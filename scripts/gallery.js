// 作品展示页面JavaScript（超高性能版本）
document.addEventListener('DOMContentLoaded', function () {
    // 优化页面加载动画，减少卡顿
    const photoItems = document.querySelectorAll('.photo-item');
    
    // 批量处理动画，减少累积延迟
    const BATCH_SIZE = 12; // 增加批处理大小
    const BATCH_DELAY = 30; // 进一步减少延迟
    
    // 使用CSS类而不是内联样式（更快）
    const style = document.createElement('style');
    style.textContent = `
        .photo-item-hidden {
            opacity: 0;
            transform: translateY(20px);
        }
        .photo-item-visible {
            opacity: 1;
            transform: translateY(0);
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
    `;
    document.head.appendChild(style);
    
    // 先添加隐藏类
    photoItems.forEach(item => {
        item.classList.add('photo-item-hidden');
    });
    
    // 使用requestAnimationFrame批量处理
    const showBatch = (startIndex) => {
        const endIndex = Math.min(startIndex + BATCH_SIZE, photoItems.length);
        
        requestAnimationFrame(() => {
            for (let i = startIndex; i < endIndex; i++) {
                photoItems[i].classList.remove('photo-item-hidden');
                photoItems[i].classList.add('photo-item-visible');
            }
            
            // 递归处理下一批
            if (endIndex < photoItems.length) {
                setTimeout(() => showBatch(endIndex), BATCH_DELAY);
            }
        });
    };
    
    // 使用requestIdleCallback延迟启动动画
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => showBatch(0), { timeout: 100 });
    } else {
        setTimeout(() => showBatch(0), 50);
    }
});





// 优化的灯箱效果（简化版）
function openLightbox(element) {
    console.log('打开灯箱');
    const img = element.querySelector('img');
    const title = element.querySelector('.photo-overlay h3')?.textContent || '';
    const description = element.querySelector('.photo-overlay p')?.textContent || '';

    // 直接使用图片路径
    const imageUrl = img.src;
    console.log('图片URL:', imageUrl);

    // 直接显示灯箱，不再提取EXIF数据
    displayLightbox(imageUrl, title, description);
}

// 显示灯箱的具体实现（简化版）
function displayLightbox(imageUrl, title, description) {
    console.log('将显示灯箱');

    // 创建灯箱
    const lightbox = document.createElement('div');
    lightbox.classList.add('lightbox');
    lightbox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        opacity: 0;
        transition: opacity 0.2s ease;
    `;

    const lightboxContent = document.createElement('div');
    lightboxContent.classList.add('lightbox-content');
    lightboxContent.style.cssText = `
        max-width: 95vw;
        max-height: 95vh;
        text-align: center;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 20px;
        box-sizing: border-box;
    `;

    // 创建关闭按钮
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: -50px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 40px;
        cursor: pointer;
        padding: 10px;
        transition: opacity 0.3s ease;
    `;
    closeButton.addEventListener('mouseenter', () => closeButton.style.opacity = '0.7');
    closeButton.addEventListener('mouseleave', () => closeButton.style.opacity = '1');

    // 计算可用空间，为文字预留空间
    const textSpaceNeeded = 120; // 为标题和描述预留空间（减少了空间）
    const availableImageHeight = Math.min(window.innerHeight * 0.95 - textSpaceNeeded, window.innerWidth * 0.95);

    // 根据内容动态生成HTML
    const titleHtml = title ? `
        <h3 style="
            color: white; 
            margin: 0 0 12px 0; 
            font-size: 28px; 
            font-family: 'Bodoni Moda', serif;
            letter-spacing: 1px;
            word-wrap: break-word;
        ">${title}</h3>
    ` : '';
    
    const descHtml = description ? `
        <p style="
            color: #ccc; 
            margin: 0; 
            font-size: 18px;
            line-height: 1.5;
            word-wrap: break-word;
        ">${description}</p>
    ` : '';

    lightboxContent.innerHTML = `
        <div style="
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 0;
            width: 100%;
        ">
            <img src="${imageUrl}" alt="${title || ''}" style="
                max-width: 90vw; 
                max-height: ${availableImageHeight}px; 
                object-fit: contain; 
                border-radius: 8px; 
                box-shadow: 0 10px 50px rgba(0, 0, 0, 0.7);
            ">
        </div>
        <div style="
            flex-shrink: 0;
            margin-top: 20px;
            max-width: 90vw;
            overflow-y: auto;
            max-height: ${textSpaceNeeded}px;
        ">
            ${titleHtml}
            ${descHtml}
        </div>
    `;

    lightboxContent.appendChild(closeButton);
    lightbox.appendChild(lightboxContent);
    document.body.appendChild(lightbox);

    // 防止背景滚动
    document.body.style.overflow = 'hidden';

    // 显示动画
    requestAnimationFrame(() => {
        lightbox.style.opacity = '1';
    });

    // 关闭lightbox函数（优化版本）
    function closeLightbox() {
        // 使用requestAnimationFrame优化动画
        lightbox.style.transition = 'opacity 0.2s ease'; // 减少动画时间
        lightbox.style.opacity = '0';
        document.body.style.overflow = 'auto';
        
        // 使用requestAnimationFrame代替setTimeout，提高性能
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (document.body.contains(lightbox)) {
                    document.body.removeChild(lightbox);
                }
                // 清理事件监听器
                document.removeEventListener('keydown', handleEsc);
                document.removeEventListener('keydown', handleArrowKeys);
            });
        });
    }

    // 点击关闭按钮
    closeButton.addEventListener('click', closeLightbox);

    // 点击背景关闭
    lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // ESC键关闭
    const handleEsc = function (e) {
        if (e.key === 'Escape') {
            closeLightbox();
        }
    };
    document.addEventListener('keydown', handleEsc);

    // 键盘导航（可选功能）
    const handleArrowKeys = function (e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            // 这里可以添加上一张/下一张的逻辑
            e.preventDefault();
        }
    };
    document.addEventListener('keydown', handleArrowKeys);
}