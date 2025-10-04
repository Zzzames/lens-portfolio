/**
 * 增强版图片管理器
 * 整合了网站同步功能，支持读取和管理主网站图片
 */

class EnhancedImageManager {
    constructor() {
        this.images = [];
        this.currentView = 'list'; // 默认使用列表视图
        this.selectedImages = new Set();
        this.currentFilter = {
            category: '',
            search: ''
        };
        this.isInitialized = false;
        this.isSyncing = false;
        this.syncManager = window.siteSyncManager;
        
        // 分页相关
        this.currentPage = 1;
        this.itemsPerPage = 100; // 进一步增加每页显示数量
        this.isLoadingMore = false;
        
        // 性能优化
        this.imageCache = new Map(); // 图片缓存
        this.observedImages = new Set(); // 已观察的图片
        this.intersectionObserver = null; // 图片懒加载观察器
        this.renderDebounceTimer = null; // 渲染防抖定时器
        this.scrollThrottleTimer = null; // 滚动节流定时器
    }

    /**
     * 初始化管理器
     */
    async init() {
        try {
            adminUtils.showLoading('正在初始化图片管理器...');
            
            // 初始化同步管理器
            if (this.syncManager && !this.syncManager.isInitialized) {
                await this.syncManager.init();
            }
            
            // 加载图片数据
            await this.loadImages();
            
            // 设置界面
            this.setupEventListeners();
            this.setupFilterBar();
            this.setupBatchActions();
            this.setupBackupRestore();
            this.setupSyncButton();
            this.updateStats();
            
            this.isInitialized = true;
            adminUtils.hideLoading();
            console.log('增强版图片管理器初始化成功');
            
            return true;
        } catch (error) {
            console.error('初始化失败:', error);
            adminUtils.hideLoading();
            adminUtils.showToast('初始化失败: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * 设置上传区域
     */
    setupUploadArea() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const uploadBtn = document.getElementById('upload-btn');
        
        // 点击上传按钮
        uploadBtn?.addEventListener('click', () => {
            fileInput?.click();
        });
        
        // 点击上传区域
        uploadArea?.addEventListener('click', (e) => {
            if (e.target === uploadArea || e.target.closest('.upload-content')) {
                fileInput?.click();
            }
        });
        
        // 文件选择
        fileInput?.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                this.handleFileUpload(Array.from(files));
            }
        });
        
        // 拖拽上传
        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea?.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                this.handleFileUpload(Array.from(files));
            }
        });
    }
    
    /**
     * 处理文件上传
     */
    async handleFileUpload(files) {
        console.log('准备上传文件:', files);
        
        // 过滤只保留图片文件
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            adminUtils.showToast('请选择图片文件', 'warning');
            return;
        }
        
        // 显示上传对话框
        this.showUploadDialog(imageFiles);
    }

    /**
     * 显示上传对话框
     */
    showUploadDialog(files) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content upload-modal">
                <div class="modal-header">
                    <h3>上传图片 (${files.length} 个文件)</h3>
                    <button class="modal-close" id="close-upload-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="upload-form">
                        <div class="form-group">
                            <label>选择分类</label>
                            <select id="upload-category" required>
                                <option value="">请选择分类</option>
                                <option value="street">街头摄影</option>
                                <option value="documentary">人文纪实</option>
                                <option value="nature">自然风光</option>
                                <option value="cityscape">城市风光</option>
                                <option value="stilllife">静物时光</option>
                                <option value="portrait">人像摄影</option>
                                <option value="animals">动物摄影</option>
                            </select>
                        </div>
                        <div class="upload-files-list" id="upload-files-list"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancel-upload">取消</button>
                    <button class="btn-primary" id="confirm-upload">开始上传</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 显示模态框
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        // 添加拖动功能
        this.makeModalDraggable(modal.querySelector('.upload-modal'));
        
        // 渲染文件列表
        const filesList = document.getElementById('upload-files-list');
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'upload-file-item';
            fileItem.innerHTML = `
                <div class="file-preview">
                    <img src="${URL.createObjectURL(file)}" alt="${file.name}">
                </div>
                <div class="file-info">
                    <div class="form-group">
                        <label>文件名</label>
                        <input type="text" class="file-title" value="${file.name.replace(/\.[^/.]+$/, '')}" data-index="${index}">
                    </div>
                    <div class="form-group">
                        <label>描述</label>
                        <input type="text" class="file-description" placeholder="输入图片描述" data-index="${index}">
                    </div>
                </div>
            `;
            filesList.appendChild(fileItem);
        });
        
        // 绑定关闭事件
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);
        };
        
        document.getElementById('close-upload-modal').addEventListener('click', closeModal);
        document.getElementById('cancel-upload').addEventListener('click', closeModal);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        document.getElementById('confirm-upload').addEventListener('click', async () => {
            const category = document.getElementById('upload-category').value;
            
            if (!category) {
                adminUtils.showToast('请选择分类', 'warning');
                return;
            }
            
            // 收集文件信息
            const uploadData = files.map((file, index) => {
                const titleInput = document.querySelector(`.file-title[data-index="${index}"]`);
                const descInput = document.querySelector(`.file-description[data-index="${index}"]`);
                
                return {
                    file: file,
                    title: titleInput.value || file.name,
                    description: descInput.value || '',
                    category: category
                };
            });
            
            modal.remove();
            
            // 开始上传
            await this.uploadFiles(uploadData);
        });
    }

    /**
     * 使模态框可拖动
     */
    makeModalDraggable(modalElement) {
        const modalHeader = modalElement.querySelector('.modal-header');
        if (!modalHeader) return;
        
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;
        let xOffset = 0;
        let yOffset = 0;

        const dragStart = (e) => {
            // 只在标题栏拖动，排除关闭按钮
            if (e.target.classList.contains('modal-close')) {
                return;
            }
            
            if (e.target === modalHeader || e.target.tagName === 'H3') {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
                isDragging = true;
                modalElement.style.cursor = 'grabbing';
                modalHeader.style.cursor = 'grabbing';
            }
        };

        const drag = (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                
                setTranslate(currentX, currentY, modalElement);
            }
        };

        const dragEnd = (e) => {
            if (isDragging) {
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                modalElement.style.cursor = 'move';
                modalHeader.style.cursor = 'move';
            }
        };

        const setTranslate = (xPos, yPos, el) => {
            el.style.transform = `translate(calc(-50% + ${xPos}px), calc(-50% + ${yPos}px))`;
        };

        modalHeader.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        
        // 清理函数
        const cleanup = () => {
            modalHeader.removeEventListener('mousedown', dragStart);
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
        };
        
        // 当模态框被移除时清理事件监听
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    if (node === modalElement || node.contains(modalElement)) {
                        cleanup();
                        observer.disconnect();
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * 上传文件到服务器
     */
    async uploadFiles(uploadData) {
        adminUtils.showLoading('正在上传图片...');
        
        let successCount = 0;
        let failCount = 0;
        const uploadedImages = [];
        
        for (let i = 0; i < uploadData.length; i++) {
            const data = uploadData[i];
            
            try {
                // 更新进度
                const loadingText = document.querySelector('#loading-overlay p');
                if (loadingText) {
                    loadingText.textContent = `正在上传 ${i + 1}/${uploadData.length}: ${data.title}`;
                }
                
                // 创建 FormData
                const formData = new FormData();
                formData.append('image', data.file);
                formData.append('folder', data.category);
                
                // 上传图片
                const response = await fetch('http://localhost:8000/api/upload-image', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('上传失败');
                }
                
                const result = await response.json();
                console.log('上传成功:', result);
                
                // 记录上传的图片信息
                uploadedImages.push({
                    path: result.path,
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    filename: data.file.name
                });
                
                successCount++;
                
            } catch (error) {
                console.error('上传失败:', error);
                failCount++;
            }
        }
        
        adminUtils.hideLoading();
        
        if (failCount === 0) {
            adminUtils.showToast(`成功上传 ${successCount} 张图片`, 'success');
        } else {
            adminUtils.showToast(`上传完成: ${successCount} 成功, ${failCount} 失败`, 'warning');
        }
        
        // 保存图片元数据
        if (uploadedImages.length > 0) {
            await this.saveUploadedImagesMetadata(uploadedImages);
        }
        
        // 重新同步图片
        await this.syncWithSite();
    }

    /**
     * 保存上传图片的元数据
     */
    async saveUploadedImagesMetadata(uploadedImages) {
        try {
            // 获取当前元数据
            const metadata = this.syncManager.metadata;
            
            console.log('开始保存上传图片元数据，共', uploadedImages.length, '张');
            
            // 将上传的图片添加到元数据中
            uploadedImages.forEach(img => {
                const category = img.category;
                const filename = img.filename;
                const match = filename.match(/(\d+)/);
                const number = match ? parseInt(match[0]) : 0;
                
                console.log(`处理图片: ${filename}, 分类: ${category}, 编号: ${number}`);
                
                // 检查是否已存在
                const exists = metadata.images[category].find(item => 
                    item.path.includes(filename)
                );
                
                if (!exists) {
                    // 生成唯一ID
                    const id = `${category}_${number}_${Date.now()}`;
                    
                    const newImage = {
                        id: id,
                        filename: filename,
                        path: `../images/${category}/${filename}`,
                        category: category,
                        number: number,
                        title: img.title,
                        description: img.description,
                        uploadDate: new Date().toISOString(),
                        exists: true
                    };
                    
                    metadata.images[category].push(newImage);
                    console.log('✓ 添加新图片到元数据:', newImage);
                } else {
                    console.log('图片已存在，跳过:', filename);
                }
            });
            
            // 更新时间戳
            metadata.lastUpdate = new Date().toISOString();
            
            // 保存到服务器
            await this.syncManager.saveMetadata();
            
            console.log('✓ 图片元数据已保存到服务器');
            
        } catch (error) {
            console.error('保存图片元数据失败:', error);
            adminUtils.showToast('保存元数据失败: ' + error.message, 'error');
        }
    }

    /**
     * 加载图片数据
     */
    async loadImages() {
        try {
            if (this.syncManager && this.syncManager.isInitialized) {
                // 从同步管理器获取图片数据
                this.images = this.syncManager.getAllImages();
                console.log(`从同步管理器加载了 ${this.images.length} 张图片`);
            } else {
                // 降级：从localStorage加载
                console.warn('同步管理器未初始化，使用本地存储');
                this.images = adminUtils.storage.get('admin_images', []);
            }
            
            this.renderImages();
        } catch (error) {
            console.error('加载图片失败:', error);
            throw error;
        }
    }

    /**
     * 同步网站图片
     */
    async syncWithSite() {
        if (this.isSyncing) {
            adminUtils.showToast('同步正在进行中...', 'warning');
            return;
        }

        try {
            this.isSyncing = true;
            adminUtils.showLoading('正在扫描网站图片...');
            
            console.log('开始扫描图片...');
            
            // 添加超时保护
            const scanPromise = this.syncManager.scanAllImages((progress) => {
                console.log('扫描进度:', progress);
                const loadingText = document.querySelector('#loading-overlay p');
                if (loadingText) {
                    loadingText.textContent = progress.message || '正在扫描...';
                }
            });
            
            // 30秒超时
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('扫描超时，请检查图片目录')), 30000)
            );
            
            const allImages = await Promise.race([scanPromise, timeoutPromise]);
            
            // 更新元数据
            this.syncManager.metadata.images = allImages;
            this.syncManager.metadata.lastUpdate = new Date().toISOString();
            
            // 保存元数据
            this.syncManager.saveMetadata();
            
            // 重新加载图片
            await this.loadImages();
            
            // 更新统计
            this.updateStats();
            
            adminUtils.hideLoading();
            
            const stats = this.syncManager.getStatistics();
            adminUtils.showToast(`同步完成！共找到 ${stats.total} 张图片`, 'success');
            
        } catch (error) {
            console.error('同步失败:', error);
            adminUtils.hideLoading();
            adminUtils.showToast('同步失败: ' + error.message, 'error');
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * 设置同步按钮
     */
    setupSyncButton() {
        // 在管理图片区域添加同步按钮
        const filterBar = document.querySelector('.filter-bar');
        if (!filterBar) return;

        // 检查是否已存在同步按钮
        if (document.getElementById('sync-site-btn')) return;

        const syncBtnContainer = document.createElement('div');
        syncBtnContainer.className = 'sync-btn-container';
        syncBtnContainer.innerHTML = `
            <button class="btn btn-primary" id="sync-site-btn" title="扫描并同步主网站的图片">
                <span class="btn-icon">🔄</span>
                <span class="btn-text">同步网站图片</span>
            </button>
        `;
        
        filterBar.appendChild(syncBtnContainer);
        
        // 绑定点击事件
        const syncBtn = document.getElementById('sync-site-btn');
        syncBtn?.addEventListener('click', () => {
            this.syncWithSite();
        });
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 上传区域
        this.setupUploadArea();
        
        // 视图切换
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
            
            // 设置初始激活状态
            if (btn.dataset.view === this.currentView) {
                btn.classList.add('active');
            }
        });
    }

    /**
     * 渲染图片列表（分页版本 + 防抖优化）
     */
    renderImages(append = false) {
        // 使用requestAnimationFrame优化渲染时机
        if (this.renderDebounceTimer) {
            cancelAnimationFrame(this.renderDebounceTimer);
        }
        
        this.renderDebounceTimer = requestAnimationFrame(() => {
            this._doRenderImages(append);
        });
    }
    
    /**
     * 实际渲染图片
     */
    _doRenderImages(append = false) {
        const container = document.getElementById('images-container');
        if (!container) return;
        
        // 过滤图片
        const filteredImages = this.filterImages();
        
        if (filteredImages.length === 0) {
            container.innerHTML = `
                <div class="no-images-message">
                    <div class="empty-icon">📷</div>
                    <h3>暂无图片</h3>
                    <p>点击上方的"同步网站图片"按钮扫描主网站图片</p>
                    <p>或者通过"上传图片"功能添加新图片</p>
                </div>
            `;
            return;
        }
        
        // 如果不是追加模式，重置页码
        if (!append) {
            this.currentPage = 1;
            container.innerHTML = '';
        }
        
        // 计算当前页的图片
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageImages = filteredImages.slice(startIndex, endIndex);
        
        if (pageImages.length === 0) {
            return; // 没有更多图片了
        }
        
        // 根据当前视图渲染
        if (this.currentView === 'grid') {
            this.renderGridView(pageImages, container, append);
        } else {
            this.renderListView(pageImages, container, append);
        }
        
        // 添加加载更多按钮
        this.updateLoadMoreButton(filteredImages.length, endIndex);
        
        // 设置滚动加载
        this.setupInfiniteScroll(filteredImages.length);
    }

    /**
     * 过滤图片
     */
    filterImages() {
        return this.images.filter(image => {
            // 分类过滤
            if (this.currentFilter.category && image.category !== this.currentFilter.category) {
                return false;
            }
            
            // 搜索过滤
            if (this.currentFilter.search) {
                const searchTerm = this.currentFilter.search.toLowerCase();
                const title = (image.title || '').toLowerCase();
                const description = (image.description || '').toLowerCase();
                
                if (!title.includes(searchTerm) && !description.includes(searchTerm)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * 渲染网格视图
     */
    renderGridView(images, container, append = false) {
        let grid = container.querySelector('.images-grid');
        
        if (!grid || !append) {
            if (!append) container.innerHTML = '';
            grid = document.createElement('div');
            grid.className = 'images-grid';
            container.appendChild(grid);
        }
        
        // 使用文档片段优化DOM操作
        const fragment = document.createDocumentFragment();
        
        images.forEach(image => {
            const imageItem = this.createGridImageItem(image);
            fragment.appendChild(imageItem);
        });
        
        grid.appendChild(fragment);
    }

    /**
     * 懒加载图片（优化版 - 复用observer）
     */
    lazyLoadImage(img) {
        if (!img.dataset.src || this.observedImages.has(img)) return;
        
        // 复用全局observer
        if (!this.intersectionObserver) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const target = entry.target;
                        const src = target.dataset.src;
                        if (src && target.src !== src) {
                            target.src = src;
                            target.classList.add('loaded');
                        }
                        this.intersectionObserver.unobserve(target);
                    }
                });
            }, {
                rootMargin: '100px', // 提前100px开始加载
                threshold: 0.01 // 只要1%可见就开始加载
            });
        }
        
        this.intersectionObserver.observe(img);
        this.observedImages.add(img);
    }

    /**
     * 创建网格图片项（优化版）
     */
    createGridImageItem(image) {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.dataset.imageId = image.id;
        
        const categoryLabel = this.getCategoryLabel(image.category);
        
        // 使用实际图片路径
        const imageSrc = image.path || image.dataURL || '';
        const placeholderSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3C/svg%3E';
        
        // 创建结构
        const checkbox = document.createElement('div');
        checkbox.className = `image-checkbox ${this.selectedImages.has(image.id) ? 'checked' : ''}`;
        checkbox.dataset.imageId = image.id;
        
        const img = document.createElement('img');
        img.src = placeholderSrc;
        img.dataset.src = imageSrc;
        img.alt = image.title || '图片';
        img.loading = 'lazy';
        img.onerror = () => {
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999"%3E加载失败%3C/text%3E%3C/svg%3E';
        };
        
        const overlay = document.createElement('div');
        overlay.className = 'image-overlay';
        overlay.innerHTML = `
            <div class="image-info">
                <div class="image-title">${image.title || '未命名'}</div>
                <div class="image-category">${categoryLabel}</div>
                <div class="image-path">${image.filename || ''}</div>
                <div class="image-actions">
                    <button class="image-action-btn edit-btn" data-image-id="${image.id}">编辑</button>
                    <button class="image-action-btn delete-btn" data-image-id="${image.id}">删除</button>
                </div>
            </div>
        `;
        
        item.appendChild(checkbox);
        item.appendChild(img);
        item.appendChild(overlay);
        
        // 懒加载图片
        this.lazyLoadImage(img);
        
        // 绑定事件
        this.bindImageItemEvents(item);
        
        return item;
    }

    /**
     * 渲染列表视图
     */
    renderListView(images, container, append = false) {
        let list = container.querySelector('.images-list');
        
        if (!list || !append) {
            if (!append) container.innerHTML = '';
            list = document.createElement('div');
            list.className = 'images-list';
            container.appendChild(list);
        }
        
        // 使用文档片段优化DOM操作
        const fragment = document.createDocumentFragment();
        
        images.forEach(image => {
            const imageItem = this.createListImageItem(image);
            fragment.appendChild(imageItem);
        });
        
        list.appendChild(fragment);
    }

    /**
     * 创建列表图片项（优化版）
     */
    createListImageItem(image) {
        const item = document.createElement('div');
        item.className = 'image-list-item';
        item.dataset.imageId = image.id;
        
        // 使用实际图片路径，添加占位符
        const imageSrc = image.path || image.dataURL || '';
        const placeholderSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3E加载中...%3C/text%3E%3C/svg%3E';
        
        // 创建DOM结构
        const checkbox = document.createElement('div');
        checkbox.className = `image-checkbox ${this.selectedImages.has(image.id) ? 'checked' : ''}`;
        checkbox.dataset.imageId = image.id;
        
        const img = document.createElement('img');
        img.src = placeholderSrc;
        img.dataset.src = imageSrc; // 懒加载
        img.alt = image.title || '图片';
        img.loading = 'lazy';
        img.onerror = () => {
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3E加载失败%3C/text%3E%3C/svg%3E';
        };
        
        const info = document.createElement('div');
        info.className = 'image-list-info';
        info.innerHTML = `
            <div class="image-list-title">${image.title || '未命名'}</div>
            ${image.description ? `<div class="image-list-description">${image.description}</div>` : '<div class="image-list-description">暂无描述</div>'}
        `;
        
        const actions = document.createElement('div');
        actions.className = 'image-list-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary edit-btn';
        editBtn.textContent = '编辑';
        editBtn.dataset.imageId = image.id;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger delete-btn';
        deleteBtn.textContent = '删除';
        deleteBtn.dataset.imageId = image.id;
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        item.appendChild(checkbox);
        item.appendChild(img);
        item.appendChild(info);
        item.appendChild(actions);
        
        // 懒加载图片
        this.lazyLoadImage(img);
        
        // 绑定事件（一次性）
        this.bindImageItemEvents(item);
        
        return item;
    }

    /**
     * 绑定图片项事件（优化版 - 直接绑定按钮）
     */
    bindImageItemEvents(item) {
        const imageId = item.dataset.imageId;
        
        // 复选框事件
        const checkbox = item.querySelector('.image-checkbox');
        if (checkbox) {
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleImageSelection(imageId);
            });
        }
        
        // 编辑按钮事件 - 直接绑定，不使用事件委托
        const editBtn = item.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const btnImageId = editBtn.dataset.imageId;
                console.log('[编辑按钮] 点击 - imageId:', btnImageId);
                console.log('[编辑按钮] 按钮元素:', editBtn);
                this.editImage(btnImageId);
            });
        }
        
        // 删除按钮事件
        const deleteBtn = item.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const btnImageId = deleteBtn.dataset.imageId;
                this.deleteImage(btnImageId);
            });
        }
        
        // 图片点击事件
        const img = item.querySelector('img');
        if (img) {
            img.addEventListener('click', () => {
                this.viewImage(imageId);
            });
        }
    }

    /**
     * 编辑图片
     */
    editImage(imageId) {
        console.log('[编辑图片] 开始编辑 - imageId:', imageId);
        console.log('[编辑图片] 当前图片总数:', this.images.length);
        
        const image = this.images.find(img => img.id === imageId);
        if (!image) {
            console.error('[编辑图片] 找不到图片 - imageId:', imageId);
            console.log('[编辑图片] 所有图片IDs:', this.images.map(img => img.id));
            adminUtils.showToast('找不到图片', 'error');
            return;
        }
        
        console.log('[编辑图片] 找到图片:', image.title, image.filename);
        
        // 创建编辑模态框
        this.showEditModal(image);
    }

    /**
     * 显示编辑模态框
     */
    showEditModal(image) {
        let modal = document.getElementById('edit-image-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'edit-image-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>编辑图片信息</h3>
                        <button class="modal-close" onclick="adminUtils.closeModal('edit-image-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="image-preview">
                            <img id="edit-image-preview" alt="预览">
                        </div>
                        <form id="edit-image-form">
                            <input type="hidden" id="edit-image-id">
                            <div class="form-group">
                                <label for="edit-image-title">标题</label>
                                <input type="text" id="edit-image-title" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-image-category">分类</label>
                                <select id="edit-image-category" required>
                                    <option value="street">街头摄影</option>
                                    <option value="documentary">纪实摄影</option>
                                    <option value="nature">自然风光</option>
                                    <option value="portrait">人像摄影</option>
                                    <option value="cityscape">城市景观</option>
                                    <option value="animals">动物摄影</option>
                                    <option value="stilllife">静物摄影</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-image-description">描述</label>
                                <textarea id="edit-image-description" rows="4"></textarea>
                            </div>
                            <div class="form-group">
                                <label>文件信息</label>
                                <div class="form-info" id="edit-image-file-info"></div>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">保存更改</button>
                                <button type="button" class="btn btn-secondary" onclick="adminUtils.closeModal('edit-image-modal')">取消</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 绑定表单提交事件
            const form = document.getElementById('edit-image-form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveImageEdit();
            });
        }
        
        // 填充表单
        document.getElementById('edit-image-id').value = image.id;
        document.getElementById('edit-image-title').value = image.title || '';
        document.getElementById('edit-image-category').value = image.category || '';
        document.getElementById('edit-image-description').value = image.description || '';
        document.getElementById('edit-image-preview').src = image.path || image.dataURL || '';
        document.getElementById('edit-image-file-info').innerHTML = `
            <p>文件名: ${image.filename || '未知'}</p>
            <p>路径: ${image.path || '未知'}</p>
        `;
        
        adminUtils.openModal('edit-image-modal');
    }

    /**
     * 保存图片编辑
     */
    saveImageEdit() {
        const imageId = document.getElementById('edit-image-id').value;
        const title = document.getElementById('edit-image-title').value;
        const category = document.getElementById('edit-image-category').value;
        const description = document.getElementById('edit-image-description').value;
        
        // 更新元数据
        const success = this.syncManager.updateImageMetadata(imageId, {
            title,
            category,
            description
        });
        
        if (success) {
            // 重新加载图片
            this.loadImages();
            
            adminUtils.closeModal('edit-image-modal');
            adminUtils.showToast('✓ 图片信息已自动保存', 'success');
        } else {
            adminUtils.showToast('更新失败', 'error');
        }
    }

    /**
     * 手动导出元数据（仅用于备份）
     */
    manualExportMetadata() {
        this.syncManager.exportMetadata();
        adminUtils.showToast('元数据已导出用于备份', 'success');
    }

    /**
     * 删除图片
     */
    async deleteImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;
        
        const confirmed = await adminUtils.confirm(
            `确定要删除图片 "${image.title || image.filename}" 吗？\n\n注意：这只会从元数据中删除记录，不会删除实际图片文件。`,
            '确认删除'
        );
        
        if (!confirmed) return;
        
        // 删除元数据
        const success = this.syncManager.deleteImageMetadata(imageId);
        
        if (success) {
            // 从选择中移除
            this.selectedImages.delete(imageId);
            
            // 重新加载图片
            await this.loadImages();
            
            // 更新选择UI
            this.updateSelectionUI();
            
            adminUtils.showToast('✓ 图片已删除并自动保存', 'success');
        } else {
            adminUtils.showToast('删除失败', 'error');
        }
    }

    /**
     * 查看图片
     */
    viewImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;
        
        // 创建图片预览模态框
        let modal = document.getElementById('view-image-modal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'view-image-modal';
            modal.className = 'modal';
            modal.style.cursor = 'pointer';
            modal.innerHTML = `
                <div class="modal-content large" style="max-width: 90vw;">
                    <div class="modal-header">
                        <h3 id="view-image-title"></h3>
                        <button class="modal-close" onclick="adminUtils.closeModal('view-image-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="image-full-preview">
                            <img id="view-image-full" alt="图片预览" style="max-width: 100%; height: auto;">
                        </div>
                        <div class="image-full-info" id="view-image-info"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // 点击关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    adminUtils.closeModal('view-image-modal');
                }
            });
        }
        
        // 填充内容
        document.getElementById('view-image-title').textContent = image.title || '图片预览';
        document.getElementById('view-image-full').src = image.path || image.dataURL || '';
        document.getElementById('view-image-info').innerHTML = `
            <p><strong>分类:</strong> ${this.getCategoryLabel(image.category)}</p>
            <p><strong>文件名:</strong> ${image.filename || '未知'}</p>
            ${image.description ? `<p><strong>描述:</strong> ${image.description}</p>` : ''}
            ${image.uploadDate ? `<p><strong>上传时间:</strong> ${adminUtils.formatDate(image.uploadDate, 'YYYY-MM-DD HH:mm')}</p>` : ''}
        `;
        
        adminUtils.openModal('view-image-modal');
    }

    /**
     * 切换图片选择状态
     */
    toggleImageSelection(imageId) {
        if (this.selectedImages.has(imageId)) {
            this.selectedImages.delete(imageId);
        } else {
            this.selectedImages.add(imageId);
        }
        
        this.updateSelectionUI();
    }

    /**
     * 更新选择UI
     */
    updateSelectionUI() {
        // 更新复选框状态
        document.querySelectorAll('.image-checkbox').forEach(checkbox => {
            const imageId = checkbox.dataset.imageId;
            if (this.selectedImages.has(imageId)) {
                checkbox.classList.add('checked');
            } else {
                checkbox.classList.remove('checked');
            }
        });
        
        // 更新批量操作区域
        const batchActions = document.getElementById('batch-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (this.selectedImages.size > 0) {
            if (batchActions) batchActions.hidden = false;
            if (selectedCount) selectedCount.textContent = this.selectedImages.size;
        } else {
            if (batchActions) batchActions.hidden = true;
        }
    }

    /**
     * 设置筛选栏
     */
    setupFilterBar() {
        const categoryFilter = document.getElementById('filter-category');
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        
        // 分类筛选
        categoryFilter?.addEventListener('change', (e) => {
            this.currentFilter.category = e.target.value;
            this.currentPage = 1; // 重置分页
            this.renderImages();
        });
        
        // 搜索输入
        const handleSearch = adminUtils.debounce(() => {
            this.currentFilter.search = searchInput?.value || '';
            this.currentPage = 1; // 重置分页
            this.renderImages();
        }, 300);
        
        searchInput?.addEventListener('input', handleSearch);
        searchBtn?.addEventListener('click', handleSearch);
    }

    /**
     * 设置批量操作
     */
    setupBatchActions() {
        const batchDelete = document.getElementById('batch-delete');
        const clearSelection = document.getElementById('clear-selection');
        
        // 批量删除
        batchDelete?.addEventListener('click', async () => {
            if (this.selectedImages.size === 0) return;
            
            const confirmed = await adminUtils.confirm(
                `确定要删除选中的 ${this.selectedImages.size} 张图片吗？\n\n注意：这只会从元数据中删除记录，不会删除实际图片文件。`,
                '确认删除'
            );
            
            if (!confirmed) return;
            
            // 删除选中的图片
            for (const imageId of this.selectedImages) {
                this.syncManager.deleteImageMetadata(imageId);
            }
            
            // 清空选择
            this.selectedImages.clear();
            
            // 重新加载
            await this.loadImages();
            this.updateSelectionUI();
            
            adminUtils.showToast('✓ 选中的图片已删除并自动保存', 'success');
        });
        
        // 清除选择
        clearSelection?.addEventListener('click', () => {
            this.selectedImages.clear();
            this.updateSelectionUI();
        });
    }

    /**
     * 设置备份恢复
     */
    setupBackupRestore() {
        const exportBtn = document.getElementById('export-data-btn');
        
        exportBtn?.addEventListener('click', () => {
            this.manualExportMetadata();
        });
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const totalImages = document.getElementById('total-images');
        if (totalImages && this.syncManager) {
            const stats = this.syncManager.getStatistics();
            totalImages.textContent = stats.total;
        }
    }

    /**
     * 更新加载更多按钮
     */
    updateLoadMoreButton(totalImages, currentEndIndex) {
        // 移除旧的加载更多按钮
        const oldButton = document.getElementById('load-more-btn');
        if (oldButton) oldButton.remove();
        
        // 如果还有更多图片，添加按钮
        if (currentEndIndex < totalImages) {
            const container = document.getElementById('images-container');
            const button = document.createElement('div');
            button.id = 'load-more-btn';
            button.className = 'load-more-container';
            button.innerHTML = `
                <button class="btn btn-secondary load-more-btn" onclick="window.enhancedImageManager.loadMoreImages()">
                    加载更多 (已显示 ${currentEndIndex}/${totalImages})
                </button>
            `;
            container.appendChild(button);
        }
    }
    
    /**
     * 加载更多图片
     */
    loadMoreImages() {
        if (this.isLoadingMore) return;
        
        this.isLoadingMore = true;
        this.currentPage++;
        
        // 显示加载状态
        const button = document.querySelector('.load-more-btn');
        if (button) {
            button.textContent = '加载中...';
            button.disabled = true;
        }
        
        // 延迟一点以显示加载状态
        setTimeout(() => {
            this.renderImages(true); // append模式
            this.isLoadingMore = false;
        }, 100);
    }
    
    /**
     * 设置无限滚动
     */
    setupInfiniteScroll(totalImages) {
        // 移除旧的滚动监听
        if (this.scrollListener) {
            window.removeEventListener('scroll', this.scrollListener);
        }
        
        // 创建新的滚动监听
        this.scrollListener = () => {
            if (this.isLoadingMore) return;
            
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            // 当滚动到距离底部200px时自动加载
            if (scrollTop + windowHeight >= documentHeight - 200) {
                const currentEndIndex = this.currentPage * this.itemsPerPage;
                if (currentEndIndex < totalImages) {
                    this.loadMoreImages();
                }
            }
        };
        
        window.addEventListener('scroll', this.scrollListener);
    }
    
    /**
     * 切换视图
     */
    switchView(view) {
        if (this.currentView === view) return;
        
        this.currentView = view;
        
        // 更新按钮状态
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // 重新渲染（重置分页）
        this.currentPage = 1;
        this.renderImages();
    }

    /**
     * 获取分类标签
     */
    getCategoryLabel(category) {
        const labels = {
            'street': '街头摄影',
            'documentary': '纪实摄影',
            'nature': '自然风光',
            'portrait': '人像摄影',
            'cityscape': '城市景观',
            'animals': '动物摄影',
            'stilllife': '静物摄影'
        };
        
        return labels[category] || category;
    }
}

// 创建全局实例
window.EnhancedImageManager = EnhancedImageManager;
window.enhancedImageManager = new EnhancedImageManager();

