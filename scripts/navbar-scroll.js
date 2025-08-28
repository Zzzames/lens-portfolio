/**
 * 导航栏滚动控制脚本
 * 实现向下滚动时隐藏导航栏，向上滚动时显示导航栏的智能交互
 */

class NavbarScrollController {
    constructor() {
        this.navbar = null;
        this.lastScrollTop = 0;
        this.scrollThreshold = 100; // 滚动阈值，超过此值才开始隐藏/显示导航栏
        this.isScrolling = false;
        this.scrollTimer = null;
        
        this.init();
    }

    /**
     * 初始化导航栏滚动控制
     */
    init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupScrollListener());
        } else {
            this.setupScrollListener();
        }
    }

    /**
     * 设置滚动监听器
     */
    setupScrollListener() {
        this.navbar = document.querySelector('.navbar');
        
        if (!this.navbar) {
            console.warn('导航栏元素未找到');
            return;
        }

        // 添加滚动事件监听
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        
        // 初始状态
        this.navbar.classList.add('navbar-visible');
        
        console.log('导航栏滚动控制已初始化');
    }

    /**
     * 处理滚动事件
     */
    handleScroll() {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 防抖处理，避免频繁触发
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
        }
        
        this.scrollTimer = setTimeout(() => {
            this.updateNavbarVisibility(currentScrollTop);
        }, 10);
    }

    /**
     * 更新导航栏可见性
     * @param {number} currentScrollTop - 当前滚动位置
     */
    updateNavbarVisibility(currentScrollTop) {
        // 如果在页面顶部附近，始终显示导航栏
        if (currentScrollTop < this.scrollThreshold) {
            this.showNavbar();
            this.lastScrollTop = currentScrollTop;
            return;
        }

        // 计算滚动方向
        const isScrollingDown = currentScrollTop > this.lastScrollTop;
        const scrollDifference = Math.abs(currentScrollTop - this.lastScrollTop);

        // 只有在滚动距离超过一定阈值时才切换状态，避免微小滚动引起闪烁
        if (scrollDifference > 5) {
            if (isScrollingDown) {
                this.hideNavbar();
            } else {
                this.showNavbar();
            }
        }

        this.lastScrollTop = currentScrollTop;
    }

    /**
     * 隐藏导航栏
     */
    hideNavbar() {
        if (!this.navbar) return;
        
        this.navbar.classList.remove('navbar-visible');
        this.navbar.classList.add('navbar-hidden');
    }

    /**
     * 显示导航栏
     */
    showNavbar() {
        if (!this.navbar) return;
        
        this.navbar.classList.remove('navbar-hidden');
        this.navbar.classList.add('navbar-visible');
    }

    /**
     * 强制显示导航栏（用于特定场景）
     */
    forceShowNavbar() {
        this.showNavbar();
    }

    /**
     * 强制隐藏导航栏（用于特定场景）
     */
    forceHideNavbar() {
        this.hideNavbar();
    }

    /**
     * 销毁滚动控制器
     */
    destroy() {
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
        }
        
        window.removeEventListener('scroll', this.handleScroll);
        
        if (this.navbar) {
            this.navbar.classList.remove('navbar-hidden', 'navbar-visible');
        }
    }
}

// 创建全局实例
window.navbarScrollController = new NavbarScrollController();

// 为了兼容性，也提供简单的函数接口
window.showNavbar = () => window.navbarScrollController.forceShowNavbar();
window.hideNavbar = () => window.navbarScrollController.forceHideNavbar();