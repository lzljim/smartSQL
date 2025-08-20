# SmartSQL - Cursor的SQL智能助手插件

## 功能特性

SmartSQL是一个专为Cursor设计的SQL智能助手插件，提供以下核心功能：

### 🗄️ SQL存储管理
- **SQL收藏夹**：保存和管理常用的SQL语句
- **分类管理**：按功能类型组织SQL语句
- **标签系统**：支持自定义标签，便于快速检索
- **版本控制**：记录SQL的修改历史

### ✅ SQL验证功能
- **语法检查**：实时检查SQL语法正确性
- **执行验证**：使用模拟环境执行SQL并显示结果
- **错误提示**：详细的错误信息和修复建议
- **性能分析**：分析SQL执行计划和性能指标

### 🤖 智能SQL生成
- **自然语言转SQL**：利用Cursor内置AI，用户描述需求生成对应SQL
- **SQL优化建议**：基于AI分析提供SQL优化方案
- **智能补全**：基于上下文的SQL关键字和表名智能补全
- **代码片段**：内置常用SQL代码片段，支持快速插入

## 安装方法

### 方法1：从源码安装
1. 克隆或下载项目源码
2. 在项目目录下运行 `npm install`
3. 运行 `npm run compile` 编译项目
4. 在Cursor中按 `Ctrl+Shift+P`，选择 "Developer: Install Extension from Location"
5. 选择项目目录进行安装

### 方法2：打包安装
1. 在项目目录下运行 `npm run compile`
2. 运行 `vsce package` 打包插件
3. 在Cursor中安装生成的 `.vsix` 文件

## 使用方法

### 基本操作
1. **打开面板**：点击左侧活动栏的SmartSQL图标
2. **添加SQL**：点击面板顶部的"+"按钮
3. **编辑SQL**：右键点击SQL项目选择"编辑"
4. **删除SQL**：右键点击SQL项目选择"删除"

### 命令面板
- `SmartSQL: 打开SQL助手面板`
- `SmartSQL: 验证SQL语法`
- `SmartSQL: AI生成SQL`

## 开发环境

- **Node.js**: 16.0+
- **TypeScript**: 4.9+
- **Cursor**: 1.74+

## 项目结构

```
smartsql-extension/
├── src/                    # 源代码
│   ├── extension.ts       # 插件入口
│   ├── providers/         # 视图提供者
│   └── services/          # 业务服务
├── resources/             # 资源文件
├── out/                   # 编译输出
├── package.json           # 项目配置
└── tsconfig.json          # TypeScript配置
```

## 开发命令

```bash
# 安装依赖
npm install

# 编译项目
npm run compile

# 监听模式编译
npm run watch

# 运行测试
npm test
```

## 贡献指南

欢迎提交Issue和Pull Request来改进这个插件！

## 许可证

MIT License

## 更新日志

### v0.1.0 (开发中)
- 基础架构搭建
- SQL存储管理功能
- 基本的用户界面