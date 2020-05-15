import * as Configstore from "configstore";
import * as vscode from 'vscode';
import * as path from 'path';
const fetch = require('node-fetch');


export const config = new Configstore('appdrag-cli');

export const getCurrentFolder = async () : Promise<vscode.WorkspaceFolder | undefined> => {
  const current_folder = await vscode.window.showWorkspaceFolderPick();
  if (!current_folder) {
      throw new Error('Please select a folder.');
  }
  const workspaces = vscode.workspace.workspaceFolders;
  if (workspaces) {
    let workspace = workspaces.find(element => element.name === current_folder.name);
    return workspace;
  }
};

export const refreshToken = async (refreshToken : string) : Promise<any> => {
  let data = { command: 'RefreshToken', refreshToken: refreshToken };
  let opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  let response = await fetch('https://api.appdrag.com/api.aspx', opts);
  return response.json();
};