import * as vscode from 'vscode';
import { SQLExplorerProvider } from './providers/SQLExplorerProvider';
import { SQLManager } from './services/SQLManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('SmartSQL插件已激活');

    // 初始化SQL管理器
    const sqlManager = new SQLManager(context.globalStorageUri);
    
    // 创建SQL资源管理器提供者
    const sqlExplorerProvider = new SQLExplorerProvider(sqlManager);
    
    // 注册视图提供者
    vscode.window.registerTreeDataProvider('smartsql.sqlExplorer', sqlExplorerProvider);
    
    // 注册命令
    const openPanelCommand = vscode.commands.registerCommand('smartsql.openPanel', () => {
        vscode.commands.executeCommand('workbench.view.extension.smartsql');
    });
    
    const validateSQLCommand = vscode.commands.registerCommand('smartsql.validateSQL', () => {
        vscode.window.showInformationMessage('SQL验证功能即将推出！');
    });
    
    const generateSQLCommand = vscode.commands.registerCommand('smartsql.generateSQL', () => {
        vscode.window.showInformationMessage('AI生成SQL功能即将推出！');
    });
    
    const addSQLCommand = vscode.commands.registerCommand('smartsql.addSQL', () => {
        sqlExplorerProvider.addSQL();
    });
    
    const editSQLCommand = vscode.commands.registerCommand('smartsql.editSQL', (item: any) => {
        sqlExplorerProvider.editSQL(item);
    });
    
    const deleteSQLCommand = vscode.commands.registerCommand('smartsql.deleteSQL', (item: any) => {
        sqlExplorerProvider.deleteSQL(item);
    });
    
    // 将命令添加到订阅列表
    context.subscriptions.push(
        openPanelCommand,
        validateSQLCommand,
        generateSQLCommand,
        addSQLCommand,
        editSQLCommand,
        deleteSQLCommand
    );
    
    // 显示欢迎消息
    vscode.window.showInformationMessage('SmartSQL插件已成功激活！欢迎使用SQL智能助手。');
}

export function deactivate() {
    console.log('SmartSQL插件已停用');
}