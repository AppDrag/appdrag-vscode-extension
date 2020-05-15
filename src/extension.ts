// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ServerResponse } from 'http';
import { deployCloudBackend, deployDatabase, deployFilesystem } from './commands/deploy';
import { login, init } from './commands/setup';
import { filesystemPull, filesystemPush } from './commands/filesystem';
import { apiPull, apiPush, apiPullSingle, apiPushSingle } from './commands/cloudbackend';
import { databasePull, databasePush } from './commands/database';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
    context.subscriptions.push(vscode.commands.registerCommand('extension.setup.login', login));
    context.subscriptions.push(vscode.commands.registerCommand('extension.setup.init', init));
    context.subscriptions.push(vscode.commands.registerCommand('extension.filesystem.pull', filesystemPull));
    context.subscriptions.push(vscode.commands.registerCommand('extension.filesystem.push', filesystemPush));
    context.subscriptions.push(vscode.commands.registerCommand('extension.cloudbackend.pull', apiPull));
    context.subscriptions.push(vscode.commands.registerCommand('extension.cloudbackend.pullsingle', apiPullSingle));
    context.subscriptions.push(vscode.commands.registerCommand('extension.cloudbackend.push', apiPush));
    context.subscriptions.push(vscode.commands.registerCommand('extension.cloudbackend.pushsingle', apiPushSingle));
    context.subscriptions.push(vscode.commands.registerCommand('extension.database.pull', databasePull));
    context.subscriptions.push(vscode.commands.registerCommand('extension.database.push', databasePush));
    context.subscriptions.push(vscode.commands.registerCommand('extension.deploy.filesystem', deployFilesystem));
    context.subscriptions.push(vscode.commands.registerCommand('extension.deploy.cloudbackend', deployCloudBackend));
    context.subscriptions.push(vscode.commands.registerCommand('extension.deploy.database', deployDatabase));
}

// this method is called when your extension is deactivated
export function deactivate() {}