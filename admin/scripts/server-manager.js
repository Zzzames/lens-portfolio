/**
 * 服务器管理器
 * 负责检测和管理API服务器状态
 */
class ServerManager {
    constructor() {
        this.serverUrl = 'http://localhost:8000';
        this.checkInterval = null;
        this.isChecking = false;
        this.statusDot = null;
        this.statusText = null;
        this.startBtn = null;
    }

    /**
     * 初始化
     */
    async init() {
        console.log('[ServerManager] 初始化服务器管理器');
        
        // 获取DOM元素
        this.statusDot = document.getElementById('server-status-dot');
        this.statusText = document.getElementById('server-status-text');
        this.startBtn = document.getElementById('start-server-btn');

        if (!this.statusDot || !this.statusText || !this.startBtn) {
            console.error('[ServerManager] 找不到必要的DOM元素');
            return;
        }

        // 绑定启动按钮
        this.startBtn.addEventListener('click', () => this.showServerInstructions());

        // 首次检测
        await this.checkServerStatus();

        // 定期检测（每10秒）
        this.checkInterval = setInterval(() => {
            this.checkServerStatus();
        }, 10000);

        console.log('[ServerManager] 服务器管理器初始化完成');
    }

    /**
     * 检测服务器状态
     */
    async checkServerStatus() {
        if (this.isChecking) return;
        
        this.isChecking = true;

        try {
            const response = await fetch(`${this.serverUrl}/data/site-images-metadata.json`, {
                method: 'GET',
                cache: 'no-cache'
            });

            if (response.ok) {
                this.updateStatus(true);
            } else {
                this.updateStatus(false);
            }
        } catch (error) {
            this.updateStatus(false);
        } finally {
            this.isChecking = false;
        }
    }

    /**
     * 更新状态显示
     * @param {boolean} isOnline - 服务器是否在线
     */
    updateStatus(isOnline) {
        if (!this.statusDot || !this.statusText || !this.startBtn) return;

        if (isOnline) {
            this.statusDot.className = 'status-dot online';
            this.statusText.textContent = '服务器运行中';
            this.statusText.style.color = '#27ae60';
            this.startBtn.style.display = 'none';
        } else {
            this.statusDot.className = 'status-dot offline';
            this.statusText.textContent = '服务器未启动';
            this.statusText.style.color = '#e74c3c';
            this.startBtn.style.display = 'block';
        }
    }

    /**
     * 显示服务器启动说明
     */
    showServerInstructions() {
        const isWindows = navigator.platform.toLowerCase().includes('win');
        const command = isWindows ? 'START-SERVER.bat' : './START-SERVER.sh';
        
        const message = `
            <div style="text-align: left; line-height: 1.8;">
                <h3 style="margin-top: 0; color: #2c3e50;">如何启动服务器？</h3>
                <p style="color: #7f8c8d;">请按以下步骤操作：</p>
                <ol style="color: #34495e; padding-left: 20px;">
                    <li>打开项目根目录</li>
                    <li>找到并双击运行: <code style="background: #ecf0f1; padding: 2px 6px; border-radius: 3px; color: #e74c3c;">${command}</code></li>
                    <li>等待命令行窗口显示 "服务器运行在 http://localhost:8000"</li>
                    <li>刷新此页面即可开始使用</li>
                </ol>
                <div style="background: #fff3cd; padding: 12px; border-radius: 5px; margin-top: 15px; border-left: 4px solid #ffc107;">
                    <strong style="color: #856404;">💡 提示：</strong><br>
                    <span style="color: #856404;">请保持命令行窗口打开，关闭窗口会停止服务器</span>
                </div>
            </div>
        `;

        // 创建自定义弹窗
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 600px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        `;
        content.innerHTML = message;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '我知道了';
        closeBtn.style.cssText = `
            margin-top: 20px;
            padding: 10px 30px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
        `;
        closeBtn.onclick = () => modal.remove();

        content.appendChild(closeBtn);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // 点击背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    /**
     * 销毁
     */
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// 创建全局实例
window.serverManager = new ServerManager();

