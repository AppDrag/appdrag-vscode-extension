import * as vscode from 'vscode';
import * as archiver from 'archiver';
import * as fs from 'fs';
import { config, refreshToken } from './common';
const fetch = require('node-fetch');

export const pushFiles = async (appId: string, absolutePath: string, filePath: string, token: string, destPath: string) => {
  let fileContent = fs.createReadStream(absolutePath);
  let fileSizeInBytes = fs.statSync(absolutePath).size;
  let url = await getSignedURL(appId, filePath, token);
  if (url.status === 'KO') {
    url = await getSignedURL(appId, filePath, token);
    if (url.status === 'KO') {
      let token_ref = config.get('refreshToken');
      await refreshToken(token_ref);
      throw new Error('Please login again.');
    }
  }
  url = url.signedURL;
  let res = await pushToAwsS3(fileContent, fileSizeInBytes, url);
  await unzipAndDelete(appId, token, destPath, filePath);
};

export const requestFiles = async (currentFolder: string, rootFiles: Array<String>, requestData: Object, lastFile: string): Promise<any> => {
  let data = new URLSearchParams({ 'command': 'GetDirectoryListing', 'token': "config.get('token')'", 'appID': "appID", 'path': currentFolder || '', 'order': 'name' });
  await fetch('https://api.appdrag.com/api.aspx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: data
  });

  return;
};

export const createZip = async (targetToZip: string, destPath: string): Promise<Boolean> => {
  let isErr = false;
  await pushZip(targetToZip, destPath).catch((err) => {
    isErr = true;
  });
  return isErr;
};

export const pushZip = (targetToZip: string, destPath: string) => {
  return new Promise((resolve, reject) => {
    let zipFile = fs.createWriteStream(destPath);
    let archive = archiver('zip', {
      zlib: { level: 9 },
    });
    zipFile.on('close', () => {
      resolve();
      return;
    });
    archive.on('error', function (err) {
      reject(err);
      return;
    });
    archive.pipe(zipFile);
    archive.directory(targetToZip, false);
    archive.finalize();
  });
};

export const getSignedURL = async (appId: string, filePath: string, token: string): Promise<any> => {
  let data = new URLSearchParams({
    command: 'GetUploadUrl',
    token: token,
    appID: appId,
    filekey: filePath
  });

  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: data,
  };
  let response = await fetch('https://api.appdrag.com/api.aspx', opts);
  response = await response.json();
  return response;
};

export const pushToAwsS3 = async (fileContent: fs.ReadStream, fileSizeInBytes: Number, url: string): Promise<any> => {
  var opts = {
    method: 'PUT',
    headers: { 'Content-length': fileSizeInBytes },
    body: fileContent
  };
  let response = await fetch(url, opts);
  try {
    response = await response.json();
    return response;
  } catch {
    return response;
  }
};

export const unzipAndDelete = async (appId: string, token: string, destPath: string, filePath: string) => {
  let opts_unzip = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({
      command: 'ExtractZipS3Lambda',
      token: token,
      appId: appId,
      filekey: filePath,
      destpath: destPath
    })
  };
  await fetch('https://api.appdrag.com/api.aspx?', opts_unzip);
  let data = new URLSearchParams({
    command: 'DeleteFile',
    token: token,
    appID: appId,
    filekey: filePath
  });
  let opts_delete = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: data
  };
  await fetch('https://api.appdrag.com/api.aspx?', opts_delete);
};

export const getDirectoryListing = async (token : string, appId : string, pathToPull : string) => {
  let data = {
    command: 'GetDirectoryListing',
    token: token,
    appID: appId,
    path: pathToPull,
    order: 'name',
  };
  var opts = {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams(data),
  };
  let response = await fetch('https://api.appdrag.com/api.aspx',opts);
  try {
    return response.json();
  } catch {
    return response;
  }
};

export const parseDirectory =  async (token : string, appId : string, files : any[], lastfile : string, currentPath : string, absolutePath : string) => {
  for (var x = 0; x < files.length; x++) {
    let path : string;
    if (currentPath === '') {
      path = files[x].path;
    } else {
      path = `${currentPath}/${files[x].path}`;
    }
    if (files[x].type === 'FOLDER') {
      if (files[x].path  === 'CloudBackend') {
        continue;
      }
      let newFiles = await isFolder(token, appId, path, absolutePath);
      if (newFiles.length > 0) {
        await parseDirectory(token, appId, newFiles, lastfile, path, absolutePath);
      }
    } else {
      let file = fs.createWriteStream(`${absolutePath}/${path}`, {'encoding': 'utf-8'});
      let response = await fetch(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/${encodeURI(path)}`, {
        method: 'GET'
      });
      response.body.pipe(file);
      file.on('finish', () => {
        file.close();
        if (path === lastfile) {
          return true;
        }
      });
    }
  }
};

export const isFolder = async (token : string, appId : string, path : string, absolutePath : string) => {
  if (!fs.existsSync(`${absolutePath}/${path}`)) {
    fs.mkdirSync(`${absolutePath}/${path}`);
  }
  let newFiles = await getDirectoryListing(token, appId, path);
  return newFiles;
};

export const pullSingleFile = async (appId: string, path: string, absolutePath: string) => {
  let response = await fetch(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/${encodeURI(path)}`, {
    method: 'GET'
  });
  if (response.status === 403) {
    throw new Error('File does not exist.');
  } else {
    let file = fs.createWriteStream(`${absolutePath}/${path}`, {'encoding': 'utf-8'});
    response.body.pipe(file);
    file.on('finish', () => {
      file.close();
    });
  }
};