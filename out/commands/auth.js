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
const auth_1 = require("../utils/auth");
const CryptoJS = require("crypto-js");
function login() {
    return __awaiter(this, void 0, void 0, function* () {
        let email = yield vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Type in your Email' });
        if (email) {
            let password = yield vscode.window.showInputBox({ ignoreFocusOut: true, password: true, prompt: 'Type in your Password' });
            if (password) {
                let hash = CryptoJS.SHA512(12 + password + 'APPALLIN').toString();
                console.log(hash);
                let loginRes = yield auth_1.loginRequest(email, hash);
                loginRes = JSON.parse(loginRes);
                console.log(loginRes);
                console.log('is it gonna pass ?');
                if (loginRes.status === 'OK') {
                    console.log('passed');
                    vscode.window.showInformationMessage('Check your mailbox, you should receive a verification code.');
                    let code = yield vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Type in your Verification Code' });
                    if (code) {
                        let codeVerification = yield auth_1.codeRequest(email, hash, code);
                        codeVerification = JSON.parse(codeVerification);
                        if (codeVerification.Table) {
                            vscode.window.showInformationMessage('Creating');
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
//# sourceMappingURL=auth.js.map