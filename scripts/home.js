// 首页专用JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 添加初始化动画
    setTimeout(() => {
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.classList.add('fade-in-up');
        }
    }, 300);
    
    // 为品牌Logo添加动画
    setTimeout(() => {
        const brandLogos = document.querySelector('.brand-logos');
        if (brandLogos) {
            brandLogos.classList.add('fade-in');
        }
    }, 800);
    
    // 导航链接高亮
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'index.html' || 
            (currentPath.endsWith('/') && link.getAttribute('href') === 'index.html') ||
            (currentPath.endsWith('index.html') && link.getAttribute('href') === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});

// 打开札记页面
function openJournal(journalId) {
    const journalPages = {
        'spring-afternoon': 'pages/journal-detail.html?id=spring-afternoon',
        'city-walk': 'pages/journal-detail.html?id=city-walk',
        'coffee-time': 'pages/journal-detail.html?id=coffee-time'
    };
    
    if (journalPages[journalId]) {
        window.location.href = journalPages[journalId];
    } else {
        // 如果没有对应的详情页，就跳转到札记列表页
        window.location.href = 'pages/journal.html';
    }
}