import * as fs from 'fs';
import * as vscode from 'vscode';
import { config, refreshToken } from '../utils/common';

const fetch = require('node-fetch');
const FormData = require('form-data');

export const downloadDb = async (appId: string, token: string, absolutePath: string) => {
  let data = {
    command: 'CloudDBExportFile',
    token: token,
    appID: appId,
  };
  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  let databaseUrl = await fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
  databaseUrl = await databaseUrl.json();
  if (databaseUrl.status !== 'OK') {
    let version = await getDbVersions(appId, token);
    if (!version) {
      return;
    }
    await downloadLastDbVersion(appId, token, version, absolutePath);
    return;
  }
  databaseUrl = databaseUrl.url;
  let file = fs.createWriteStream(`${absolutePath}`);
  let response = await fetch(databaseUrl, {
    method: 'GET',
  });
  response.body.pipe(file);
  file.on('close', () => {
    return;
  });
};

const getDbVersions = async (appId : string, token: string) => {
  let data = {
    command: 'GetFileVersions',
    token: token,
    appID: appId,
    path: 'CloudBackend/db/backup.sql',
  };
  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  let fileVersions = await fetch ('https://api.appdrag.com/api.aspx', opts);
  fileVersions = await fileVersions.json();
  if (fileVersions.status === 'KO') {
      let token_ref = config.get('refreshToken');
      await refreshToken(token_ref);
      fileVersions = await fetch ('https://api.appdrag.com/api.aspx', opts);
      fileVersions = await fileVersions.json();
      if (fileVersions.status === 'KO') {
      throw new Error('Invalid appId provided and/or please login again.');
    }
  }
  let versionId = fileVersions[0].VersionId;
  return versionId;
};

const downloadLastDbVersion = async (appId: string, token: string, version: string, absolutePath: string) => {
  let file = fs.createWriteStream(`${absolutePath}`);
  let data = {
    command: 'CloudDBDownloadRestore',
    token: token,
    appID: appId,
    version: version,
  };
  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  let dbUrl = await fetch ('https://api.appdrag.com/CloudBackend.aspx', opts);
  dbUrl = await dbUrl.json();
  if (dbUrl.status === 'KO') {
    return;
  }
  let response = await fetch (dbUrl.url, {
    method: 'GET',
  });
  response.body.pipe(file);
  file.on('close', () => {
    vscode.window.showInformationMessage('Done !');
  });
};

export const pushDbToCloudBackend = async (appId: string, token: string, filePath: string) => {
  let file = fs.readFileSync(filePath);
  let form = new FormData();
  form.append('command', 'CloudDBRestoreDB');
  form.append('upload', file, filePath);
  form.append('appID', appId);
  form.append('token', token);

  let url = 'https://api.appdrag.com/CloudBackend.aspx';
  form.submit(url, (err:any, res:any) => {
    if (res.statusMessage === 'OK') {
      vscode.window.showInformationMessage(`${filePath} successfully uploaded !`);
      return;
    } else {
      throw new Error(`Error when trying to upload file`);
    }
  });
};