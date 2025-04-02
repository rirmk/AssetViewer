let currentResources; // 新增在文件顶部

// 工具函数
const getFileExtension = (url) => {
    const match = url.match(/\.([a-z0-9]+)(?:[\?#]|$)/i);
    return match ? '.' + match[1] : '.jpg';
};

const generateFileName = (altText, url) => {
    return altText
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
        .substring(0, 30) + getFileExtension(url);
};

// 资源收集
function collectResources() {
    const srcSet = new Set();
    return [...document.querySelectorAll('img')]
        .filter(img => {
            const src = img.src.split('?')[0];
            return !srcSet.has(src) && srcSet.add(src);
        })
        .map(el => ({
            url: el.src,
            alt: el.alt,
            type: el.tagName.toLowerCase()
        }));
}

// 视图渲染
function renderAssetPanel(resources) {
    return `
        <div class="header">
            <h3 style="margin:0; display: inline-block; color: #212529">页面资源 (${resources.length})</h3>
            <input type="search" class="search-input" placeholder="搜索资源...">
            <button id="close-panel">×</button>
        </div>
        <div class="filter-controls">
            <label><input type="checkbox" class="filter-checkbox" data-type="empty-alt"><span>隐藏无描述文本</span></label>
            <label><input type="checkbox" class="filter-checkbox" data-type="downloaded"><span>隐藏已下载</span></label>
        </div>
        <div style="padding:15px">${renderAssetList(resources)}</div>`;
}

function renderAssetList(resources) {
    return resources.map(res => `
        <div class="asset-item">
            <img src="${res.url}" onerror="this.style.display='none'">
            <div class="asset-item-content">${res.alt || '无描述文本'}</div>
            <div class="asset-item-actions">
                <button class="preview-btn" data-url="${res.url}">👀 预览</button>
                <button class="download-btn" data-url="${res.url}">↓ 下载</button>
            </div>
        </div>
    `).join('');
}

// 事件处理
function handleDownload(btn) {
    const url = btn.dataset.url;
    window.downloadedUrls = window.downloadedUrls || new Set();
    window.downloadedUrls.add(url);

    chrome.runtime.sendMessage({
        action: 'download',
        url: url,
        filename: generateFileName(btn.dataset.alt || 'unnamed', url)
    }, () => renderFilteredResources());
}

function handlePreview(btn) {
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
}

// 核心逻辑
let observer, debounceTimer;
const assetPanel = (() => {
    const panel = document.createElement('div');
    panel.id = 'asset-panel';
    // 添加初始隐藏状态
    panel.style.display = 'none';
    document.body.appendChild(panel);
    return panel;
})();


let isDragging = false;
let startX, startY, initialX, initialY;
function setupDragHandlers() {
    // 添加防重复绑定逻辑
    const header = assetPanel.querySelector('.header');
    header._hasDragHandler = header._hasDragHandler || false;
    
    if (!header._hasDragHandler) {
        header.addEventListener('mousedown', (e) => {
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
        header._hasDragHandler = true;
    }
}

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

function applyFilters() {
    const searchTerm = assetPanel.querySelector('.search-input').value.toLowerCase();
    const hideEmptyAlt = assetPanel.querySelector('[data-type="empty-alt"]').checked;
    const hideDownloaded = assetPanel.querySelector('[data-type="downloaded"]').checked;

    return currentResources.filter(res =>
        res.alt.toLowerCase().includes(searchTerm) &&
        (!hideEmptyAlt || res.alt.trim()) &&
        (!hideDownloaded || !(window.downloadedUrls || new Set()).has(res.url))
    );
}

function renderFilteredResources() {
    const filtered = applyFilters();
    assetPanel.querySelector('div[style="padding:15px"]').innerHTML = renderAssetList(filtered);
    
    // 新增计数更新逻辑
    const header = assetPanel.querySelector('.header h3');
    if (header) {
        header.textContent = `页面资源 (${filtered.length}/${currentResources.length})`;
    }
}

function showAssets() {
    assetPanel.style.display = 'block';
    if (observer) observer.disconnect();

    // 先保存当前过滤状态（在DOM被替换前）
    const currentSearch = assetPanel.querySelector('.search-input')?.value || '';
    const currentEmptyAlt = assetPanel.querySelector('[data-type="empty-alt"]')?.checked || false;
    const currentDownloaded = assetPanel.querySelector('[data-type="downloaded"]')?.checked || false;

    const resources = collectResources();
    currentResources = resources;
    assetPanel.innerHTML = renderAssetPanel(resources);

    // 恢复过滤状态
    assetPanel.querySelector('.search-input').value = currentSearch;
    assetPanel.querySelector('[data-type="empty-alt"]').checked = currentEmptyAlt;
    assetPanel.querySelector('[data-type="downloaded"]').checked = currentDownloaded;

    // 保持原有DOM结构，仅更新资源列表
    const container = assetPanel.querySelector('div[style="padding:15px"]');
    if (container) {
        container.innerHTML = renderAssetList(applyFilters());
    }

    // 输入框事件绑定
    assetPanel.addEventListener('input', (e) => {
        if (e.target.matches('.search-input, .filter-checkbox')) {
            renderFilteredResources();
        }
    });
    // 关闭按钮事件
    assetPanel.querySelector('#close-panel').addEventListener('click', () => {
        assetPanel.style.display = 'none';
    });
    assetPanel.querySelector('div[style="padding:15px"]').addEventListener('click', e => {
        if (e.target.classList.contains('download-btn')) handleDownload(e.target);
        if (e.target.classList.contains('preview-btn')) handlePreview(e.target);
    });

    setupDragHandlers();

    // 防抖逻辑
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'style']
    }), 300);
}


// 初始化
const style = document.createElement('style');
style.textContent = `
#asset-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    height: 70vh !important;
    max-width: 400px;
    max-height: 70vh;
    background: #ffffff;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    resize: none;
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

.header #close-panel {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 30px;
    height: 24px;
    background: #ff6b6b;
    color: white;
    border-radius: 10px;
    border: none;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header #close-panel:hover {
    background: #ff5252;
    transform: translateY(-50%) scale(1.1);
}

.header #close-panel:active {
    transform: translateY(-50%) scale(0.9);
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
    min-height: 0;
    height: calc(100% - 120px); 
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

/* 新增搜索框样式 */
.search-input {
    flex: 1;
    margin: 0 15px;
    padding: 6px 12px;
    border: 1px solid #dee2e6;
    border-radius: 20px;
    font-size: 14px;
    transition: all 0.3s;
    max-width: 160px;
}

.search-input:focus {
    outline: none;
    border-color: #86b7fe;
    box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
}

/* 过滤控件样式 */
.filter-controls {
    padding: 12px 15px;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    gap: 20px;
}

.filter-controls label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: #495057;
    font-size: 14px;
}

.filter-checkbox {
    width: 16px;
    height: 16px;
    border: 1px solid #adb5bd;
    border-radius: 3px;
    appearance: none;
    position: relative;
    cursor: pointer;
}

.filter-checkbox:checked {
    background-color: #007bff;
    border-color: #007bff;
}

.filter-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 4px;
    height: 8px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

/* 调整header布局 */
.header {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    gap: 10px;
}
`;
document.head.appendChild(style);

// MutationObserver
function startObservation() {
    observer = new MutationObserver(mutations => {
        if (document.contains(assetPanel)) {
            mutations.forEach(m => {
                if (!m.target.closest('#asset-panel') &&
                    !m.target.contains(assetPanel) &&
                    m.type !== 'attributes') {
                    showAssets();
                }
            });
        }
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'style']
    });
}
startObservation();