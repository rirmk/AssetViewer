// 使用单例模式管理监听器
let isListenerAdded = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'download') {
        // 确保只注册一次监听器
        if (!isListenerAdded) {
            setupDownloadListener();
            isListenerAdded = true;
        }
        chrome.downloads.download({
            url: request.url,
            filename: request.filename,
            conflictAction: 'uniquify'
        });
    }
});

function setupDownloadListener() {
    // 必须先添加再移除，确保存在可移除的实例
    chrome.downloads.onDeterminingFilename.addListener(filenameHandler);
    chrome.downloads.onDeterminingFilename.removeListener(filenameHandler);
}

// MIME类型映射辅助函数
function getExtension(mime, originalName) {
    // 加强版正则匹配，捕获所有webp变种
    const webpRegex = /\.a?webp(\?.*)?$/i;
    if (webpRegex.test(originalName)) {
        return '.jpg'; // 直接返回带点的扩展名
    }
    
    // 扩展MIME类型映射
    const typeMap = {
        'image/webp': '.jpg',
        'image/x-webp': '.jpg',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif'
    };
    
    return typeMap[mime] || '.jpg';
}

// 修正文件名拼接逻辑
const filenameHandler = (item, suggest) => {
    // 使用更安全的文件名解析
    const [baseName] = item.filename.split('.');
    const ext = getExtension(item.mime, item.filename);
    suggest({ filename: `${baseName}${ext}`, conflictAction: 'overwrite' });
};