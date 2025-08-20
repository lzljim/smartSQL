const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// 创建测试数据库
const testDbPath = path.join(__dirname, 'test.db');

// 确保测试目录存在
const testDir = path.dirname(testDbPath);
if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
}

console.log('开始测试SQLite数据库功能...');

// 创建数据库连接
const db = new sqlite3.Database(testDbPath, (err) => {
    if (err) {
        console.error('创建数据库失败:', err);
        return;
    }
    
    console.log('数据库连接成功');
    
    // 创建表结构
    createTables();
});

function createTables() {
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
    
    db.exec(createTablesSQL, (err) => {
        if (err) {
            console.error('创建表失败:', err);
            return;
        }
        
        console.log('表创建成功');
        
        // 插入默认分类
        insertDefaultCategories();
    });
}

function insertDefaultCategories() {
    const defaultCategories = [
        { id: 'default', name: '未分类', color: '#6C757D' },
        { id: 'query', name: '查询语句', color: '#28A745' },
        { id: 'insert', name: '插入语句', color: '#007BFF' },
        { id: 'update', name: '更新语句', color: '#FFC107' },
        { id: 'delete', name: '删除语句', color: '#DC3545' },
        { id: 'ddl', name: 'DDL语句', color: '#6F42C1' }
    ];

    const insertSQL = 'INSERT OR IGNORE INTO categories (id, name, color) VALUES (?, ?, ?)';
    
    let completed = 0;
    defaultCategories.forEach(cat => {
        db.run(insertSQL, [cat.id, cat.name, cat.color], (err) => {
            if (err) {
                console.error('插入默认分类失败:', err);
            }
            
            completed++;
            if (completed === defaultCategories.length) {
                console.log('默认分类插入完成');
                
                // 开始测试CRUD操作
                testCRUDOperations();
            }
        });
    });
}

function testCRUDOperations() {
    console.log('\n开始测试CRUD操作...');
    
    // 测试添加SQL
    const testSQL = {
        id: 'test_' + Date.now(),
        title: '测试查询',
        sql: 'SELECT * FROM users WHERE id = ?',
        category: '查询语句',
        tags: JSON.stringify(['用户', '查询']),
        description: '这是一个测试SQL',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    const insertSQL = `
        INSERT INTO sql_items (id, title, sql, category, tags, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(insertSQL, [
        testSQL.id,
        testSQL.title,
        testSQL.sql,
        testSQL.category,
        testSQL.tags,
        testSQL.description,
        testSQL.created_at,
        testSQL.updated_at
    ], function(err) {
        if (err) {
            console.error('插入SQL失败:', err);
            return;
        }
        
        console.log('SQL插入成功，ID:', this.lastID);
        
        // 测试查询
        testQuery();
    });
}

function testQuery() {
    console.log('\n测试查询功能...');
    
    // 查询所有SQL
    db.all('SELECT * FROM sql_items', [], (err, rows) => {
        if (err) {
            console.error('查询失败:', err);
            return;
        }
        
        console.log('查询结果:', rows);
        
        // 测试分类查询
        testCategoryQuery();
    });
}

function testCategoryQuery() {
    console.log('\n测试分类查询...');
    
    db.all('SELECT * FROM categories', [], (err, rows) => {
        if (err) {
            console.error('查询分类失败:', err);
            return;
        }
        
        console.log('分类查询结果:', rows);
        
        // 测试搜索
        testSearch();
    });
}

function testSearch() {
    console.log('\n测试搜索功能...');
    
    const searchSQL = `
        SELECT * FROM sql_items
        WHERE title LIKE ? OR sql LIKE ? OR description LIKE ?
    `;
    
    const searchPattern = '%测试%';
    
    db.all(searchSQL, [searchPattern, searchPattern, searchPattern], (err, rows) => {
        if (err) {
            console.error('搜索失败:', err);
            return;
        }
        
        console.log('搜索结果:', rows);
        
        // 测试完成，清理资源
        cleanup();
    });
}

function cleanup() {
    console.log('\n测试完成，清理资源...');
    
    // 删除测试数据库
    db.close((err) => {
        if (err) {
            console.error('关闭数据库失败:', err);
        } else {
            console.log('数据库关闭成功');
            
            // 删除测试文件
            if (fs.existsSync(testDbPath)) {
                fs.unlinkSync(testDbPath);
                console.log('测试数据库文件已删除');
            }
            
            console.log('所有测试完成！');
        }
    });
}