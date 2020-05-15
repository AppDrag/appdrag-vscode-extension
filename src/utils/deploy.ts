import * as fs from 'fs';
import { isFolder } from '../utils/filesystem';
import { getFunctionURL } from '../utils/cloudbackend';
const fetch = require('node-fetch');
const unzipper = require('unzipper');

export const parseDirectory = (token: string, appId: string, files: any[], lastfile: string, currentPath: string, absolutePath: string) => {
  return new Promise( async (resolve, reject) => {
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
          let newLast = path + '/' + newFiles[newFiles.length - 1].path;
          await parseDirectory(token, appId, newFiles, newLast, path, absolutePath);
        }
      } else {
        const regex = RegExp(/(.html|.js|.xml|.css|.txt)$/gm);
        if (fs.existsSync(`${absolutePath}/${path}`) && !(regex.test(path))) {
          if (x+1 === files.length) {
            resolve();
          }
          else {
            continue;
          }
        }
        let file = fs.createWriteStream(`${absolutePath}/${path}`, {'encoding': 'utf-8'});
        let response = await fetch(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/${path}`, {
          method: 'GET'
        });
        response.body.pipe(file);
        file.on('finish', () => {
          file.close();
          if (path === lastfile) {
            resolve();
          }
        });
      }
    }
  });
};

const replaceLinks = (filePath: string, appId: string) => {
  if (fs.existsSync(filePath)) {
    let file_content : Buffer|string = fs.readFileSync(filePath);
    let regexp = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/`,"g");
    let regexp2 = new RegExp(`https://cf.appdrag.com/${appId}/`,"g");
    let regexp3 = new RegExp(`//cf.appdrag.com/${appId}/`, "g");
    let regexp4 = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/`,"g");
    let regexp5 = new RegExp('//cf.appdrag.com/resources/',"g");
    file_content = file_content.toString('utf-8');
    file_content = file_content.replace(regexp, "./").replace(regexp2,'./').replace(regexp3,'./').replace(regexp4, './').replace(regexp5, './');
    fs.writeFileSync(filePath, file_content);
  }
};

export const parseHtmlFiles = (appId: string, absolutePath: string) => {
  let files = fs.readdirSync(absolutePath);
  files.forEach((file) => {
    if (file.slice(-5) === '.html') {
      replaceLinks(`${absolutePath}/${file}`, appId);
    }
  });
};

export const downloadResources = async (absolutePath: string) => {
  if (!fs.existsSync(`${absolutePath}/js`)) {
    fs.mkdirSync(`${absolutePath}/js`);
  }
  if (!fs.existsSync(`${absolutePath}/css`)) {
    fs.mkdirSync(`${absolutePath}/css`);
  }
  let urls = [
    'https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/css/appdrag.css',
    'https://cf.appdrag.com/resources/appallin-universal-theme.css',
    'https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/js/appdrag.js'
  ];
  for (let x = 0; x < urls.length ;x++) {
    let path = urls[x].replace(/.*resources\//g, "");
    let file = fs.createWriteStream(`${absolutePath}/${path}`, { encoding: 'utf8' });
    let response = await fetch(urls[x], {
      method: 'GET',
    });
    response.body.pipe(file);
    file.on('finish', () => {
      if (path === urls[urls.length - 1].replace(/.*resources\//g, "")) {
        return;
      }
      file.close();
    });
  }
};

export const parseFunctionsDeploy = async (token : string, appId : string, funcs : any[], absolutePath : string) => {
  let apiKey = await getApiKey(token, appId);
  if (!fs.existsSync(absolutePath)) {
    fs.mkdirSync(absolutePath);
  }
  if (!fs.existsSync(`${absolutePath}/api`)) {
    fs.mkdirSync(`${absolutePath}/api`);
  }

  for(let x = 0; x < funcs.length; x++) {
    let newPath = `${absolutePath}/api/${funcs[x].name}`;
    if (funcs[x].type !== 'FOLDER') {
      if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath);
      }
      await downloadAndWriteFunction(token, appId, newPath, funcs[x], apiKey);
    }
  }
};

const downloadAndWriteFunction = async (token: string, appId: string, path: string, functionObj: any, apiKey: string) => {
  await writeEnvFile(path, functionObj, apiKey);
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
      if (fs.existsSync(`${path}/main.zip`)) {
        fs.unlinkSync(`${path}/main.zip`);
      }
      if (fs.existsSync(`${path}/backup.csv`)) {
        fs.unlinkSync(`${path}/backup.csv`);
      }
      fs.unlinkSync(filePath);
    });
  });
};

const getApiKey = async (token: string, appId: string) => {
  let res = await fetch('https://api.appdrag.com/CloudBackend.aspx', {
    method:'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({command:'CloudDBGetSecretKey', token: token, appID: appId})
  });
  res =  await res.json();
  return res.secret_key;
};

const writeEnvFile = async (path: string, functionObj: any, apiKey: string) => {
  let envFile = fs.createWriteStream(`${path}/.env`);
  envFile.write('APIKEY='+apiKey);
  if (functionObj.envVars) {
    let envVars = JSON.parse(functionObj.envVars);
    delete envVars.APPID;
    delete envVars.APIKEY;
    if (Object.keys(envVars).length > 0) {
      Object.keys(envVars).forEach(val => {
        envFile.write('\n'+val+'='+envVars[val]);
      });    
    }
  }
  if (functionObj.type === 'SQLSELECT') {
    fs.writeFileSync(`${path}/main.json`, JSON.stringify(functionObj));
    fs.writeFileSync(`${path}/main.sql`, functionObj.sourceCode);
    return;
  } else {
    fs.writeFileSync(`${path}/backup.json`, JSON.stringify(functionObj));
  }
};