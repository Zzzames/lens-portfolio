# Requirements Document

## Introduction

用户需要一个统一的内容管理工具来替代现有的 content-manager.html 和后端服务，解决当前存在的重大 bug，并将前后端整合到一个文件中。用户希望能够通过一个文件就能修改和同步网站内容，包括札记管理和图片内容管理。

## Requirements

### Requirement 1

**User Story:** 作为网站管理员，我希望有一个单文件的内容管理工具，这样我就能够直接打开一个文件来管理所有网站内容。

#### Acceptance Criteria

1. WHEN 用户打开统一内容管理工具 THEN 系统 SHALL 在一个HTML文件中提供完整的前后端功能
2. WHEN 用户需要管理内容 THEN 系统 SHALL 不需要单独启动后端服务
3. WHEN 用户保存更改 THEN 系统 SHALL 直接更新相关的源文件

### Requirement 2

**User Story:** 作为网站管理员，我希望能够创建、编辑和删除札记，这样我就能够管理网站的札记内容。

#### Acceptance Criteria

1. WHEN 用户创建新札记 THEN 系统 SHALL 生成对应的HTML文件和更新札记索引
2. WHEN 用户编辑现有札记 THEN 系统 SHALL 更新对应的HTML文件和数据
3. WHEN 用户删除札记 THEN 系统 SHALL 删除对应的HTML文件并更新索引
4. WHEN 用户上传图片 THEN 系统 SHALL 处理图片并关联到札记

### Requirement 3

**User Story:** 作为网站管理员，我希望能够批量管理图片的标题和描述，这样我就能够快速更新图片库的内容。

#### Acceptance Criteria

1. WHEN 用户修改图片标题 THEN 系统 SHALL 更新 image-gallery-loader.js 中的标题数据
2. WHEN 用户修改图片描述 THEN 系统 SHALL 更新 image-gallery-loader.js 中的描述数据
3. WHEN 用户应用更改 THEN 系统 SHALL 创建备份并更新源文件
4. WHEN 更新失败 THEN 系统 SHALL 显示错误信息并保持原有数据

### Requirement 4

**User Story:** 作为网站管理员，我希望工具能够自动处理文件操作，这样我就不需要手动管理文件系统。

#### Acceptance Criteria

1. WHEN 系统需要创建文件 THEN 系统 SHALL 自动创建必要的目录结构
2. WHEN 系统更新文件 THEN 系统 SHALL 自动创建备份
3. WHEN 系统处理图片 THEN 系统 SHALL 自动转换为适当的格式和路径
4. WHEN 发生错误 THEN 系统 SHALL 提供详细的错误信息和恢复建议

### Requirement 5

**User Story:** 作为网站管理员，我希望工具有良好的用户界面，这样我就能够高效地管理内容。

#### Acceptance Criteria

1. WHEN 用户打开工具 THEN 系统 SHALL 显示清晰的标签页界面
2. WHEN 用户执行操作 THEN 系统 SHALL 提供实时的状态反馈
3. WHEN 操作完成 THEN 系统 SHALL 显示成功或失败的消息
4. WHEN 用户需要帮助 THEN 系统 SHALL 提供使用说明和提示