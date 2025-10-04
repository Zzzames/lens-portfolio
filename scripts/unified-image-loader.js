/**
 * 统一图片加载器
 * 整合了 simple-image-loader.js 和 optimized-image-loader.js 的优点
 * 提供高性能、稳定性和用户友好的图片加载体验
 */

class UnifiedImageLoader {
    constructor() {
        // 图片分类配置
        this.categories = {
            'street': { prefix: 'street', name: '街头掠影' },
            'documentary': { prefix: 'doc', name: '人文纪实' },
            'nature': { prefix: 'nature', name: '自然风光' },
            'cityscape': { prefix: 'city', name: '城市风光' },
            'stilllife': { prefix: 'still', name: '静物时光' },
            'portrait': { prefix: 'portrait', name: '人像摄影' },
            'animals': { prefix: 'animals', name: '动物摄影' }
        };

        // 元数据存储（从JSON文件加载）
        this.metadataCache = null;
        this.metadataLoaded = false;

        // 获取配置（延迟获取，确保配置文件已加载）
        this.config = this.getDefaultConfig();
        
        // 延迟获取用户配置
        setTimeout(() => {
            if (window.getImageLoadingConfig) {
                this.config = window.getImageLoadingConfig();
                this.log('已加载用户配置:', this.config);
            } else {
                this.log('使用默认配置:', this.config);
            }
        }, 100);

        // 初始化状态变量
        this.batchSize = this.config.imagesPerPage || 12; // 增加每批加载数量
        this.currentBatch = 0; // 当前批次
        this.allImages = [];
        this.currentCategory = '';
        this.imageCache = new Map(); // 图片缓存
        this.loadingQueue = new Set(); // 加载队列，避免重复加载
        this.loadedImagesCount = 0;
        this.totalImagesCount = 0;
        this.isLoadingMore = false; // 是否正在加载更多
        this.hasMoreImages = true; // 是否还有更多图片
        this.loadedImageIndexes = new Set(); // 已加载的图片索引
        
        // 虚拟滚动相关
        this.visibleRange = { start: 0, end: 12 }; // 可见范围
        this.renderBuffer = 6; // 渲染缓冲区

        // 从配置获取性能参数
        this.LOAD_TIMEOUT = this.config.loadTimeout;
        this.CONCURRENT_LIMIT = 6; // 增加并发限制
        this.RETRY_COUNT = this.config.retryCount;
        this.LAZY_LOAD_THRESHOLD = 400; // 增加预加载阈值

        // 初始化懒加载观察器
        this.initIntersectionObserver();
        
        // 初始化无限滚动观察器
        this.initInfiniteScrollObserver();
        
        // 初始化灯箱
        this.initLightbox();
        
        this.log('UnifiedImageLoader 初始化完成');
    }

    /**
     * 获取默认配置（当配置文件不存在时使用）
     */
    getDefaultConfig() {
        return {
            imagesPerPage: 3,
            maxImageCheck: 50,
            loadTimeout: 5000,
            concurrentLimit: 3,
            retryCount: 2,
            batchSize: 5,
            checkTimeout: 2000,
            lazyLoadThreshold: 200,
            supportedFormats: ['webp', 'jpg', 'jpeg', 'png'],
            enableDebugLog: false,
            showLoadingIndicator: true,
            enableImageCache: true,
            skeletonDelay: 100,
            fadeInDuration: 300,
            showErrorPlaceholder: true,
            enableRetry: true,
            cacheExpireTime: 300000,
            enablePreload: true,
            preloadNextPage: false,
            // 新增检测优化配置
            maxConsecutiveEmptyBatches: 3, // 最大连续空批次
            maxImagesPerCategory: 500, // 每个分类最大图片数量
            adaptiveBatchSize: true, // 是否启用自适应批量大小
            detectionCacheExpireTime: 300000, // 检测结果缓存过期时间
            mobileOptimization: {
                enabled: true,
                imagesPerPage: 6,
                concurrentLimit: 2,
                loadTimeout: 8000
            }
        };
    }

    /**
     * 日志记录（可配置）
     */
    log(...args) {
        if (this.config.enableDebugLog) {
            console.log('[UnifiedImageLoader]', ...args);
        }
    }

    /**
     * 错误日志记录
     */
    logError(...args) {
        console.error('[UnifiedImageLoader]', ...args);
    }

    /**
     * 初始化 Intersection Observer 用于懒加载（优化版）
     */
    initIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        // 检查图片是否已经加载过
                        if (!img.classList.contains('loaded') && !img.classList.contains('loading')) {
                            this.loadImageWithFallback(img);
                        }
                        // 不取消观察，以便在滚动回来时能够保持加载状态
                        // this.observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: `${this.LAZY_LOAD_THRESHOLD}px`,
                // 添加阈值，提高响应性
                threshold: 0.01
            });
        } else {
            this.log('IntersectionObserver 不支持，将使用降级方案');
        }
    }

    /**
     * 初始化无限滚动观察器
     */
    initInfiniteScrollObserver() {
        if ('IntersectionObserver' in window) {
            // 创建用于检测滚动到底部的观察器
            this.scrollObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.isLoadingMore && this.hasMoreImages) {
                        this.log('滚动触发器被激活，开始加载更多图片');
                        this.loadMoreImages();
                    }
                });
            }, {
                rootMargin: '300px' // 提前300px开始加载，提供更流畅的体验
            });
            
            this.log('无限滚动观察器已初始化');
        } else {
            this.log('IntersectionObserver 不支持，将使用滚动事件监听');
            // 降级方案：使用滚动事件
            this.initScrollEventListener();
        }
    }

    /**
     * 初始化滚动事件监听（降级方案）
     */
    initScrollEventListener() {
        let throttleTimer = null;
        
        window.addEventListener('scroll', () => {
            if (throttleTimer) return;
            
            throttleTimer = setTimeout(() => {
                const scrollPosition = window.innerHeight + window.scrollY;
                const documentHeight = document.documentElement.offsetHeight;
                
                // 当滚动到距离底部500px时触发加载，提供更早的触发点
                if (scrollPosition >= documentHeight - 500 && !this.isLoadingMore && this.hasMoreImages) {
                    this.log('滚动事件触发，开始加载更多图片');
                    this.loadMoreImages();
                }
                
                throttleTimer = null;
            }, 100); // 减少节流时间到100ms，提高响应性
        });
        
        this.log('已使用滚动事件监听作为降级方案');
    }

    /**
     * 初始化灯箱功能
     */
    initLightbox() {
        // 检查是否已有全局灯箱函数
        if (!window.openLightbox) {
            window.openLightbox = (element) => {
                this.createLightbox(element);
            };
        }
    }

    /**
     * 创建灯箱
     */
    createLightbox(element) {
        // 获取图片信息
        const img = element.querySelector('img') || element;
        const title = element.dataset.title || img.alt || '';
        const description = element.dataset.description || '';
        
        // 创建灯箱元素
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.4s ease;
        `;

        // 创建灯箱内容
        const lightboxContent = document.createElement('div');
        lightboxContent.className = 'lightbox-content';
        lightboxContent.style.cssText = `
            max-width: 90vw;
            max-height: 90vh;
            text-align: center;
            position: relative;
        `;

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: -40px;
            right: 0;
            background: none;
            border: none;
            color: white;
            font-size: 30px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // 创建图片元素
        const lightboxImg = document.createElement('img');
        lightboxImg.src = img.src || img.dataset.src;
        lightboxImg.alt = title;
        lightboxImg.style.cssText = `
            max-width: 100%;
            max-height: 80vh;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
        `;

        // 创建标题和描述（只在有内容时显示）
        const titleElement = title ? `<div class="lightbox-title" style="color: white; margin-top: 20px; font-size: 24px; font-family: 'Bodoni Moda', serif;">${title}</div>` : '';
        const descriptionElement = description ? `<div class="lightbox-description" style="color: #ccc; margin-top: 10px; font-size: 16px;">${description}</div>` : '';

        // 组装灯箱内容
        lightboxContent.innerHTML = `
            ${titleElement}
            ${descriptionElement}
        `;
        lightboxContent.appendChild(lightboxImg);
        lightboxContent.appendChild(closeButton);
        lightbox.appendChild(lightboxContent);
        document.body.appendChild(lightbox);

        // 禁止背景滚动
        document.body.style.overflow = 'hidden';

        // 显示灯箱
        requestAnimationFrame(() => {
            lightbox.style.opacity = '1';
        });

        // 关闭灯箱函数
        const closeLightbox = () => {
            lightbox.style.opacity = '0';
            document.body.style.overflow = 'auto';
            setTimeout(() => {
                if (document.body.contains(lightbox)) {
                    document.body.removeChild(lightbox);
                }
            }, 400);
        };

        // 事件监听
        closeButton.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeLightbox();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    /**
     * 获取图片基础路径
     */
    getImageBasePath() {
        const currentPath = window.location.pathname;
        const basePath = currentPath.includes('/pages/') ? '../images' : 'images';
        this.log(`当前路径: ${currentPath}, 图片基础路径: ${basePath}`);
        return basePath;
    }

    /**
     * 快速检测图片存在性 - 使用 HEAD 请求（优化版）
     */
    async quickImageCheck(imagePath) {
        const cacheKey = `check_${imagePath}`;
        
        // 检查缓存
        if (this.imageCache.has(cacheKey)) {
            const cachedResult = this.imageCache.get(cacheKey);
            // 对于不存在图片的缓存，保留更长时间以减少重复请求
            if (cachedResult === false) {
                this.log(`使用缓存(不存在): ${imagePath}`);
                return false;
            } else if (cachedResult && cachedResult.timestamp) {
                // 对于存在图片的缓存，检查是否过期
                const cacheExpireTime = this.config.detectionCacheExpireTime || this.config.cacheExpireTime;
                if (Date.now() - cachedResult.timestamp < cacheExpireTime) {
                    this.log(`使用缓存(存在): ${imagePath}`);
                    return true;
                }
            }
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.checkTimeout);

            const response = await fetch(imagePath, {
                method: 'HEAD',
                signal: controller.signal,
                cache: 'force-cache'
            });

            clearTimeout(timeoutId);
            const exists = response.ok;
            
            // 缓存结果，对存在和不存在图片使用不同的缓存策略
            if (exists) {
                this.imageCache.set(cacheKey, {
                    exists: true,
                    timestamp: Date.now()
                });
            } else {
                // 不存在的图片缓存更长时间，减少重复404请求
                this.imageCache.set(cacheKey, false);
            }
            
            return exists;
        } catch (error) {
            // 请求失败也缓存为不存在，避免重复请求
            this.imageCache.set(cacheKey, false);
            return false;
        }
    }

    /**
     * 优先从元数据加载所有图片（随机排布）
     */
    async detectImagesOptimized(category) {
        if (!this.categories[category]) {
            this.logError(`未知分类: ${category}`);
            return [];
        }

        const imageBasePath = this.getImageBasePath();
        let existingImages = [];

        this.log(`开始检测 ${category} 分类图片`);
        
        // 显示即时加载状态
        this.showLoadingState();

        // 优先从元数据加载所有已知图片
        if (this.metadataCache && this.metadataCache.images && this.metadataCache.images[category]) {
            const metadataImages = this.metadataCache.images[category];
            this.log(`从元数据加载 ${metadataImages.length} 张图片`);
            
            // 验证每张图片是否存在
            const verifyPromises = metadataImages.map(async (img) => {
                // 转换路径格式
                let imagePath = img.path;
                if (imagePath.startsWith('../')) {
                    imagePath = imagePath.substring(3); // 移除 '../'
                }
                const fullPath = `${imageBasePath}/${imagePath.replace('images/', '')}`;
                
                const exists = await this.quickImageCheck(fullPath);
                if (exists) {
                    return {
                        path: fullPath,
                        number: img.number || 0,
                        title: img.title || '',
                        description: img.description || '',
                        filename: img.filename || ''
                    };
                }
                return null;
            });
            
            const verifiedImages = (await Promise.all(verifyPromises)).filter(img => img !== null);
            
            // 随机打乱图片顺序
            existingImages = this.shuffleArray(verifiedImages);
            
            this.log(`✓ 验证完成，找到 ${existingImages.length} 张有效图片（已随机排布）`);
            
            // 如果从元数据中找到了图片，立即渲染
            if (existingImages.length > 0) {
                this.allImages = existingImages;
                if (this.currentBatch === 0) {
                    this.renderInitialImages();
                }
                
                // 缓存结果
                const cacheKey = `detect_${category}_${imageBasePath}`;
                this.imageCache.set(cacheKey, {
                    images: existingImages,
                    timestamp: Date.now()
                });
                
                return existingImages;
            }
        }

        // 如果元数据中没有图片，返回空数组
        this.log(`元数据中没有找到 ${category} 分类的图片`);
        return existingImages;
    }
    
    /**
     * 随机打乱数组（Fisher-Yates 算法）
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * 传统的文件系统扫描方法（已废弃，不再使用）
     * 现在所有图片都通过元数据管理，支持任意命名
     */
    async detectImagesByFileSystem(category) {
        this.log('文件系统扫描方法已废弃，所有图片通过元数据加载');
        return [];
        
        // 初始化检测状态
        let consecutiveEmptyBatches = 0; // 连续空批次计数
        const maxConsecutiveEmptyBatches = this.config.maxConsecutiveEmptyBatches || 3; // 最大连续空批次
        let lastFoundIndex = -1; // 最后找到的图片索引
        let adaptiveBatchSize = batchSize; // 自适应批量大小
        const maxImagesPerCategory = this.config.maxImagesPerCategory || 50; // 每个分类最大图片数量
        
        // 检测结果缓存键
        const cacheKey = `detect_${category}_${imageBasePath}`;
        
        // 检查是否有缓存的结果
        if (this.imageCache.has(cacheKey)) {
            const cachedResult = this.imageCache.get(cacheKey);
            const cacheExpireTime = this.config.detectionCacheExpireTime || this.config.cacheExpireTime;
            if (cachedResult && cachedResult.timestamp && (Date.now() - cachedResult.timestamp < cacheExpireTime)) {
                this.log(`使用缓存的检测结果: ${cachedResult.images.length} 张图片`);
                return cachedResult.images;
            }
        }
        
        this.log(`检测参数: maxCheck=${maxCheck}, initialBatchSize=${batchSize}, imageBasePath=${imageBasePath}`);

        for (let i = 0; i < maxCheck; i += adaptiveBatchSize) {
            if (this.currentCategory !== category) break; // 用户切换了页面

            const batch = [];
            for (let j = i; j < Math.min(i + adaptiveBatchSize, maxCheck); j++) {
                const imageNumber = (j + 1).toString().padStart(2, '0');
                const imagePath = `${imageBasePath}/${category}/${prefix}-${imageNumber}.webp`;
                batch.push({ path: imagePath, number: j + 1 });
                if (j < 3) { // 只打印前3个路径作为示例
                    this.log(`检测图片路径示例: ${imagePath}`);
                }
            }

            // 并行检测这一批图片
            const results = await Promise.allSettled(
                batch.map(async ({ path, number }) => {
                    const exists = await this.quickImageCheck(path);
                    return { exists, path, number };
                })
            );

            // 处理结果
            let foundInBatch = false;
            let foundCount = 0;
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value.exists) {
                    foundInBatch = true;
                    foundCount++;
                    lastFoundIndex = Math.max(lastFoundIndex, result.value.number);
                    
                    // 检查是否已经在元数据中找到此图片
                    const alreadyExists = existingImages.some(img => img.path === result.value.path);
                    if (!alreadyExists) {
                        // 优先从元数据获取标题和描述
                        const metadata = this.getImageMetadata(category, result.value.number);
                        const imageData = {
                            path: result.value.path,
                            number: result.value.number,
                            title: (metadata && metadata.title) || this.generateTitle(category, result.value.number),
                            description: (metadata && metadata.description) || this.generateDescription(category, result.value.number)
                        };
                        existingImages.push(imageData);
                    }
                }
            });

            // 实时更新界面
            if (foundInBatch) {
                this.allImages = existingImages;
                consecutiveEmptyBatches = 0; // 重置连续空批次计数
                
                // 检测完成后，渲染第一批图片
                if (this.currentBatch === 0) {
                    this.renderInitialImages();
                }
                
                // 动态调整批量大小：如果找到的图片多，增加批量大小
                if (this.config.adaptiveBatchSize && foundCount === adaptiveBatchSize && adaptiveBatchSize < 15) {
                    adaptiveBatchSize = Math.min(adaptiveBatchSize + 2, 15);
                    this.log(`增加批量大小到: ${adaptiveBatchSize}`);
                }
            } else {
                consecutiveEmptyBatches++;
                this.log(`连续空批次: ${consecutiveEmptyBatches}/${maxConsecutiveEmptyBatches}`);
                
                // 动态调整批量大小：如果没找到图片，减少批量大小
                if (this.config.adaptiveBatchSize && adaptiveBatchSize > 3) {
                    adaptiveBatchSize = Math.max(adaptiveBatchSize - 1, 3);
                    this.log(`减少批量大小到: ${adaptiveBatchSize}`);
                }
            }

            // 智能终止条件：
            // 1. 连续多个空批次
            // 2. 最后找到图片后已经检测了足够多的图片
            // 3. 已经找到足够多的图片
            const shouldStop =
                consecutiveEmptyBatches >= maxConsecutiveEmptyBatches ||
                (lastFoundIndex > 0 && i - lastFoundIndex > 10) ||
                existingImages.length >= maxImagesPerCategory;
                
            if (shouldStop) {
                this.log(`提前终止检测: 连续空批次=${consecutiveEmptyBatches}, 最后找到索引=${lastFoundIndex}, 当前索引=${i}`);
                break;
            }

            // 给浏览器喘息时间，根据找到的图片数量调整
            const restTime = foundInBatch ? 30 : 100; // 找到图片时休息时间更短
            await new Promise(resolve => setTimeout(resolve, restTime));
        }

        // 缓存检测结果
        this.imageCache.set(cacheKey, {
            images: existingImages,
            timestamp: Date.now()
        });

        this.log(`检测完成，${category} 分类共有 ${existingImages.length} 张图片`);
        return existingImages;
    }

    /**
     * 显示加载状态
     */
    showLoadingState() {
        const photoGrid = document.querySelector('.photo-grid');
        if (!photoGrid) return;

        // 立即显示骨架屏
        const skeletonHTML = Array(this.batchSize).fill(0).map(() => `
            <div class="photo-item skeleton">
                <div class="skeleton-image"></div>
                <div class="skeleton-text">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            </div>
        `).join('');

        photoGrid.innerHTML = skeletonHTML;
    }

    /**
     * 渲染第一批图片
     */
    renderInitialImages() {
        const photoGrid = document.querySelector('.photo-grid');
        if (!photoGrid) return;

        // 清空现有内容
        photoGrid.innerHTML = '';
        
        // 加载第一批图片
        this.loadMoreImages();
    }

    /**
     * 加载更多图片
     */
    async loadMoreImages() {
        if (this.isLoadingMore || !this.hasMoreImages) return;
        
        this.isLoadingMore = true;
        this.showLoadingIndicator();
        
        const startIndex = this.currentBatch * this.batchSize;
        const endIndex = Math.min(startIndex + this.batchSize, this.allImages.length);
        
        // 检查是否还有更多图片
        if (startIndex >= this.allImages.length) {
            this.hasMoreImages = false;
            this.hideLoadingIndicator();
            this.isLoadingMore = false;
            return;
        }
        
        // 获取当前批次的图片
        const currentBatchImages = this.allImages.slice(startIndex, endIndex);
        
        // 渲染新图片
        await this.renderImageBatch(currentBatchImages, startIndex);
        
        this.currentBatch++;
        this.isLoadingMore = false;
        this.hideLoadingIndicator();
        
        // 如果这是第一批图片，设置无限滚动触发器
        if (this.currentBatch === 1) {
            this.setupScrollTrigger();
        }
    }

    /**
     * 渲染图片批次
     */
    async renderImageBatch(images, startIndex) {
        const photoGrid = document.querySelector('.photo-grid');
        if (!photoGrid) return;

        // 创建文档片段以提高性能
        const fragment = document.createDocumentFragment();
        
        images.forEach((imageData, index) => {
            const actualIndex = startIndex + index;
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            photoItem.dataset.index = actualIndex;
            photoItem.onclick = () => window.openLightbox(photoItem);
            photoItem.dataset.title = imageData.title || '';
            photoItem.dataset.description = imageData.description || '';
            
            const img = document.createElement('img');
            img.dataset.src = imageData.path;
            img.alt = imageData.title || '';
            img.className = 'lazy-image';
            img.loading = 'lazy';
            
            const overlay = document.createElement('div');
            overlay.className = 'photo-overlay';
            
            if (imageData.title) {
                const title = document.createElement('h3');
                title.textContent = imageData.title;
                overlay.appendChild(title);
            }
            
            if (imageData.description) {
                const description = document.createElement('p');
                description.textContent = imageData.description;
                overlay.appendChild(description);
            }
            
            photoItem.appendChild(img);
            photoItem.appendChild(overlay);
            fragment.appendChild(photoItem);
        });
        
        // 添加到DOM
        photoGrid.appendChild(fragment);
        
        // 启动懒加载
        this.initLazyLoading();
    }

    /**
     * 设置滚动触发器
     */
    setupScrollTrigger() {
        // 移除旧的触发元素（如果存在）
        const oldTrigger = document.querySelector('.scroll-trigger');
        if (oldTrigger && oldTrigger.parentNode) {
            oldTrigger.parentNode.removeChild(oldTrigger);
        }
        
        // 创建触发元素
        const trigger = document.createElement('div');
        trigger.className = 'scroll-trigger';
        trigger.style.cssText = `
            height: 1px;
            width: 100%;
            margin-top: -1px;
            visibility: hidden;
        `;
        
        const photoGrid = document.querySelector('.photo-grid');
        if (photoGrid) {
            photoGrid.appendChild(trigger);
            
            // 观察触发元素
            if (this.scrollObserver) {
                this.scrollObserver.observe(trigger);
                this.log('滚动触发器已设置并开始观察');
            }
        }
    }

    /**
     * 显示加载指示器（仅显示动画，不显示文字）
     */
    showLoadingIndicator() {
        let indicator = document.querySelector('.infinite-scroll-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'infinite-scroll-indicator';
            indicator.style.cssText = `
                text-align: center;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.6;
            `;
            
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            spinner.style.cssText = `
                width: 20px;
                height: 20px;
                border: 2px solid rgba(212, 184, 150, 0.3);
                border-top: 2px solid var(--burberry-beige);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            `;
            
            indicator.appendChild(spinner);
            
            const photoGrid = document.querySelector('.photo-grid');
            if (photoGrid) {
                photoGrid.appendChild(indicator);
            }
        }
    }

    /**
     * 隐藏加载指示器
     */
    hideLoadingIndicator() {
        const indicator = document.querySelector('.infinite-scroll-indicator');
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }

    /**
     * 显示所有图片加载完成消息（已禁用）
     */
    showAllImagesLoadedMessage() {
        // 不显示任何消息，静默结束
        return;
    }

    /**
     * 初始化懒加载（优化版）
     */
    initLazyLoading() {
        const lazyImages = document.querySelectorAll('.lazy-image');

        if (this.observer) {
            // 使用 Intersection Observer
            lazyImages.forEach(img => {
                // 检查图片是否已经加载过
                if (!img.classList.contains('loaded')) {
                    this.observer.observe(img);
                }
            });
        } else {
            // 降级方案：立即加载可见图片
            lazyImages.forEach(img => {
                if (!img.classList.contains('loaded')) {
                    this.loadImageWithFallback(img);
                }
            });
        }
    }

    /**
     * 带降级的图片加载（优化缓存版）
     */
    async loadImageWithFallback(imgElement) {
        const originalSrc = imgElement.dataset.src;
        if (!originalSrc) return;

        // 检查是否已经在加载队列中
        if (this.loadingQueue.has(originalSrc)) {
            this.log(`图片已在加载队列中: ${originalSrc}`);
            return;
        }

        // 检查图片是否已经加载过
        if (imgElement.classList.contains('loaded')) {
            this.log(`图片已加载: ${originalSrc}`);
            return;
        }

        // 检查缓存中是否有该图片
        const cacheKey = `img_${originalSrc}`;
        if (this.imageCache.has(cacheKey)) {
            const cachedData = this.imageCache.get(cacheKey);
            if (cachedData && (cachedData.loaded || cachedData.exists)) {
                this.log(`使用缓存图片: ${originalSrc}`);
                imgElement.src = cachedData.src || originalSrc;
                imgElement.classList.remove('loading');
                imgElement.classList.add('loaded');
                this.loadedImagesCount++;
                return;
            }
        }

        this.loadingQueue.add(originalSrc);
        imgElement.classList.add('loading');

        try {
            // 尝试加载原图片
            await this.loadImageWithTimeout(imgElement, originalSrc);
            imgElement.classList.remove('loading');
            imgElement.classList.add('loaded');
            this.loadedImagesCount++;
            
            // 将加载成功的图片存入缓存
            this.imageCache.set(cacheKey, {
                src: originalSrc,
                loaded: true,
                exists: true,
                timestamp: Date.now()
            });
            
            // 更新加载指示器
            this.updateLoadingIndicator();
        } catch (error) {
            this.logError(`图片加载失败: ${originalSrc}`, error);

            // 尝试降级格式
            const fallbackSrc = await this.tryFallbackFormats(originalSrc);
            if (fallbackSrc) {
                try {
                    await this.loadImageWithTimeout(imgElement, fallbackSrc);
                    imgElement.classList.remove('loading');
                    imgElement.classList.add('loaded');
                    this.loadedImagesCount++;
                    
                    // 将加载成功的降级图片存入缓存
                    this.imageCache.set(cacheKey, {
                        src: fallbackSrc,
                        loaded: true,
                        exists: true,
                        timestamp: Date.now()
                    });
                } catch (fallbackError) {
                    this.showImageError(imgElement);
                }
            } else {
                this.showImageError(imgElement);
            }
        } finally {
            this.loadingQueue.delete(originalSrc);
        }
    }

    /**
     * 带超时的图片加载
     */
    loadImageWithTimeout(imgElement, src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timeoutId = setTimeout(() => {
                reject(new Error('图片加载超时'));
            }, this.LOAD_TIMEOUT);

            img.onload = () => {
                clearTimeout(timeoutId);
                imgElement.src = src;
                
                // 添加GPU加速的淡入动画
                imgElement.style.opacity = '0';
                imgElement.style.transform = 'translateZ(0)'; // GPU加速
                imgElement.style.willChange = 'opacity';
                
                requestAnimationFrame(() => {
                    imgElement.style.transition = `opacity ${this.config.fadeInDuration}ms ease`;
                    imgElement.style.opacity = '1';
                });
                
                resolve();
            };

            img.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error('图片加载失败'));
            };

            img.src = src;
        });
    }

    /**
     * 尝试降级格式
     */
    async tryFallbackFormats(originalPath) {
        const basePath = originalPath.replace(/\.[^.]+$/, '');
        const fallbackFormats = ['jpg', 'jpeg', 'png'];

        for (const format of fallbackFormats) {
            const fallbackPath = `${basePath}.${format}`;
            const exists = await this.quickImageCheck(fallbackPath);
            if (exists) return fallbackPath;
        }

        return null;
    }

    /**
     * 显示图片错误状态
     */
    showImageError(imgElement) {
        imgElement.classList.remove('loading');
        imgElement.classList.add('error');
        imgElement.alt = '图片加载失败';

        // 创建错误占位符
        const errorDiv = document.createElement('div');
        errorDiv.className = 'image-error';
        errorDiv.innerHTML = `
            <div class="error-icon">📷</div>
            <div class="error-text">图片暂时无法加载</div>
        `;

        imgElement.parentNode.insertBefore(errorDiv, imgElement);
        imgElement.style.display = 'none';
    }

    /**
     * 更新加载指示器（已禁用文字提示）
     */
    updateLoadingIndicator() {
        // 禁用加载进度文字提示，只保留内部计数逻辑
        if (!this.config.showLoadingIndicator) return;
        
        // 仅保留内部状态更新，不显示任何UI元素
        return;
    }


    /**
     * 显示空状态
     */
    showEmptyState() {
        const photoGrid = document.querySelector('.photo-grid');
        if (photoGrid) {
            photoGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📷</div>
                    <h3>暂无图片</h3>
                    <p>该分类下暂时没有图片内容</p>
                </div>
            `;
        }
    }

    /**
     * 显示错误状态
     */
    showErrorState(error) {
        const photoGrid = document.querySelector('.photo-grid');
        if (photoGrid) {
            photoGrid.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>加载失败</h3>
                    <p>图片加载遇到问题: ${error.message}</p>
                    <button onclick="location.reload()" class="retry-btn">重试</button>
                </div>
            `;
        }
    }

    /**
     * 加载元数据JSON文件
     */
    async loadMetadata() {
        if (this.metadataLoaded) {
            return this.metadataCache;
        }

        try {
            // 添加时间戳防止缓存
            const metadataPath = this.getImageBasePath().replace('images', 'data') + '/../data/site-images-metadata.json?t=' + new Date().getTime();
            this.log(`尝试加载元数据: ${metadataPath}`);
            
            const response = await fetch(metadataPath);
            if (response.ok) {
                this.metadataCache = await response.json();
                this.metadataLoaded = true;
                this.log('✓ 元数据加载成功，包含', Object.keys(this.metadataCache.images || {}).length, '个分类');
                
                // 打印每个分类的图片数量
                if (this.metadataCache.images) {
                    Object.keys(this.metadataCache.images).forEach(cat => {
                        this.log(`  - ${cat}: ${this.metadataCache.images[cat].length} 张图片`);
                    });
                }
                
                return this.metadataCache;
            } else {
                this.log('元数据文件不存在，使用默认数据');
                return null;
            }
        } catch (error) {
            this.log('加载元数据失败，使用默认数据:', error.message);
            return null;
        }
    }

    /**
     * 从元数据获取图片信息
     */
    getImageMetadata(category, number) {
        if (!this.metadataCache || !this.metadataCache.images) {
            return null;
        }

        const categoryImages = this.metadataCache.images[category];
        if (!categoryImages || !Array.isArray(categoryImages)) {
            return null;
        }

        // 查找匹配的图片
        return categoryImages.find(img => img.number === number);
    }

    /**
     * 初始化画廊
     */
    async initializeGallery(category) {
        this.currentCategory = category;
        this.currentBatch = 0; // 重置批次
        this.loadedImagesCount = 0;
        this.totalImagesCount = 0;
        this.isLoadingMore = false;
        this.hasMoreImages = true;
        this.loadedImageIndexes.clear();

        this.log(`开始初始化 ${category} 画廊...`);
        
        // 加载元数据
        await this.loadMetadata();
        
        // 确保配置已加载
        if (window.getImageLoadingConfig) {
            this.config = window.getImageLoadingConfig();
            this.log('使用用户配置:', this.config);
        } else {
            this.log('使用默认配置:', this.config);
        }

        // 应用移动端优化
        this.applyMobileOptimization();

        // 立即显示骨架屏
        this.showLoadingState();

        try {
            // 检测并加载图片
            this.allImages = await this.detectImagesOptimized(category);
            this.totalImagesCount = this.allImages.length;

            // 如果没有图片，显示空状态
            if (this.allImages.length === 0) {
                this.showEmptyState();
            }

        } catch (error) {
            this.logError('初始化画廊失败:', error);
            this.showErrorState(error);
        }
    }

    /**
     * 应用移动端优化
     */
    applyMobileOptimization() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile && this.config.mobileOptimization.enabled) {
            const mobileConfig = this.config.mobileOptimization;
            
            // 应用移动端配置
            this.batchSize = mobileConfig.imagesPerPage;
            this.CONCURRENT_LIMIT = mobileConfig.concurrentLimit;
            this.LOAD_TIMEOUT = mobileConfig.loadTimeout;
            
            this.log('已应用移动端优化配置');
        } else {
            this.batchSize = this.config.imagesPerPage;
            this.CONCURRENT_LIMIT = this.config.concurrentLimit;
            this.LOAD_TIMEOUT = this.config.loadTimeout;
        }
        
        // 确保批量大小至少为9，提供更好的用户体验
        if (this.batchSize < 9) {
            this.batchSize = 9;
        }
    }

    // 标题和描述生成方法（使用完整的真实数据）
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
}

// 创建全局实例
window.unifiedLoader = new UnifiedImageLoader();
console.log('UnifiedImageLoader 全局实例已创建');