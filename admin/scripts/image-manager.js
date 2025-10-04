/**
 * 图片管理器
 * 处理图片的上传、管理、编辑和删除等功能
 */

class ImageManager {
    constructor() {
        this.images = [];
        this.currentView = 'grid';
        this.selectedImages = new Set();
        this.currentFilter = {
            category: '',
            search: ''
        };
        this.uploadQueue = [];
        this.isUploading = false;
        this.isInitialized = false;
        this.initTimeout = null;
        
        // 不在构造函数中立即初始化
    }

    /**
     * 初始化图片管理器
     */
    init() {
        // 显示加载状态
        adminUtils.showLoading('正在初始化图片管理器...');
        
        // 设置初始化超时
        this.initTimeout = setTimeout(() => {
            console.warn('图片管理器初始化超时，使用默认设置');
            this.handleInitTimeout();
        }, 8000); // 8秒超时
        
        // 异步初始化
        this.safeInit().catch(error => {
            console.error('图片管理器初始化失败:', error);
            this.handleInitError(error);
        });
    }
    
    /**
     * 安全初始化方法
     */
    async safeInit() {
        try {
            // 加载图片数据（带超时）
            await this.loadImagesWithTimeout();
            
            // 设置其他功能
            this.setupEventListeners();
            this.setupUploadArea();
            this.setupImageForm();
            this.setupEditModal();
            this.setupFilterBar();
            this.setupBatchActions();
            this.setupBackupRestore();
            this.updateStats();
            
            // 清除超时并隐藏加载
            if (this.initTimeout) {
                clearTimeout(this.initTimeout);
                this.initTimeout = null;
            }
            adminUtils.hideLoading();
            this.isInitialized = true;
            console.log('图片管理器初始化完成');
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * 处理初始化超时
     */
    handleInitTimeout() {
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
            this.initTimeout = null;
        }
        
        // 使用空数组初始化
        this.images = [];
        this.setupEventListeners();
        this.setupUploadArea();
        this.setupImageForm();
        this.setupEditModal();
        this.setupFilterBar();
        this.setupBatchActions();
        this.setupBackupRestore();
        this.updateStats();
        this.renderImages(); // 渲染空状态
        
        // 显示错误消息但继续工作
        adminUtils.hideLoading();
        adminUtils.showToast('图片数据加载超时，某些功能可能受限', 'warning');
        this.isInitialized = true; // 标记为已初始化，以避免重入
        console.warn('图片管理器在超时后完成基础初始化');
    }
    
    /**
     * 处理初始化错误
     */
    handleInitError(error) {
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
            this.initTimeout = null;
        }
        
        // 使用空数组初始化
        this.images = [];
        this.setupEventListeners();
        this.setupUploadArea();
        this.setupImageForm();
        this.setupEditModal();
        this.setupFilterBar();
        this.setupBatchActions();
        this.setupBackupRestore();
        this.updateStats();
        this.renderImages(); // 渲染空状态
        
        adminUtils.hideLoading();
        adminUtils.showToast('图片管理器初始化失败，请刷新页面重试', 'error');
        this.isInitialized = true; // 标记为已初始化，以避免重入
        console.error('图片管理器初始化错误:', error);
    }

    /**
     * 带超时的图片数据加载
     */
    async loadImagesWithTimeout() {
        return new Promise(async (resolve, reject) => {
            // 设置加载超时
            const timeoutId = setTimeout(() => {
                reject(new Error('图片数据加载超时'));
            }, 5000); // 5秒超时
            
            try {
                await this.loadImages();
                clearTimeout(timeoutId);
                resolve();
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * 加载图片数据
     */
    async loadImages() {
        try {
            // 从本地存储加载图片数据
            const storedImages = adminUtils.storage.get('admin_images', []);
            this.images = storedImages;
            
            // 如果本地存储为空，尝试从JSON文件加载
            if (this.images.length === 0) {
                await this.loadImagesFromFile();
            }
            
            this.renderImages();
        } catch (error) {
            console.error('加载图片数据失败:', error);
            // 不显示错误消息，让超时处理统一处理
            throw error;
        }
    }

    /**
     * 从JSON文件加载图片数据
     */
    async loadImagesFromFile() {
        try {
            // 添加超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
            
            const response = await fetch('./data/images.json', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                this.images = data.images || [];
                this.saveImages();
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('从文件加载图片数据失败: 超时');
            } else {
                console.error('从文件加载图片数据失败:', error);
            }
            // 不抛出错误，允许使用空数组继续
        }
    }

    /**
     * 保存图片数据到本地存储
     */
    saveImages() {
        adminUtils.storage.set('admin_images', this.images);
        this.updateStats();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 视图切换
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });
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
        uploadArea?.addEventListener('click', () => {
            fileInput?.click();
        });

        // 文件选择
        fileInput?.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // 拖拽上传
        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea?.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFileSelect(e.dataTransfer.files);
        });
    }

    /**
     * 处理文件选择
     * @param {FileList} files - 选择的文件列表
     */
    async handleFileSelect(files) {
        if (files.length === 0) return;

        const validFiles = Array.from(files).filter(file => {
            if (!adminUtils.file.validateFileType(file)) {
                adminUtils.showToast(`文件 ${file.name} 不是支持的图片格式`, 'error');
                return false;
            }
            
            if (!adminUtils.file.validateFileSize(file, 10 * 1024 * 1024)) { // 10MB
                adminUtils.showToast(`文件 ${file.name} 超过10MB限制`, 'error');
                return false;
            }
            
            return true;
        });

        if (validFiles.length === 0) return;

        // 显示上传进度
        this.showUploadProgress();
        
        // 添加到上传队列
        this.uploadQueue = validFiles;
        
        // 开始上传
        this.processUploadQueue();
    }

    /**
     * 显示上传进度
     */
    showUploadProgress() {
        const uploadProgress = document.getElementById('upload-progress');
        const imageForm = document.getElementById('image-form');
        
        if (uploadProgress) uploadProgress.hidden = false;
        if (imageForm) imageForm.hidden = true;
    }

    /**
     * 处理上传队列
     */
    async processUploadQueue() {
        if (this.isUploading || this.uploadQueue.length === 0) return;
        
        this.isUploading = true;
        const uploadList = document.getElementById('upload-list');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (uploadList) uploadList.innerHTML = '';
        
        for (let i = 0; i < this.uploadQueue.length; i++) {
            const file = this.uploadQueue[i];
            const uploadItem = this.createUploadItem(file);
            
            if (uploadList) uploadList.appendChild(uploadItem);
            
            try {
                // 更新进度
                const progress = Math.round(((i + 1) / this.uploadQueue.length) * 100);
                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `${progress}%`;
                
                // 更新上传项状态
                const statusElement = uploadItem.querySelector('.upload-item-status');
                if (statusElement) {
                    statusElement.textContent = '上传中...';
                    statusElement.className = 'upload-item-status uploading';
                }
                
                // 处理图片
                const processedImage = await this.processImage(file);
                
                // 更新上传项状态
                if (statusElement) {
                    statusElement.textContent = '完成';
                    statusElement.className = 'upload-item-status success';
                }
                
                // 临时保存处理后的图片数据
                if (!this.tempImageData) this.tempImageData = [];
                this.tempImageData.push(processedImage);
                
            } catch (error) {
                console.error('处理图片失败:', error);
                
                // 更新上传项状态
                const statusElement = uploadItem.querySelector('.upload-item-status');
                if (statusElement) {
                    statusElement.textContent = '失败';
                    statusElement.className = 'upload-item-status error';
                }
                
                adminUtils.showToast(`处理图片 ${file.name} 失败`, 'error');
            }
        }
        
        this.isUploading = false;
        this.uploadQueue = [];
        
        // 显示图片信息表单
        setTimeout(() => {
            this.showImageForm();
        }, 1000);
    }

    /**
     * 创建上传项元素
     * @param {File} file - 文件对象
     * @returns {HTMLElement} 上传项元素
     */
    createUploadItem(file) {
        const item = document.createElement('div');
        item.className = 'upload-item';
        item.innerHTML = `
            <span class="upload-item-icon">📷</span>
            <span class="upload-item-name">${file.name}</span>
            <span class="upload-item-status pending">等待中</span>
        `;
        return item;
    }

    /**
     * 处理图片
     * @param {File} file - 图片文件
     * @returns {Promise<Object>} 处理后的图片数据
     */
    async processImage(file) {
        // 压缩图片
        const compressedBlob = await adminUtils.file.compressImage(file, 0.8, 1920, 1080);
        
        // 转换为DataURL
        const dataURL = await adminUtils.file.readFileAsDataURL(compressedBlob);
        
        return {
            id: adminUtils.generateId('img'),
            filename: file.name,
            dataURL: dataURL,
            size: compressedBlob.size,
            type: compressedBlob.type,
            uploadDate: new Date().toISOString(),
            title: file.name.replace(/\.[^/.]+$/, ''), // 移除文件扩展名
            category: '',
            description: ''
        };
    }

    /**
     * 显示图片信息表单
     */
    showImageForm() {
        const uploadProgress = document.getElementById('upload-progress');
        const imageForm = document.getElementById('image-form');
        
        if (uploadProgress) uploadProgress.hidden = true;
        if (imageForm) imageForm.hidden = false;
        
        // 如果只有一张图片，自动填充表单
        if (this.tempImageData && this.tempImageData.length === 1) {
            const image = this.tempImageData[0];
            document.getElementById('image-title').value = image.title;
        }
    }

    /**
     * 设置图片信息表单
     */
    setupImageForm() {
        const form = document.getElementById('image-info-form');
        const cancelBtn = document.getElementById('cancel-upload');
        
        // 表单提交
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveImageInfo();
        });
        
        // 取消按钮
        cancelBtn?.addEventListener('click', () => {
            this.cancelUpload();
        });
    }

    /**
     * 保存图片信息
     */
    saveImageInfo() {
        if (!this.tempImageData || this.tempImageData.length === 0) return;
        
        const title = document.getElementById('image-title').value;
        const category = document.getElementById('image-category').value;
        const description = document.getElementById('image-description').value;
        
        // 为每张图片设置信息
        this.tempImageData.forEach(image => {
            image.title = title || image.title;
            image.category = category;
            image.description = description;
            
            // 添加到图片列表
            this.images.unshift(image);
        });
        
        // 保存数据
        this.saveImages();
        
        // 重新渲染图片列表
        this.renderImages();
        
        // 重置表单
        this.resetUploadForm();
        
        // 显示成功消息
        const count = this.tempImageData.length;
        adminUtils.showToast(`成功添加 ${count} 张图片`, 'success');
        
        // 清空临时数据
        this.tempImageData = null;
    }

    /**
     * 取消上传
     */
    cancelUpload() {
        this.resetUploadForm();
        this.tempImageData = null;
        this.uploadQueue = [];
        this.isUploading = false;
    }

    /**
     * 重置上传表单
     */
    resetUploadForm() {
        const uploadProgress = document.getElementById('upload-progress');
        const imageForm = document.getElementById('image-form');
        const fileInput = document.getElementById('file-input');
        
        if (uploadProgress) uploadProgress.hidden = true;
        if (imageForm) imageForm.hidden = true;
        if (fileInput) fileInput.value = '';
        
        // 重置表单字段
        const form = document.getElementById('image-info-form');
        if (form) form.reset();
        
        // 重置进度条
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
    }

    /**
     * 渲染图片列表
     */
    renderImages() {
        const container = document.getElementById('images-container');
        if (!container) return;
        
        // 过滤图片
        const filteredImages = this.filterImages();
        
        if (filteredImages.length === 0) {
            container.innerHTML = `
                <div class="no-images-message">
                    <p>暂无图片</p>
                </div>
            `;
            return;
        }
        
        // 根据当前视图渲染
        if (this.currentView === 'grid') {
            this.renderGridView(filteredImages, container);
        } else {
            this.renderListView(filteredImages, container);
        }
    }

    /**
     * 过滤图片
     * @returns {Array} 过滤后的图片数组
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
                const title = image.title.toLowerCase();
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
     * @param {Array} images - 图片数组
     * @param {HTMLElement} container - 容器元素
     */
    renderGridView(images, container) {
        container.innerHTML = '';
        
        const grid = document.createElement('div');
        grid.className = 'images-grid';
        
        images.forEach(image => {
            const imageItem = this.createGridImageItem(image);
            grid.appendChild(imageItem);
        });
        
        container.appendChild(grid);
    }

    /**
     * 创建网格图片项
     * @param {Object} image - 图片对象
     * @returns {HTMLElement} 图片项元素
     */
    createGridImageItem(image) {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.dataset.imageId = image.id;
        
        const categoryLabel = this.getCategoryLabel(image.category);
        
        item.innerHTML = `
            <div class="image-checkbox ${this.selectedImages.has(image.id) ? 'checked' : ''}" 
                 data-image-id="${image.id}"></div>
            <img src="${image.dataURL}" alt="${image.title}" loading="lazy">
            <div class="image-overlay">
                <div class="image-info">
                    <div class="image-title">${image.title}</div>
                    <div class="image-category">${categoryLabel}</div>
                    <div class="image-actions">
                        <button class="image-action-btn edit-btn" data-image-id="${image.id}">编辑</button>
                        <button class="image-action-btn delete-btn" data-image-id="${image.id}">删除</button>
                    </div>
                </div>
            </div>
        `;
        
        // 绑定事件
        this.bindImageItemEvents(item);
        
        return item;
    }

    /**
     * 渲染列表视图
     * @param {Array} images - 图片数组
     * @param {HTMLElement} container - 容器元素
     */
    renderListView(images, container) {
        container.innerHTML = '';
        
        const list = document.createElement('div');
        list.className = 'images-list';
        
        images.forEach(image => {
            const imageItem = this.createListImageItem(image);
            list.appendChild(imageItem);
        });
        
        container.appendChild(list);
    }

    /**
     * 创建列表图片项
     * @param {Object} image - 图片对象
     * @returns {HTMLElement} 图片项元素
     */
    createListImageItem(image) {
        const item = document.createElement('div');
        item.className = 'image-list-item';
        item.dataset.imageId = image.id;
        
        const categoryLabel = this.getCategoryLabel(image.category);
        const uploadDate = adminUtils.formatDate(image.uploadDate, 'YYYY-MM-DD');
        
        item.innerHTML = `
            <div class="image-checkbox ${this.selectedImages.has(image.id) ? 'checked' : ''}" 
                 data-image-id="${image.id}"></div>
            <img src="${image.dataURL}" alt="${image.title}" loading="lazy">
            <div class="image-list-info">
                <div class="image-list-title">${image.title}</div>
                <div class="image-list-meta">
                    分类: ${categoryLabel} | 上传时间: ${uploadDate} | 
                    大小: ${adminUtils.file.formatFileSize(image.size)}
                </div>
            </div>
            <div class="image-list-actions">
                <button class="btn btn-secondary edit-btn" data-image-id="${image.id}">编辑</button>
                <button class="btn btn-danger delete-btn" data-image-id="${image.id}">删除</button>
            </div>
        `;
        
        // 绑定事件
        this.bindImageItemEvents(item);
        
        return item;
    }

    /**
     * 绑定图片项事件
     * @param {HTMLElement} item - 图片项元素
     */
    bindImageItemEvents(item) {
        const imageId = item.dataset.imageId;
        
        // 复选框事件
        const checkbox = item.querySelector('.image-checkbox');
        checkbox?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleImageSelection(imageId);
        });
        
        // 编辑按钮事件
        const editBtn = item.querySelector('.edit-btn');
        editBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editImage(imageId);
        });
        
        // 删除按钮事件
        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteImage(imageId);
        });
        
        // 图片点击事件
        const img = item.querySelector('img');
        img?.addEventListener('click', () => {
            this.viewImage(imageId);
        });
    }

    /**
     * 切换图片选择状态
     * @param {string} imageId - 图片ID
     */
    toggleImageSelection(imageId) {
        if (this.selectedImages.has(imageId)) {
            this.selectedImages.delete(imageId);
        } else {
            this.selectedImages.add(imageId);
        }
        
        // 更新UI
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
     * 设置编辑模态框
     */
    setupEditModal() {
        const form = document.getElementById('edit-form');
        const cancelBtn = document.getElementById('cancel-edit');
        
        // 表单提交
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveImageEdit();
        });
        
        // 取消按钮
        cancelBtn?.addEventListener('click', () => {
            adminUtils.closeModal('edit-modal');
        });
    }

    /**
     * 编辑图片
     * @param {string} imageId - 图片ID
     */
    editImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;
        
        // 填充表单
        document.getElementById('edit-title').value = image.title;
        document.getElementById('edit-category').value = image.category;
        document.getElementById('edit-description').value = image.description || '';
        
        // 设置预览图片
        const previewImg = document.getElementById('edit-preview-img');
        if (previewImg) previewImg.src = image.dataURL;
        
        // 保存当前编辑的图片ID
        this.currentEditingImageId = imageId;
        
        // 显示模态框
        adminUtils.openModal('edit-modal');
    }

    /**
     * 保存图片编辑
     */
    saveImageEdit() {
        if (!this.currentEditingImageId) return;
        
        const image = this.images.find(img => img.id === this.currentEditingImageId);
        if (!image) return;
        
        // 获取表单数据
        const title = document.getElementById('edit-title').value;
        const category = document.getElementById('edit-category').value;
        const description = document.getElementById('edit-description').value;
        
        // 更新图片信息
        image.title = title;
        image.category = category;
        image.description = description;
        
        // 保存数据
        this.saveImages();
        
        // 重新渲染
        this.renderImages();
        
        // 关闭模态框
        adminUtils.closeModal('edit-modal');
        
        // 显示成功消息
        adminUtils.showToast('图片信息已更新', 'success');
        
        // 清空当前编辑ID
        this.currentEditingImageId = null;
    }

    /**
     * 删除图片
     * @param {string} imageId - 图片ID
     */
    async deleteImage(imageId) {
        const confirmed = await adminUtils.confirm('确定要删除这张图片吗？此操作不可撤销。', '确认删除');
        if (!confirmed) return;
        
        // 从数组中删除图片
        const index = this.images.findIndex(img => img.id === imageId);
        if (index !== -1) {
            this.images.splice(index, 1);
            
            // 从选择中移除
            this.selectedImages.delete(imageId);
            
            // 保存数据
            this.saveImages();
            
            // 重新渲染
            this.renderImages();
            
            // 更新选择UI
            this.updateSelectionUI();
            
            // 显示成功消息
            adminUtils.showToast('图片已删除', 'success');
        }
    }

    /**
     * 查看图片
     * @param {string} imageId - 图片ID
     */
    viewImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;
        
        // 创建简单的图片预览
        const preview = document.createElement('div');
        preview.className = 'image-preview-modal';
        preview.innerHTML = `
            <div class="preview-overlay">
                <div class="preview-content">
                    <img src="${image.dataURL}" alt="${image.title}">
                    <div class="preview-info">
                        <h3>${image.title}</h3>
                        <p>${this.getCategoryLabel(image.category)}</p>
                        <p>${image.description || ''}</p>
                        <button class="btn btn-secondary close-preview">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(preview);
        
        // 绑定关闭事件
        const closeBtn = preview.querySelector('.close-preview');
        const overlay = preview.querySelector('.preview-overlay');
        
        const closePreview = () => {
            document.body.removeChild(preview);
        };
        
        closeBtn?.addEventListener('click', closePreview);
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) closePreview();
        });
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
            this.renderImages();
        });
        
        // 搜索输入
        const handleSearch = adminUtils.debounce(() => {
            this.currentFilter.search = searchInput?.value || '';
            this.renderImages();
        }, 300);
        
        searchInput?.addEventListener('input', handleSearch);
        
        // 搜索按钮
        searchBtn?.addEventListener('click', handleSearch);
    }

    /**
     * 设置批量操作
     */
    setupBatchActions() {
        const batchDelete = document.getElementById('batch-delete');
        const batchCategory = document.getElementById('batch-category');
        const clearSelection = document.getElementById('clear-selection');
        
        // 批量删除
        batchDelete?.addEventListener('click', async () => {
            if (this.selectedImages.size === 0) return;
            
            const confirmed = await adminUtils.confirm(
                `确定要删除选中的 ${this.selectedImages.size} 张图片吗？此操作不可撤销。`,
                '确认删除'
            );
            
            if (!confirmed) return;
            
            // 删除选中的图片
            this.images = this.images.filter(img => !this.selectedImages.has(img.id));
            
            // 清空选择
            this.selectedImages.clear();
            
            // 保存数据
            this.saveImages();
            
            // 重新渲染
            this.renderImages();
            
            // 更新选择UI
            this.updateSelectionUI();
            
            // 显示成功消息
            adminUtils.showToast('选中的图片已删除', 'success');
        });
        
        // 批量修改分类
        batchCategory?.addEventListener('click', () => {
            if (this.selectedImages.size === 0) return;
            
            // 这里可以添加批量修改分类的逻辑
            adminUtils.showToast('批量修改分类功能开发中', 'info');
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
        const importBtn = document.getElementById('import-data-btn');
        const importFile = document.getElementById('import-file');
        
        // 导出数据
        exportBtn?.addEventListener('click', () => {
            this.exportData();
        });
        
        // 导入数据
        importBtn?.addEventListener('click', () => {
            importFile?.click();
        });
        
        importFile?.addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });
    }

    /**
     * 导出数据
     */
    exportData() {
        const data = {
            images: this.images,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const filename = `images_backup_${adminUtils.formatDate(new Date(), 'YYYYMMDD_HHmmss')}.json`;
        adminUtils.exportToJSON(data, filename);
        
        // 更新最后备份时间
        const lastBackupTime = document.getElementById('last-backup-time');
        if (lastBackupTime) {
            lastBackupTime.textContent = adminUtils.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
        }
        
        adminUtils.showToast('数据导出成功', 'success');
    }

    /**
     * 导入数据
     * @param {File} file - 导入的文件
     */
    async importData(file) {
        if (!file) return;
        
        try {
            adminUtils.showLoading('正在导入数据...');
            
            const data = await adminUtils.importFromJSON(file);
            
            if (data.images && Array.isArray(data.images)) {
                // 备份当前数据
                const backup = {
                    images: this.images,
                    backupDate: new Date().toISOString()
                };
                adminUtils.storage.set('admin_images_backup', backup);
                
                // 导入新数据
                this.images = data.images;
                this.saveImages();
                
                // 重新渲染
                this.renderImages();
                
                adminUtils.hideLoading();
                adminUtils.showToast('数据导入成功', 'success');
            } else {
                throw new Error('无效的数据格式');
            }
        } catch (error) {
            adminUtils.hideLoading();
            console.error('导入数据失败:', error);
            adminUtils.showToast('导入数据失败: ' + error.message, 'error');
        }
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const totalImages = document.getElementById('total-images');
        if (totalImages) {
            totalImages.textContent = this.images.length;
        }
        
        const lastBackupTime = document.getElementById('last-backup-time');
        if (lastBackupTime && !lastBackupTime.textContent) {
            lastBackupTime.textContent = '未备份';
        }
    }

    /**
     * 切换视图
     * @param {string} view - 视图类型 (grid/list)
     */
    switchView(view) {
        if (this.currentView === view) return;
        
        this.currentView = view;
        
        // 更新按钮状态
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // 重新渲染
        this.renderImages();
    }

    /**
     * 获取分类标签
     * @param {string} category - 分类值
     * @returns {string} 分类标签
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

// 创建全局实例但不立即初始化
const imageManager = new ImageManager();

// 导出到全局作用域
window.ImageManager = ImageManager;
window.imageManager = imageManager;

// 初始化将由 admin/index.html 中的脚本调用
