"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const filesystem_1 = require("../utils/filesystem");
const common_1 = require("../utils/common");
const setup_1 = require("../utils/setup");
function filesystemPush() {
    return __awaiter(this, void 0, void 0, function* () {
        let currentFolder = yield common_1.getCurrentFolder();
        if (!currentFolder) {
            throw new Error('Please select a valid folder.');
        }
        const appId = yield setup_1.getAppId(currentFolder.uri);
        if (!appId) {
            throw new Error('Please run the init command first.');
        }
        let token = common_1.config.get('token');
        if (!token) {
            throw new Error('Please login first.');
        }
        let filesInFolder = yield vscode.workspace.fs.readDirectory(currentFolder.uri);
        let files = [];
        filesInFolder.forEach(file => {
            var _a;
            if (file[0][0] !== '.') {
                if (fs.statSync(((_a = currentFolder) === null || _a === void 0 ? void 0 : _a.uri.fsPath) + '/' + file[0]).isDirectory()) {
                    files.push(file[0]);
                }
            }
        });
        if (files.length === 0) {
            throw new Error('No folders in current path');
        }
        let folder = yield vscode.window.showQuickPick(files);
        if (!folder) {
            throw new Error('You did not choose a file.');
        }
        let date = new Date();
        let absolutePath = `${currentFolder.uri.fsPath}/appdrag-cli-deploy-${date.getDate()}${date.getMonth()}${date.getFullYear()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}.zip`;
        let err = yield filesystem_1.createZip(`${currentFolder.uri.fsPath}/${folder}`, absolutePath);
        if (err) {
            throw new Error('Error zipping file');
        }
        let pathToPush = yield vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Where do you want to push (. for root)' });
        if (!pathToPush) {
            throw new Error('Please input the destination path');
        }
        if (pathToPush === '.') {
            pathToPush = '';
        }
        else {
            if (pathToPush[pathToPush.length - 1] === '/') {
                pathToPush = pathToPush.slice(0, -1);
            }
            pathToPush = pathToPush + '/';
        }
        let zipPath = `appdrag-cli-deploy-${date.getDate()}${date.getMonth()}${date.getFullYear()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}.zip`;
        yield filesystem_1.pushFiles(appId, absolutePath, zipPath, token, pathToPush);
        vscode.window.showInformationMessage('Done !');
    });
}
exports.filesystemPush = filesystemPush;
function filesystemPull() {
    return __awaiter(this, void 0, void 0, function* () {
        let token = common_1.config.get('token');
        if (!token) {
            throw new Error('Please login first.');
        }
        let currentFolder = yield common_1.getCurrentFolder();
        if (!currentFolder) {
            throw new Error('Please select a valid folder.');
        }
        const appId = yield setup_1.getAppId(currentFolder.uri);
        if (!appId) {
            throw new Error('Please run the init command first.');
        }
        let folder = yield vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'What do you want to pull ( leave empty for root folder )' });
        if (!folder) {
            folder = '';
        }
        let files = yield filesystem_1.getDirectoryListing(token, appId, folder);
        if (files.status === 'KO') {
            let token_ref = common_1.config.get('refreshToken');
            yield common_1.refreshToken(token_ref);
            files = yield filesystem_1.getDirectoryListing(token, appId, folder);
            if (files.status === 'KO') {
                throw new Error('Login again please');
            }
        }
        if (files.length === 0) {
            yield filesystem_1.pullSingleFile(appId, folder, currentFolder.uri.fsPath);
            return;
        }
        let lastfile = files[files.length - 1].path;
        yield filesystem_1.parseDirectory(token, appId, files, lastfile, '', currentFolder.uri.fsPath);
        vscode.window.showInformationMessage('Done !');
    });
}
exports.filesystemPull = filesystemPull;
//# sourceMappingURL=filesystem.js.map