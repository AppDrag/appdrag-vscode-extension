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
const database_1 = require("../utils/database");
const common_1 = require("../utils/common");
const setup_1 = require("../utils/setup");
function databasePush() {
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
        let filesInFolder = yield vscode.workspace.fs.readDirectory(currentFolder.uri);
        let files = [];
        filesInFolder.forEach(file => {
            if (file[0][0] !== '.') {
                if (file[0].slice(-4) === '.sql') {
                    files.push(file[0]);
                }
            }
        });
        if (files.length === 0) {
            throw new Error('No sql files in current folder');
        }
        let sqlFile = yield vscode.window.showQuickPick(files);
        if (!sqlFile) {
            throw new Error('Please pick a file');
        }
        yield database_1.pushDbToCloudBackend(appId, token, `${currentFolder.uri.fsPath}/${sqlFile}`);
        vscode.window.showInformationMessage('Done !');
    });
}
exports.databasePush = databasePush;
function databasePull() {
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
exports.databasePull = databasePull;
//# sourceMappingURL=database.js.map