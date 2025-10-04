/**
 * 图片加载配置文件
 * 用户可以根据需要调整这些参数来优化加载性能
 */

window.ImageLoadingConfig = {
    // 基础配置
    imagesPerPage: 9,           // 每页显示图片数量
    maxImageCheck: 500,         // 最大检测图片数量（增加以支持更多图片）
    
    // 性能配置
    loadTimeout: 5000,          // 图片加载超时时间（毫秒）
    concurrentLimit: 3,         // 并发加载限制
    retryCount: 2,              // 加载失败重试次数
    
    // 检测配置
    batchSize: 9,               // 批量检测大小（与imagesPerPage保持一致）
    checkTimeout: 2000,         // 图片存在性检测超时（毫秒）
    maxConsecutiveEmptyBatches: 3, // 最大连续空批次（提前终止检测）
    maxImagesPerCategory: 50,   // 每个分类最大图片数量（避免检测过多）
    adaptiveBatchSize: true,    // 是否启用自适应批量大小
    detectionCacheExpireTime: 300000, // 检测结果缓存过期时间（5分钟）
    
    // 懒加载配置
    lazyLoadThreshold: 200,     // 懒加载触发距离（像素）
    
    // 用户体验配置
    skeletonDelay: 100,         // 骨架屏显示延迟（毫秒）
    fadeInDuration: 300,        // 图片淡入动画时长（毫秒）
    
    // 支持的图片格式（按优先级排序）
    supportedFormats: ['webp', 'jpg', 'jpeg', 'png'],
    
    // 错误处理配置
    showErrorPlaceholder: true, // 是否显示错误占位符
    enableRetry: true,          // 是否启用重试功能
    
    // 调试配置
    enableDebugLog: false,      // 是否启用调试日志
    showLoadingIndicator: false, // 是否显示加载指示器（已禁用文字提示）
    
    // 缓存配置
    enableImageCache: true,     // 是否启用图片缓存
    cacheExpireTime: 300000,    // 缓存过期时间（5分钟）
    persistentCache: true,      // 是否启用持久化缓存（避免重新加载）
    
    // 网络优化
    enablePreload: true,        // 是否启用预加载
    preloadNextPage: false,     // 是否预加载下一页
    
    // 移动端优化
    mobileOptimization: {
        enabled: true,
        imagesPerPage: 6,       // 移动端每页图片数
        concurrentLimit: 2,     // 移动端并发限制
        loadTimeout: 8000       // 移动端超时时间
    }
};

/**
 * 根据设备类型自动调整配置
 */
function adjustConfigForDevice() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile && window.ImageLoadingConfig.mobileOptimization.enabled) {
        const mobileConfig = window.ImageLoadingConfig.mobileOptimization;
        
        // 应用移动端配置
        window.ImageLoadingConfig.imagesPerPage = mobileConfig.imagesPerPage;
        window.ImageLoadingConfig.concurrentLimit = mobileConfig.concurrentLimit;
        window.ImageLoadingConfig.loadTimeout = mobileConfig.loadTimeout;
        
        console.log('已应用移动端优化配置');
    }
}

/**
 * 获取当前有效配置
 */
function getEffectiveConfig() {
    adjustConfigForDevice();
    return window.ImageLoadingConfig;
}

// 自动调整配置
document.addEventListener('DOMContentLoaded', adjustConfigForDevice);
window.addEventListener('resize', adjustConfigForDevice);

// 导出配置获取函数
window.getImageLoadingConfig = getEffectiveConfig;