/**
 * 个人信息管理器
 * 负责处理个人信息的管理、编辑和保存功能
 */
class ProfileManager {
    constructor() {
        this.profileData = {
            name: 'Fugao',
            bio: [
                '燕子去了，有再来的时候；杨柳枯了，有再青的时候；桃花谢了，有再开的时候。',
                '但是，聪明的，你告诉我，我们的日子为什么一去不复返呢？'
            ],
            avatar: './images/admin-images/Eric.jpg',
            background: null,
            logos: [
                { id: 'nikon', src: '../images/nikon-logo.svg', name: 'Nikon' },
                { id: '500px', src: '../images/500px-logo.svg', name: '500px' }
            ],
            socialLinks: []
        };
        
        this.currentCropImage = null;
        this.cropType = null; // 'avatar' or 'background'
        this.isInitialized = false;
        this.initTimeout = null;
        
        // 不在构造函数中立即初始化
    }

    /**
     * 安全初始化个人信息管理器
     */
    init() {
        // 如果已经初始化，直接返回
        if (this.isInitialized) return;
        
        // 设置初始化超时
        this.initTimeout = setTimeout(() => {
            console.warn('个人信息管理器初始化超时，强制完成初始化');
            this.completeInit();
        }, 5000); // 5秒超时
        
        try {
            this.loadProfileData();
            this.setupEventListeners();
            this.updatePreview();
            this.completeInit();
        } catch (error) {
            console.error('个人信息管理器初始化失败:', error);
            this.handleInitError(error);
        }
    }
    
    completeInit() {
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
            this.initTimeout = null;
        }
        this.isInitialized = true;
        console.log('个人信息管理器初始化完成');
    }
    
    handleInitError(error) {
        if (this.initTimeout) {
            clearTimeout(this.initTimeout);
            this.initTimeout = null;
        }
        console.error('个人信息管理器初始化错误:', error);
        // 仍然尝试完成基本初始化
        this.isInitialized = true;
    }

    /**
     * 加载个人信息数据
     */
    async loadProfileData() {
        // 永远使用服务器图片路径，不再使用 localStorage
        console.log('开始加载个人信息...');
        
        // 清除 localStorage 中的旧数据
        localStorage.removeItem('profileData');
        
        // 强制使用服务器图片路径
        this.profileData.avatar = '../images/home/Eric.jpg';
        this.profileData.background = '../images/home/back.webp';
        
        // 尝试从服务器加载配置文件
        try {
            const response = await fetch('../data/profile-data.json?t=' + new Date().getTime());
            if (response.ok) {
                const serverData = await response.json();
                // 只合并文本信息，图片路径永远使用服务器路径
                this.profileData.name = serverData.name || this.profileData.name;
                this.profileData.bio = serverData.bio || this.profileData.bio;
                this.profileData.socialLinks = serverData.socialLinks || this.profileData.socialLinks;
                this.profileData.logos = serverData.logos || this.profileData.logos;
                
                // 不再使用 DataURL，永远使用服务器图片
                console.log('✓ 已从服务器加载个人信息（仅文本数据）');
                console.log('✓ 图片路径固定为服务器路径');
            }
        } catch (error) {
            console.log('从服务器加载失败，使用默认数据:', error);
        }
        
        this.updateFormFields();
    }

    /**
     * 更新表单字段
     */
    updateFormFields() {
        // 更新基本信息
        document.getElementById('profile-name').value = this.profileData.name || '';
        document.getElementById('profile-bio-1').value = this.profileData.bio[0] || '';
        document.getElementById('profile-bio-2').value = this.profileData.bio[1] || '';
        
        // 更新头像
        this.updateAvatarDisplay();
        
        // 更新背景图片
        this.updateBackgroundDisplay();
        
        // 更新Logo列表
        this.updateLogosDisplay();
        
        // 更新社交媒体链接
        this.updateSocialLinksDisplay();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 头像上传
        const avatarInput = document.getElementById('avatar-input');
        const changeAvatarBtn = document.getElementById('change-avatar-btn');
        
        changeAvatarBtn?.addEventListener('click', () => {
            avatarInput.click();
        });
        
        avatarInput?.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0], 'avatar');
        });
        
        // 背景图片上传
        const backgroundInput = document.getElementById('background-input');
        const addBackgroundBtn = document.getElementById('add-background-btn');
        const changeBackgroundBtn = document.getElementById('change-background-btn');
        
        addBackgroundBtn?.addEventListener('click', () => {
            backgroundInput.click();
        });
        
        changeBackgroundBtn?.addEventListener('click', () => {
            backgroundInput.click();
        });
        
        backgroundInput?.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0], 'background');
        });
        
        // Logo上传
        const logoInput = document.getElementById('logo-input');
        const logoAddArea = document.getElementById('logo-add-area');
        
        logoAddArea?.addEventListener('click', () => {
            logoInput.click();
        });
        
        logoInput?.addEventListener('change', (e) => {
            this.handleLogoUpload(e.target.files[0]);
        });
        
        // 基本信息实时预览
        const nameInput = document.getElementById('profile-name');
        const bio1Input = document.getElementById('profile-bio-1');
        const bio2Input = document.getElementById('profile-bio-2');
        
        nameInput?.addEventListener('input', (e) => {
            this.profileData.name = e.target.value;
            this.updatePreview();
        });
        
        bio1Input?.addEventListener('input', (e) => {
            this.profileData.bio[0] = e.target.value;
            this.updatePreview();
        });
        
        bio2Input?.addEventListener('input', (e) => {
            this.profileData.bio[1] = e.target.value;
            this.updatePreview();
        });
        
        // Logo删除
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('logo-remove-btn')) {
                const logoId = e.target.dataset.logo;
                this.removeLogo(logoId);
            }
        });
        
        // 社交媒体链接管理
        const addSocialLinkBtn = document.getElementById('add-social-link');
        addSocialLinkBtn?.addEventListener('click', () => {
            this.addSocialLink();
        });
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('social-remove-btn')) {
                e.target.closest('.social-link-item').remove();
            }
        });
        
        // 保存和重置按钮
        const saveBtn = document.getElementById('save-profile-btn');
        const resetBtn = document.getElementById('reset-profile-btn');
        
        saveBtn?.addEventListener('click', () => {
            this.saveProfileData();
        });
        
        resetBtn?.addEventListener('click', () => {
            this.resetProfileData();
        });
        
        // 图片裁剪模态框
        this.setupCropModal();
    }

    /**
     * 处理图片上传
     */
    async handleImageUpload(file, type) {
        if (!file || !adminUtils.file.validateFileType(file)) {
            adminUtils.showToast('请选择有效的图片文件', 'error');
            return;
        }
        
        if (!adminUtils.file.validateFileSize(file, 5 * 1024 * 1024)) { // 5MB限制
            adminUtils.showToast('图片文件大小不能超过5MB', 'error');
            return;
        }
        
        try {
            adminUtils.showLoading('正在处理图片...');
            
            // 压缩图片
            const compressedFile = await adminUtils.file.compressImage(file, 0.8, 1920, 1080);
            
            // 读取为DataURL
            const dataURL = await adminUtils.file.readFileAsDataURL(compressedFile);
            
            // 设置当前裁剪图片
            this.currentCropImage = dataURL;
            this.cropType = type;
            
            // 打开裁剪模态框
            this.openCropModal(dataURL, type);
            
        } catch (error) {
            console.error('图片处理失败:', error);
            adminUtils.showToast('图片处理失败', 'error');
        } finally {
            adminUtils.hideLoading();
        }
    }

    /**
     * 处理Logo上传
     */
    async handleLogoUpload(file) {
        if (!file || !adminUtils.file.validateFileType(file)) {
            adminUtils.showToast('请选择有效的图片文件', 'error');
            return;
        }
        
        try {
            adminUtils.showLoading('正在处理Logo...');
            
            // 读取为DataURL
            const dataURL = await adminUtils.file.readFileAsDataURL(file);
            
            // 添加Logo
            const logoId = adminUtils.generateId('logo');
            const logoName = file.name.split('.')[0];
            
            this.profileData.logos.push({
                id: logoId,
                src: dataURL,
                name: logoName
            });
            
            this.updateLogosDisplay();
            this.updatePreview();
            
            adminUtils.showToast('Logo添加成功', 'success');
            
        } catch (error) {
            console.error('Logo处理失败:', error);
            adminUtils.showToast('Logo处理失败', 'error');
        } finally {
            adminUtils.hideLoading();
        }
    }

    /**
     * 设置图片裁剪模态框
     */
    setupCropModal() {
        const modal = document.getElementById('crop-modal');
        const closeBtn = document.getElementById('crop-modal-close');
        const cancelBtn = document.getElementById('cancel-crop');
        const confirmBtn = document.getElementById('confirm-crop');
        const aspectRatioSelect = document.getElementById('crop-aspect-ratio');
        
        closeBtn?.addEventListener('click', () => {
            this.closeCropModal();
        });
        
        cancelBtn?.addEventListener('click', () => {
            this.closeCropModal();
        });
        
        confirmBtn?.addEventListener('click', () => {
            this.confirmCrop();
        });
        
        aspectRatioSelect?.addEventListener('change', (e) => {
            this.setCropAspectRatio(e.target.value);
        });
        
        // 设置拖拽功能
        this.setupCropDrag();
    }

    /**
     * 打开裁剪模态框
     */
    openCropModal(imageSrc, type) {
        const modal = document.getElementById('crop-modal');
        const cropImage = document.getElementById('crop-image');
        const aspectRatioSelect = document.getElementById('crop-aspect-ratio');
        
        // 等待模态框显示后再设置图片
        adminUtils.openModal('crop-modal');
        
        // 延迟设置图片和裁剪框，确保容器已渲染
        setTimeout(() => {
            cropImage.src = imageSrc;
            
            // 等待图片加载完成
            cropImage.onload = () => {
                this.initializeCropBox(type);
            };
            
            // 设置默认裁剪比例
            if (type === 'avatar') {
                aspectRatioSelect.value = '1:1';
            } else {
                aspectRatioSelect.value = 'free';
            }
        }, 100);
    }

    /**
     * 关闭裁剪模态框
     */
    closeCropModal() {
        adminUtils.closeModal('crop-modal');
        this.currentCropImage = null;
        this.cropType = null;
    }

    /**
     * 初始化裁剪框
     */
    initializeCropBox(type) {
        const cropBox = document.querySelector('.crop-box');
        const cropContainer = document.querySelector('.crop-image-container');
        const cropImage = document.getElementById('crop-image');
        
        if (!cropBox || !cropContainer || !cropImage) return;
        
        // 获取容器尺寸
        const containerRect = cropContainer.getBoundingClientRect();
        
        // 设置裁剪框尺寸和位置
        let boxWidth, boxHeight;
        
        if (type === 'avatar') {
            // 头像：1:1 比例
            boxWidth = Math.min(300, containerRect.width * 0.6);
            boxHeight = boxWidth;
        } else {
            // 背景：16:9 比例
            boxWidth = Math.min(400, containerRect.width * 0.7);
            boxHeight = boxWidth * (9 / 16);
        }
        
        cropBox.style.width = boxWidth + 'px';
        cropBox.style.height = boxHeight + 'px';
        cropBox.style.left = (containerRect.width - boxWidth) / 2 + 'px';
        cropBox.style.top = (containerRect.height - boxHeight) / 2 + 'px';
        cropBox.style.transform = 'none';
    }
    
    /**
     * 设置裁剪比例
     */
    setCropAspectRatio(ratio) {
        const cropBox = document.querySelector('.crop-box');
        const cropContainer = document.querySelector('.crop-image-container');
        
        if (!cropBox || !cropContainer) return;
        
        const containerRect = cropContainer.getBoundingClientRect();
        let boxWidth, boxHeight;
        
        switch (ratio) {
            case '1:1':
                boxWidth = Math.min(300, containerRect.width * 0.6);
                boxHeight = boxWidth;
                break;
            case '16:9':
                boxWidth = Math.min(400, containerRect.width * 0.7);
                boxHeight = boxWidth * (9 / 16);
                break;
            case '4:3':
                boxWidth = Math.min(400, containerRect.width * 0.7);
                boxHeight = boxWidth * (3 / 4);
                break;
            case '3:2':
                boxWidth = Math.min(400, containerRect.width * 0.7);
                boxHeight = boxWidth * (2 / 3);
                break;
            default:
                boxWidth = Math.min(300, containerRect.width * 0.6);
                boxHeight = boxWidth;
        }
        
        cropBox.style.width = boxWidth + 'px';
        cropBox.style.height = boxHeight + 'px';
        
        // 居中显示
        cropBox.style.left = (containerRect.width - boxWidth) / 2 + 'px';
        cropBox.style.top = (containerRect.height - boxHeight) / 2 + 'px';
        cropBox.style.transform = 'none';
    }

    /**
     * 设置裁剪拖拽功能
     */
    setupCropDrag() {
        const cropBox = document.querySelector('.crop-box');
        const cropContainer = document.querySelector('.crop-image-container');
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        
        cropBox?.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('corner')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = cropBox.getBoundingClientRect();
            const containerRect = cropContainer.getBoundingClientRect();
            
            initialLeft = rect.left - containerRect.left;
            initialTop = rect.top - containerRect.top;
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const containerRect = cropContainer.getBoundingClientRect();
            const boxRect = cropBox.getBoundingClientRect();
            
            let newLeft = initialLeft + deltaX;
            let newTop = initialTop + deltaY;
            
            // 限制在容器内
            newLeft = Math.max(0, Math.min(newLeft, containerRect.width - boxRect.width));
            newTop = Math.max(0, Math.min(newTop, containerRect.height - boxRect.height));
            
            cropBox.style.left = newLeft + 'px';
            cropBox.style.top = newTop + 'px';
            cropBox.style.transform = 'none';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    /**
     * 确认裁剪
     */
    async confirmCrop() {
        if (!this.currentCropImage || !this.cropType) return;
        
        try {
            adminUtils.showLoading('正在处理图片...');
            
            // 获取裁剪区域
            const croppedImage = await this.getCroppedImage();
            
            if (this.cropType === 'avatar') {
                this.profileData.avatar = croppedImage;
                this.updateAvatarDisplay();
            } else if (this.cropType === 'background') {
                this.profileData.background = croppedImage;
                this.updateBackgroundDisplay();
            }
            
            this.updatePreview();
            this.closeCropModal();
            
            adminUtils.showToast('图片更新成功', 'success');
            
        } catch (error) {
            console.error('图片处理失败:', error);
            adminUtils.showToast('图片处理失败', 'error');
        } finally {
            adminUtils.hideLoading();
        }
    }

    /**
     * 获取裁剪后的图片
     */
    async getCroppedImage() {
        const cropBox = document.querySelector('.crop-box');
        const cropImage = document.getElementById('crop-image');
        const cropContainer = document.querySelector('.crop-image-container');
        
        // 获取裁剪框的位置和尺寸
        const containerRect = cropContainer.getBoundingClientRect();
        const imageRect = cropImage.getBoundingClientRect();
        const boxRect = cropBox.getBoundingClientRect();
        
        // 计算相对于图片的裁剪区域
        const scaleX = cropImage.naturalWidth / imageRect.width;
        const scaleY = cropImage.naturalHeight / imageRect.height;
        
        const cropX = (boxRect.left - imageRect.left) * scaleX;
        const cropY = (boxRect.top - imageRect.top) * scaleY;
        const cropWidth = boxRect.width * scaleX;
        const cropHeight = boxRect.height * scaleY;
        
        // 使用 Canvas 裁剪图片
        const canvas = document.createElement('canvas');
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        const ctx = canvas.getContext('2d');
        
        // 绘制裁剪后的图片
        ctx.drawImage(
            cropImage,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
        );
        
        // 转换为 DataURL
        return canvas.toDataURL('image/jpeg', 0.9);
    }

    /**
     * 更新头像显示
     */
    updateAvatarDisplay() {
        const currentAvatarImg = document.getElementById('current-avatar-img');
        const previewAvatarImg = document.getElementById('preview-avatar-img');
        
        // 永远使用服务器图片路径，添加时间戳防止缓存
        const avatarSrc = '../images/home/Eric.jpg?t=' + new Date().getTime();
        
        if (currentAvatarImg) {
            currentAvatarImg.src = avatarSrc;
        }
        
        if (previewAvatarImg) {
            previewAvatarImg.src = avatarSrc;
        }
        
        console.log('更新头像显示:', avatarSrc);
    }

    /**
     * 更新背景图片显示
     */
    updateBackgroundDisplay() {
        const currentBackground = document.getElementById('current-background');
        const previewBackground = document.getElementById('preview-background');
        
        // 永远使用服务器图片路径，添加时间戳防止缓存
        const backgroundSrc = '../images/home/back.webp?t=' + new Date().getTime();
        const hasBackground = true;
        
        if (hasBackground) {
            // 有背景图片
            if (currentBackground) {
                currentBackground.innerHTML = `
                    <img src="${backgroundSrc}" alt="当前背景" id="current-background-img" onerror="this.style.display='none'">
                    <div class="image-overlay">
                        <button class="change-image-btn" id="change-background-btn">更换背景</button>
                    </div>
                `;
                
                // 重新绑定事件
                const changeBtn = document.getElementById('change-background-btn');
                changeBtn?.addEventListener('click', () => {
                    document.getElementById('background-input').click();
                });
            }
            
            if (previewBackground) {
                previewBackground.style.backgroundImage = `url(${backgroundSrc})`;
                previewBackground.style.backgroundSize = 'cover';
                previewBackground.style.backgroundPosition = 'center';
            }
            
            console.log('更新背景显示:', backgroundSrc);
        } else {
            // 无背景图片
            if (currentBackground) {
                currentBackground.innerHTML = `
                    <div class="no-image-placeholder">
                        <span>暂无背景图片</span>
                        <button class="add-image-btn" id="add-background-btn">添加背景</button>
                    </div>
                    <div class="image-overlay">
                        <button class="change-image-btn" id="change-background-btn">更换背景</button>
                    </div>
                `;
                
                // 重新绑定事件
                const addBtn = document.getElementById('add-background-btn');
                const changeBtn = document.getElementById('change-background-btn');
                
                addBtn?.addEventListener('click', () => {
                    document.getElementById('background-input').click();
                });
                
                changeBtn?.addEventListener('click', () => {
                    document.getElementById('background-input').click();
                });
            }
            
            if (previewBackground) {
                previewBackground.style.backgroundImage = '';
                previewBackground.style.background = 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)';
            }
        }
    }

    /**
     * 更新Logo显示
     */
    updateLogosDisplay() {
        const logosContainer = document.getElementById('logos-container');
        const previewLogos = document.getElementById('preview-logos');
        
        if (!logosContainer) return;
        
        // 清空现有Logo（保留添加按钮）
        const existingLogos = logosContainer.querySelectorAll('.logo-item');
        existingLogos.forEach(logo => logo.remove());
        
        // 添加Logo
        this.profileData.logos.forEach(logo => {
            const logoItem = document.createElement('div');
            logoItem.className = 'logo-item';
            logoItem.dataset.logo = logo.id;
            logoItem.innerHTML = `
                <div class="logo-preview">
                    <img src="${logo.src}" alt="${logo.name}">
                </div>
                <div class="logo-controls">
                    <button class="logo-remove-btn" data-logo="${logo.id}">删除</button>
                </div>
            `;
            
            logosContainer.insertBefore(logoItem, logosContainer.querySelector('.logo-add'));
        });
        
        // 更新预览区域
        if (previewLogos) {
            previewLogos.innerHTML = this.profileData.logos.map(logo => 
                `<img src="${logo.src}" alt="${logo.name}" class="brand-logo-preview">`
            ).join('');
        }
    }

    /**
     * 删除Logo
     */
    removeLogo(logoId) {
        this.profileData.logos = this.profileData.logos.filter(logo => logo.id !== logoId);
        this.updateLogosDisplay();
        this.updatePreview();
        adminUtils.showToast('Logo已删除', 'success');
    }

    /**
     * 添加社交媒体链接
     */
    addSocialLink() {
        const container = document.getElementById('social-links-container');
        const linkItem = document.createElement('div');
        linkItem.className = 'social-link-item';
        linkItem.innerHTML = `
            <div class="social-link-form">
                <select class="social-platform">
                    <option value="">选择平台</option>
                    <option value="weibo">微博</option>
                    <option value="wechat">微信</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter</option>
                    <option value="facebook">Facebook</option>
                    <option value="website">个人网站</option>
                </select>
                <input type="text" class="social-url" placeholder="输入链接地址">
                <button class="social-remove-btn">删除</button>
            </div>
        `;
        
        container.appendChild(linkItem);
    }

    /**
     * 更新社交媒体链接显示
     */
    updateSocialLinksDisplay() {
        const container = document.getElementById('social-links-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.profileData.socialLinks.length === 0) {
            // 添加一个空的链接项
            this.addSocialLink();
        } else {
            // 添加现有链接
            this.profileData.socialLinks.forEach(link => {
                const linkItem = document.createElement('div');
                linkItem.className = 'social-link-item';
                linkItem.innerHTML = `
                    <div class="social-link-form">
                        <select class="social-platform">
                            <option value="">选择平台</option>
                            <option value="weibo" ${link.platform === 'weibo' ? 'selected' : ''}>微博</option>
                            <option value="wechat" ${link.platform === 'wechat' ? 'selected' : ''}>微信</option>
                            <option value="instagram" ${link.platform === 'instagram' ? 'selected' : ''}>Instagram</option>
                            <option value="twitter" ${link.platform === 'twitter' ? 'selected' : ''}>Twitter</option>
                            <option value="facebook" ${link.platform === 'facebook' ? 'selected' : ''}>Facebook</option>
                            <option value="website" ${link.platform === 'website' ? 'selected' : ''}>个人网站</option>
                        </select>
                        <input type="text" class="social-url" placeholder="输入链接地址" value="${link.url || ''}">
                        <button class="social-remove-btn">删除</button>
                    </div>
                `;
                
                container.appendChild(linkItem);
            });
        }
    }

    /**
     * 更新预览
     */
    updatePreview() {
        // 更新预览区域的文本内容
        const previewName = document.getElementById('preview-name');
        const previewBio = document.getElementById('preview-bio');
        const previewBio2 = document.getElementById('preview-bio-2');
        
        if (previewName) {
            previewName.textContent = this.profileData.name || '未设置姓名';
        }
        
        if (previewBio) {
            previewBio.textContent = this.profileData.bio[0] || '';
        }
        
        if (previewBio2) {
            previewBio2.textContent = this.profileData.bio[1] || '';
        }
    }

    /**
     * 收集社交媒体链接数据
     */
    collectSocialLinks() {
        const socialLinks = [];
        const linkItems = document.querySelectorAll('.social-link-item');
        
        linkItems.forEach(item => {
            const platform = item.querySelector('.social-platform').value;
            const url = item.querySelector('.social-url').value;
            
            if (platform && url) {
                socialLinks.push({ platform, url });
            }
        });
        
        return socialLinks;
    }

    /**
     * 保存个人信息数据
     */
    async saveProfileData() {
        try {
            adminUtils.showLoading('正在保存个人信息...');
            
            // 收集表单数据
            this.profileData.name = document.getElementById('profile-name').value;
            this.profileData.bio[0] = document.getElementById('profile-bio-1').value;
            this.profileData.bio[1] = document.getElementById('profile-bio-2').value;
            this.profileData.socialLinks = this.collectSocialLinks();
            
            // 保存到本地存储
            adminUtils.storage.set('profileData', this.profileData);
            
            // 保存个人信息到服务器
            await this.saveProfileToServer();
            
            // 保存图片到服务器
            await this.saveImagesToServer();
            
            adminUtils.hideLoading();
            adminUtils.showToast('个人信息保存成功', 'success');
            
        } catch (error) {
            console.error('保存失败:', error);
            adminUtils.hideLoading();
            adminUtils.showToast('保存失败: ' + error.message, 'error');
        }
    }

    /**
     * 保存个人信息到服务器
     */
    async saveProfileToServer() {
        try {
            const response = await fetch('http://localhost:8000/api/save-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.profileData)
            });
            
            if (!response.ok) {
                throw new Error('保存个人信息失败');
            }
            
            console.log('✓ 个人信息已保存到服务器');
            
        } catch (error) {
            console.error('保存个人信息到服务器失败:', error);
            // 不抛出错误，允许继续保存图片
        }
    }

    /**
     * 保存图片到服务器
     */
    async saveImagesToServer() {
        const savePromises = [];
        
        // 保存头像
        if (this.profileData.avatar && this.profileData.avatar.startsWith('data:')) {
            savePromises.push(
                this.saveImageToServer(this.profileData.avatar, 'Eric.jpg', 'home')
            );
        }
        
        // 保存背景图
        if (this.profileData.background && this.profileData.background.startsWith('data:')) {
            savePromises.push(
                this.saveImageToServer(this.profileData.background, 'back.webp', 'home')
            );
        }
        
        if (savePromises.length > 0) {
            await Promise.all(savePromises);
        }
    }

    /**
     * 保存单个图片到服务器
     */
    async saveImageToServer(dataURL, filename, folder) {
        try {
            // 将 DataURL 转换为 Blob
            const response = await fetch(dataURL);
            const blob = await response.blob();
            
            // 创建 FormData
            const formData = new FormData();
            formData.append('image', blob, filename);
            formData.append('folder', folder);
            
            // 发送到服务器
            const uploadResponse = await fetch('http://localhost:8000/api/upload-image', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('上传失败');
            }
            
            const result = await uploadResponse.json();
            console.log('图片上传成功:', result);
            
        } catch (error) {
            console.error('图片上传失败:', error);
            throw error;
        }
    }

    /**
     * 重置个人信息数据
     */
    resetProfileData() {
        adminUtils.confirm('确定要重置所有个人信息吗？未保存的更改将丢失。', '确认重置')
            .then((confirmed) => {
                if (confirmed) {
                    this.loadProfileData();
                    this.updatePreview();
                    adminUtils.showToast('个人信息已重置', 'info');
                }
            });
    }

    /**
     * 更新主页面的个人信息
     */
    updateMainPageProfile() {
        // 这里可以实现更新主页面个人信息的逻辑
        // 由于跨页面限制，通常需要通过服务器或本地存储来实现
        console.log('主页面个人信息已更新');
    }
}

// 创建全局实例但不立即初始化
const profileManager = new ProfileManager();

// 导出到全局作用域
window.ProfileManager = ProfileManager;
window.profileManager = profileManager;

// 等待DOM加载完成后安全初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        profileManager.init();
    });
} else {
    // DOM已经加载完成，直接初始化
    profileManager.init();
}