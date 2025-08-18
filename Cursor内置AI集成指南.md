# Cursor内置AI集成指南

## 1. 概述

### 1.1 为什么使用Cursor内置AI？

#### 1.1.1 主要优势
- **零成本**：无需配置API密钥，完全免费使用
- **深度集成**：与编辑器完美集成，响应速度快
- **上下文感知**：自动获取工作区、文件、代码结构等信息
- **稳定性高**：由Cursor官方维护，服务稳定可靠
- **功能丰富**：支持多种AI功能，包括代码生成、优化建议等

#### 1.1.2 适用场景
- SQL查询生成和优化
- 代码重构建议
- 性能分析
- 智能补全
- 错误诊断

### 1.2 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Cursor Extension                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   AI Service    │  │  Context        │  │  SQL        │ │
│  │   Layer         │  │  Provider       │  │  Generator  │ │
│  │                 │  │                 │  │             │ │
│  │ • Chat API      │  │ • Workspace     │  │ • Query     │ │
│  │ • Stream API    │  │ • File Context  │  │ • Optimize  │ │
│  │ • Completion    │  │ • Code Patterns │  │ • Validate  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Cursor Built-in AI                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Language      │  │   Code          │  │   Context   │ │
│  │   Model         │  │   Understanding │  │   Awareness │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 2. 核心API使用

### 2.1 基础AI聊天API

#### 2.1.1 简单对话
```typescript
import * as vscode from 'vscode';

export class BasicAIService {
  // 简单的AI对话
  async chat(prompt: string): Promise<string> {
    try {
      const response = await vscode.commands.executeCommand(
        'cursor.chat',
        prompt
      );
      return response;
    } catch (error) {
      throw new Error(`AI chat failed: ${error.message}`);
    }
  }
  
  // 带上下文的对话
  async chatWithContext(prompt: string, context: string): Promise<string> {
    const fullPrompt = `Context: ${context}\n\nUser: ${prompt}`;
    return await this.chat(fullPrompt);
  }
}
```

#### 2.1.2 流式响应
```typescript
export class StreamingAIService {
  // 流式AI响应
  async *chatStream(prompt: string): AsyncGenerator<string> {
    try {
      const stream = await vscode.commands.executeCommand(
        'cursor.chat.stream',
        {
          prompt: prompt,
          stream: true
        }
      );
      
      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content;
        }
      }
    } catch (error) {
      throw new Error(`Streaming failed: ${error.message}`);
    }
  }
  
  // 带进度的流式响应
  async *chatStreamWithProgress(
    prompt: string,
    onProgress?: (progress: number) => void
  ): AsyncGenerator<string> {
    let totalChunks = 0;
    let receivedChunks = 0;
    
    try {
      const stream = await vscode.commands.executeCommand(
        'cursor.chat.stream',
        {
          prompt: prompt,
          stream: true,
          estimateTokens: true
        }
      );
      
      for await (const chunk of stream) {
        if (chunk.content) {
          receivedChunks++;
          
          if (onProgress && chunk.totalTokens) {
            const progress = (receivedChunks / chunk.totalTokens) * 100;
            onProgress(Math.min(progress, 100));
          }
          
          yield chunk.content;
        }
      }
    } catch (error) {
      throw new Error(`Streaming failed: ${error.message}`);
    }
  }
}
```

### 2.2 高级AI功能

#### 2.2.1 代码生成
```typescript
export class CodeGenerationService {
  // 生成SQL查询
  async generateSQL(description: string, context: SQLContext): Promise<string> {
    const prompt = this.buildSQLPrompt(description, context);
    
    const response = await vscode.commands.executeCommand(
      'cursor.chat',
      prompt
    );
    
    return this.extractSQL(response);
  }
  
  // 生成SQL优化建议
  async generateOptimization(sql: string, context: SQLContext): Promise<string> {
    const prompt = `Analyze and optimize this SQL query:

SQL: ${sql}

Database Context:
${JSON.stringify(context, null, 2)}

Provide:
1. Optimized SQL
2. Performance improvements
3. Best practices recommendations`;

    return await vscode.commands.executeCommand('cursor.chat', prompt);
  }
  
  // 构建SQL生成提示
  private buildSQLPrompt(description: string, context: SQLContext): string {
    return `Generate SQL query based on this description:

Description: ${description}

Database Context:
- Type: ${context.databaseType}
- Tables: ${context.tables.join(', ')}
- Schema: ${JSON.stringify(context.schema, null, 2)}

Requirements:
1. Generate valid SQL for ${context.databaseType}
2. Use existing tables and columns
3. Follow best practices
4. Add helpful comments
5. Consider performance

Output only the SQL query.`;
  }
  
  // 提取SQL内容
  private extractSQL(response: string): string {
    // 移除代码块标记
    const sqlMatch = response.match(/```sql\s*([\s\S]*?)\s*```/);
    if (sqlMatch) {
      return sqlMatch[1].trim();
    }
    
    // 如果没有代码块，直接返回
    return response.trim();
  }
}
```

#### 2.2.2 智能补全
```typescript
export class SmartCompletionService {
  // 提供智能补全建议
  async provideCompletion(
    partialSQL: string,
    context: CompletionContext
  ): Promise<CompletionItem[]> {
    try {
      const prompt = `Complete this SQL query:

Partial SQL: ${partialSQL}

Context:
${JSON.stringify(context, null, 2)}

Provide 3-5 completion suggestions. Output as JSON array.`;

      const response = await vscode.commands.executeCommand(
        'cursor.chat',
        prompt
      );
      
      const suggestions = this.parseCompletionResponse(response);
      
      return suggestions.map(suggestion => ({
        label: suggestion,
        kind: vscode.CompletionItemKind.Text,
        detail: 'AI Generated',
        insertText: suggestion,
        sortText: '0'
      }));
    } catch (error) {
      // 降级到传统补全
      return this.provideTraditionalCompletion(partialSQL, context);
    }
  }
  
  // 解析补全响应
  private parseCompletionResponse(response: string): string[] {
    try {
      // 尝试解析JSON响应
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // 如果没有JSON，尝试解析普通文本
      const lines = response.split('\n').filter(line => line.trim());
      return lines.slice(0, 5); // 返回前5行作为建议
    } catch (error) {
      return [];
    }
  }
}
```

## 3. 上下文集成

### 3.1 工作区上下文

#### 3.1.1 文件系统上下文
```typescript
export class WorkspaceContextProvider {
  // 获取工作区数据库相关文件
  async getDatabaseFiles(): Promise<DatabaseFile[]> {
    const files = await vscode.workspace.findFiles(
      '**/*.{sql,db,schema,ddl}',
      '**/node_modules/**'
    );
    
    const databaseFiles: DatabaseFile[] = [];
    
    for (const file of files) {
      try {
        const content = await vscode.workspace.fs.readFile(file);
        const fileInfo = await vscode.workspace.fs.stat(file);
        
        databaseFiles.push({
          uri: file,
          name: path.basename(file.fsPath),
          content: content.toString(),
          size: fileInfo.size,
          modified: new Date(fileInfo.mtime)
        });
      } catch (error) {
        console.warn(`Failed to read file ${file.fsPath}:`, error);
      }
    }
    
    return databaseFiles;
  }
  
  // 获取当前活动文件
  getActiveFile(): vscode.TextDocument | undefined {
    return vscode.window.activeTextEditor?.document;
  }
  
  // 获取选中的文本
  getSelectedText(): string {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return '';
    
    const selection = editor.selection;
    return editor.document.getText(selection);
  }
}
```

#### 3.1.2 数据库模式解析
```typescript
export class SchemaParser {
  // 解析SQL文件中的表结构
  parseSchemaFromFiles(files: DatabaseFile[]): DatabaseSchema {
    const schema: DatabaseSchema = {
      tables: [],
      views: [],
      indexes: [],
      relationships: []
    };
    
    for (const file of files) {
      if (file.name.endsWith('.sql')) {
        const fileSchema = this.parseSQLFile(file.content);
        this.mergeSchema(schema, fileSchema);
      }
    }
    
    return schema;
  }
  
  // 解析单个SQL文件
  private parseSQLFile(content: string): DatabaseSchema {
    const schema: DatabaseSchema = {
      tables: [],
      views: [],
      indexes: [],
      relationships: []
    };
    
    // 解析CREATE TABLE语句
    const tableMatches = content.match(/CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]*?)\)/gi);
    if (tableMatches) {
      for (const match of tableMatches) {
        const table = this.parseCreateTable(match);
        if (table) {
          schema.tables.push(table);
        }
      }
    }
    
    // 解析CREATE VIEW语句
    const viewMatches = content.match(/CREATE\s+VIEW\s+(\w+)\s+AS\s+([\s\S]*?);/gi);
    if (viewMatches) {
      for (const match of viewMatches) {
        const view = this.parseCreateView(match);
        if (view) {
          schema.views.push(view);
        }
      }
    }
    
    return schema;
  }
  
  // 解析CREATE TABLE语句
  private parseCreateTable(createTableSQL: string): Table | null {
    const tableNameMatch = createTableSQL.match(/CREATE\s+TABLE\s+(\w+)/i);
    if (!tableNameMatch) return null;
    
    const tableName = tableNameMatch[1];
    const columns: Column[] = [];
    
    // 解析列定义
    const columnMatches = createTableSQL.match(/`?(\w+)`?\s+(\w+)(?:\(([^)]+)\))?/gi);
    if (columnMatches) {
      for (const match of columnMatches) {
        const column = this.parseColumnDefinition(match);
        if (column) {
          columns.push(column);
        }
      }
    }
    
    return {
      name: tableName,
      columns: columns,
      primaryKey: this.extractPrimaryKey(createTableSQL),
      foreignKeys: this.extractForeignKeys(createTableSQL)
    };
  }
}
```

### 3.2 代码模式分析

#### 3.2.1 SQL使用模式识别
```typescript
export class CodePatternAnalyzer {
  // 分析代码中的SQL使用模式
  async analyzeSQLPatterns(): Promise<SQLPattern[]> {
    const patterns: SQLPattern[] = [];
    
    // 获取所有代码文件
    const codeFiles = await vscode.workspace.findFiles(
      '**/*.{js,ts,jsx,tsx,py,java,cpp,c,cs,php,rb,go,rs}',
      '**/node_modules/**'
    );
    
    for (const file of codeFiles) {
      try {
        const content = await vscode.workspace.fs.readFile(file);
        const filePatterns = this.extractPatternsFromFile(content.toString());
        patterns.push(...filePatterns);
      } catch (error) {
        console.warn(`Failed to analyze file ${file.fsPath}:`, error);
      }
    }
    
    return this.consolidatePatterns(patterns);
  }
  
  // 从文件中提取模式
  private extractPatternsFromFile(content: string): SQLPattern[] {
    const patterns: SQLPattern[] = [];
    
    // 查找SQL字符串
    const sqlMatches = content.match(/['"`](SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)[\s\S]*?['"`]/gi);
    if (sqlMatches) {
      for (const match of sqlMatches) {
        const sql = match.slice(1, -1); // 移除引号
        const pattern = this.analyzeSQLPattern(sql);
        if (pattern) {
          patterns.push(pattern);
        }
      }
    }
    
    // 查找SQL模板
    const templateMatches = content.match(/query\s*[:=]\s*['"`]([\s\S]*?)['"`]/gi);
    if (templateMatches) {
      for (const match of templateMatches) {
        const template = match.match(/['"`]([\s\S]*?)['"`]/)?.[1];
        if (template) {
          patterns.push({
            type: 'template',
            content: template,
            frequency: 1,
            context: 'query assignment'
          });
        }
      }
    }
    
    return patterns;
  }
  
  // 分析SQL模式
  private analyzeSQLPattern(sql: string): SQLPattern | null {
    const type = this.getSQLType(sql);
    if (!type) return null;
    
    return {
      type: type,
      content: sql,
      frequency: 1,
      complexity: this.calculateComplexity(sql),
      tables: this.extractTableNames(sql),
      operations: this.extractOperations(sql)
    };
  }
  
  // 获取SQL类型
  private getSQLType(sql: string): string | null {
    const upperSQL = sql.trim().toUpperCase();
    
    if (upperSQL.startsWith('SELECT')) return 'SELECT';
    if (upperSQL.startsWith('INSERT')) return 'INSERT';
    if (upperSQL.startsWith('UPDATE')) return 'UPDATE';
    if (upperSQL.startsWith('DELETE')) return 'DELETE';
    if (upperSQL.startsWith('CREATE')) return 'CREATE';
    if (upperSQL.startsWith('ALTER')) return 'ALTER';
    if (upperSQL.startsWith('DROP')) return 'DROP';
    
    return null;
  }
}
```

## 4. 高级功能实现

### 4.1 智能SQL生成

#### 4.1.1 上下文感知生成器
```typescript
export class ContextAwareSQLGenerator {
  private aiService: CursorAIService;
  private contextProvider: WorkspaceContextProvider;
  private patternAnalyzer: CodePatternAnalyzer;
  
  constructor(
    aiService: CursorAIService,
    contextProvider: WorkspaceContextProvider,
    patternAnalyzer: CodePatternAnalyzer
  ) {
    this.aiService = aiService;
    this.contextProvider = contextProvider;
    this.patternAnalyzer = patternAnalyzer;
  }
  
  // 生成上下文感知的SQL
  async generateContextAwareSQL(
    userRequest: string,
    options: GenerationOptions = {}
  ): Promise<GeneratedSQL> {
    try {
      // 获取工作区上下文
      const [databaseFiles, codePatterns, activeFile] = await Promise.all([
        this.contextProvider.getDatabaseFiles(),
        this.patternAnalyzer.analyzeSQLPatterns(),
        this.contextProvider.getActiveFile()
      ]);
      
      // 构建增强提示
      const enhancedPrompt = this.buildEnhancedPrompt(
        userRequest,
        {
          databaseFiles,
          codePatterns,
          activeFile,
          options
        }
      );
      
      // 使用AI生成SQL
      const aiResponse = await this.aiService.chat(enhancedPrompt);
      
      // 解析和验证结果
      const sql = this.extractSQL(aiResponse);
      const validation = await this.validateGeneratedSQL(sql, databaseFiles);
      
      return {
        sql: sql,
        explanation: this.extractExplanation(aiResponse),
        context: {
          databaseFiles: databaseFiles.length,
          codePatterns: codePatterns.length,
          activeFile: activeFile?.fileName
        },
        validation: validation,
        suggestions: this.generateSuggestions(sql, codePatterns)
      };
    } catch (error) {
      throw new Error(`Failed to generate context-aware SQL: ${error.message}`);
    }
  }
  
  // 构建增强提示
  private buildEnhancedPrompt(
    userRequest: string,
    context: GenerationContext
  ): string {
    const databaseContext = this.formatDatabaseContext(context.databaseFiles);
    const patternContext = this.formatPatternContext(context.codePatterns);
    const activeFileContext = context.activeFile ? 
      `\nActive File: ${context.activeFile.fileName}` : '';
    
    return `You are an expert SQL developer. Generate SQL based on this request:

User Request: ${userRequest}

Workspace Context:
${databaseContext}

Code Patterns:
${patternContext}${activeFileContext}

Requirements:
1. Use existing tables and columns from the workspace
2. Follow the established naming conventions and patterns
3. Consider existing relationships and constraints
4. Generate optimized SQL for the current database structure
5. Add helpful comments explaining the logic
6. Follow the coding style used in the workspace

Output format:
\`\`\`sql
[SQL Query]
\`\`\`

\`\`\`explanation
[Brief explanation of the approach and any important considerations]
\`\`\``;
  }
  
  // 格式化数据库上下文
  private formatDatabaseContext(files: DatabaseFile[]): string {
    if (files.length === 0) {
      return 'No database files found in workspace.';
    }
    
    let context = `Found ${files.length} database-related files:\n`;
    
    for (const file of files.slice(0, 5)) { // 只显示前5个文件
      context += `- ${file.name} (${file.size} bytes, modified: ${file.modified.toLocaleDateString()})\n`;
    }
    
    if (files.length > 5) {
      context += `... and ${files.length - 5} more files\n`;
    }
    
    return context;
  }
  
  // 格式化模式上下文
  private formatPatternContext(patterns: SQLPattern[]): string {
    if (patterns.length === 0) {
      return 'No SQL patterns found in codebase.';
    }
    
    const patternSummary = patterns.reduce((acc, pattern) => {
      acc[pattern.type] = (acc[pattern.type] || 0) + pattern.frequency;
      return acc;
    }, {} as Record<string, number>);
    
    let context = `Found SQL patterns in codebase:\n`;
    for (const [type, count] of Object.entries(patternSummary)) {
      context += `- ${type}: ${count} occurrences\n`;
    }
    
    return context;
  }
}
```

#### 4.1.2 SQL优化建议器
```typescript
export class SQLOptimizationAdvisor {
  private aiService: CursorAIService;
  private contextProvider: WorkspaceContextProvider;
  
  constructor(
    aiService: CursorAIService,
    contextProvider: WorkspaceContextProvider
  ) {
    this.aiService = aiService;
    this.contextProvider = contextProvider;
  }
  
  // 分析SQL并提供优化建议
  async analyzeAndOptimize(
    sql: string,
    context: OptimizationContext = {}
  ): Promise<OptimizationResult> {
    try {
      // 获取工作区上下文
      const databaseFiles = await this.contextProvider.getDatabaseFiles();
      
      // 构建优化提示
      const optimizationPrompt = this.buildOptimizationPrompt(sql, {
        ...context,
        databaseFiles
      });
      
      // 使用AI分析
      const aiResponse = await this.aiService.chat(optimizationPrompt);
      
      // 解析结果
      return this.parseOptimizationResponse(aiResponse);
    } catch (error) {
      throw new Error(`Failed to analyze SQL: ${error.message}`);
    }
  }
  
  // 构建优化提示
  private buildOptimizationPrompt(
    sql: string,
    context: OptimizationContext
  ): string {
    const databaseContext = context.databaseFiles ? 
      this.formatDatabaseContext(context.databaseFiles) : '';
    
    return `Analyze and optimize this SQL query:

Original SQL:
\`\`\`sql
${sql}
\`\`\`

Database Context:
${databaseContext}

Please provide:
1. **Performance Analysis**: Identify potential performance issues
2. **Optimized SQL**: Provide an optimized version
3. **Index Recommendations**: Suggest indexes if needed
4. **Best Practices**: Recommend improvements
5. **Security Considerations**: Identify security issues

Output format:
\`\`\`analysis
[Performance analysis and issues found]
\`\`\`

\`\`\`sql
[Optimized SQL query]
\`\`\`

\`\`\`recommendations
[Index and best practice recommendations]
\`\`\`

\`\`\`security
[Security considerations and recommendations]
\`\`\``;
  }
  
  // 解析优化响应
  private parseOptimizationResponse(response: string): OptimizationResult {
    const analysis = this.extractSection(response, 'analysis');
    const optimizedSQL = this.extractSection(response, 'sql');
    const recommendations = this.extractSection(response, 'recommendations');
    const security = this.extractSection(response, 'security');
    
    return {
      analysis: analysis || 'No analysis provided',
      optimizedSQL: optimizedSQL || '',
      recommendations: recommendations || 'No recommendations provided',
      security: security || 'No security analysis provided',
      originalSQL: '',
      timestamp: new Date()
    };
  }
  
  // 提取特定部分
  private extractSection(response: string, section: string): string | null {
    const regex = new RegExp(`\`\`\`${section}\\s*([\\s\\S]*?)\\s*\`\`\``, 'i');
    const match = response.match(regex);
    return match ? match[1].trim() : null;
  }
}
```

### 4.2 智能错误诊断

#### 4.2.1 SQL错误分析器
```typescript
export class SQLErrorAnalyzer {
  private aiService: CursorAIService;
  
  constructor(aiService: CursorAIService) {
    this.aiService = aiService;
  }
  
  // 分析SQL错误并提供修复建议
  async analyzeError(
    sql: string,
    error: string,
    context: ErrorContext = {}
  ): Promise<ErrorAnalysis> {
    try {
      const prompt = this.buildErrorAnalysisPrompt(sql, error, context);
      const response = await this.aiService.chat(prompt);
      
      return this.parseErrorAnalysis(response);
    } catch (error) {
      throw new Error(`Failed to analyze SQL error: ${error.message}`);
    }
  }
  
  // 构建错误分析提示
  private buildErrorAnalysisPrompt(
    sql: string,
    error: string,
    context: ErrorContext
  ): string {
    const databaseContext = context.databaseType ? 
      `\nDatabase Type: ${context.databaseType}` : '';
    const tableContext = context.tables ? 
      `\nAvailable Tables: ${context.tables.join(', ')}` : '';
    
    return `Analyze this SQL error and provide a solution:

SQL Query:
\`\`\`sql
${sql}
\`\`\`

Error Message:
${error}${databaseContext}${tableContext}

Please provide:
1. **Error Analysis**: Explain what caused the error
2. **Root Cause**: Identify the underlying issue
3. **Solution**: Provide the corrected SQL
4. **Prevention**: How to avoid this error in the future
5. **Best Practices**: Related best practices

Output format:
\`\`\`analysis
[Error analysis and explanation]
\`\`\`

\`\`\`cause
[Root cause identification]
\`\`\`

\`\`\`sql
[Corrected SQL query]
\`\`\`

\`\`\`prevention
[How to prevent this error]
\`\`\`

\`\`\`best-practices
[Related best practices]
\`\`\``;
  }
  
  // 解析错误分析响应
  private parseErrorAnalysis(response: string): ErrorAnalysis {
    const analysis = this.extractSection(response, 'analysis');
    const cause = this.extractSection(response, 'cause');
    const correctedSQL = this.extractSection(response, 'sql');
    const prevention = this.extractSection(response, 'prevention');
    const bestPractices = this.extractSection(response, 'best-practices');
    
    return {
      analysis: analysis || 'No analysis provided',
      cause: cause || 'No cause identified',
      correctedSQL: correctedSQL || '',
      prevention: prevention || 'No prevention tips provided',
      bestPractices: bestPractices || 'No best practices provided',
      timestamp: new Date()
    };
  }
  
  // 提取特定部分
  private extractSection(response: string, section: string): string | null {
    const regex = new RegExp(`\`\`\`${section}\\s*([\\s\\S]*?)\\s*\`\`\``, 'i');
    const match = response.match(regex);
    return match ? match[1].trim() : null;
  }
}
```

## 5. 性能优化

### 5.1 缓存策略

#### 5.1.1 AI响应缓存
```typescript
export class AICacheManager {
  private cache = new Map<string, CacheItem>();
  private maxSize = 1000;
  private ttl = 30 * 60 * 1000; // 30分钟
  
  // 获取缓存的AI响应
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // 检查过期
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  // 设置缓存
  set<T>(key: string, value: T): void {
    // 检查缓存大小
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  // 生成缓存键
  generateKey(prompt: string, context: any): string {
    const normalizedPrompt = this.normalizePrompt(prompt);
    const contextHash = this.hashContext(context);
    return `${normalizedPrompt}:${contextHash}`;
  }
  
  // 标准化提示
  private normalizePrompt(prompt: string): string {
    return prompt
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  }
  
  // 哈希上下文
  private hashContext(context: any): string {
    return require('crypto')
      .createHash('md5')
      .update(JSON.stringify(context))
      .digest('hex');
  }
}
```

#### 5.1.2 智能缓存失效
```typescript
export class SmartCacheInvalidator {
  private cacheManager: AICacheManager;
  private fileWatcher: vscode.FileSystemWatcher;
  
  constructor(cacheManager: AICacheManager) {
    this.cacheManager = cacheManager;
    this.setupFileWatcher();
  }
  
  // 设置文件监听器
  private setupFileWatcher(): void {
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      '**/*.{sql,db,schema,ddl}'
    );
    
    this.fileWatcher.onDidChange(() => {
      this.invalidateDatabaseCache();
    });
    
    this.fileWatcher.onDidCreate(() => {
      this.invalidateDatabaseCache();
    });
    
    this.fileWatcher.onDidDelete(() => {
      this.invalidateDatabaseCache();
    });
  }
  
  // 失效数据库相关缓存
  private invalidateDatabaseCache(): void {
    // 清除所有与数据库相关的缓存
    // 这里可以实现更细粒度的缓存失效策略
    console.log('Database files changed, invalidating related cache');
  }
}
```

### 5.2 异步处理

#### 5.2.1 后台任务管理
```typescript
export class BackgroundTaskManager {
  private tasks = new Map<string, BackgroundTask>();
  private maxConcurrentTasks = 3;
  private runningTasks = 0;
  private taskQueue: QueuedTask[] = [];
  
  // 启动后台任务
  async startTask<T>(
    taskId: string,
    taskFn: () => Promise<T>,
    priority: TaskPriority = 'normal'
  ): Promise<string> {
    const task: BackgroundTask = {
      id: taskId,
      status: 'queued',
      priority,
      startTime: Date.now(),
      progress: 0
    };
    
    this.tasks.set(taskId, task);
    
    if (this.runningTasks < this.maxConcurrentTasks) {
      this.executeTask(taskId, taskFn);
    } else {
      this.queueTask(taskId, taskFn, priority);
    }
    
    return taskId;
  }
  
  // 执行任务
  private async executeTask<T>(
    taskId: string,
    taskFn: () => Promise<T>
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.status = 'running';
    this.runningTasks++;
    
    try {
      await taskFn();
      task.status = 'completed';
      task.progress = 100;
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
    } finally {
      task.endTime = Date.now();
      this.runningTasks--;
      this.processNextTask();
    }
  }
  
  // 队列任务
  private queueTask<T>(
    taskId: string,
    taskFn: () => Promise<T>,
    priority: TaskPriority
  ): void {
    this.taskQueue.push({
      id: taskId,
      taskFn,
      priority,
      timestamp: Date.now()
    });
    
    // 按优先级排序
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
  
  // 处理下一个任务
  private processNextTask(): void {
    if (this.taskQueue.length === 0 || this.runningTasks >= this.maxConcurrentTasks) {
      return;
    }
    
    const nextTask = this.taskQueue.shift();
    if (nextTask) {
      this.executeTask(nextTask.id, nextTask.taskFn);
    }
  }
}
```

## 6. 错误处理和降级

### 6.1 错误处理策略

#### 6.1.1 分层错误处理
```typescript
export class ErrorHandler {
  // 处理AI服务错误
  async handleAIError(error: Error, context: ErrorContext): Promise<ErrorHandlingResult> {
    console.error('AI service error:', error);
    
    // 根据错误类型选择处理策略
    if (this.isNetworkError(error)) {
      return this.handleNetworkError(context);
    } else if (this.isRateLimitError(error)) {
      return this.handleRateLimitError(context);
    } else if (this.isAuthenticationError(error)) {
      return this.handleAuthenticationError(context);
    } else {
      return this.handleGenericError(error, context);
    }
  }
  
  // 处理网络错误
  private async handleNetworkError(context: ErrorContext): Promise<ErrorHandlingResult> {
    // 尝试重试
    const retryResult = await this.retryWithBackoff(context);
    if (retryResult.success) {
      return retryResult;
    }
    
    // 降级到本地处理
    return this.fallbackToLocalProcessing(context);
  }
  
  // 处理速率限制错误
  private async handleRateLimitError(context: ErrorContext): Promise<ErrorHandlingResult> {
    // 等待一段时间后重试
    await this.delay(5000);
    
    try {
      const result = await this.retryOperation(context);
      return { success: true, result, method: 'retry' };
    } catch (error) {
      return this.fallbackToLocalProcessing(context);
    }
  }
  
  // 降级到本地处理
  private async fallbackToLocalProcessing(context: ErrorContext): Promise<ErrorHandlingResult> {
    try {
      // 使用本地规则引擎或模板
      const result = await this.localSQLGenerator.generate(context);
      return {
        success: true,
        result,
        method: 'local',
        warning: 'Using local processing due to AI service unavailability'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Both AI service and local processing failed',
        method: 'none'
      };
    }
  }
  
  // 重试操作
  private async retryOperation(context: ErrorContext, maxRetries = 3): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.executeAIOperation(context);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.delay(Math.pow(2, i) * 1000); // 指数退避
      }
    }
  }
}
```

#### 6.1.2 用户友好的错误提示
```typescript
export class UserFriendlyErrorHandler {
  // 显示用户友好的错误信息
  showError(error: Error, context: ErrorContext): void {
    const message = this.formatErrorMessage(error, context);
    const actions = this.getErrorActions(error, context);
    
    vscode.window.showErrorMessage(message, ...actions);
  }
  
  // 格式化错误消息
  private formatErrorMessage(error: Error, context: ErrorContext): string {
    if (this.isNetworkError(error)) {
      return 'Network connection issue. Please check your internet connection and try again.';
    } else if (this.isRateLimitError(error)) {
      return 'AI service is temporarily busy. Please wait a moment and try again.';
    } else if (this.isAuthenticationError(error)) {
      return 'Authentication failed. Please check your Cursor settings.';
    } else {
      return `An unexpected error occurred: ${error.message}`;
    }
  }
  
  // 获取错误操作选项
  private getErrorActions(error: Error, context: ErrorContext): string[] {
    const actions: string[] = [];
    
    if (this.isNetworkError(error)) {
      actions.push('Retry', 'Use Local Processing');
    } else if (this.isRateLimitError(error)) {
      actions.push('Wait & Retry', 'Use Local Processing');
    } else if (this.isAuthenticationError(error)) {
      actions.push('Check Settings', 'Report Issue');
    } else {
      actions.push('Retry', 'Report Issue');
    }
    
    return actions;
  }
}
```

## 7. 测试策略

### 7.1 AI功能测试

#### 7.1.1 模拟AI响应
```typescript
// test/mocks/cursorAIMock.ts
export class MockCursorAIService {
  private responses = new Map<string, string>();
  
  // 设置模拟响应
  setResponse(prompt: string, response: string): void {
    this.responses.set(this.normalizePrompt(prompt), response);
  }
  
  // 模拟AI聊天
  async chat(prompt: string): Promise<string> {
    const normalizedPrompt = this.normalizePrompt(prompt);
    const response = this.responses.get(normalizedPrompt);
    
    if (response) {
      return response;
    }
    
    // 默认响应
    return 'This is a mock AI response for testing purposes.';
  }
  
  // 标准化提示
  private normalizePrompt(prompt: string): string {
    return prompt.toLowerCase().trim();
  }
}

// test/services/aiService.test.ts
describe('CursorAIService', () => {
  let aiService: CursorAIService;
  let mockAI: MockCursorAIService;
  
  beforeEach(() => {
    mockAI = new MockCursorAIService();
    aiService = new CursorAIService(mockAI);
  });
  
  describe('generateSQL', () => {
    it('should generate SQL using AI', async () => {
      const mockResponse = '```sql\nSELECT * FROM users WHERE active = 1;\n```';
      mockAI.setResponse('generate sql for active users', mockResponse);
      
      const result = await aiService.generateSQL('generate sql for active users');
      
      expect(result).toBe('SELECT * FROM users WHERE active = 1;');
    });
    
    it('should handle AI errors gracefully', async () => {
      mockAI.setResponse('invalid prompt', '');
      
      await expect(aiService.generateSQL('invalid prompt')).rejects.toThrow();
    });
  });
});
```

### 7.2 集成测试

#### 7.2.1 端到端测试
```typescript
// test/integration/aiIntegration.test.ts
describe('AI Integration', () => {
  let testEnvironment: TestEnvironment;
  
  beforeAll(async () => {
    testEnvironment = new TestEnvironment();
    await testEnvironment.setup();
  });
  
  afterAll(async () => {
    await testEnvironment.teardown();
  });
  
  it('should generate SQL with workspace context', async () => {
    // 创建测试数据库文件
    await testEnvironment.createTestSQLFile();
    
    // 测试AI集成
    const generator = new ContextAwareSQLGenerator(
      testEnvironment.aiService,
      testEnvironment.contextProvider,
      testEnvironment.patternAnalyzer
    );
    
    const result = await generator.generateContextAwareSQL(
      'create a query to get all users with their orders'
    );
    
    expect(result.sql).toBeTruthy();
    expect(result.context.databaseFiles).toBeGreaterThan(0);
    expect(result.validation.isValid).toBe(true);
  });
});
```

## 8. 最佳实践

### 8.1 性能最佳实践

#### 8.1.1 提示工程优化
```typescript
export class PromptOptimizer {
  // 优化AI提示以提高响应质量
  optimizePrompt(prompt: string, context: any): string {
    let optimized = prompt;
    
    // 添加明确的输出格式要求
    if (!optimized.includes('Output format:')) {
      optimized += '\n\nOutput format:\n```sql\n[SQL Query]\n```';
    }
    
    // 添加约束条件
    if (!optimized.includes('Requirements:')) {
      optimized += '\n\nRequirements:\n1. Generate valid SQL\n2. Follow best practices\n3. Add helpful comments';
    }
    
    // 限制输出长度
    if (!optimized.includes('Keep the response concise')) {
      optimized += '\n\nKeep the response concise and focused.';
    }
    
    return optimized;
  }
  
  // 构建结构化提示
  buildStructuredPrompt(
    task: string,
    context: any,
    constraints: string[] = []
  ): string {
    return `Task: ${task}

Context:
${JSON.stringify(context, null, 2)}

Constraints:
${constraints.map(c => `- ${c}`).join('\n')}

Output Format:
\`\`\`sql
[SQL Query]
\`\`\`

\`\`\`explanation
[Brief explanation]
\`\`\``;
  }
}
```

#### 8.1.2 缓存策略优化
```typescript
export class CacheOptimizer {
  // 智能缓存键生成
  generateCacheKey(prompt: string, context: any): string {
    // 标准化提示
    const normalizedPrompt = this.normalizePrompt(prompt);
    
    // 提取关键上下文信息
    const keyContext = this.extractKeyContext(context);
    
    // 生成哈希
    return this.hash(`${normalizedPrompt}:${keyContext}`);
  }
  
  // 提取关键上下文
  private extractKeyContext(context: any): string {
    const key = {
      databaseType: context.databaseType,
      tableCount: context.tables?.length || 0,
      hasSchema: !!context.schema,
      timestamp: Math.floor(Date.now() / (5 * 60 * 1000)) // 5分钟时间窗口
    };
    
    return JSON.stringify(key);
  }
  
  // 标准化提示
  private normalizePrompt(prompt: string): string {
    return prompt
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  }
}
```

### 8.2 用户体验最佳实践

#### 8.2.1 渐进式增强
```typescript
export class ProgressiveEnhancement {
  // 检查AI功能可用性
  async checkAIAvailability(): Promise<AIAvailability> {
    try {
      // 尝试执行简单的AI命令
      await vscode.commands.executeCommand('cursor.chat', 'Hello');
      return { available: true, type: 'full' };
    } catch (error) {
      return { available: false, type: 'none', error: error.message };
    }
  }
  
  // 根据可用性调整功能
  adjustFeatures(availability: AIAvailability): FeatureSet {
    if (availability.available) {
      return {
        sqlGeneration: 'ai',
        optimization: 'ai',
        errorAnalysis: 'ai',
        completion: 'ai'
      };
    } else {
      return {
        sqlGeneration: 'local',
        optimization: 'local',
        errorAnalysis: 'local',
        completion: 'basic'
      };
    }
  }
  
  // 显示功能状态
  showFeatureStatus(features: FeatureSet): void {
    const statusBar = vscode.window.createStatusBarItem();
    
    if (features.sqlGeneration === 'ai') {
      statusBar.text = '$(lightbulb) SmartSQL AI Enabled';
      statusBar.tooltip = 'AI features are available';
    } else {
      statusBar.text = '$(lightbulb) SmartSQL Local Mode';
      statusBar.tooltip = 'Using local processing only';
    }
    
    statusBar.show();
  }
}
```

## 9. 总结

本指南详细介绍了如何在Cursor插件中集成和使用内置AI功能，主要优势包括：

### 9.1 技术优势
- **零成本**：无需外部API密钥，完全免费
- **深度集成**：与编辑器完美集成，响应速度快
- **上下文感知**：自动获取工作区信息，生成更准确的SQL
- **稳定性高**：由Cursor官方维护，服务稳定可靠

### 9.2 实现要点
1. **使用Cursor AI API**：`vscode.commands.executeCommand('cursor.chat', prompt)`
2. **上下文集成**：结合工作区文件、代码模式等信息
3. **错误处理**：完善的错误处理和降级策略
4. **性能优化**：智能缓存和异步处理
5. **用户体验**：渐进式增强和友好的错误提示

### 9.3 最佳实践
- 构建结构化的AI提示
- 实现智能缓存策略
- 提供优雅的降级方案
- 持续优化提示工程
- 完善的测试覆盖

通过合理使用Cursor内置AI，可以为用户提供智能、高效、免费的SQL开发体验，同时保持插件的轻量级和高性能特性。