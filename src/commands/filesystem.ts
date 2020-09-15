import * as vscode from 'vscode';
import * as fs from 'fs';
import { requestFiles, parseDirectory, createZip, pushFiles, getDirectoryListing, pullSingleFile } from '../utils/filesystem';
import { config, getCurrentFolder, refreshToken } from '../utils/common';
import { getAppId } from '../utils/setup';

export async function filesystemPush(){
  let currentFolder = await getCurrentFolder();
  if (!currentFolder) {
    throw new Error('Please select a valid folder.');
  }
  const appId = await getAppId(currentFolder.uri);
  if (!appId) {
    throw new Error('Please run the init command first.');
  }
  let token = config.get('token');
  if (!token) {
    throw new Error('Please login first.');
  }
  let filesInFolder = await vscode.workspace.fs.readDirectory(currentFolder.uri);
  let files : string[] = [];
  filesInFolder.forEach(file => {
    if (file[0][0] !== '.') {
      if (fs.statSync(currentFolder?.uri.fsPath+'/'+file[0]).isDirectory()) {
        files.push(file[0]);
      }
    }
  });
  if (files.length === 0) {
    throw new Error('No folders in current path');
  }
  let folder = await vscode.window.showQuickPick(files);
  if (!folder) {
    throw new Error('You did not choose a file.');
  }
  let date = new Date();
  let absolutePath = `${currentFolder.uri.fsPath}/appdrag-cli-deploy-${date.getDate()}${date.getMonth()}${date.getFullYear()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}.zip`;
  let err = await createZip(`${currentFolder.uri.fsPath}/${folder}`, absolutePath);
  if (err) {
    throw new Error('Error zipping file');
  }
  let pathToPush = await vscode.window.showInputBox({ignoreFocusOut : true, prompt : 'Where do you want to push (. for root)'});
  if (!pathToPush) {
    throw new Error('Please input the destination path');
  }
  if (pathToPush === '.') {
    pathToPush = '';
  } else {
    if (pathToPush[pathToPush.length - 1] === '/') {
      pathToPush = pathToPush.slice(0, -1);
    }
    pathToPush = pathToPush + '/';
  }
  let zipPath = `appdrag-cli-deploy-${date.getDate()}${date.getMonth()}${date.getFullYear()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}.zip`;
  await pushFiles(appId, absolutePath, zipPath, token, pathToPush);
  vscode.window.showInformationMessage('Done !');
}

export async function filesystemPull() {
  let token = config.get('token');
  if (!token) {
    throw new Error('Please login first.');
  }
  let currentFolder = await getCurrentFolder();
  if (!currentFolder) {
    throw new Error('Please select a valid folder.');
  }
  const appId = await getAppId(currentFolder.uri);
  if (!appId) {
    throw new Error('Please run the init command first.');
  }
  let folder = await vscode.window.showInputBox({ignoreFocusOut : true, prompt : 'What do you want to pull ( leave empty for root folder )'});
  if (!folder) {
    folder = '';
  }
  let files = await getDirectoryListing(token, appId, folder);
  if (files.status === 'KO') {
    let token_ref = config.get('refreshToken');
    await refreshToken(token_ref);
    files = await getDirectoryListing(token, appId, folder);
    if (files.status === 'KO') {
      throw new Error('Login again please');
    }
  }
  if (files.length === 0) {
    await pullSingleFile(appId, folder, currentFolder.uri.fsPath);
    return;
  }
  let lastfile = files[files.length-1].path;
  await parseDirectory(token, appId, files, lastfile, '', currentFolder.uri.fsPath);
  vscode.window.showInformationMessage('Done !');
}