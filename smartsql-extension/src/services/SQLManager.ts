import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';

export interface SQLItem {
    id: string;
    title: string;
    sql: string;
    category: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    description?: string;
}

export class SQLManager {
    private db!: sqlite3.Database;
    private dbPath: string;

    constructor(storageUri: vscode.Uri | undefined) {
        // 确定数据库存储路径
        if (storageUri) {
            this.dbPath = path.join(storageUri.fsPath, 'smartsql.db');
        } else {
            // 如果没有全局存储URI，使用插件目录
            this.dbPath = path.join(__dirname, '..', '..', 'data', 'smartsql.db');
        }
        
        // 确保目录存在
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        this.initDatabase();
    }

    private initDatabase() {
        try {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('打开数据库失败:', err);
                    vscode.window.showErrorMessage('打开SQL数据库失败');
                    return;
                }
                
                // 创建表结构
                this.createTables();
            });
        } catch (error) {
            console.error('初始化数据库失败:', error);
            vscode.window.showErrorMessage('初始化SQL数据库失败');
        }
    }

    private createTables() {
        const createTablesSQL = `
            CREATE TABLE IF NOT EXISTS sql_items (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                sql TEXT NOT NULL,
                category TEXT DEFAULT '未分类',
                tags TEXT DEFAULT '[]',
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT DEFAULT '#007ACC',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_sql_items_category ON sql_items(category);
            CREATE INDEX IF NOT EXISTS idx_sql_items_tags ON sql_items(tags);
        `;
        
        this.db.exec(createTablesSQL, (err) => {
            if (err) {
                console.error('创建表失败:', err);
                return;
            }
            
            // 插入默认分类
            this.insertDefaultCategories();
        });
    }

    private insertDefaultCategories() {
        const defaultCategories = [
            { id: 'default', name: '未分类', color: '#6C757D' },
            { id: 'query', name: '查询语句', color: '#28A745' },
            { id: 'insert', name: '插入语句', color: '#007BFF' },
            { id: 'update', name: '更新语句', color: '#FFC107' },
            { id: 'delete', name: '删除语句', color: '#DC3545' },
            { id: 'ddl', name: 'DDL语句', color: '#6F42C1' }
        ];

        const insertSQL = 'INSERT OR IGNORE INTO categories (id, name, color) VALUES (?, ?, ?)';
        
        defaultCategories.forEach(cat => {
            this.db.run(insertSQL, [cat.id, cat.name, cat.color], (err) => {
                if (err) {
                    console.error('插入默认分类失败:', err);
                }
            });
        });
    }

    // 添加SQL项目
    async addSQL(item: Omit<SQLItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<SQLItem> {
        return new Promise((resolve, reject) => {
            const id = this.generateId();
            const now = new Date();
            
            const insertSQL = `
                INSERT INTO sql_items (id, title, sql, category, tags, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(insertSQL, [
                id,
                item.title,
                item.sql,
                item.category,
                JSON.stringify(item.tags),
                item.description || '',
                now.toISOString(),
                now.toISOString()
            ], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                resolve({
                    ...item,
                    id,
                    createdAt: now,
                    updatedAt: now
                });
            });
        });
    }

    // 更新SQL项目
    async updateSQL(id: string, updates: Partial<Omit<SQLItem, 'id' | 'createdAt'>>): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const now = new Date();
            const updateFields: string[] = [];
            const values: any[] = [];
            
            if (updates.title !== undefined) {
                updateFields.push('title = ?');
                values.push(updates.title);
            }
            if (updates.sql !== undefined) {
                updateFields.push('sql = ?');
                values.push(updates.sql);
            }
            if (updates.category !== undefined) {
                updateFields.push('category = ?');
                values.push(updates.category);
            }
            if (updates.tags !== undefined) {
                updateFields.push('tags = ?');
                values.push(JSON.stringify(updates.tags));
            }
            if (updates.description !== undefined) {
                updateFields.push('description = ?');
                values.push(updates.description);
            }
            
            updateFields.push('updated_at = ?');
            values.push(now.toISOString());
            values.push(id);
            
            const updateSQL = `
                UPDATE sql_items 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `;
            
            this.db.run(updateSQL, values, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                resolve(this.changes > 0);
            });
        });
    }

    // 删除SQL项目
    async deleteSQL(id: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const deleteSQL = 'DELETE FROM sql_items WHERE id = ?';
            
            this.db.run(deleteSQL, [id], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                resolve(this.changes > 0);
            });
        });
    }

    // 获取所有SQL项目
    async getAllSQL(): Promise<SQLItem[]> {
        return new Promise((resolve, reject) => {
            const selectSQL = `
                SELECT id, title, sql, category, tags, description, created_at, updated_at
                FROM sql_items
                ORDER BY updated_at DESC
            `;
            
            this.db.all(selectSQL, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const result = rows.map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    sql: row.sql,
                    category: row.category,
                    tags: JSON.parse(row.tags || '[]'),
                    description: row.description,
                    createdAt: new Date(row.created_at),
                    updatedAt: new Date(row.updated_at)
                }));
                
                resolve(result);
            });
        });
    }

    // 根据分类获取SQL项目
    async getSQLByCategory(category: string): Promise<SQLItem[]> {
        return new Promise((resolve, reject) => {
            const selectSQL = `
                SELECT id, title, sql, category, tags, description, created_at, updated_at
                FROM sql_items
                WHERE category = ?
                ORDER BY updated_at DESC
            `;
            
            this.db.all(selectSQL, [category], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const result = rows.map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    sql: row.sql,
                    category: row.category,
                    tags: JSON.parse(row.tags || '[]'),
                    description: row.description,
                    createdAt: new Date(row.created_at),
                    updatedAt: new Date(row.updated_at)
                }));
                
                resolve(result);
            });
        });
    }

    // 搜索SQL项目
    async searchSQL(query: string): Promise<SQLItem[]> {
        return new Promise((resolve, reject) => {
            const searchSQL = `
                SELECT id, title, sql, category, tags, description, created_at, updated_at
                FROM sql_items
                WHERE title LIKE ? OR sql LIKE ? OR description LIKE ?
                ORDER BY updated_at DESC
            `;
            
            const searchPattern = `%${query}%`;
            
            this.db.all(searchSQL, [searchPattern, searchPattern, searchPattern], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const result = rows.map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    sql: row.sql,
                    category: row.category,
                    tags: JSON.parse(row.tags || '[]'),
                    description: row.description,
                    createdAt: new Date(row.created_at),
                    updatedAt: new Date(row.updated_at)
                }));
                
                resolve(result);
            });
        });
    }

    // 获取所有分类
    async getCategories(): Promise<{ id: string; name: string; color: string }[]> {
        return new Promise((resolve, reject) => {
            const selectSQL = 'SELECT id, name, color FROM categories ORDER BY name';
            
            this.db.all(selectSQL, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                resolve(rows as { id: string; name: string; color: string }[]);
            });
        });
    }

    // 生成唯一ID
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 关闭数据库连接
    dispose() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('关闭数据库失败:', err);
                }
            });
        }
    }
}