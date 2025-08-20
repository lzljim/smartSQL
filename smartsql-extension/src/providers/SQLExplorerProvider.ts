import * as vscode from 'vscode';
import { SQLManager, SQLItem } from '../services/SQLManager';

export class SQLExplorerProvider implements vscode.TreeDataProvider<SQLTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SQLTreeItem | undefined | null | void> = new vscode.EventEmitter<SQLTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SQLTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private sqlManager: SQLManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SQLTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SQLTreeItem): Promise<SQLTreeItem[]> {
        if (!element) {
            // 根节点，显示分类
            return this.getCategoryItems();
        } else if (element.type === 'category') {
            // 分类节点，显示该分类下的SQL项目
            return this.getSQLItems(element.id);
        } else {
            // SQL项目节点，没有子节点
            return [];
        }
    }

    private async getCategoryItems(): Promise<SQLTreeItem[]> {
        try {
            const categories = await this.sqlManager.getCategories();
            const sqlItems = await this.sqlManager.getAllSQL();
            
            return categories.map(category => {
                const count = sqlItems.filter(item => item.category === category.name).length;
                return new SQLTreeItem(
                    category.name,
                    category.id,
                    'category',
                    `${category.name} (${count})`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    category.color
                );
            });
        } catch (error) {
            console.error('获取分类失败:', error);
            return [];
        }
    }

    private async getSQLItems(categoryId: string): Promise<SQLTreeItem[]> {
        try {
            const categories = await this.sqlManager.getCategories();
            const category = categories.find(cat => cat.id === categoryId);
            if (!category) return [];

            const sqlItems = await this.sqlManager.getSQLByCategory(category.name);
            
            return sqlItems.map(item => {
                return new SQLTreeItem(
                    item.title,
                    item.id,
                    'sql',
                    item.title,
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    item
                );
            });
        } catch (error) {
            console.error('获取SQL项目失败:', error);
            return [];
        }
    }

    // 添加SQL项目
    async addSQL(): Promise<void> {
        const title = await vscode.window.showInputBox({
            prompt: '请输入SQL标题',
            placeHolder: '例如：查询用户信息'
        });

        if (!title) return;

        const sql = await vscode.window.showInputBox({
            prompt: '请输入SQL语句',
            placeHolder: '例如：SELECT * FROM users WHERE id = ?'
        });

        if (!sql) return;

        const categories = await this.sqlManager.getCategories();
        const categoryNames = categories.map(cat => cat.name);
        
        const category = await vscode.window.showQuickPick(
            categoryNames.map(name => ({ label: name })),
            {
                placeHolder: '选择分类'
            }
        );

        if (!category) return;

        const description = await vscode.window.showInputBox({
            prompt: '请输入描述（可选）',
            placeHolder: '描述这个SQL的用途'
        });

        try {
            await this.sqlManager.addSQL({
                title,
                sql,
                category: category.label,
                tags: [],
                description: description || undefined
            });

            this.refresh();
            vscode.window.showInformationMessage(`SQL项目"${title}"添加成功！`);
        } catch (error) {
            console.error('添加SQL失败:', error);
            vscode.window.showErrorMessage('添加SQL失败');
        }
    }

    // 编辑SQL项目
    async editSQL(item: SQLTreeItem): Promise<void> {
        if (item.type !== 'sql' || !item.sqlItem) return;

        const sqlItem = item.sqlItem;
        
        const title = await vscode.window.showInputBox({
            prompt: '请输入新的标题',
            value: sqlItem.title
        });

        if (!title) return;

        const sql = await vscode.window.showInputBox({
            prompt: '请输入新的SQL语句',
            value: sqlItem.sql
        });

        if (!sql) return;

        const categories = await this.sqlManager.getCategories();
        const categoryNames = categories.map(cat => cat.name);
        
        const category = await vscode.window.showQuickPick(
            categoryNames.map(name => ({ label: name })),
            {
                placeHolder: '选择分类'
            }
        );

        if (!category) return;

        const description = await vscode.window.showInputBox({
            prompt: '请输入新的描述',
            value: sqlItem.description || ''
        });

        try {
            await this.sqlManager.updateSQL(sqlItem.id, {
                title,
                sql,
                category: category.label,
                description: description || undefined
            });

            this.refresh();
            vscode.window.showInformationMessage(`SQL项目"${title}"更新成功！`);
        } catch (error) {
            console.error('更新SQL失败:', error);
            vscode.window.showErrorMessage('更新SQL失败');
        }
    }

    // 删除SQL项目
    async deleteSQL(item: SQLTreeItem): Promise<void> {
        if (item.type !== 'sql' || !item.sqlItem) return;

        const sqlItem = item.sqlItem;
        
        const result = await vscode.window.showWarningMessage(
            `确定要删除SQL项目"${sqlItem.title}"吗？`,
            { modal: true },
            '删除'
        );

        if (result === '删除') {
            try {
                await this.sqlManager.deleteSQL(sqlItem.id);
                this.refresh();
                vscode.window.showInformationMessage(`SQL项目"${sqlItem.title}"删除成功！`);
            } catch (error) {
                console.error('删除SQL失败:', error);
                vscode.window.showErrorMessage('删除SQL失败');
            }
        }
    }
}

export class SQLTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly type: 'category' | 'sql',
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly color?: string,
        public readonly sqlItem?: SQLItem
    ) {
        super(label, collapsibleState);

        this.tooltip = type === 'sql' && sqlItem ? sqlItem.sql : description;
        this.description = description;

        if (type === 'category') {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'category';
        } else {
            this.iconPath = new vscode.ThemeIcon('file-code');
            this.contextValue = 'sql';
        }

        if (color) {
            this.iconPath = new vscode.ThemeIcon('folder', new vscode.ThemeColor(color));
        }
    }
}