
import * as vscode from 'vscode';
import * as archiver from 'archiver';
import * as fs from 'fs';
import * as chalk from 'chalk';
import { config, refreshToken } from './common';
import { createZip, getSignedURL, pushToAwsS3 } from '../utils/filesystem';
const fetch = require('node-fetch');
const unzipper = require('unzipper');

export const getFunctionsList = async (appId :string, token :string) : Promise<any> => {
  let data = {
    command: 'CloudAPIGetFunctions',
    token: token,
    appID: appId,
  };
  let opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  
  let response = await fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
  response = await response.json();
  return response;
};

export const parseFunctions = async (token : string, appId : string, funcs : any[], absolutePath : string) => {
  if (!fs.existsSync(`${absolutePath}/CloudBackend`)) {
    fs.mkdirSync(`${absolutePath}/CloudBackend/`);
    fs.mkdirSync(`${absolutePath}/CloudBackend/code`);
  } else if (!fs.existsSync(`${absolutePath}/CloudBackend/code`)) {
    fs.mkdirSync(`${absolutePath}/CloudBackend/code`);
  }

  for(let x = 0; x < funcs.length; x++) {
    let newPath = `${absolutePath}/CloudBackend/code/${funcs[x].id}`;
    if (funcs[x].type !== 'FOLDER') {
      if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath);
      }
      await downloadAndWriteFunction(token, appId, newPath, funcs[x]);
    }
  }
};

export const downloadAndWriteFunction = async (token: string, appId: string, path: string, functionObj : any) => {
  let filePath = `${path}/${appId}_${functionObj.id}.zip`;
  let data = {
    command: 'CloudAPIExportFile',
    token: token,
    appID: appId,
    file: 'main.js',
    functionID: functionObj.id,
    parentID: null
  };
  if (functionObj.parentID !== -1) {
    data.parentID = functionObj.parentID;
  }

  let file = fs.createWriteStream(filePath);
  let url = await getFunctionURL(data);
  let response = await fetch(url, {
    method: 'GET'
  });
  response.body.pipe(file);
  file.on('close', () => {
    fs.createReadStream(filePath)
    .pipe(unzipper.Extract({path: path}))
    .on('close', () => {
      fs.unlinkSync(filePath);
    });
  });
};

export const getFunctionURL =  async (data : any) => {
  let opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data)
  };
  console.log(data);
  let res = await fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
  res = await res.json();
  return res.url;
};

export const writeScriptFile = (functionList: any[], absolutePath : string) => {
  let modules : any[] = [];
    functionList.forEach(func => {
      if (func.libs) {
        let libs = JSON.parse(func.libs);
        libs.forEach((lib : any) => {
          if (modules.indexOf(lib) < 0) {
            modules.push(lib);
          }
        });
      }
    });
    fs.writeFileSync(absolutePath+'/install.sh', 'npm init --force --yes\nnpm install ' + modules.join('\nnpm install ').replace(/,/g, " "));
};

interface FuncObject {
  id: any;
  name: string;
  description: string;
  type: string;
  contentType: string;
  method: string;
  ram: string;
  timeout: string;
  output: string;
}

interface FuncTables {
  [key : string] : FuncObject[]|any;
}

interface ApiObj {
  appId : string;
  funcs : FuncTables;
}



export const apiJson = (api : any[], appId : string) => {
  let finalObj : ApiObj = {
    appId : appId,
    funcs : {
      '/' : []
    }
  };
  api.forEach((func : any) => {
    if (func.type === 'FOLDER') {
      finalObj.funcs[func.name] = {
        id : func.id
      };
    }
  });
  api.forEach(func => {
    if (func.type !== 'FOLDER') {
      if (func.parentID !== -1) {
        let folder = api.find(elem => {
          return elem.id === func.parentID;
        }).name;
        finalObj.funcs[folder] = [];
        finalObj.funcs[folder].push({
          id: func.id,
          name: func.name,
          description: func.description,
          type: func.type,
          contentType: func.contentType,
          method: func.method,
          ram: func.ram,
          timeout: func.timeout,
          output: func.output
        });
      } else {
        finalObj.funcs['/'].push({
          id: func.id,
          name: func.name,
          description: func.description,
          type: func.type,
          contentType: func.contentType,
          method: func.method,
          ram: func.ram,
          timeout: func.timeout,
          output: func.output
        });
      }
    }
  });
  return JSON.stringify(finalObj);
};

export const pushFunctions = async (appId: string, token: string, currFolder: string, basePath: string, folders: any[]) => {
  for (let x = 0; x < folders.length; x++) {
    let folder = folders[x];
    let zipPath = `${appId}_${folder}.zip`;
    let folderPath = basePath+folder;
    let zipErr = await createZip(folderPath, zipPath);
    if (zipErr) {
      throw new Error('Error zipping file');
    }
    let fileContent = fs.createReadStream(zipPath);
    let fileSizeInBytes = fs.statSync(zipPath).size;
    let url = await getSignedURL(appId, `CloudBackend/api/${zipPath}`, token);
    if (url.status === 'KO') {
      let token_ref = config.get('refreshToken');
      await refreshToken(token_ref);
      url = await getSignedURL(appId, `CloudBackend/api/${zipPath}`, token);
      if (url.status === 'KO') {
        return;
      }
    }
    url = url.signedURL;
    await pushToAwsS3(fileContent, fileSizeInBytes, url);
    let response = await restoreCloudBackendFunction(appId, token, folder);
    if (response.status === 'OK') {
      fs.unlinkSync(zipPath);
    }
  }
};

export const restoreCloudBackendFunction = async (appId: string, token: string, folder: string) => {
  let data = {
    command: 'CloudAPIRestoreAPI',
    token: token,
    appID: appId,
    version: '',
    functionID: folder,
  };
  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  let response = await fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
  return await response.json();
};