// 札记页面JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 添加页面加载动画
    const journalPreviews = document.querySelectorAll('.journal-preview');
    journalPreviews.forEach((preview, index) => {
        setTimeout(() => {
            preview.style.opacity = '0';
            preview.style.transform = 'translateY(30px)';
            preview.style.transition = 'all 0.6s ease';
            
            setTimeout(() => {
                preview.style.opacity = '1';
                preview.style.transform = 'translateY(0)';
            }, 100);
        }, index * 200);
    });
});

// 打开札记详情页面
function openJournal(journalId) {
    // 动态路径生成，支持所有札记
    const journalUrl = `journals/${journalId}.html`;
    
    // 检查文件是否存在
    fetch(journalUrl, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                window.location.href = journalUrl;
            } else {
                console.error(`札记文件不存在: ${journalUrl}`);
                alert('抱歉，此札记暂时不可用。');
            }
        })
        .catch(error => {
            console.error('检查札记文件失败:', error);
            // 如果检查失败，就直接跳转（可能是跨域限制）
            window.location.href = journalUrl;
        });
}