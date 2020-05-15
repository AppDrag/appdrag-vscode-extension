import * as vscode from 'vscode';
import * as fs from 'fs';
import { parseDirectory, parseHtmlFiles, downloadResources, parseFunctionsDeploy } from '../utils/deploy';
import { downloadDb } from '../utils/database';
import { getDirectoryListing } from '../utils/filesystem';
import { getFunctionsList, writeScriptFile, apiJson } from '../utils/cloudbackend';
import { config, getCurrentFolder, refreshToken } from '../utils/common';
import { getAppId } from '../utils/setup';

export async function deployFilesystem() {
  let currentFolder = await getCurrentFolder();
  if (!currentFolder) {
    throw new Error('Please select a valid folder.');
  }
  const appId = await getAppId(currentFolder.uri);
  if (!appId) {
    throw new Error('Please run the init command first.');
  }
  let token = config.get('token');
  let files = await getDirectoryListing(token, appId, '');
  if (files.status === 'KO') {
    let token_ref = config.get('refreshToken');
    await refreshToken(token_ref);
    files = await getDirectoryListing(token, appId, '');
    if (files.status === 'KO') {
      throw new Error('Login again please');
    }
  }
  let lastfile = files[files.length-1].path;
  let deployFolder = await vscode.window.showInputBox({ignoreFocusOut : true, prompt : 'Where do you want to deploy ( leave empty for root folder )'});
  let absolutePath: string = `${currentFolder.uri.fsPath}/${deployFolder}`; 
  if (!deployFolder) {
    deployFolder = '';
  } else {
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath);
    }
  }
  await parseDirectory(token, appId, files, lastfile, '', absolutePath);
  parseHtmlFiles(appId, absolutePath);
  await downloadResources(absolutePath);
}

export async function deployCloudBackend() {
  
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
  let deployFolder = await vscode.window.showInputBox({ignoreFocusOut : true, prompt : 'Where do you want to deploy ( leave empty for root folder )'});
  let absolutePath: string = `${currentFolder.uri.fsPath}/${deployFolder}`; 
  if (!deployFolder) {
    deployFolder = '';
  } else {
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath);
    }
  }
  await parseFunctionsDeploy(token, appId, functionList, absolutePath);
  writeScriptFile(functionList, currentFolder.uri.fsPath);
  fs.writeFileSync(currentFolder.uri.fsPath+'/api.json', apiJson(functionList, appId));
  vscode.window.showInformationMessage('Done !');

}

export async function deployDatabase() {
  let currentFolder = await getCurrentFolder();
  if (!currentFolder) {
    throw new Error('Please select a valid folder.');
  }
  const appId = await getAppId(currentFolder.uri);
  if (!appId) {
    throw new Error('Please run the init command first.');
  }
  let token = config.get('token');
  await downloadDb(appId, token, currentFolder.uri.fsPath);
  vscode.window.showInformationMessage('Done !');
}