import * as vscode from 'vscode';
import * as fs from 'fs';
import { parseDirectory, parseHtmlFiles, downloadResources, parseFunctionsDeploy, flattenFunctionList, appConfigJson } from '../utils/deploy';
import { downloadDb } from '../utils/database';
import { getDirectoryListing } from '../utils/filesystem';
import { getFunctionsList, writeScriptFile, apiJson } from '../utils/cloudbackend';
import { config, getCurrentFolder, refreshToken } from '../utils/common';
import { getAppId } from '../utils/setup';

async function deployFilesystem(appId: string, token: string, currentFolder: vscode.WorkspaceFolder, absolutePath: string) {
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
  if (!fs.existsSync(`${absolutePath}/public`)) {
    fs.mkdirSync(`${absolutePath}/public`);
  }
  absolutePath += '/public';
  await parseDirectory(token, appId, files, lastfile, '', absolutePath);
  parseHtmlFiles(appId, absolutePath);
  await downloadResources(absolutePath);
}

async function deployCloudBackend(appId: string, token: string, currentFolder: vscode.WorkspaceFolder, absolutePath: string) {
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
  writeScriptFile(functionList, currentFolder.uri.fsPath);
  let cleanList: any = flattenFunctionList(functionList);
  let apiKey: string = await parseFunctionsDeploy(token, appId, cleanList, absolutePath);
  appConfigJson(appId, cleanList, currentFolder.uri.fsPath, apiKey);
}

async function deployDatabase(appId: string, token: string, currentFolder: vscode.WorkspaceFolder, absolutePath: string) {
  if (!fs.existsSync(`${absolutePath}/DB/`)) {
    fs.mkdirSync(`${absolutePath}/DB/`);
  }
  await downloadDb(appId, token, `${absolutePath}/DB/db.sql`);
}

export async function exportProject() {
  let currentFolder: vscode.WorkspaceFolder | undefined = await getCurrentFolder();
  if (!currentFolder) {
    throw new Error('Please select a valid folder.');
  }
  const appId = await getAppId(currentFolder.uri);
  if (!appId) {
    throw new Error('Please run the init command first.');
  }
  let token = config.get('token');
  let deployFolder = await vscode.window.showInputBox({ignoreFocusOut : true, prompt : 'Where do you want to deploy ( leave empty for root folder )'});
  let absolutePath: string = `${currentFolder.uri.fsPath}`; 
  if (deployFolder) {
    absolutePath += `/${deployFolder}`;
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath);
    }
  }
  console.log(`${currentFolder.uri.fsPath}/${deployFolder}DB/`);
  vscode.window.showInformationMessage('Pulling...');
  await deployDatabase(appId, token, currentFolder, absolutePath);
  await deployFilesystem(appId, token, currentFolder, absolutePath);
  await deployCloudBackend(appId, token, currentFolder, absolutePath);
  vscode.window.showInformationMessage('Done !');
}