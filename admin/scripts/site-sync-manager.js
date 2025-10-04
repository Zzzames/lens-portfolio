/**
 * 网站同步管理器
 * 负责admin工具与主网站之间的数据同步
 */

class SiteSyncManager {
    constructor() {
        this.metadataPath = '../data/site-images-metadata.json';
        this.metadata = null;
        this.isInitialized = false;
        
        // 图片文件命名规则
        this.namingPatterns = {
            'street': /^street-(\d+)\.(webp|jpg|jpeg|png)$/i,
            'documentary': /^doc-(\d+)\.(webp|jpg|jpeg|png)$/i,
            'nature': /^nature-(\d+)\.(webp|jpg|jpeg|png)$/i,
            'portrait': /^portrait-(\d+)\.(webp|jpg|jpeg|png)$/i,
            'cityscape': /^city-(\d+)\.(webp|jpg|jpeg|png)$/i,
            'animals': /^animals-(\d+)\.(webp|jpg|jpeg|png)$/i,
            'stilllife': /^still-(\d+)\.(webp|jpg|jpeg|png)$/i
        };
    }

    /**
     * 初始化同步管理器
     */
    async init() {
        try {
            await this.loadMetadata();
            this.isInitialized = true;
            console.log('网站同步管理器初始化成功');
            return true;
        } catch (error) {
            console.error('初始化同步管理器失败:', error);
            return false;
        }
    }

    /**
     * 加载元数据
     */
    async loadMetadata() {
        try {
            const response = await fetch(this.metadataPath);
            if (!response.ok) {
                throw new Error('无法加载元数据文件');
            }
            this.metadata = await response.json();
            console.log('元数据加载成功:', this.metadata);
        } catch (error) {
            console.error('加载元数据失败:', error);
            // 创建默认元数据结构
            this.metadata = this.createDefaultMetadata();
        }
    }

    /**
     * 创建默认元数据结构
     */
    createDefaultMetadata() {
        return {
            version: "1.0",
            lastUpdate: new Date().toISOString(),
            images: {
                street: [],
                documentary: [],
                nature: [],
                portrait: [],
                cityscape: [],
                animals: [],
                stilllife: []
            },
            categories: {
                street: { id: "street", name: "街头摄影", path: "../images/street/" },
                documentary: { id: "documentary", name: "纪实摄影", path: "../images/documentary/" },
                nature: { id: "nature", name: "自然风光", path: "../images/nature/" },
                portrait: { id: "portrait", name: "人像摄影", path: "../images/portrait/" },
                cityscape: { id: "cityscape", name: "城市景观", path: "../images/cityscape/" },
                animals: { id: "animals", name: "动物摄影", path: "../images/animals/" },
                stilllife: { id: "stilllife", name: "静物摄影", path: "../images/stilllife/" }
            }
        };
    }

    /**
     * 扫描指定分类的图片文件
     * @param {string} category - 分类名称
     * @returns {Promise<Array>} 图片列表
     */
    async scanCategoryImages(category) {
        console.log(`[SiteSyncManager] scanCategoryImages 开始扫描: ${category}`);
        
        const images = [];
        const basePath = `../images/${category}/`;
        const pattern = this.namingPatterns[category];
        
        if (!pattern) {
            console.warn(`未找到分类 ${category} 的命名规则`);
            return images;
        }

        // 尝试检测图片文件（编号从01到30，减少扫描时间）
        // 优化：只检测webp格式，减少404请求
        const maxCheck = 30; // 减少到30以提高速度
        const checkPromises = [];
        
        console.log(`[SiteSyncManager] 将检查 ${maxCheck} 个文件`);
        
        // 获取文件名前缀
        const prefixMap = {
            'street': 'street',
            'documentary': 'doc',
            'nature': 'nature',
            'portrait': 'portrait',
            'cityscape': 'city',
            'animals': 'animals',
            'stilllife': 'still'
        };
        
        const prefix = prefixMap[category];
        if (!prefix) {
            console.warn(`未知分类: ${category}`);
            return images;
        }
        
        // 只检测webp格式（根据用户网站实际情况）
        const extension = 'webp';

        for (let i = 1; i <= maxCheck; i++) {
            const numStr = String(i).padStart(2, '0');
            const filename = `${prefix}-${numStr}.${extension}`;
            const path = basePath + filename;
            
            checkPromises.push(
                this.checkImageExists(path).then(exists => {
                    if (exists) {
                        return {
                            filename,
                            path,
                            number: i,
                            category
                        };
                    }
                    return null;
                })
            );
        }

        console.log(`[SiteSyncManager] 开始并行检查 ${checkPromises.length} 个文件`);
        
        const results = await Promise.all(checkPromises);
        const validImages = results.filter(r => r !== null);
        
        console.log(`[SiteSyncManager] 扫描 ${category} 分类完成，找到 ${validImages.length} 张图片`);
        return validImages;
    }

    /**
     * 检查图片是否存在
     * @param {string} path - 图片路径
     * @returns {Promise<boolean>}
     */
    async checkImageExists(path) {
        try {
            const response = await fetch(path, { method: 'HEAD', cache: 'no-cache' });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * 扫描所有分类的图片
     * @param {Function} progressCallback - 进度回调函数
     * @returns {Promise<Object>} 所有图片数据
     */
    async scanAllImages(progressCallback) {
        console.log('[SiteSyncManager] 开始扫描所有图片');
        
        const categories = Object.keys(this.metadata.categories);
        const allImages = {};
        
        console.log('[SiteSyncManager] 分类列表:', categories);
        
        for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            const categoryName = this.metadata.categories[category] || category;
            
            console.log(`[SiteSyncManager] 正在扫描: ${categoryName} (${i+1}/${categories.length})`);
            
            if (progressCallback) {
                try {
                    progressCallback({
                        current: i + 1,
                        total: categories.length,
                        category: category,
                        categoryName: categoryName,
                        message: `正在扫描 ${categoryName} 分类...`
                    });
                } catch (error) {
                    console.error('[SiteSyncManager] 进度回调错误:', error);
                }
            }
            
            try {
                const images = await this.scanCategoryImages(category);
                console.log(`[SiteSyncManager] ${categoryName} 找到 ${images.length} 张图片`);
                
                // 合并现有元数据
                allImages[category] = this.mergeWithExistingMetadata(category, images);
            } catch (error) {
                console.error(`[SiteSyncManager] 扫描 ${categoryName} 失败:`, error);
                allImages[category] = [];
            }
        }
        
        console.log('[SiteSyncManager] 扫描完成，总计图片数:', 
            Object.values(allImages).reduce((sum, imgs) => sum + imgs.length, 0));
        
        return allImages;
    }

    /**
     * 合并现有元数据
     * @param {string} category - 分类
     * @param {Array} scannedImages - 扫描到的图片
     * @returns {Array} 合并后的图片数据
     */
    mergeWithExistingMetadata(category, scannedImages) {
        const existingImages = this.metadata.images[category] || [];
        const mergedImages = [];
        const scannedFilenames = new Set(scannedImages.map(img => img.filename));

        // 1. 处理扫描到的图片（文件系统中实际存在的图片）
        scannedImages.forEach(scannedImg => {
            // 查找是否有现有的元数据
            const existing = existingImages.find(img => 
                img.filename === scannedImg.filename || img.path === scannedImg.path
            );

            if (existing) {
                // 使用现有元数据，但如果标题或描述为空，则使用默认值
                const defaultTitle = this.generateDefaultTitle(category, scannedImg.number);
                const defaultDescription = this.generateDefaultDescription(category, scannedImg.number);
                
                mergedImages.push({
                    ...existing,
                    path: scannedImg.path,
                    // 如果已有自定义标题/描述则保留，否则使用默认值
                    title: existing.title || defaultTitle,
                    description: existing.description || defaultDescription,
                    exists: true
                });
            } else {
                // 创建新的元数据
                mergedImages.push({
                    id: this.generateImageId(category, scannedImg.number),
                    filename: scannedImg.filename,
                    path: scannedImg.path,
                    category: category,
                    number: scannedImg.number,
                    title: this.generateDefaultTitle(category, scannedImg.number),
                    description: this.generateDefaultDescription(category, scannedImg.number),
                    uploadDate: new Date().toISOString(),
                    exists: true
                });
            }
        });

        // 2. 保留元数据中已存在但未被扫描到的图片（用户上传的任意命名图片）
        existingImages.forEach(existing => {
            if (!scannedFilenames.has(existing.filename)) {
                // 这是一个未被扫描到的图片（可能是用户上传的任意命名图片）
                // 保留它的元数据
                mergedImages.push({
                    ...existing,
                    exists: true
                });
                console.log(`[SiteSyncManager] 保留用户上传的图片: ${existing.filename}`);
            }
        });

        return mergedImages;
    }

    /**
     * 生成图片ID
     */
    generateImageId(category, number) {
        return `${category}_${number}_${Date.now()}`;
    }

    /**
     * 生成默认标题（使用完整真实数据）
     */
    generateDefaultTitle(category, number) {
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
            'portrait': [],
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
     * 生成默认描述（使用完整真实数据）
     */
    generateDefaultDescription(category, number) {
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
            'portrait': [],
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
     * 获取所有图片数据
     * @returns {Array} 图片数组
     */
    getAllImages() {
        if (!this.metadata || !this.metadata.images) {
            return [];
        }

        const allImages = [];
        Object.keys(this.metadata.images).forEach(category => {
            const categoryImages = this.metadata.images[category] || [];
            allImages.push(...categoryImages);
        });

        return allImages;
    }

    /**
     * 根据分类获取图片
     * @param {string} category - 分类名称
     * @returns {Array} 图片数组
     */
    getImagesByCategory(category) {
        if (!this.metadata || !this.metadata.images) {
            return [];
        }
        return this.metadata.images[category] || [];
    }

    /**
     * 更新图片元数据
     * @param {string} imageId - 图片ID
     * @param {Object} updates - 更新的数据
     */
    updateImageMetadata(imageId, updates) {
        if (!this.metadata || !this.metadata.images) {
            console.error('元数据未初始化');
            return false;
        }

        // 查找图片
        let found = false;
        Object.keys(this.metadata.images).forEach(category => {
            const images = this.metadata.images[category];
            const index = images.findIndex(img => img.id === imageId);
            
            if (index !== -1) {
                // 更新图片信息
                this.metadata.images[category][index] = {
                    ...images[index],
                    ...updates,
                    lastModified: new Date().toISOString()
                };
                found = true;
            }
        });

        if (found) {
            this.metadata.lastUpdate = new Date().toISOString();
            this.saveMetadata();
        }

        return found;
    }

    /**
     * 删除图片元数据
     * @param {string} imageId - 图片ID
     */
    deleteImageMetadata(imageId) {
        if (!this.metadata || !this.metadata.images) {
            console.error('元数据未初始化');
            return false;
        }

        let found = false;
        Object.keys(this.metadata.images).forEach(category => {
            const images = this.metadata.images[category];
            const index = images.findIndex(img => img.id === imageId);
            
            if (index !== -1) {
                this.metadata.images[category].splice(index, 1);
                found = true;
            }
        });

        if (found) {
            this.metadata.lastUpdate = new Date().toISOString();
            this.saveMetadata();
        }

        return found;
    }

    /**
     * 保存元数据到服务器
     */
    async saveMetadata() {
        try {
            // 先保存到localStorage作为备份
            localStorage.setItem('site_images_metadata', JSON.stringify(this.metadata));
            
            // 尝试通过API保存到服务器
            const response = await fetch('/api/save-metadata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.metadata)
            });
            
            if (response.ok) {
                console.log('✓ 元数据已自动保存到服务器');
                return true;
            } else {
                console.warn('后端API不可用，使用localStorage备份');
                // 降级：仍然返回true，因为localStorage已保存
                return true;
            }
        } catch (error) {
            // API不可用时不报错，使用localStorage
            console.log('使用本地存储（后端API未启动）');
            return true;
        }
    }

    /**
     * 导出元数据文件
     */
    exportMetadata() {
        const dataStr = JSON.stringify(this.metadata, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'site-images-metadata.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('元数据已导出');
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        if (!this.metadata || !this.metadata.images) {
            return { total: 0, byCategory: {} };
        }

        const stats = {
            total: 0,
            byCategory: {}
        };

        Object.keys(this.metadata.images).forEach(category => {
            const count = this.metadata.images[category].length;
            stats.byCategory[category] = count;
            stats.total += count;
        });

        return stats;
    }
}

// 创建全局实例
const siteSyncManager = new SiteSyncManager();

// 导出到全局作用域
window.SiteSyncManager = SiteSyncManager;
window.siteSyncManager = siteSyncManager;

