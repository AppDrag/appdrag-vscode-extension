import * as vscode from 'vscode';
import { loginRequest, codeRequest, getAppId } from '../utils/setup';
import * as CryptoJS from 'crypto-js';
import { config } from '../utils/common';

export async function login() {
    let email = await vscode.window.showInputBox({ignoreFocusOut : true, prompt : 'Type in your Email'});
    if (email) {
        let password = await vscode.window.showInputBox({ignoreFocusOut : true, password:true, prompt : 'Type in your Password'});
        if (password) {
            let hash = CryptoJS.SHA512(12 + password + 'APPALLIN').toString();
            let loginRes = await loginRequest(email,hash);
            loginRes = JSON.parse(loginRes);
            if (loginRes.status === 'OK') {
                vscode.window.showInformationMessage('Check your mailbox, you should receive a verification code.');
                let code = await vscode.window.showInputBox({ignoreFocusOut : true, prompt : 'Type in your Verification Code'});
                if (code) {
                    let response_code = await codeRequest(email, hash, code);
                    response_code = JSON.parse(response_code);
                    if (response_code.Table) {
                        vscode.window.showInformationMessage('Creating/Updating local config...');
                        let user_data = {
                            token : response_code.Table[0].token,
                            firstName : response_code.Table[0].firstName,
                            lastName : response_code.Table[0].lastName,
                            email : response_code.Table[0].email,
                            Id : response_code.Table[0].Id,
                            refreshToken : response_code.Table[0].refreshToken,
                        };
                        config.set(user_data);
                    } else {
                        throw new Error('Wrong code');
                    }
                } else {
                    throw new Error('Type in a verification code');
                }
            }
        } else {
            throw new Error('Type in your password');
        }
    } else {
        throw new Error('Type in your email');
    }
}

export async function init() {
    let appID = await vscode.window.showInputBox({ignoreFocusOut : true, prompt : 'Type in your app-id'});
    let cfg_file = vscode.Uri.file(vscode.workspace.rootPath + '/.appdrag');
    if (vscode.workspace.workspaceFolders) {
        await vscode.workspace.fs.writeFile(cfg_file, Buffer.from(JSON.stringify({appID})));
    }
}