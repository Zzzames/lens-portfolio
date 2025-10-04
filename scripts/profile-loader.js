/**
 * 主页个人信息加载器
 * 从服务器加载个人信息并更新页面
 */

(async function() {
    try {
        // 加载个人信息
        const response = await fetch('data/profile-data.json?t=' + new Date().getTime());
        
        if (response.ok) {
            const profileData = await response.json();
            console.log('✓ 已加载个人信息:', profileData);
            
            // 更新姓名
            if (profileData.name) {
                const nameElement = document.querySelector('.hero-title');
                if (nameElement) {
                    nameElement.textContent = profileData.name;
                }
            }
            
            // 更新简介
            if (profileData.bio && Array.isArray(profileData.bio)) {
                const descriptionElement = document.querySelector('.hero-description');
                if (descriptionElement) {
                    descriptionElement.innerHTML = '';
                    profileData.bio.forEach(text => {
                        const p = document.createElement('p');
                        p.textContent = text;
                        descriptionElement.appendChild(p);
                    });
                }
            }
            
            // 更新Logo
            if (profileData.logos && Array.isArray(profileData.logos) && profileData.logos.length > 0) {
                const logosContainer = document.querySelector('.brand-logos');
                if (logosContainer) {
                    logosContainer.innerHTML = '';
                    profileData.logos.forEach(logo => {
                        const img = document.createElement('img');
                        // 修正路径：如果是相对路径，转换为正确的路径
                        let logoSrc = logo.src;
                        if (logoSrc.startsWith('./images/')) {
                            logoSrc = logoSrc.replace('./images/', 'images/');
                        } else if (logoSrc.startsWith('../images/')) {
                            logoSrc = logoSrc.replace('../images/', 'images/');
                        }
                        img.src = logoSrc;
                        img.alt = logo.name;
                        img.className = 'brand-logo';
                        
                        // 根据 logo id 添加特定的 class
                        if (logo.id === 'nikon') {
                            img.classList.add('nikon-logo');
                        } else if (logo.id === '500px') {
                            img.classList.add('px500-logo');
                        }
                        
                        // 添加错误处理，防止Logo加载失败导致页面崩溃
                        img.onerror = function() {
                            console.warn('Logo加载失败:', logoSrc);
                            this.style.display = 'none';
                        };
                        
                        // 添加加载成功日志
                        img.onload = function() {
                            console.log('✓ Logo加载成功:', logoSrc);
                        };
                        
                        logosContainer.appendChild(img);
                    });
                }
            }
            
        } else {
            console.log('使用默认个人信息');
        }
    } catch (error) {
        console.error('加载个人信息失败:', error);
        // 即使加载失败也不显示错误，使用HTML中的默认值
    }
})();



