// 作品集页面JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 取消动画效果，直接显示所有元素
    const categoryItems = document.querySelectorAll('.category-item');
    
    // 直接移除初始隐藏状态，让所有元素立即可见
    categoryItems.forEach((item) => {
        item.classList.remove('category-item-initial');
        item.classList.add('category-item-animate');
    });
    
    // 注释掉预加载功能（暂时不需要）
    // preloadImages();
});

// 预加载图片函数
function preloadImages() {
    const images = document.querySelectorAll('.category-image img');
    images.forEach(img => {
        if (img.dataset.src) {
            const preloader = new Image();
            preloader.src = img.dataset.src;
            preloader.onload = () => {
                img.src = img.dataset.src;
            };
        }
    });
}

// 打开作品分类页面
function openCategory(category) {
    const categoryPages = {
        'street': 'street.html',
        'documentary': 'documentary.html', 
        'nature': 'nature.html',
        'cityscape': 'cityscape.html',
        'stilllife': 'stilllife.html',
        'portrait': 'portrait.html',
        'animals': 'animals.html'
    };
    
    if (categoryPages[category]) {
        window.location.href = categoryPages[category];
    }
}