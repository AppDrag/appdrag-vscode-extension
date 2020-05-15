import * as vscode from 'vscode';
import * as requestNative from 'request-promise-native';
import { URLSearchParams } from 'url';

export async function loginRequest (email : string, password : string): Promise<requestNative.RequestPromise> {
    let data = {
        command : 'Login',
        email : email,
        password : password
    };

    let response = await requestNative({
        method : 'POST',
        headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
        uri : "https://api.appdrag.com/api.aspx",
        body : new URLSearchParams(data).toString(),
    });
    return response;
}

export async function codeRequest (email : string, password : string, code : string): Promise<requestNative.RequestPromise> {
    let data = {
        command : 'Login',
        email : email,
        password : password,
        verificationCode : code
    };
    let response = await requestNative({
        method : 'POST',
        headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
        uri : "https://api.appdrag.com/api.aspx",
        body : new URLSearchParams(data).toString(),
    });
    return response;
}

export async function getAppId(folderUri : vscode.Uri) : Promise<string | undefined> {
  const fileUri = vscode.Uri.parse(folderUri + '/.appdrag');
  var buff = await vscode.workspace.fs.readFile(fileUri).then((content) => {return content;}, () => {return false;});
  if (buff) {
    let content = buff.toString();
    content = JSON.parse(content).appID;
    return content;
  } else {
    return;
  }
}