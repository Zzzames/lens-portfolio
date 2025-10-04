/**
 * 性能监控工具
 * 用于监控和优化管理工具的性能
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            renderTime: [],
            clickResponseTime: [],
            scrollFPS: []
        };
        this.isMonitoring = false;
    }

    /**
     * 开始监控
     */
    start() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        
        console.log('[性能监控] 开始监控...');
        
        // 监控渲染性能
        this.monitorRenderPerformance();
        
        // 监控交互性能
        this.monitorInteractionPerformance();
        
        // 监控滚动性能
        this.monitorScrollPerformance();
    }

    /**
     * 监控渲染性能
     */
    monitorRenderPerformance() {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'measure') {
                    console.log(`[渲染性能] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
                    this.metrics.renderTime.push(entry.duration);
                }
            }
        });
        
        observer.observe({ entryTypes: ['measure'] });
    }

    /**
     * 监控交互性能
     */
    monitorInteractionPerformance() {
        // 监控点击响应时间
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) {
                const startTime = performance.now();
                
                // 使用MutationObserver检测DOM变化（编辑框打开）
                const observer = new MutationObserver(() => {
                    const endTime = performance.now();
                    const responseTime = endTime - startTime;
                    console.log(`[交互性能] 按钮响应时间: ${responseTime.toFixed(2)}ms`);
                    this.metrics.clickResponseTime.push(responseTime);
                    observer.disconnect();
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                
                // 5秒后自动断开
                setTimeout(() => observer.disconnect(), 5000);
            }
        }, true);
    }

    /**
     * 监控滚动性能
     */
    monitorScrollPerformance() {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFPS = () => {
            const currentTime = performance.now();
            frameCount++;
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                console.log(`[滚动性能] FPS: ${fps}`);
                this.metrics.scrollFPS.push(fps);
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            if (this.isMonitoring) {
                requestAnimationFrame(measureFPS);
            }
        };
        
        // 只在滚动时监控
        let scrollTimeout;
        document.addEventListener('scroll', () => {
            if (!this.scrolling) {
                this.scrolling = true;
                requestAnimationFrame(measureFPS);
            }
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.scrolling = false;
            }, 200);
        }, true);
    }

    /**
     * 获取性能报告
     */
    getReport() {
        const avgRenderTime = this.average(this.metrics.renderTime);
        const avgClickResponse = this.average(this.metrics.clickResponseTime);
        const avgFPS = this.average(this.metrics.scrollFPS);
        
        console.log('=== 性能报告 ===');
        console.log(`平均渲染时间: ${avgRenderTime.toFixed(2)}ms`);
        console.log(`平均点击响应: ${avgClickResponse.toFixed(2)}ms`);
        console.log(`平均滚动FPS: ${avgFPS.toFixed(0)}`);
        console.log('================');
        
        return {
            avgRenderTime,
            avgClickResponse,
            avgFPS
        };
    }

    /**
     * 计算平均值
     */
    average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * 停止监控
     */
    stop() {
        this.isMonitoring = false;
        console.log('[性能监控] 停止监控');
        return this.getReport();
    }
}

// 全局导出
window.performanceMonitor = new PerformanceMonitor();

