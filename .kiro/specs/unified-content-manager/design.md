# Design Document

## Overview

用户创作工具将是一个自包含的HTML文件，集成了前端界面和后端逻辑。它将使用现代Web技术（File System Access API、IndexedDB等）来直接操作本地文件系统，无需单独的后端服务。工具将提供avatar-crop.html文件里面同样的功能，札记管理和图片内容管理功能，并能够直接更新网站的源文件。

## Architecture

### 核心架构
- **单文件架构**: 所有功能集成在一个HTML文件中
- **客户端文件操作**: 使用File System Access API进行本地文件读写
- **模块化设计**: 功能按模块组织，便于维护和扩展
- **响应式界面**: 支持桌面和移动设备

### 技术栈
- **前端**: HTML5, CSS3, Vanilla JavaScript
- **文件操作**: File System Access API (主要) + 传统文件操作 (兼容)
- **数据存储**: LocalStorage + 文件系统
- **UI框架**: 原生CSS Grid/Flexbox

## Components and Interfaces

### 1. 文件系统管理器 (FileSystemManager)
```javascript
class FileSystemManager {
    async requestDirectoryAccess()
    async readFile(path)
    async writeFile(path, content)
    async createBackup(path)
    async ensureDirectory(path)
}
```

### 2. 札记管理器 (JournalManager)
```javascript
class JournalManager {
    async createJournal(journalData)
    async updateJournal(id, journalData)
    async deleteJournal(id)
    async getJournalList()
    generateJournalHTML(journalData)
    updateJournalIndex()
}
```

### 3. 图片内容管理器 (ImageContentManager)
```javascript
class ImageContentManager {
    async updateImageContent(categories)
    parseImageGalleryLoader()
    generateUpdatedContent(categories)
    async applyChanges()
}
```

### 4. 用户界面管理器 (UIManager)
```javascript
class UIManager {
    initializeTabs()
    showMessage(message, type)
    updateStatus(status)
    handleImageUpload()
    renderJournalList()
}
```

## Data Models

### 札记数据模型
```javascript
const JournalModel = {
    id: String,           // 唯一标识符
    title: String,        // 札记标题
    date: String,         // 发布日期
    excerpt: String,      // 摘要
    content: String,      // 正文内容
    tags: Array<String>,  // 标签列表
    mainImage: String,    // 主图路径
    images: Array<String>, // 附加图片列表
    published: Boolean,   // 发布状态
    createdAt: Date,      // 创建时间
    updatedAt: Date       // 更新时间
}
```

### 图片内容数据模型
```javascript
const ImageContentModel = {
    categories: {
        [categoryName]: {
            titles: Array<String>,      // 图片标题列表
            descriptions: Array<String> // 图片描述列表
        }
    }
}
```

## Error Handling

### 文件操作错误处理
1. **权限错误**: 提示用户授权文件系统访问
2. **文件不存在**: 自动创建必要的文件和目录
3. **写入失败**: 显示详细错误信息并提供重试选项
4. **备份失败**: 警告用户并询问是否继续

### 数据验证错误处理
1. **必填字段验证**: 实时验证并高亮显示错误字段
2. **格式验证**: 检查数据格式并提供修正建议
3. **重复数据检查**: 防止创建重复的札记ID

### 兼容性错误处理
1. **API不支持**: 降级到传统文件操作方式
2. **浏览器兼容性**: 提供功能检测和替代方案

## Testing Strategy

### 单元测试
- 文件系统操作函数测试
- 数据模型验证测试
- HTML生成函数测试

### 集成测试
- 札记创建到发布的完整流程测试
- 图片内容更新的端到端测试
- 错误恢复机制测试

### 用户界面测试
- 响应式设计测试
- 用户交互流程测试
- 错误消息显示测试

### 兼容性测试
- 不同浏览器的File System Access API支持测试
- 移动设备兼容性测试
- 降级功能测试

## Implementation Details

### 文件结构管理
```
project-root/
├── pages/
│   ├── journals/
│   │   ├── journal-001.html
│   │   └── ...
│   └── journal.html
├── data/
│   └── journals.json
├── backups/
│   ├── image-gallery-loader-backup-timestamp.js
│   └── ...
├── image-gallery-loader.js
└── tools/
    └── unified-content-manager.html
```

### 关键算法

#### 图片内容更新算法
1. 解析现有的 image-gallery-loader.js 文件
2. 提取现有的 titles 和 descriptions 对象
3. 根据用户输入更新数据
4. 生成新的JavaScript代码
5. 创建备份并写入更新后的文件

#### 札记HTML生成算法
1. 使用模板生成基础HTML结构
2. 插入札记内容和元数据
3. 处理图片路径和引用
4. 生成导航和相关链接

### 安全考虑
1. **文件路径验证**: 防止路径遍历攻击
2. **内容过滤**: 防止XSS攻击
3. **权限检查**: 确保只能访问指定目录
4. **备份机制**: 防止数据丢失