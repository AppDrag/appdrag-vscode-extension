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
const setup_1 = require("../utils/setup");
const CryptoJS = require("crypto-js");
const common_1 = require("../utils/common");
function login() {
    return __awaiter(this, void 0, void 0, function* () {
        let email = yield vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Type in your Email' });
        if (email) {
            let password = yield vscode.window.showInputBox({ ignoreFocusOut: true, password: true, prompt: 'Type in your Password' });
            if (password) {
                let hash = CryptoJS.SHA512(12 + password + 'APPALLIN').toString();
                let loginRes = yield setup_1.loginRequest(email, hash);
                loginRes = JSON.parse(loginRes);
                if (loginRes.status === 'OK') {
                    vscode.window.showInformationMessage('Check your mailbox, you should receive a verification code.');
                    let code = yield vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Type in your Verification Code' });
                    if (code) {
                        let response_code = yield setup_1.codeRequest(email, hash, code);
                        response_code = JSON.parse(response_code);
                        if (response_code.Table) {
                            vscode.window.showInformationMessage('Creating/Updating local config...');
                            let user_data = {
                                token: response_code.Table[0].token,
                                firstName: response_code.Table[0].firstName,
                                lastName: response_code.Table[0].lastName,
                                email: response_code.Table[0].email,
                                Id: response_code.Table[0].Id,
                                refreshToken: response_code.Table[0].refreshToken,
                            };
                            common_1.config.set(user_data);
                        }
                        else {
                            throw new Error('Wrong code');
                        }
                    }
                    else {
                        throw new Error('Type in a verification code');
                    }
                }
            }
            else {
                throw new Error('Type in your password');
            }
        }
        else {
            throw new Error('Type in your email');
        }
    });
}
exports.login = login;
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        let appID = yield vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Type in your app-id' });
        let cfg_file = vscode.Uri.file(vscode.workspace.rootPath + '/.appdrag');
        if (vscode.workspace.workspaceFolders) {
            yield vscode.workspace.fs.writeFile(cfg_file, Buffer.from(JSON.stringify({ appID })));
        }
    });
}
exports.init = init;
//# sourceMappingURL=setup.js.map