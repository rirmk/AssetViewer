// 创建资源悬浮窗
const assetPanel = document.createElement('div');
assetPanel.id = 'asset-panel';
document.body.appendChild(assetPanel);

// 悬浮窗样式
const style = document.createElement('style');
style.textContent = `
#asset-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    height: 70vh;
    background: #ffffff;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    resize: none;
    max-width: 400px;
    max-height: 70vh;
    overflow-y: auto;
    z-index: 9999;
    padding: 15px;
    cursor: move;
    user-select: none;
}

#asset-panel .header {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f1f3f5;
    padding: 10px 15px;
    border-radius: 8px 8px 0 0;
    cursor: move;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

#asset-panel {
    display: flex;
    flex-direction: column;
    max-height: 70vh;
    overflow: hidden;
}

#asset-panel > div:last-child {
    overflow-y: auto;
    flex: 1;
    padding-top: 5px;
}

.asset-item {
    display: flex;
    align-items: center;
    gap: 12px; 
    margin: 8px 0;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
}

/* 图片固定宽度 */
.asset-item img {
    width: 40px;
    height: 40px;
    flex-shrink: 0; 
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #eee;
}

/* 中间文本容器 */
.asset-item-content {
    height: 40px;
    line-height: 40px;
    flex: 1;
    min-width: 0; 
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #6c757d;
}

/* 按钮容器 */
.asset-item-actions {
    height: 40px;
    display: flex;
    gap: 8px;
    flex-shrink: 0; 
}

.download-btn {
    margin-left: auto;
    padding: 5px 12px;
    width: 80px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.2s;
    box-sizing: border-box;
}

.preview-btn {
    margin-left: 8px;
    padding: 5px 12px;
    width: 80px; 
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    box-sizing: border-box;
}

.download-btn:hover {
    opacity: 0.8;
}

.preview-btn {
    margin-left: 8px;
    padding: 5px 12px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.preview-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.preview-image {
    max-width: 80vw;
    max-height: 80vh;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
`;
document.head.appendChild(style);

// 收集并展示资源
let debounceTimer;
const debounceDelay = 300;

function showAssets() {
    // 先断开观察避免循环
    if(observer) observer.disconnect();

    const srcSet = new Set(); // 仅保留src集合
    const resources = [
        ...document.querySelectorAll('img')
    ].filter(img => {
        const src = img.src.split('?')[0]; // 去除URL参数比较基础路径
        
        // 仅当src重复时过滤
        if (srcSet.has(src)) return false;
        
        srcSet.add(src);
        return true;
    }).map(el => ({
        url: el.src,
        alt: el.alt,
        type: el.tagName.toLowerCase()
    }));

    assetPanel.innerHTML = `
        <div class="header">
            <h3 style="margin:0; display: inline-block; color: #212529">页面资源 (${resources.length})</h3>
            <button id="close-panel" style="float:right; padding:2px 8px; background: #dc3545; color:white; border:none; border-radius:4px;">×</button>
        </div>
        <div style="padding:15px">
            ${resources.map(res => `
                <div class="asset-item">
                    <img src="${res.url}" onerror="this.style.display='none'">
                    <div class="asset-item-content">${res.alt || '无描述文本'}</div>
                    <div class="asset-item-actions">
                        <button class="preview-btn" 
                                data-url="${res.url}"
                                data-alt="${res.alt}">👀 预览</button>
                        <button class="download-btn" 
                                data-url="${res.url}"
                                data-alt="${res.alt}">↓ 下载</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // 关闭按钮事件监听
    assetPanel.querySelector('#close-panel').addEventListener('click', () => {
        assetPanel.remove();
    });

    // 拖动逻辑
    let isDragging = false;
    let startX, startY, initialX, initialY;

    assetPanel.querySelector('.header').addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = assetPanel.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
        }, { once: true });
    });

    // 在拖拽移动函数中锁定宽度
    function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
    
        // 保持原有宽度
        const currentWidth = assetPanel.offsetWidth;
    
        // 限制在窗口范围内
        const newX = Math.max(0, Math.min(window.innerWidth - currentWidth, initialX + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - assetPanel.offsetHeight, initialY + dy));

        assetPanel.style.left = `${newX}px`;
        assetPanel.style.top = `${newY}px`;
    }

    // 预览事件监听
    assetPanel.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const overlay = document.createElement('div');
            overlay.className = 'preview-overlay';

            const img = new Image();
            img.className = 'preview-image';
            img.src = btn.dataset.url;

            img.onerror = () => img.alt = '图片加载失败';
            img.onclick = e => e.stopPropagation();

            overlay.appendChild(img);
            overlay.onclick = () => overlay.remove();

            // ESC键关闭
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') overlay.remove();
            }, { once: true });

            document.body.appendChild(overlay);
        });
    });

    // 下载事件监听
    assetPanel.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const originalUrl = btn.dataset.url;
            const altText = btn.dataset.alt || 'unnamed'; // 获取alt文本
            // 生成安全文件名
            let filename = altText
                .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') // 替换非法字符
                .substring(0, 30); // 限制长度

            chrome.runtime.sendMessage({
                action: 'download',
                url: originalUrl,
                filename: filename + getFileExtension(originalUrl) // 添加扩展名
            });
        });
    });

    // 获取文件扩展名的辅助函数
    function getFileExtension(url) {
        const match = url.match(/\.([a-z0-9]+)(?:[\?#]|$)/i);
        return match ? '.' + match[1] : '.jpg';
    }

    // 防抖的重新观察
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        startObservation();
    }, debounceDelay);
}

// MutationObserver逻辑
let observer;

function startObservation() {
    observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            // 过滤插件自身产生的变化
            if (!mutation.target.closest('#asset-panel')) {
                showAssets();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'style']
    });
}

// 初始化时启动监听
startObservation();