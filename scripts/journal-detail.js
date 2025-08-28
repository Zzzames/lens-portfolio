// 札记详情页JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 添加页面加载动画
    setTimeout(() => {
        const journalHeader = document.querySelector('.journal-header');
        if (journalHeader) {
            journalHeader.classList.add('fade-in-up');
        }
    }, 200);
    
    setTimeout(() => {
        const journalHeroImage = document.querySelector('.journal-hero-image');
        if (journalHeroImage) {
            journalHeroImage.classList.add('fade-in');
        }
    }, 400);
    
    setTimeout(() => {
        const journalContent = document.querySelector('.journal-content');
        if (journalContent) {
            journalContent.classList.add('fade-in-up');
        }
    }, 600);
    
    // 图片懒加载和点击放大
    const images = document.querySelectorAll('.journal-content img');
    images.forEach(img => {
        img.addEventListener('click', function() {
            openImageLightbox(this);
        });
        
        // 添加鼠标悬停效果
        img.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.02)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        img.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // 滚动时的渐进式显示
    addScrollAnimations();
});

// 图片灯箱效果
function openImageLightbox(imgElement) {
    const lightbox = document.createElement('div');
    lightbox.classList.add('image-lightbox');
    lightbox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        opacity: 0;
        transition: opacity 0.3s ease;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = imgElement.src;
    img.alt = imgElement.alt;
    img.style.cssText = `
        max-width: 90vw;
        max-height: 90vh;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
    `;
    
    lightbox.appendChild(img);
    document.body.appendChild(lightbox);
    
    // 防止背景滚动
    document.body.style.overflow = 'hidden';
    
    // 显示动画
    setTimeout(() => {
        lightbox.style.opacity = '1';
    }, 10);
    
    // 点击关闭
    lightbox.addEventListener('click', function() {
        lightbox.style.opacity = '0';
        document.body.style.overflow = 'auto';
        setTimeout(() => {
            if (document.body.contains(lightbox)) {
                document.body.removeChild(lightbox);
            }
        }, 300);
    });
    
    // ESC键关闭
    const handleEsc = function(e) {
        if (e.key === 'Escape') {
            lightbox.click();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// 滚动动画
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.style.transition = 'all 0.6s ease';
            }
        });
    }, observerOptions);
    
    // 观察需要动画的元素
    const animatedElements = document.querySelectorAll('.journal-text-block, .journal-image-insert, .journal-image-gallery');
    animatedElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        observer.observe(element);
    });
}