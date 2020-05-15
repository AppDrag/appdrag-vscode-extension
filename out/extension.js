"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const deploy_1 = require("./commands/deploy");
const setup_1 = require("./commands/setup");
const filesystem_1 = require("./commands/filesystem");
const cloudbackend_1 = require("./commands/cloudbackend");
const database_1 = require("./commands/database");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    context.subscriptions.push(vscode.commands.registerCommand('extension.setup.login', setup_1.login));
    context.subscriptions.push(vscode.commands.registerCommand('extension.setup.init', setup_1.init));
    context.subscriptions.push(vscode.commands.registerCommand('extension.filesystem.pull', filesystem_1.filesystemPull));
    context.subscriptions.push(vscode.commands.registerCommand('extension.filesystem.push', filesystem_1.filesystemPush));
    context.subscriptions.push(vscode.commands.registerCommand('extension.cloudbackend.pull', cloudbackend_1.apiPull));
    context.subscriptions.push(vscode.commands.registerCommand('extension.cloudbackend.pullsingle', cloudbackend_1.apiPullSingle));
    context.subscriptions.push(vscode.commands.registerCommand('extension.cloudbackend.push', cloudbackend_1.apiPush));
    context.subscriptions.push(vscode.commands.registerCommand('extension.cloudbackend.pushsingle', cloudbackend_1.apiPushSingle));
    context.subscriptions.push(vscode.commands.registerCommand('extension.database.pull', database_1.databasePull));
    context.subscriptions.push(vscode.commands.registerCommand('extension.database.push', database_1.databasePush));
    context.subscriptions.push(vscode.commands.registerCommand('extension.deploy.filesystem', deploy_1.deployFilesystem));
    context.subscriptions.push(vscode.commands.registerCommand('extension.deploy.cloudbackend', deploy_1.deployCloudBackend));
    context.subscriptions.push(vscode.commands.registerCommand('extension.deploy.database', deploy_1.deployDatabase));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map