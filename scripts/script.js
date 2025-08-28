// 导航栏交互
document.addEventListener('DOMContentLoaded', function() {
    // 平滑滚动导航
    const navLinks = document.querySelectorAll('.nav-link');
    const navbar = document.querySelector('.navbar');
    
    // 滚动时导航栏效果
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // 更新导航栏状态
        const sections = document.querySelectorAll('section');
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有active类
            navLinks.forEach(nav => nav.classList.remove('active'));
            // 添加active类到当前链接
            this.classList.add('active');
            
            // 平滑滚动到目标部分
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // 考虑导航栏高度
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // 生成作品集内容
    generatePortfolioItems();
    
    // 添加滚动动画
    addScrollAnimations();
    
    // 初始化动画
    initializeAnimations();
});

// 生成作品集项目
function generatePortfolioItems() {
    const portfolioGrid = document.querySelector('.portfolio-grid');
    
    // 示例作品数据
    const portfolioItems = [
        {
            title: "城市光影",
            description: "捕捉都市夜晚的光影变幻",
            image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=250&fit=crop"
        },
        {
            title: "自然静谧",
            description: "山林间的宁静时光",
            image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop"
        },
        {
            title: "人文纪实",
            description: "记录生活中的真实瞬间",
            image: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=400&h=250&fit=crop"
        },
        {
            title: "建筑几何",
            description: "现代建筑的线条美学",
            image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=250&fit=crop"
        },
        {
            title: "街头掠影",
            description: "城市街头的生动画面",
            image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=250&fit=crop"
        },
        {
            title: "黑白印象",
            description: "单色世界的情感表达",
            image: "https://images.unsplash.com/photo-1494548162494-384bba4ab999?w=400&h=250&fit=crop"
        },
        {
            title: "风景如画",
            description: "大自然的壮美景色",
            image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop"
        },
        {
            title: "光影艺术",
            description: "光与影的完美结合",
            image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=250&fit=crop"
        },
        {
            title: "都市节奏",
            description: "现代都市的快节奏生活",
            image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&h=250&fit=crop"
        },
        {
            title: "静物时光",
            description: "日常物品的诗意表达",
            image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=250&fit=crop"
        },
        {
            title: "肖像写真",
            description: "人物情感的深度捕捉",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop"
        },
        {
            title: "旅行记忆",
            description: "远方的美好回忆",
            image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=250&fit=crop"
        }
    ];
    
    portfolioItems.forEach((item, index) => {
        const portfolioItem = document.createElement('div');
        portfolioItem.classList.add('portfolio-item');
        portfolioItem.style.animationDelay = `${index * 0.1}s`;
        
        portfolioItem.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="portfolio-img">
            <div class="portfolio-info">
                <h3 class="portfolio-title">${item.title}</h3>
                <p class="portfolio-description">${item.description}</p>
            </div>
        `;
        
        // 添加点击事件
        portfolioItem.addEventListener('click', function() {
            openLightbox(item);
        });
        
        portfolioGrid.appendChild(portfolioItem);
    });
}

// 灯箱效果（简单实现）
function openLightbox(item) {
    // 创建灯箱
    const lightbox = document.createElement('div');
    lightbox.classList.add('lightbox');
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
    `;
    
    const lightboxContent = document.createElement('div');
    lightboxContent.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        text-align: center;
    `;
    
    lightboxContent.innerHTML = `
        <img src="${item.image}" alt="${item.title}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">
        <h3 style="color: white; margin-top: 20px; font-size: 24px;">${item.title}</h3>
        <p style="color: #ccc; margin-top: 10px; font-size: 16px;">${item.description}</p>
    `;
    
    lightbox.appendChild(lightboxContent);
    document.body.appendChild(lightbox);
    
    // 显示动画
    setTimeout(() => {
        lightbox.style.opacity = '1';
    }, 10);
    
    // 点击关闭
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            lightbox.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(lightbox);
            }, 300);
        }
    });
    
    // ESC键关闭
    const handleEsc = function(e) {
        if (e.key === 'Escape') {
            lightbox.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(lightbox);
                document.removeEventListener('keydown', handleEsc);
            }, 300);
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
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);
    
    // 观察作品集项目
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    portfolioItems.forEach(item => {
        observer.observe(item);
    });
    
    // 观察其他元素
    const animatedElements = document.querySelectorAll('.hero-content, .section-title, .journal-content');
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

// 移动端菜单切换（如果需要）
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('mobile-active');
}

// 初始化动画
function initializeAnimations() {
    // 为首页元素添加动画
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
}

// 按列动画显示作品
function animatePortfolioItems() {
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    portfolioItems.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add('animate');
        }, index * 100); // 逐个动画
    });
}