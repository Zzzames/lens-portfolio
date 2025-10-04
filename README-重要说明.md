# 🚨 重要说明 - 请先阅读

## ✅ 问题已解决

### 问题1：管理工具修改后网站未同步 ✅

**解决方案：**
1. **必须启动API服务器** - 运行 `START-SERVER.bat` (Windows) 或 `START-SERVER.sh` (Mac/Linux)
2. **数据流程已完善** - 管理工具 → API服务器 → JSON文件 → 网站前端
3. **已实现自动保存** - 点击保存后自动通过API保存到 `data/site-images-metadata.json`

### 问题2：图片上传功能 ⚠️

**当前状态：** 图片上传功能暂未完全实现

**临时方案：**
1. 使用FTP或文件管理器手动将图片上传到 `images/{分类}/` 目录
2. 图片命名格式：`{prefix}-{编号}.webp`
3. 上传完成后，在管理工具点击 "同步网站图片"

**示例：**
```
上传街头摄影：
文件：street-13.webp
目录：images/street/
```

---

## 🚀 立即开始

### 1️⃣ 启动服务器

**Windows：**
```bash
双击运行 START-SERVER.bat
```

**Mac/Linux：**
```bash
chmod +x START-SERVER.sh
./START-SERVER.sh
```

### 2️⃣ 打开管理工具

浏览器访问：
```
http://localhost:8000/admin/
```

### 3️⃣ 同步现有图片

点击 **"同步网站图片"** 按钮

### 4️⃣ 编辑图片信息

点击图片的 **"编辑"** 按钮，修改标题和描述，然后保存

### 5️⃣ 查看效果

打开网站页面，例如：
```
http://localhost:8000/pages/street.html
```

按 `Ctrl + F5` 强制刷新，查看修改效果

---

## 📊 系统工作原理

### 数据流程

```mermaid
graph LR
    A[管理工具] -->|修改标题/描述| B[点击保存]
    B -->|POST /api/save-metadata| C[API服务器]
    C -->|写入文件| D[site-images-metadata.json]
    D -->|读取| E[网站前端]
    E -->|显示| F[用户看到的页面]
```

### 数据优先级

```
网站显示标题和描述时的查找顺序：
1. 首先查找 data/site-images-metadata.json 中的自定义数据
2. 如果找不到，使用 unified-image-loader.js 中的默认数据
```

---

## 📁 关键文件

| 文件 | 作用 | 说明 |
|------|------|------|
| `api-server.py` | API服务器 | **必须运行**才能保存数据 |
| `START-SERVER.bat/.sh` | 启动脚本 | 快速启动服务器 |
| `data/site-images-metadata.json` | 元数据文件 | 存储所有自定义标题和描述 |
| `scripts/unified-image-loader.js` | 加载器 | 网站前端，优先读取JSON数据 |
| `admin/scripts/site-sync-manager.js` | 同步管理器 | 扫描图片并生成元数据 |
| `admin/scripts/enhanced-image-manager.js` | 图片管理器 | 管理工具核心逻辑 |

---

## 🔧 常见问题

### Q1: 点击保存后显示 "501 Unsupported method"

**A:** API服务器没有运行。请运行 `START-SERVER.bat` 或 `START-SERVER.sh`

---

### Q2: 网站没有显示修改后的内容

**A:** 执行以下步骤：
1. 强制刷新页面 (`Ctrl + F5`)
2. 检查 `data/site-images-metadata.json` 文件是否存在
3. 查看浏览器控制台（F12）是否有错误

---

### Q3: 如何添加新图片？

**A:** 当前需要手动操作：
1. 将 `.webp` 图片放到 `images/{分类}/` 目录
2. 命名格式：`{prefix}-{编号}.webp`
3. 在管理工具点击 "同步网站图片"

---

### Q4: 拖拽上传不工作？

**A:** 图片上传功能暂未实现，请使用上述手动方法

---

## 📖 完整文档

详细使用说明请查看：
- **`完整使用指南.md`** - 详细的功能说明和最佳实践
- **`快速测试步骤.md`** - 5分钟快速测试流程
- **`图片标题描述统一修复说明.md`** - 技术实现细节
- **`管理工具优化说明.md`** - 管理工具优化记录

---

## ⚠️ 重要提醒

1. **服务器必须运行** - 否则无法保存数据
2. **定期备份** - 点击 "手动导出元数据" 备份数据
3. **强制刷新** - 修改后记得 `Ctrl + F5` 刷新网站
4. **检查文件** - 保存后检查 `data/site-images-metadata.json` 确认

---

## 🎯 下一步计划

- [ ] 实现完整的图片上传功能
- [ ] 添加图片预览和裁剪
- [ ] 支持批量导入
- [ ] 实现数据导入功能
- [ ] 添加图片压缩和格式转换

---

**版本：** v3.0  
**更新日期：** 2025-10-04  
**状态：** ✅ 核心功能完成，可正常使用

