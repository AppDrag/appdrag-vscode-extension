import * as vscode from 'vscode';
import * as fs from 'fs';
import { downloadDb, pushDbToCloudBackend } from '../utils/database';
import { config, getCurrentFolder, refreshToken } from '../utils/common';
import { getAppId } from '../utils/setup';

export async function databasePush() {
  let currentFolder = await getCurrentFolder();
  if (!currentFolder) {
    throw new Error('Please select a valid folder.');
  }
  const appId = await getAppId(currentFolder.uri);
  if (!appId) {
    throw new Error('Please run the init command first.');
  }
  let token = config.get('token');
  let filesInFolder = await vscode.workspace.fs.readDirectory(currentFolder.uri);
  let files : string[] = [];
  filesInFolder.forEach(file => {
    if (file[0][0] !== '.') {
      if (file[0].slice(-4) === '.sql') {
        files.push(file[0]);
      }
    }
  });
  if (files.length === 0) {
    throw new Error('No sql files in current folder');
  }
  let sqlFile = await vscode.window.showQuickPick(files);
  if (!sqlFile) {
    throw new Error('Please pick a file');
  }
  await pushDbToCloudBackend(appId, token, `${currentFolder.uri.fsPath}/${sqlFile}`);
  vscode.window.showInformationMessage('Done !');
}

export async function databasePull() {
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

