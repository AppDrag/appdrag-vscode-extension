import * as fs from 'fs';
import * as vscode from 'vscode';

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
    // throw new Error('Error trying to fetch database (You can only fetch db file once in an hour)');
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