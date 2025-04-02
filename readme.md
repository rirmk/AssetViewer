```markdown
# Asset Viewer 插件

🖼️ 专业的网页资源查看与下载工具 | 基于Chrome扩展开发

## 🌟 功能亮点
- **智能资源嗅探**  
  自动抓取当前页面的所有图片资源
- **悬浮预览面板**  
  - 置顶显示可拖拽窗口（默认在右上角）
  - 状态持久化（自动记忆过滤条件）
  - 实时资源计数展示
- **增强交互功能**  
  - 一键预览高清大图（支持ESC关闭）
  - 智能下载命名（优先使用alt文本）
  - 自动格式转换（awebp → jpg）
- **开发者友好**  
  - 安全类型检查（可选链操作符）
  - 防抖设计（300ms延迟加载）
  - 样式隔离（独立z-index层级）

## 🔧 安装方式
```bash
# 克隆仓库
git clone https://github.com/rirmk/AssetViewer.git

# 浏览器加载
1. 访问 chrome://extensions/
2. 开启「开发者模式」 
3. 点击「加载已解压的扩展程序」
4. 选择项目根目录
 ```

## 🛠 使用说明
### 基本操作
1. 点击扩展图标激活面板
2. 拖拽标题栏移动窗口位置
3. 点击「👀 预览」查看大图
4. 点击「↓ 下载」保存资源
![image](https://github.com/rirmk/AssetViewer/blob/master/img/xg.png)

## ⚠️ 注意事项
- 已知限制：
  - 不支持跨域资源下载
  - 动态加载资源需手动刷新
  - WebP转换依赖浏览器支持

如果 AssetViewer 给您的生活带来了快乐，请随意支持它。
![image](https://github.com/rirmk/AssetViewer/blob/master/img/sk.jpg)