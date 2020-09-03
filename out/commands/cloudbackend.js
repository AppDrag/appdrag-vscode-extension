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
const cloudbackend_1 = require("../utils/cloudbackend");
const common_1 = require("../utils/common");
const setup_1 = require("../utils/setup");
function apiPush() {
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
        let basePath = `${currentFolder.uri.fsPath}/CloudBackend/code/`;
        let functionList = fs.readdirSync(basePath);
        yield cloudbackend_1.pushFunctions(appId, token, currentFolder.uri.fsPath, basePath, functionList);
        vscode.window.showInformationMessage('Done !');
    });
}
exports.apiPush = apiPush;
function apiPushSingle() {
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
        let basePath = `${currentFolder.uri.fsPath}/CloudBackend/code/`;
        let functionList = fs.readdirSync(basePath);
        let funcInput = yield vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'What function do you want to pull' });
        if (!funcInput) {
            throw new Error('Please input a function ID');
        }
        if (functionList.includes(funcInput)) {
            functionList = [...funcInput];
        }
        yield cloudbackend_1.pushFunctions(appId, token, currentFolder.uri.fsPath, basePath, functionList);
        vscode.window.showInformationMessage('Done !');
    });
}
exports.apiPushSingle = apiPushSingle;
function apiPull() {
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
        yield cloudbackend_1.parseFunctions(token, appId, functionList, currentFolder.uri.fsPath);
        cloudbackend_1.writeScriptFile(functionList, currentFolder.uri.fsPath);
        fs.writeFileSync(currentFolder.uri.fsPath + '/api.json', cloudbackend_1.apiJson(functionList, appId));
        vscode.window.showInformationMessage('Done !');
    });
}
exports.apiPull = apiPull;
function apiPullSingle() {
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
                return;
            }
            return;
        }
        let functionList = response.Table;
        let funcInput = yield vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'What function do you want to pull' });
        if (!funcInput) {
            throw new Error('You must specify a function ID');
        }
        else {
            let funcId = +funcInput;
            let func = functionList.find((func) => func.id === funcId);
            if (!func) {
                throw new Error('Function ID does not exist');
            }
            functionList = [Object.assign({}, func)];
        }
        yield cloudbackend_1.parseFunctions(token, appId, functionList, currentFolder.uri.fsPath);
        cloudbackend_1.writeScriptFile(functionList, currentFolder.uri.fsPath);
        fs.writeFileSync(currentFolder.uri.fsPath + '/api.json', cloudbackend_1.apiJson(functionList, appId));
        vscode.window.showInformationMessage('Done !');
    });
}
exports.apiPullSingle = apiPullSingle;
//# sourceMappingURL=cloudbackend.js.map