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
const Configstore = require("configstore");
const vscode = require("vscode");
const fetch = require('node-fetch');
exports.config = new Configstore('appdrag-cli');
exports.getCurrentFolder = () => __awaiter(void 0, void 0, void 0, function* () {
    const current_folder = yield vscode.window.showWorkspaceFolderPick();
    if (!current_folder) {
        throw new Error('Please select a folder.');
    }
    const workspaces = vscode.workspace.workspaceFolders;
    if (workspaces) {
        let workspace = workspaces.find(element => element.name === current_folder.name);
        return workspace;
    }
});
exports.refreshToken = (refreshToken) => __awaiter(void 0, void 0, void 0, function* () {
    let data = { command: 'RefreshToken', refreshToken: refreshToken };
    let opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams(data),
    };
    let response = yield fetch('https://api.appdrag.com/api.aspx', opts);
    return response.json();
});
//# sourceMappingURL=common.js.map