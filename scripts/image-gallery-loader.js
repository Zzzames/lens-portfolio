/**
 * 动态图片加载工具库
 * 自动检测并加载指定文件夹中的所有图片
 */

class ImageGalleryLoader {
    constructor() {
        this.categories = {
            'street': { prefix: 'street', name: '街头掠影' },
            'documentary': { prefix: 'doc', name: '人文纪实' },
            'nature': { prefix: 'nature', name: '自然风光' },
            'cityscape': { prefix: 'city', name: '城市风光' },
            'stilllife': { prefix: 'still', name: '静物时光' },
            'portrait': { prefix: 'portrait', name: '人像摄影' },
            'animals': { prefix: 'animals', name: '动物摄影' }
        };
        
        this.supportedFormats = ['webp'];
        this.maxImageCount = 100; // 最大检测图片数量
        this.imagesPerPage = 9; // 每页显示图片数量
        this.currentPage = 1; // 当前页码
        this.totalImages = 0; // 总图片数量
        this.allImages = []; // 所有图片数据
        this.currentCategory = ''; // 当前分类
        this.imageQuality = 20; // 默认图片质量
    }

    /**
     * 获取正确的图片基础路径
     * @returns {string} 图片基础路径
     */
    getImageBasePath() {
        // 检查当前页面是否在子目录中（如pages目录）
        const currentPath = window.location.pathname;
        if (currentPath.includes('/pages/')) {
            return '../images'; // 从pages目录访问images目录
        }
        return 'images'; // 从根目录访问images目录
    }

    /**
     * 获取带质量参数的图片路径
     * @param {string} imagePath - 原始图片路径
     * @param {number} quality - 图片质量 (1-100)
     * @returns {string} 带质量参数的图片路径
     */
    getImagePathWithQuality(imagePath, quality = 80) {
        return imagePath;
    }

    /**
     * 设置图片质量
     * @param {number} quality - 图片质量 (1-100)
     */
    setImageQuality(quality) {
        this.imageQuality = Math.max(1, Math.min(100, quality));
    }

    /**
     * 异步检测指定分类文件夹中的图片数量（优化版）
     * @param {string} category - 分类名称
     * @returns {Promise<Array>} 返回存在的图片文件列表
     */
    async detectImages(category) {
        if (!this.categories[category]) {
            console.error(`未知分类: ${category}`);
            return [];
        }

        const prefix = this.categories[category].prefix;
        const existingImages = [];
        const imageBasePath = this.getImageBasePath();
        
        // 批量检测图片，减少频繁的DOM更新
        let batchImages = [];
        let lastUpdateTime = Date.now();
        const UPDATE_INTERVAL = 300; // 减少到300ms
        const CONCURRENT_LIMIT = 3; // 限制并发请求数量
        
        // 优化：使用队列机制批量检测
        const checkBatch = async (startIndex, batchSize) => {
            const promises = [];
            for (let i = startIndex; i < Math.min(startIndex + batchSize, this.maxImageCount); i++) {
                const imageNumber = (i + 1).toString().padStart(2, '0');
                
                for (const format of this.supportedFormats) {
                    const imagePath = `${imageBasePath}/${category}/${prefix}-${imageNumber}.${format}`;
                    promises.push(
                        this.imageExists(imagePath).then(exists => ({ 
                            exists, 
                            path: imagePath, 
                            number: i + 1 
                        }))
                    );
                    break; // 只检测第一个格式，减少请求
                }
            }
            
            return Promise.all(promises);
        };
        
        // 分批检测图片
        for (let i = 0; i < this.maxImageCount; i += CONCURRENT_LIMIT) {
            const batchResults = await checkBatch(i, CONCURRENT_LIMIT);
            
            for (const result of batchResults) {
                if (result.exists) {
                    const imageData = {
                        path: result.path,
                        number: result.number,
                        title: this.generateTitle(category, result.number),
                        description: this.generateDescription(category, result.number),
                        exif: this.generateExifData(category, result.number)
                    };
                    
                    existingImages.push(imageData);
                    batchImages.push(imageData);
                }
            }
            
            // 批量更新DOM
            const currentTime = Date.now();
            if (this.currentCategory === category && 
                (currentTime - lastUpdateTime > UPDATE_INTERVAL || batchImages.length >= 3)) {
                this.allImages = existingImages;
                this.totalImages = existingImages.length;
                await this.renderBatchImages(batchImages);
                batchImages = [];
                lastUpdateTime = currentTime;
            }
            
            // 如果连续几批都没有图片，提前退出
            if (batchResults.every(r => !r.exists) && i > 10) {
                break;
            }
        }
        
        // 最后更新剩余的图片
        if (this.currentCategory === category && batchImages.length > 0) {
            this.allImages = existingImages;
            this.totalImages = existingImages.length;
            await this.renderBatchImages(batchImages);
        }

        console.log(`检测到 ${category} 分类共有 ${existingImages.length} 张图片`);
        return existingImages;
    }

    /**
     * 实时更新的图片检测（新增方法）
     * @param {string} category - 分类名称
     * @returns {Promise<Array>} 返回存在的图片文件列表
     */
    async detectImagesWithRealTimeUpdate(category) {
        if (!this.categories[category]) {
            console.error(`未知分类: ${category}`);
            return [];
        }

        const prefix = this.categories[category].prefix;
        const existingImages = [];
        const imageBasePath = this.getImageBasePath();
        const CONCURRENT_LIMIT = 2; // 减少并发数，提升响应速度
        const REAL_TIME_UPDATE_INTERVAL = 200; // 更频繁的实时更新
        
        let lastUpdateTime = Date.now();
        let pendingImages = [];
        let isFirstBatch = true;
        
        // 实时更新函数
        const updateImages = async () => {
            if (pendingImages.length === 0) return;
            
            // 更新数据
            existingImages.push(...pendingImages);
            this.allImages = existingImages;
            this.totalImages = existingImages.length;
            
            // 第一次检测到图片时，立即显示第一页的占位符
            const photoGrid = document.querySelector('.photo-grid');
            if (photoGrid && isFirstBatch) {
                isFirstBatch = false;
                // 立即显示第一页占位符，避免用户等待
                photoGrid.innerHTML = '<div class="loading-message"><p>正在加载图片...</p></div>';
                
                // 短暂延迟后显示占位符网格
                setTimeout(() => {
                    const currentImages = this.getCurrentPageImages(this.currentPage);
                    photoGrid.innerHTML = this.generatePhotoGridHTML(this.currentCategory, currentImages, true);
                    console.log(`初始化第一页网格，显示 ${currentImages.length} 个占位符`);
                }, 100);
            }
            
            // 实时更新界面，逐个替换占位符
            await this.replaceMultiplePlaceholders(pendingImages);
            pendingImages = [];
            lastUpdateTime = Date.now();
        };
        
        // 分批检测函数
        const checkBatch = async (startIndex, batchSize) => {
            const promises = [];
            for (let i = startIndex; i < Math.min(startIndex + batchSize, this.maxImageCount); i++) {
                const imageNumber = (i + 1).toString().padStart(2, '0');
                
                for (const format of this.supportedFormats) {
                    const imagePath = `${imageBasePath}/${category}/${prefix}-${imageNumber}.${format}`;
                    promises.push(
                        this.imageExists(imagePath).then(exists => ({ 
                            exists, 
                            path: imagePath, 
                            number: i + 1 
                        }))
                    );
                    break; // 只检测第一个格式
                }
            }
            
            return Promise.all(promises);
        };
        
        // 分批实时检测
        for (let i = 0; i < this.maxImageCount; i += CONCURRENT_LIMIT) {
            if (this.currentCategory !== category) {
                break; // 如果用户切换了页面，停止检测
            }
            
            const batchResults = await checkBatch(i, CONCURRENT_LIMIT);
            
            // 处理检测结果
            for (const result of batchResults) {
                if (result.exists) {
                    const imageData = {
                        path: result.path,
                        number: result.number,
                        title: this.generateTitle(category, result.number),
                        description: this.generateDescription(category, result.number),
                        exif: this.generateExifData(category, result.number)
                    };
                    
                    pendingImages.push(imageData);
                }
            }
            
            // 实时更新界面
            const currentTime = Date.now();
            if (pendingImages.length > 0 && 
                (currentTime - lastUpdateTime > REAL_TIME_UPDATE_INTERVAL || pendingImages.length >= 2)) {
                await updateImages();
            }
            
            // 如果连续几批都没有图片，提前退出
            if (batchResults.every(r => !r.exists) && i > 6) {
                break;
            }
            
            // 给浏览器一些时间处理其他任务
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // 处理最后的图片
        if (pendingImages.length > 0) {
            await updateImages();
        }
        
        console.log(`检测完成，${category} 分类共有 ${existingImages.length} 张图片`);
        return existingImages;
    }

    /**
     * 逐个替换多个占位符（优化版）
     * @param {Array} imageDataList - 图片数据列表
     */
    async replaceMultiplePlaceholders(imageDataList) {
        const photoGrid = document.querySelector('.photo-grid');
        if (!photoGrid || imageDataList.length === 0) return;
        
        const currentImages = this.getCurrentPageImages(this.currentPage);
        
        // 逐个替换占位符，提升视觉效果
        for (const imageData of imageDataList) {
            // 检查图片是否属于当前页
            const imageIndex = currentImages.findIndex(img => img.path === imageData.path);
            
            if (imageIndex >= 0) {
                // 重新获取占位符元素（因为 DOM 可能已更新）
                const placeholders = photoGrid.querySelectorAll('.photo-item.placeholder');
                
                if (imageIndex < placeholders.length) {
                    const placeholder = placeholders[imageIndex];
                    
                    if (placeholder && placeholder.classList.contains('placeholder') && !placeholder.dataset.loading) {
                        // 标记为加载中，避免重复处理
                        placeholder.dataset.loading = 'true';
                        
                        try {
                            // 获取带质量参数的图片路径
                            const qualityImageSrc = this.getImagePathWithQuality(imageData.path, this.imageQuality);
                            
                            // 预加载图片（添加超时）
                            await Promise.race([
                                this.preloadImage(qualityImageSrc),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                            ]);
                            
                            // 替换为实际内容
                            const titleHtml = imageData.title ? `<h3>${imageData.title}</h3>` : '';
                            const descHtml = imageData.description ? `<p>${imageData.description}</p>` : '';
                            
                            placeholder.innerHTML = `
                                <img src="${qualityImageSrc}" alt="${imageData.title || '图片'}" loading="lazy">
                                <div class="photo-overlay">
                                    ${titleHtml}
                                    ${descHtml}
                                </div>
                            `;
                            
                            // 清理标记并更新状态
                            delete placeholder.dataset.loading;
                            placeholder.classList.remove('placeholder');
                            placeholder.classList.add('loaded', 'fade-in');
                            
                            // 给一个小的动画间隔
                            await new Promise(resolve => setTimeout(resolve, 100));
                            
                        } catch (error) {
                            console.warn(`加载图片失败: ${imageData.path}`, error);
                            
                            // 显示错误占位符
                            placeholder.innerHTML = `
                                <div class="error-placeholder">
                                    <p>图片加载失败</p>
                                </div>
                            `;
                            
                            delete placeholder.dataset.loading;
                            placeholder.classList.remove('placeholder');
                            placeholder.classList.add('error');
                        }
                    }
                }
            }
        }
        
        // 检查是否需要移除多余的占位符
        this.removeExtraPlaceholders();
        
        // 更新分页信息
        this.updatePaginationDisplay();
    }

    /**
     * 移除多余的占位符（新增方法）
     */
    removeExtraPlaceholders() {
        const photoGrid = document.querySelector('.photo-grid');
        if (!photoGrid) return;
        
        const currentImages = this.getCurrentPageImages(this.currentPage);
        const allItems = photoGrid.querySelectorAll('.photo-item');
        
        // 如果当前页图片数量少于占位符数量，移除多余的占位符
        if (currentImages.length < allItems.length) {
            for (let i = allItems.length - 1; i >= currentImages.length; i--) {
                const extraItem = allItems[i];
                if (extraItem && extraItem.classList.contains('placeholder')) {
                    extraItem.remove();
                    console.log(`移除第 ${i + 1} 个多余占位符`);
                }
            }
        }
    }

    /**
     * 更新分页显示（新增方法）
     */
    updatePaginationDisplay() {
        let paginationContainer = document.querySelector('.pagination-container');
        
        // 如果分页容器不存在，创建一个
        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.className = 'pagination-container';
            
            const photoGrid = document.querySelector('.photo-grid');
            const galleryFooter = document.querySelector('.gallery-footer');
            
            if (photoGrid) {
                if (galleryFooter) {
                    galleryFooter.parentNode.insertBefore(paginationContainer, galleryFooter);
                } else {
                    photoGrid.parentNode.appendChild(paginationContainer);
                }
            }
        }
        
        // 更新分页内容
        const paginationHTML = this.generatePaginationHTML();
        if (paginationHTML) {
            paginationContainer.innerHTML = paginationHTML;
        } else {
            paginationContainer.innerHTML = ''; // 清空分页内容
        }
    }

    /**
     * 检测图片文件是否存在（优化版）
     * @param {string} imagePath - 图片路径
     * @returns {Promise<boolean>}
     */
    imageExists(imagePath) {
        return new Promise((resolve) => {
            const img = new Image();
            const timeoutId = setTimeout(() => {
                // 2秒超时，避免无限等待
                resolve(false);
            }, 2000);
            
            img.onload = () => {
                clearTimeout(timeoutId);
                resolve(true);
            };
            
            img.onerror = () => {
                clearTimeout(timeoutId);
                resolve(false);
            };
            
            // 设置图片源时捕获异常
            try {
                img.src = imagePath;
            } catch (error) {
                clearTimeout(timeoutId);
                console.warn('图片路径错误:', imagePath, error);
                resolve(false);
            }
        });
    }

    /**
     * 生成图片标题
     * @param {string} category - 分类
     * @param {number} number - 编号
     * @returns {string}
     */
    generateTitle(category, number) {
        const titles = {
        'street': [
            '北京·旧鼓楼大街',
            '天津·北安桥',
            '天津·宁园外街头',
            '天津·宁园',
            '天津·棉里咖啡',
            '北京·朝阳体育馆附近街道',
            '天津·百福大楼旧址',
            '天津·天津之眼',
            '天津·狮子林桥一隅',
            '天津理工大学校内',
            '天津理工大学北门公交车站',
            '佛山·广教立交桥',
            '佛山·广教立交桥'
        ],
        'documentary': [
            '天津·赤峰道',
            '天津·赤峰道',
            '天津·宁园',
            '天津·宁园',
            '天津·宁园',
            '北京·街边',
            '上海·外滩',
            '佛山·筷子路',
            '佛山·筷子路',
            '潮州·张厝巷',
            '天津',
            '佛山·美创',
            '天津·意大利兵营旧址',
            '北京·颐和园'
        ],
        'nature': [
            '青岛',
            '天津',
            '天津·滨海',
            '天津·滨海',
            '天津·滨海',
            '天津·妈祖旁海堤',
            '韶关·丹霞山',
            '韶关·丹霞山',
            '韶关·丹霞山',
            '天津·妈祖旁海堤'
        ],
        'cityscape': [
            '天津·赤峰桥',
            '北京·午门',
            '天津·世纪钟',
            '天津·赤峰桥',
            '天津·恒隆广场',
            '天津·恒隆广场',
            '北京·中央广播电视台',
            '北京·首都三件套',
            '北京·首都三件套',
            '天津·水滴体育馆&天塔',
            '重庆',
            '重庆',
            '天津',
            '天津',
            '天津',
            '天津·津丽华酒店',
            '上海',
            '天津·古文化街',
            '天津·君临大厦',
            '天津·天津之眼',
            '潮州·广济桥',
            '天津·天津理工大学',
            '天津·瑞吉金融街酒店'
        ],
        'stilllife': [
            '天津·海边罗森',
            '天津·宁园',
            '天津·大悲禅院',
            '天津·大悲禅院',
            '潮州·张厝巷',
            '天津·理工大学校内一隅',
            '佛山·家里',
            '天津·羊脂瓷',
            '天津·大悲禅院',
            '天津·滨海站',
            '天津·滨海站',
            '天津·滨海',
            '天津·滨海',
            '天津·滨海',
            '佛山·和美术馆',
            '佛山·和美术馆',
            '广州·三元里',
            '北京·鸟巢体育馆',
            '重庆·银楼',
            '天津·月相之美',
            '天津·理工校内'
        ],
        'portrait': [

        ],
        'animals': [
            '天津·宁园',
            '天津·宁园',
            '天津·老码头',
            '天津·老码头',
            '天津·老码头',
            '天津·老码头',
            '天津·老码头',
            '韶关·丹霞山'
        ]
    };

        const categoryTitles = titles[category] || [];
        if (categoryTitles.length === 0) {
            return ''; // 没有内容时返回空字符串
        }
        const titleIndex = (number - 1) % categoryTitles.length;
        const title = categoryTitles[titleIndex];
        return title || ''; // 如果标题是undefined，返回空字符串
    }

    /**
     * 生成图片描述
     * @param {string} category - 分类
     * @param {number} number - 编号
     * @returns {string}
     */
    generateDescription(category, number) {
        const descriptions = {
        'street': [
            '树影斑驳，宁静致远。',
            '城市日落时分的繁忙景象，金色的阳光洒满街道，行人和车辆在光影中穿梭。',
            '秋日街头和骑行路人的背影。',
            '秋日的夕阳下，在宁园内湖畔柳荫里，围坐休憩。',
            '调酒师和琳琅满目的调酒瓶。',
            '金黄银杏叶下，骑车人剪影。',
            '红瓦屋顶与金色尖塔在蓝天下交相辉映，尽显欧式建筑韵味。',
            '天津之眼独特的摄影角度。',
            '狮子林桥不拍大爷跳水拍什么？',
            '骑车人沐浴在夕阳余晖中，穿梭于校内的林荫街道。',
            '夕阳余晖下，行人与公交车在街头构成一幅温馨剪影。',
            '木棉树下，春意盎然。',
            '车道旁，共享单车随意散落，与路过的摩托车形成动静对比。'
        ],
        'documentary': [
            '夕阳斜照在一对情侣身上。',
            '无。',
            '宁园内的台阶上，老人们闲坐聊天，猫咪在前景悠然漫步，一派和谐景象。',
            '金秋时节，古桥上游人驻足，尽享层林尽染的诗意美景。',
            '湖畔画家专注创作，水面波光粼粼，鸭子悠然自得。',
            '秋日街头，老人独自坐在长椅上，手中把玩着玩物，神情若有所思。',
            '春日樱花烂漫，东方明珠塔下游客欢声笑语，定格城市美好瞬间。',
            '阴雨天的筷子路街头，路人轻触车窗上的金色挥春，感受过年氛围。',
            '人潮涌动，满街的春联与路人相映成趣。',
            '大年期间，阿嬷在包粿。',
            '新旧交织的城市一隅。',
            '绿草如茵，孑然独行。',
            '阳光下的钟楼上，天津独有的欧式美感。',
            '透过斑驳朱门，夕阳下的湖光山色与行人剪影构成一幅暖意画卷。'
        ],
        'nature': [
            '海天一色，远山近海皆成画。',
            '晚霞如火，高楼剪影中尽显都市日暮之美。',
            '海边升起的朝阳金光万丈，海面波澜。',
            '金色朝阳下，海边防波堤在汹涌海浪与城市建筑间延伸。',
            '金光碎影随波跳跃，尽显水波律动。',
            '桥影红霞。',
            '层峦叠嶂，云雾缭绕。',
            '尽显人间仙境。',
            '一览众山小！',
            '堆栈出动静结合之美。'
        ],
        'cityscape': [
            '高楼林立，车流光影，彰显天津璀璨夜景。',
            '紫禁城屋檐高耸，斗转星移，星轨与古建辉映，尽显天地苍穹之浩渺。',
            '繁华都市与时间流转。',
            '天津最美进城之路。',
            '车水马龙与天津的夜景。',
            '都市夜幕下尽显现代建筑的璀璨与繁华。',
            'CCTV & 中国尊',
            '首都天际线，摩天大楼林立（一）。',
            '首都天际线，摩天大楼林立（二）。',
            '晚霞映天际，城市灯火阑珊。',
            '雕花窗棂，传统民居与现代高楼共融，尽显山城独特韵味。',
            '傍晚时分，山城车流不息，桥梁横跨江面。',
            '天塔矗立，晚霞温柔。',
            '夕阳余晖下的天津。',
            '霞光万丈，车流似炬。',
            '津丽华酒店的灯火璀璨，两侧道路车流光影。',
            '花枝摇曳，古钟楼矗立。',
            '古今同框：古街与高楼辉映。',
            '窗内外光影交织，色彩与黑白对比。',
            '经典新手机位。',
            '廊桥流光溢彩。',
            '霞光万里下的理工大学与天津天际线同框。',
            '虚实之美。'
        ],
        'stilllife': [
            'Luckin Coffee Cup',
            '金黄枝叶垂挂，古石与柳丝映衬，尽显园林深邃之美。',
            '秋日禅意（一）',
            '秋日禅意（二）',
            '潮州粿申非遗官方照',
            '树影斑驳与林间小路，勾勒出宁静的夏日早晨。',
            '阴天，雨水与VOOK',
            '呈现器物之美',
            '对称美学',
            '黑白建筑美学',
            '建筑的空间美感',
            '炽热生命力！',
            '生与枯，向日葵的时光交响',
            'Spoon Honda',
            '事物的发展是螺旋上升的。',
            '像不像跌宕起伏的人生，最终归为平静？',
            '绿叶扶疏，生机盎然',
            '光影交错尽显鸟巢体育馆的几何韵律',
            '巨龙吐雾',
            '三月同框',
            '金叶满枝，秋意盎然'
        ],
        'portrait': [

        ],
        'animals': [
            '白鹅悠游（一）',
            '白鹅悠游（二）',
            '波光粼粼间定格海鸥捕食瞬间（一）',
            '波光粼粼间定格海鸥捕食瞬间（二）',
            '海鸥翱翔蓝天',
            '波光粼粼，海鸥低飞（一）',
            '波光粼粼，海鸥低飞（二）',
            '翠竹环绕，小松鼠立于枯木枝头，探头探脑~'
        ]
    };

        const categoryDescs = descriptions[category] || [];
        if (categoryDescs.length === 0) {
            return ''; // 没有内容时返回空字符串
        }
        const descIndex = (number - 1) % categoryDescs.length;
        const description = categoryDescs[descIndex];
        return description || ''; // 如果描述是undefined，返回空字符串
    }

    /**
     * 生成图片EXIF数据
     * @param {string} category - 分类
     * @param {number} number - 编号
     * @returns {Object}
     */
    generateExifData(category, number) {
        // EXIF数据配置 - 可通过内容管理工具编辑
        const exifData = {
        'street': [
            {
                camera: 'Nikon D850',
                lens: 'NIKKOR 24-70mm f/2.8E ED VR',
                focal_length: '35mm',
                aperture: 'f/5.6',
                shutter_speed: '1/125s',
                iso: 'ISO 400',
                date: '2024-03-15'
            }
        ]
    };

        const categoryExif = exifData[category] || [{
            camera: 'Nikon D850',
            lens: 'NIKKOR 24-70mm f/2.8E ED VR',
            focal_length: '50mm',
            aperture: 'f/2.8',
            shutter_speed: '1/60s',
            iso: 'ISO 200',
            date: new Date().toISOString().split('T')[0]
        }];
        
        const exifIndex = (number - 1) % categoryExif.length;
        return categoryExif[exifIndex];
    }

    /**
     * 获取当前页的图片
     * @param {number} page - 页码
     * @returns {Array} 当前页的图片列表
     */
    getCurrentPageImages(page = 1) {
        const startIndex = (page - 1) * this.imagesPerPage;
        const endIndex = startIndex + this.imagesPerPage;
        return this.allImages.slice(startIndex, endIndex);
    }

    /**
     * 获取总页数
     * @returns {number} 总页数
     */
    getTotalPages() {
        return Math.ceil(this.totalImages / this.imagesPerPage);
    }

    /**
     * 生成分页导航 HTML
     * @returns {string} 分页导航 HTML
     */
    generatePaginationHTML() {
        const totalPages = this.getTotalPages();
        if (totalPages <= 1) return '';

        let html = '<div class="pagination">';
        
        // 上一页按钮
        if (this.currentPage > 1) {
            html += `<button class="pagination-btn" onclick="window.imageGalleryLoader.goToPage(${this.currentPage - 1})">‹ 上一页</button>`;
        }
        
        // 页码按钮
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === this.currentPage ? ' active' : '';
            html += `<button class="pagination-btn${activeClass}" onclick="window.imageGalleryLoader.goToPage(${i})">${i}</button>`;
        }
        
        // 下一页按钮
        if (this.currentPage < totalPages) {
            html += `<button class="pagination-btn" onclick="window.imageGalleryLoader.goToPage(${this.currentPage + 1})">下一页 ›</button>`;
        }
        
        html += '</div>';
        
        // 添加页面信息
        html += `<div class="pagination-info">第 ${this.currentPage} 页 / 共 ${this.getTotalPages()} 页 (总计 ${this.totalImages} 张图片)</div>`;
        
        return html;
    }

    /**
     * 批量渲染图片（优化版）
     * @param {Array} batchImages - 批量图片数据
     */
    async renderBatchImages(batchImages) {
        const photoGrid = document.querySelector('.photo-grid');
        if (!photoGrid || batchImages.length === 0) return;
        
        try {
            const currentImages = this.getCurrentPageImages(this.currentPage);
            
            // 如果是第一批图片且正在加载，先显示占位符
            if (this.totalImages <= batchImages.length && photoGrid.innerHTML.includes('正在加载')) {
                photoGrid.innerHTML = this.generatePhotoGridHTML(this.currentCategory, currentImages, true);
            }
            
            // 批量更新占位符（限制并发操作）
            const placeholders = photoGrid.querySelectorAll('.photo-item.placeholder');
            const RENDER_BATCH_SIZE = 2; // 每次只渲染2个元素
            
            for (let i = 0; i < batchImages.length; i += RENDER_BATCH_SIZE) {
                const batch = batchImages.slice(i, i + RENDER_BATCH_SIZE);
                
                await Promise.all(batch.map(async (imageData) => {
                    const imageIndex = currentImages.findIndex(img => img.path === imageData.path);
                    
                    if (imageIndex >= 0 && imageIndex < placeholders.length) {
                        const placeholder = placeholders[imageIndex];
                        if (placeholder && placeholder.classList.contains('placeholder')) {
                            try {
                                // 获取带质量参数的图片路径
                                const qualityImageSrc = this.getImagePathWithQuality(imageData.path, this.imageQuality);
                                
                                // 预加载图片（添加超时）
                                await Promise.race([
                                    this.preloadImage(qualityImageSrc),
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                                ]);
                                
                                // 替换为实际内容
                                const titleHtml = imageData.title ? `<h3>${imageData.title}</h3>` : '';
                                const descHtml = imageData.description ? `<p>${imageData.description}</p>` : '';
                                
                                placeholder.innerHTML = `
                                    <img src="${qualityImageSrc}" alt="${imageData.title || '图片'}" loading="lazy">
                                    <div class="photo-overlay">
                                        ${titleHtml}
                                        ${descHtml}
                                    </div>
                                `;
                                placeholder.classList.remove('placeholder');
                                placeholder.classList.add('loaded', 'fade-in');
                                
                            } catch (error) {
                                console.warn(`加载图片失败: ${imageData.path}`, error);
                                // 显示错误占位符
                                placeholder.innerHTML = `
                                    <div class="error-placeholder">
                                        <p>图片加载失败</p>
                                    </div>
                                `;
                                placeholder.classList.remove('placeholder');
                                placeholder.classList.add('error');
                            }
                        }
                    }
                }));
                
                // 使用requestAnimationFrame优化渲染
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
            
            // 更新分页信息
            const paginationContainer = document.querySelector('.pagination-container');
            if (paginationContainer) {
                paginationContainer.innerHTML = this.generatePaginationHTML();
            }
            
        } catch (error) {
            console.error('批量渲染图片失败:', error);
        }
    }

    /**
     * 跳转到指定页面
     * @param {number} page - 目标页码
     */
    async goToPage(page) {
        if (page < 1 || page > this.getTotalPages()) return;
        
        this.currentPage = page;
        
        // 显示加载提示
        const photoGrid = document.querySelector('.photo-grid');
        if (photoGrid) {
            photoGrid.innerHTML = '<div class="loading-message"><p>正在加载第 ' + page + ' 页...</p></div>';
        }
        
        // 模拟加载延迟，提升用户体验
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 渲染当前页图片
        this.renderCurrentPage();
        
        // 滚动到页面顶部
        document.querySelector('.gallery-header').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 渐进式渲染当前页（新增方法）
     * @param {Object} newImage - 新检测到的图片数据
     */
    async renderCurrentPageProgressively(newImage) {
        // 检查当前页是否需要更新
        const currentImages = this.getCurrentPageImages(this.currentPage);
        const photoGrid = document.querySelector('.photo-grid');
        
        if (!photoGrid) return;
        
        // 如果是第一页且正在加载，先显示占位符
        if (this.totalImages === 1 && photoGrid.innerHTML.includes('正在加载')) {
            photoGrid.innerHTML = this.generatePhotoGridHTML(this.currentCategory, currentImages, true);
        }
        
        // 查找对应的占位符元素
        const placeholders = photoGrid.querySelectorAll('.photo-item.placeholder');
        const imageIndex = currentImages.findIndex(img => img.path === newImage.path);
        
        if (imageIndex >= 0 && imageIndex < placeholders.length) {
            const placeholder = placeholders[imageIndex];
            if (placeholder) {
                try {
                    // 获取带质量参数的图片路径
                    const qualityImageSrc = this.getImagePathWithQuality(newImage.path, this.imageQuality);
                    
                    // 预加载图片
                    await this.preloadImage(qualityImageSrc);
                    
                    // 替换为实际内容
                    const titleHtml = newImage.title ? `<h3>${newImage.title}</h3>` : '';
                    const descHtml = newImage.description ? `<p>${newImage.description}</p>` : '';
                    
                    placeholder.innerHTML = `
                        <img src="${qualityImageSrc}" alt="${newImage.title || '图片'}" loading="lazy">
                        <div class="photo-overlay">
                            ${titleHtml}
                            ${descHtml}
                        </div>
                    `;
                    placeholder.classList.remove('placeholder');
                    placeholder.classList.add('loaded', 'fade-in');
                } catch (error) {
                    console.error(`加载图片失败: ${newImage.path}`, error);
                    // 显示错误占位符
                    placeholder.innerHTML = `
                        <div class="error-placeholder">
                            <p>图片加载失败</p>
                        </div>
                    `;
                    placeholder.classList.remove('placeholder');
                    placeholder.classList.add('error');
                }
            }
        }
        
        // 更新分页信息
        const paginationContainer = document.querySelector('.pagination-container');
        if (paginationContainer) {
            paginationContainer.innerHTML = this.generatePaginationHTML();
        }
    }

    /**
     * 渲染当前页图片
     */
    async renderCurrentPage() {
        const currentImages = this.getCurrentPageImages(this.currentPage);
        const photoGrid = document.querySelector('.photo-grid');
        
        if (!photoGrid) {
            console.error('未找到 .photo-grid 元素');
            return;
        }
        
        console.log(`渲染第 ${this.currentPage} 页，共 ${currentImages.length} 张图片`);
        
        // 显示当前页的占位符
        photoGrid.innerHTML = this.generatePhotoGridHTML(this.currentCategory, currentImages, true);
        
        // 更新分页显示
        this.updatePaginationDisplay();
        
        // 异步加载图片
        await this.loadImagesProgressively(this.imageQuality);
    }
    
    /**
     * 逐步加载图片
     * @param {number} quality - 图片质量 (1-100)
     */
    async loadImagesProgressively(quality = 50) {
        const placeholders = document.querySelectorAll('.photo-item.placeholder');
        
        for (let i = 0; i < placeholders.length; i++) {
            const placeholder = placeholders[i];
            const imageSrc = placeholder.dataset.src;
            const imageTitle = placeholder.dataset.title;
            const imageDescription = placeholder.dataset.description;
            
            try {
                // 获取带质量参数的图片路径
                const qualityImageSrc = this.getImagePathWithQuality(imageSrc, quality);
                
                // 预加载图片
                await this.preloadImage(qualityImageSrc);
                
                // 替换为实际内容
                const titleHtml = imageTitle ? `<h3>${imageTitle}</h3>` : '';
                const descHtml = imageDescription ? `<p>${imageDescription}</p>` : '';
                
                placeholder.innerHTML = `
                    <img src="${qualityImageSrc}" alt="${imageTitle || '图片'}" loading="lazy">
                    <div class="photo-overlay">
                        ${titleHtml}
                        ${descHtml}
                    </div>
                `;
                placeholder.classList.remove('placeholder');
                placeholder.classList.add('loaded', 'fade-in');
                
                // 添加小延迟以提供渐进动画效果
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`加载图片失败: ${imageSrc}`, error);
                // 显示错误占位符
                placeholder.innerHTML = `
                    <div class="error-placeholder">
                        <p>图片加载失败</p>
                    </div>
                `;
                placeholder.classList.remove('placeholder');
                placeholder.classList.add('error');
            }
        }
    }
    
    /**
     * 预加载图片
     * @param {string} src - 图片路径
     * @returns {Promise}
     */
    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    }

    /**
     * 动态生成照片网格HTML
     * @param {string} category - 分类名称
     * @param {Array} images - 图片列表
     * @param {boolean} withPlaceholder - 是否显示占位符
     * @returns {string} HTML字符串
     */
    generatePhotoGridHTML(category, images, withPlaceholder = false) {
        let html = '';
        
        images.forEach((image, index) => {
            if (withPlaceholder) {
                // 显示占位符
                html += `
                    <div class="photo-item placeholder" data-src="${image.path}" data-title="${image.title}" data-description="${image.description}" onclick="openLightbox(this)">
                        <div class="placeholder-content">
                            <div class="placeholder-image"></div>
                            <div class="placeholder-text">
                                <div class="placeholder-title"></div>
                                <div class="placeholder-description"></div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // 显示实际内容
                const titleHtml = image.title ? `<h3>${image.title}</h3>` : '';
                const descHtml = image.description ? `<p>${image.description}</p>` : '';
                
                html += `
                    <div class="photo-item loaded" onclick="openLightbox(this)">
                        <img src="${image.path}" alt="${image.title || '图片'}" loading="lazy">
                        <div class="photo-overlay">
                            ${titleHtml}
                            ${descHtml}
                        </div>
                    </div>
                `;
            }
        });

        return html;
    }

    /**
     * 初始化指定分类的图片画廊（优化用户体验版）
     * @param {string} category - 分类名称
     * @param {number} quality - 图片质量 (1-100)，默认为50
     */
    async initializeGallery(category, quality = 80) {
        console.log(`正在初始化 ${category} 画廊...`);
        
        this.currentCategory = category;
        this.currentPage = 1;
        this.setImageQuality(quality);
        
        // 初始化清空图片数据
        this.allImages = [];
        this.totalImages = 0;
        
        const photoGrid = document.querySelector('.photo-grid');
        if (!photoGrid) {
            console.error('未找到 .photo-grid 元素');
            return;
        }
        
        // 显示加载提示，给用户反馈
        photoGrid.innerHTML = '<div class="loading-message"><p>正在初始化画廊...</p></div>';
        
        try {
            // 异步检测图片，不阻塞界面
            const images = await this.detectImagesWithRealTimeUpdate(category);
            
            if (images.length === 0) {
                console.warn(`${category} 分类中没有找到图片`);
                photoGrid.innerHTML = '<div class="no-images-message"><p>暂无图片</p></div>';
                return;
            }
            
            console.log(`${category} 画廊初始化完成，共 ${images.length} 张图片，分 ${this.getTotalPages()} 页显示`);
            
            // 初始化完成后渲染第一页
            await this.renderCurrentPage();
            
        } catch (error) {
            console.error('初始化画廊失败:', error);
            photoGrid.innerHTML = `
                <div class="error-message" style="text-align: center; color: red; padding: 20px;">
                    <p>加载图片失败</p>
                    <p>错误信息: ${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px;">刷新页面</button>
                </div>
            `;
        }
    }
}

// 全局实例
window.imageGalleryLoader = new ImageGalleryLoader();