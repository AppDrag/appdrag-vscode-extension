import * as vscode from 'vscode';
const fetch = require('node-fetch');
import { URLSearchParams } from 'url';

export async function loginRequest (email : string, password : string): Promise<any> {
    let data = {
        command : 'Login',
        email : email,
        password : password
    };

    let response = await fetch("https://api.appdrag.com/api.aspx",{
        method : 'POST',
        headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
        body : new URLSearchParams(data),
    });
    console.log(response)
    return await response.json();
}

export async function codeRequest (email : string, password : string, code : string): Promise<any> {
    let data = {
        command : 'Login',
        email : email,
        password : password,
        verificationCode : code
    };
    let response = await fetch("https://api.appdrag.com/api.aspx", {
        method : 'POST',
        headers : {'Content-Type' :'application/x-www-form-urlencoded;charset=utf-8'},
        body : new URLSearchParams(data).toString(),
    });
    return await response.json();
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