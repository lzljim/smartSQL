const { SQLManager } = require('../out/services/SQLManager');

// 模拟vscode.Uri
const mockUri = {
    fsPath: '/tmp/test'
};

async function testSQLManager() {
    console.log('开始测试SQLManager...');
    
    try {
        // 创建SQLManager实例
        const sqlManager = new SQLManager(mockUri);
        
        console.log('SQLManager创建成功');
        
        // 等待数据库初始化
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 测试添加SQL
        console.log('测试添加SQL...');
        const newSQL = await sqlManager.addSQL({
            title: '测试查询',
            sql: 'SELECT * FROM users WHERE id = ?',
            category: '查询语句',
            tags: ['用户', '查询'],
            description: '这是一个测试SQL'
        });
        
        console.log('SQL添加成功:', newSQL);
        
        // 测试获取所有SQL
        console.log('测试获取所有SQL...');
        const allSQL = await sqlManager.getAllSQL();
        console.log('所有SQL:', allSQL);
        
        // 测试获取分类
        console.log('测试获取分类...');
        const categories = await sqlManager.getCategories();
        console.log('所有分类:', categories);
        
        // 测试根据分类获取SQL
        console.log('测试根据分类获取SQL...');
        const sqlByCategory = await sqlManager.getSQLByCategory('查询语句');
        console.log('查询语句分类的SQL:', sqlByCategory);
        
        // 测试搜索SQL
        console.log('测试搜索SQL...');
        const searchResults = await sqlManager.searchSQL('用户');
        console.log('搜索结果:', searchResults);
        
        // 测试更新SQL
        console.log('测试更新SQL...');
        const updateResult = await sqlManager.updateSQL(newSQL.id, {
            title: '更新后的测试查询',
            description: '这是更新后的描述'
        });
        console.log('更新结果:', updateResult);
        
        // 测试删除SQL
        console.log('测试删除SQL...');
        const deleteResult = await sqlManager.deleteSQL(newSQL.id);
        console.log('删除结果:', deleteResult);
        
        console.log('所有测试完成！');
        
        // 清理资源
        sqlManager.dispose();
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

// 运行测试
testSQLManager();