// 图片格式检测和处理工具
class ImageUtils {
    static supportedFormats = ['webp'];
    
    /**
     * 检测图片是否存在，支持webp格式
     * @param {string} basePath - 不含扩展名的图片路径
     * @returns {Promise<string>} - 返回完整的图片路径
     */
    static async detectImageFormat(basePath) {
        const formats = ['webp'];
        
        for (let format of formats) {
            const fullPath = `${basePath}.${format}`;
            try {
                const exists = await this.checkImageExists(fullPath);
                if (exists) {
                    return fullPath;
                }
            } catch (error) {
                continue;
            }
        }
        
        // 如果都不存在，返回默认webp格式
        return `${basePath}.webp`;
    }
    
    /**
     * 检查图片是否存在
     * @param {string} imagePath - 完整图片路径
     * @returns {Promise<boolean>}
     */
    static checkImageExists(imagePath) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = imagePath;
        });
    }
    
    /**
     * 为img元素设置正确的图片源
     * @param {HTMLImageElement} imgElement - 图片元素
     * @param {string} basePath - 不含扩展名的图片路径
     */
    static async setImageSrc(imgElement, basePath) {
        const imagePath = await this.detectImageFormat(basePath);
        imgElement.src = imagePath;
    }
    
    /**
     * 批量处理页面中的图片
     * @param {string} selector - 图片元素选择器
     */
    static async processPageImages(selector = 'img[data-base-src]') {
        const images = document.querySelectorAll(selector);
        
        for (let img of images) {
            const basePath = img.getAttribute('data-base-src');
            if (basePath) {
                await this.setImageSrc(img, basePath);
            }
        }
    }
}