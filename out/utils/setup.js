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
const fetch = require('node-fetch');
const url_1 = require("url");
function loginRequest(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = {
            command: 'Login',
            email: email,
            password: password
        };
        let response = yield fetch("https://api.appdrag.com/api.aspx", {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
            body: new url_1.URLSearchParams(data),
        });
        console.log(response);
        return yield response.json();
    });
}
exports.loginRequest = loginRequest;
function codeRequest(email, password, code) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = {
            command: 'Login',
            email: email,
            password: password,
            verificationCode: code
        };
        let response = yield fetch("https://api.appdrag.com/api.aspx", {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
            body: new url_1.URLSearchParams(data).toString(),
        });
        return yield response.json();
    });
}
exports.codeRequest = codeRequest;
function getAppId(folderUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileUri = vscode.Uri.parse(folderUri + '/.appdrag');
        var buff = yield vscode.workspace.fs.readFile(fileUri).then((content) => { return content; }, () => { return false; });
        if (buff) {
            let content = buff.toString();
            content = JSON.parse(content).appID;
            return content;
        }
        else {
            return;
        }
    });
}
exports.getAppId = getAppId;
//# sourceMappingURL=setup.js.map