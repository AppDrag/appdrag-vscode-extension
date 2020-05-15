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
const deploy_1 = require("../utils/deploy");
const database_1 = require("../utils/database");
const filesystem_1 = require("../utils/filesystem");
const cloudbackend_1 = require("../utils/cloudbackend");
const common_1 = require("../utils/common");
const setup_1 = require("../utils/setup");
function deployFilesystem() {
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
        let files = yield filesystem_1.getDirectoryListing(token, appId, '');
        if (files.status === 'KO') {
            let token_ref = common_1.config.get('refreshToken');
            yield common_1.refreshToken(token_ref);
            files = yield filesystem_1.getDirectoryListing(token, appId, '');
            if (files.status === 'KO') {
                throw new Error('Login again please');
            }
        }
        let lastfile = files[files.length - 1].path;
        let deployFolder = yield vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Where do you want to deploy ( leave empty for root folder )' });
        let absolutePath = `${currentFolder.uri.fsPath}/${deployFolder}`;
        if (!deployFolder) {
            deployFolder = '';
        }
        else {
            if (!fs.existsSync(absolutePath)) {
                fs.mkdirSync(absolutePath);
            }
        }
        yield deploy_1.parseDirectory(token, appId, files, lastfile, '', absolutePath);
        deploy_1.parseHtmlFiles(appId, absolutePath);
        yield deploy_1.downloadResources(absolutePath);
    });
}
exports.deployFilesystem = deployFilesystem;
function deployCloudBackend() {
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
        let response = yield cloudbackend_1.getFunctionsList(appId, token);
        if (response.status === 'KO') {
            let token_ref = common_1.config.get('refreshToken');
            yield common_1.refreshToken(token_ref);
            response = yield cloudbackend_1.getFunctionsList(appId, token);
            if (response.status === 'KO') {
                throw new Error('Please log-in again');
            }
            return;
        }
        let functionList = response.Table;
        let deployFolder = yield vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Where do you want to deploy ( leave empty for root folder )' });
        let absolutePath = `${currentFolder.uri.fsPath}/${deployFolder}`;
        if (!deployFolder) {
            deployFolder = '';
        }
        else {
            if (!fs.existsSync(absolutePath)) {
                fs.mkdirSync(absolutePath);
            }
        }
        yield deploy_1.parseFunctionsDeploy(token, appId, functionList, absolutePath);
        cloudbackend_1.writeScriptFile(functionList, currentFolder.uri.fsPath);
        fs.writeFileSync(currentFolder.uri.fsPath + '/api.json', cloudbackend_1.apiJson(functionList, appId));
        vscode.window.showInformationMessage('Done !');
    });
}
exports.deployCloudBackend = deployCloudBackend;
function deployDatabase() {
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
        yield database_1.downloadDb(appId, token, currentFolder.uri.fsPath);
        vscode.window.showInformationMessage('Done !');
    });
}
exports.deployDatabase = deployDatabase;
//# sourceMappingURL=deploy.js.map