/**
 * 管理工具通用函数库
 * 提供常用的工具函数和辅助方法
 */

// 工具函数类
class AdminUtils {
    constructor() {
        // 不在构造函数中立即初始化，等待DOM加载完成
        this.isInitialized = false;
        this.initTimeout = null;
    }

    /**
     * 安全初始化方法，带有超时处理
     */
    safeInit() {
        // 如果已经初始化，直接返回
        if (this.isInitialized) return;
        
        // 设置初始化超时
        this.initTimeout = setTimeout(() => {
            console.warn('AdminUtils初始化超时，强制完成初始化');
            this.completeInit();
        }, 5000); // 5秒超时
        
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            // DOM已经加载完成，直接初始化
            this.init();
        }
    }

    init() {
        try {
            // 清除超时
            if (this.initTimeout) {
                clearTimeout(this.initTimeout);
                this.initTimeout = null;
            }
            
            // 初始化事件监听器
            this.initEventListeners();
            // 初始化模态框
            this.initModals();
            // 初始化提示消息
            this.initToast();
            
            this.completeInit();
        } catch (error) {
            console.error('AdminUtils初始化失败:', error);
            this.handleInitError(error);
        }
    }
    
    completeInit() {
        this.isInitialized = true;
        // 隐藏加载提示
        this.hideLoading();
        console.log('AdminUtils初始化完成');
    }
    
    handleInitError(error) {
        console.error('AdminUtils初始化错误:', error);
        this.showToast('管理工具初始化失败，请刷新页面重试', 'error');
        this.hideLoading();
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 侧边栏菜单切换
        this.setupSidebarNavigation();
        this.setupMobileMenu();
    }

    /**
     * 设置侧边栏导航
     */
    setupSidebarNavigation() {
        const menuItems = document.querySelectorAll('.menu-item');
        const contentSections = document.querySelectorAll('.content-section');

        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // 移除所有活动状态
                menuItems.forEach(mi => mi.classList.remove('active'));
                contentSections.forEach(cs => cs.classList.remove('active'));
                
                // 添加当前活动状态
                item.classList.add('active');
                const sectionId = item.dataset.section + '-section';
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
            });
        });
    }

    /**
     * 设置移动端菜单
     */
    setupMobileMenu() {
        // 移动端菜单切换逻辑
        const sidebar = document.querySelector('.admin-sidebar');
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
            });
        }

        // 点击外部关闭移动端菜单
        document.addEventListener('click', (e) => {
            if (sidebar && !sidebar.contains(e.target) && menuToggle && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }

    /**
     * 初始化模态框
     */
    initModals() {
        // 获取所有模态框
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('.modal-close');
            const cancelBtn = modal.querySelector('.btn-secondary');
            
            // 关闭按钮事件
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeModal(modal.id);
                });
            }
            
            // 取消按钮事件
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.closeModal(modal.id);
                });
            }
            
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    /**
     * 打开模态框
     * @param {string} modalId - 模态框ID
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * 关闭模态框
     * @param {string} modalId - 模态框ID
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * 初始化提示消息
     */
    initToast() {
        const toast = document.getElementById('toast');
        const toastClose = document.getElementById('toast-close');
        
        if (toastClose) {
            toastClose.addEventListener('click', () => {
                this.hideToast();
            });
        }
    }

    /**
     * 显示提示消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success, error, warning, info)
     * @param {number} duration - 显示时长(毫秒)
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        if (!toast || !toastMessage) return;
        
        // 设置消息内容
        toastMessage.textContent = message;
        
        // 设置消息类型样式
        toast.className = 'toast show';
        if (type !== 'info') {
            toast.classList.add(type);
        }
        
        // 自动隐藏
        setTimeout(() => {
            this.hideToast();
        }, duration);
    }

    /**
     * 隐藏提示消息
     */
    hideToast() {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.classList.remove('show');
        }
    }

    /**
     * 显示加载覆盖层
     * @param {string} message - 加载消息
     */
    showLoading(message = '处理中，请稍候...') {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = loadingOverlay?.querySelector('p');
        
        if (loadingOverlay) {
            if (loadingText) {
                loadingText.textContent = message;
            }
            loadingOverlay.style.display = 'flex';
            loadingOverlay.hidden = false; // Fallback
        }
    }

    /**
     * 隐藏加载覆盖层
     */
    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            loadingOverlay.hidden = true; // Fallback
        }
    }

    /**
     * 格式化日期
     * @param {Date|string} date - 日期对象或日期字符串
     * @param {string} format - 格式化模式
     * @returns {string} 格式化后的日期字符串
     */
    formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    /**
     * 生成唯一ID
     * @param {string} prefix - ID前缀
     * @returns {string} 唯一ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间(毫秒)
     * @returns {Function} 防抖后的函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 限制时间(毫秒)
     * @returns {Function} 节流后的函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 深拷贝对象
     * @param {any} obj - 要拷贝的对象
     * @returns {any} 拷贝后的对象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    /**
     * 本地存储操作
     */
    storage = {
        /**
         * 设置本地存储
         * @param {string} key - 键名
         * @param {any} value - 值
         */
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('存储数据失败:', error);
            }
        },

        /**
         * 获取本地存储
         * @param {string} key - 键名
         * @param {any} defaultValue - 默认值
         * @returns {any} 存储的值或默认值
         */
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('获取数据失败:', error);
                return defaultValue;
            }
        },

        /**
         * 删除本地存储
         * @param {string} key - 键名
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('删除数据失败:', error);
            }
        },

        /**
         * 清空本地存储
         */
        clear() {
            try {
                localStorage.clear();
            } catch (error) {
                console.error('清空数据失败:', error);
            }
        }
    };

    /**
     * 文件操作工具
     */
    file = {
        /**
         * 读取文件为DataURL
         * @param {File} file - 文件对象
         * @returns {Promise<string>} DataURL
         */
        readFileAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        /**
         * 压缩图片
         * @param {File} file - 图片文件
         * @param {number} quality - 压缩质量 (0-1)
         * @param {number} maxWidth - 最大宽度
         * @param {number} maxHeight - 最大高度
         * @returns {Promise<Blob>} 压缩后的图片
         */
        compressImage(file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    // 计算新尺寸
                    let { width, height } = img;
                    
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width *= ratio;
                        height *= ratio;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // 绘制压缩后的图片
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 转换为Blob
                    canvas.toBlob(resolve, 'image/jpeg', quality);
                };
                
                img.src = URL.createObjectURL(file);
            });
        },

        /**
         * 获取文件扩展名
         * @param {string} filename - 文件名
         * @returns {string} 文件扩展名
         */
        getFileExtension(filename) {
            return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
        },

        /**
         * 验证文件类型
         * @param {File} file - 文件对象
         * @param {string[]} allowedTypes - 允许的文件类型数组
         * @returns {boolean} 是否为允许的文件类型
         */
        validateFileType(file, allowedTypes = ['image/jpeg', 'image/png', 'image/webp']) {
            return allowedTypes.includes(file.type);
        },

        /**
         * 验证文件大小
         * @param {File} file - 文件对象
         * @param {number} maxSize - 最大文件大小(字节)
         * @returns {boolean} 是否在允许的大小范围内
         */
        validateFileSize(file, maxSize = 10 * 1024 * 1024) { // 默认10MB
            return file.size <= maxSize;
        },

        /**
         * 格式化文件大小
         * @param {number} bytes - 字节数
         * @returns {string} 格式化后的文件大小
         */
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    };

    /**
     * 表单验证工具
     */
    validation = {
        /**
         * 验证必填字段
         * @param {string} value - 字段值
         * @returns {boolean} 是否通过验证
         */
        required(value) {
            return value !== null && value !== undefined && value.toString().trim() !== '';
        },

        /**
         * 验证邮箱格式
         * @param {string} email - 邮箱地址
         * @returns {boolean} 是否为有效邮箱
         */
        email(email) {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(email);
        },

        /**
         * 验证字符串长度
         * @param {string} value - 字符串值
         * @param {number} min - 最小长度
         * @param {number} max - 最大长度
         * @returns {boolean} 是否在长度范围内
         */
        length(value, min = 0, max = Infinity) {
            const length = value ? value.length : 0;
            return length >= min && length <= max;
        },

        /**
         * 验证表单
         * @param {HTMLFormElement} form - 表单元素
         * @param {Object} rules - 验证规则
         * @returns {Object} 验证结果
         */
        validateForm(form, rules) {
            const errors = {};
            let isValid = true;
            
            for (const fieldName in rules) {
                const field = form.elements[fieldName];
                const value = field ? field.value : '';
                const fieldRules = rules[fieldName];
                
                for (const rule of fieldRules) {
                    if (rule.type === 'required' && !this.required(value)) {
                        errors[fieldName] = rule.message || '此字段为必填项';
                        isValid = false;
                        break;
                    }
                    
                    if (rule.type === 'email' && !this.email(value)) {
                        errors[fieldName] = rule.message || '请输入有效的邮箱地址';
                        isValid = false;
                        break;
                    }
                    
                    if (rule.type === 'length' && !this.length(value, rule.min, rule.max)) {
                        errors[fieldName] = rule.message || `长度应在${rule.min}-${rule.max}个字符之间`;
                        isValid = false;
                        break;
                    }
                }
            }
            
            return { isValid, errors };
        }
    };

    /**
     * 导出数据为JSON文件
     * @param {Object} data - 要导出的数据
     * @param {string} filename - 文件名
     */
    exportToJSON(data, filename = 'data.json') {
        try {
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('导出数据失败:', error);
            this.showToast('导出数据失败', 'error');
        }
    }

    /**
     * 从JSON文件导入数据
     * @param {File} file - JSON文件
     * @returns {Promise<Object>} 解析后的数据
     */
    importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('JSON文件格式错误'));
                }
            };
            
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    /**
     * 确认对话框
     * @param {string} message - 确认消息
     * @param {string} title - 对话框标题
     * @returns {Promise<boolean>} 用户选择结果
     */
    confirm(message, title = '确认操作') {
        return new Promise((resolve) => {
            // 创建确认模态框
            const modalId = 'confirm-dialog-modal';
            let modal = document.getElementById(modalId);
            
            if (!modal) {
                modal = document.createElement('div');
                modal.id = modalId;
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content small">
                        <div class="modal-header">
                            <h3>${title}</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>${message}</p>
                            <div class="form-actions">
                                <button class="btn btn-danger confirm-btn">确认</button>
                                <button class="btn btn-secondary cancel-btn">取消</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                // 绑定事件
                modal.querySelector('.modal-close').addEventListener('click', () => {
                    this.closeModal(modalId);
                    resolve(false);
                });
                
                modal.querySelector('.cancel-btn').addEventListener('click', () => {
                    this.closeModal(modalId);
                    resolve(false);
                });
                
                modal.querySelector('.confirm-btn').addEventListener('click', () => {
                    this.closeModal(modalId);
                    resolve(true);
                });
                
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modalId);
                        resolve(false);
                    }
                });
            } else {
                // 更新内容
                modal.querySelector('h3').textContent = title;
                modal.querySelector('.modal-body p').textContent = message;
            }
            
            // 显示模态框
            this.openModal(modalId);
        });
    }
}

// 创建全局实例但不立即初始化
const adminUtils = new AdminUtils();

// 导出到全局作用域
window.AdminUtils = AdminUtils;
window.adminUtils = adminUtils;

// 安全初始化
adminUtils.safeInit();
