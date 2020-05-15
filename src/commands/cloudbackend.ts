import * as vscode from 'vscode';
import * as fs from 'fs';
import { getFunctionsList, parseFunctions, writeScriptFile, apiJson, pushFunctions } from '../utils/cloudbackend';
import { config, getCurrentFolder, refreshToken } from '../utils/common';
import { getAppId } from '../utils/setup';

export async function apiPush() {
  let currentFolder = await getCurrentFolder();
  if (!currentFolder) {
    throw new Error('Please select a valid folder.');
  }
  const appId = await getAppId(currentFolder.uri);
  if (!appId) {
    throw new Error('Please run the init command first.');
  }
  let token = config.get('token');
  let basePath : string = `${currentFolder.uri.fsPath}/CloudBackend/code/`;
  let functionList = fs.readdirSync(basePath);
  await pushFunctions(appId, token, currentFolder.uri.fsPath, basePath, functionList);
}

export async function apiPushSingle() {
  let currentFolder = await getCurrentFolder();
  if (!currentFolder) {
    throw new Error('Please select a valid folder.');
  }
  const appId = await getAppId(currentFolder.uri);
  if (!appId) {
    throw new Error('Please run the init command first.');
  }
  let token = config.get('token');
  let basePath : string = `${currentFolder.uri.fsPath}/CloudBackend/code/`;
  let functionList = fs.readdirSync(basePath);
  let funcInput = await vscode.window.showInputBox({ignoreFocusOut : true, prompt : 'What function do you want to pull'});
  if (!funcInput) {
    throw new Error('Please input a function ID');
  }
  if (functionList.includes(funcInput)) {
    functionList = [...funcInput];   
  }
  await pushFunctions(appId, token, currentFolder.uri.fsPath, basePath, functionList);
}

export async function apiPull() {
  let currentFolder = await getCurrentFolder();
  if (!currentFolder) {
    throw new Error('Please select a valid folder.');
  }
  const appId = await getAppId(currentFolder.uri);
  if (!appId) {
    throw new Error('Please run the init command first.');
  }
  let token = config.get('token');
  let response = await getFunctionsList(appId, token);
  if (response.status === 'KO') {
    let token_ref = config.get('refreshToken');
    await refreshToken(token_ref);
    response = await getFunctionsList(appId, token);
    if (response.status === 'KO') {
      throw new Error('Please log-in again');
    }
    return;
  }
  let functionList = response.Table;
  await parseFunctions(token, appId, functionList, currentFolder.uri.fsPath);
  writeScriptFile(functionList, currentFolder.uri.fsPath);
  fs.writeFileSync(currentFolder.uri.fsPath+'/api.json', apiJson(functionList, appId));
  vscode.window.showInformationMessage('Done !');
}

export async function apiPullSingle() {
  let currentFolder = await getCurrentFolder();
  if (!currentFolder) {
    throw new Error('Please select a valid folder.');
  }
  const appId = await getAppId(currentFolder.uri);
  if (!appId) {
    throw new Error('Please run the init command first.');
  }
  let token = config.get('token');
  let response = await getFunctionsList(appId, token);
  if (response.status === 'KO') {
    let token_ref = config.get('refreshToken');
    await refreshToken(token_ref);
    response = await getFunctionsList(appId, token);
    if (response.status === 'KO') {
      throw new Error('Please log-in again');
      return;
    }
    return;
  }
  let functionList = response.Table;
  let funcInput = await vscode.window.showInputBox({ignoreFocusOut : true, prompt : 'What function do you want to pull'});
  if (!funcInput) {
    throw new Error('You must specify a function ID');
  } else {
    let funcId = +funcInput;
    let func = functionList.find((func:any) => func.id === funcId);
    if (!func) {
      throw new Error('Function ID does not exist');
    }
    functionList = [{...func}];
  }
  await parseFunctions(token, appId, functionList, currentFolder.uri.fsPath);
  writeScriptFile(functionList, currentFolder.uri.fsPath);
  fs.writeFileSync(currentFolder.uri.fsPath+'/api.json', apiJson(functionList, appId));
  vscode.window.showInformationMessage('Done !'); 
}