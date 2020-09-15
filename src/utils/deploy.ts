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
        let response = await fetch(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/${encodeURI(path)}`, {
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

  for (const funcFolder in funcs) {
    let basePath = `${absolutePath}/api`;
    for (let x = 0; x < funcs[funcFolder].functions.length ;x++) {
      let func : any = funcs[funcFolder].functions[x];
      let filePath = '';
      if (!funcs[funcFolder].name) {
         filePath += `${basePath}`;
      } else {
        filePath += `${basePath}/${funcs[funcFolder].name}`;
        if (!fs.existsSync(filePath)) {
          fs.mkdirSync(filePath);
        }
      }
      if (func.type === 'SELECT') {
        writeSelectVSQLFile(func, filePath);
      } else if (func.type === 'UPDATE') {
        writeUpdateVSQLFile(func, filePath);
      } else if (func.type === 'INSERT') {
        writeInsertVSQLFile(func, filePath);
      } else if (func.type === 'DELETE') {
        writeDeleteVSQLFile(func, filePath);
      } else if (func.type.slice(0,3) === 'SQL') {
        writeSQLFile(func, filePath);
      }
      await downloadAndWriteFunction(token, appId, filePath, func, apiKey);
    }
  }
  return apiKey;
};

const downloadAndWriteFunction = async (token: string, appId: string, path: string, functionObj: any, apiKey: string) => {
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
      fs.access(`${path}/main.js`, (err) => {
        if (err) {
          return;
        } else {
          fs.renameSync(`${path}/main.js`, `${path}/${functionObj.name}.js`);
        }
      });
      fs.access(`${path}/main.py`, (err) => {
        if (err) {
          return;
        } else {
          fs.renameSync(`${path}/main.py`, `${path}/${functionObj.name}.py`);
        }
      });
      fs.access(`${path}/backup.csv`, (err) => {
        if (err) {
          return;
        } else {
          fs.unlinkSync(`${path}/backup.csv`);
        }
      });
      fs.access(`${path}/backup.json`, (err) => {
        if (err) {
          return;
        } else {
          fs.unlinkSync(`${path}/backup.json`);
        }
      });
      fs.access(`${path}/main.zip`, (err) => {
        if (err) {
          return;
        } else {
          fs.unlinkSync(`${path}/main.zip`);
        }
      });
    }).on('finish', () => {      
      fs.unlinkSync(filePath);
    });
  });
};

export const flattenFunctionList = (functions: any) => {
  let finalObj: any = {
    '/': {
      functions: []
    }
  };
  functions.forEach((func: any) => {
    if (func.type === 'FOLDER') {
      finalObj[func.id] = {
        name: func.name,
        functions: []
      };
    }
  });

  functions.forEach((func: any) => {
    if (func.type !== 'FOLDER') {
      if (func.parentID !== -1) {
        finalObj[func.parentID].functions.push(func);
      } else {
        finalObj['/'].functions.push(func);
      }
    }
  });
  return finalObj;
};

const writeSelectVSQLFile = (functionObj: any, filePath: string) => {
  let finalQuery = "";
  let columns = "";
  let whereConditions = JSON.parse(functionObj.whereConditions);
  let outputColumns = JSON.parse(functionObj.outputColumns);
  if (outputColumns !== [] && outputColumns) {
    outputColumns.map((col: string) => {
      columns += `${col},`;
    });
    columns = columns.slice(0, -1);

    finalQuery += `SELECT ${columns} FROM ${functionObj.tableName}`;
  }
  let where = "";
  if (whereConditions !== [] && whereConditions) {
    whereConditions.map((condition : any) => {
      let value = "";
      if (condition.type == "value" || condition.type == "formula") {
        value = condition.value;
      } else {
        if (condition.value === null) {
          return;
        }
        value = ' @PARAM_' + condition.value.replace("'", "''");
      }
      let quotedValue = value;
      let matchValue = condition.signOperator + quotedValue;
      if (condition.signOperator == "contains")
      {
          matchValue = "LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "not contains")
      {
          matchValue = "NOT LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "starts with")
      {
          matchValue = "LIKE '" + value + "%'";
      }
      else if (condition.signOperator == "in")
      {
          matchValue = "IN (" + value + ")";
      }
      else if (condition.signOperator == "ends with")
      {
          matchValue = "LIKE '%" + value + "'";
      }
      else if (condition.signOperator == "is")
      {
          matchValue = "IS " + value;
      }
      else if (condition.signOperator == "is not")
      {
          matchValue = "IS NOT " + value;
      }
      finalQuery += " " + condition.conditionOperator + " `" + condition.column + "` " + matchValue;
    });
  }
  // ORDER BY ==============================
  if (functionObj.orderByColumn != ""){
    let orderBy = "";
    let orderByDirections: any = functionObj.orderByDirection;
    let idx = 0;
    if (orderByDirections !== null) {
      orderByDirections = orderByDirections.split(',');
    }
    let orderByColumn = functionObj.orderByColumn;
    if (orderByColumn !== null) {
      orderByColumn = orderByColumn.split(',');
      orderByColumn.forEach((column: any) => {
        if (orderBy != "")
        {
          orderBy += ", ";
        }
        orderBy += "`" + column + "`";
        if (idx < orderByDirections.Length)
        {
          orderBy += " " + orderByDirections[idx];
        }
        idx++;
      });
    }
    if (orderBy != "") {
      finalQuery += " ORDER BY " + orderBy;
    }
  }
  fs.writeFileSync(`${filePath}/${functionObj.name}.sql`, finalQuery);
}

const writeUpdateVSQLFile = (functionObj :any, filePath: string) => {
  let finalQuery = `UPDATE ${functionObj.tableName} SET `;
  let mappingColumns = JSON.parse(functionObj.mappingColumns);
  let whereConditions = JSON.parse(functionObj.whereConditions);

  let updateStr = "";
  if (mappingColumns) {
    mappingColumns.forEach((condition: any) => {
      let value = "";
      if (condition.type == 'value' || condition.type=='formula') {
        value = condition.value;
      } else {
        if (condition.value == null) {
          return;
        }
      }
      if (updateStr != ""){
        updateStr += ",";
      }
      if (condition.type != "formula") {
        value = "'" + value + "'";
      }
      updateStr += "`" +condition.column + "`=" + value + " ";
    });
  }
  finalQuery += updateStr;
  let where = "";
  if (whereConditions) {
    whereConditions.map((condition: any) => {
      let value = "";
      if (condition.type == "value" || condition.type == "formula") {
        value = condition.value;
      } else {
        if (condition.value === null) {
          return;
        }
        value = condition.value.replace("'", "''");
      }
      let quotedValue = value;
      let matchValue = condition.signOperator + quotedValue;
      if (condition.signOperator == "contains")
      {
          matchValue = "LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "not contains")
      {
          matchValue = "NOT LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "starts with")
      {
          matchValue = "LIKE '" + value + "%'";
      }
      else if (condition.signOperator == "in")
      {
          matchValue = "IN (" + value + ")";
      }
      else if (condition.signOperator == "ends with")
      {
          matchValue = "LIKE '%" + value + "'";
      }
      else if (condition.signOperator == "is")
      {
          matchValue = "IS " + value;
      }
      else if (condition.signOperator == "is not")
      {
          matchValue = "IS NOT " + value;
      }
      finalQuery += " " + condition.conditionOperator + " `" + condition.column + "` " + matchValue;
    });
  }
  fs.writeFileSync(`${filePath}/${functionObj.name}.sql`, finalQuery);
};

const writeInsertVSQLFile = (functionObj :any, filePath: string) => {
  let finalQuery = "";
  let cols = '';
  let vals = '';
  let mappingColumns = JSON.parse(functionObj.mappingColumns);
  if (mappingColumns) {
    mappingColumns.map((condition: any) => {
      let value = '';
      if (condition.type == 'value' || condition.type == 'formula') {
        value = condition.value;
      } else {
        if (condition.value == null) {
          return;
        }
        value = condition.value.replace("'", "''");
      }
      if (cols != '') {
        cols += ',';
      }
      cols += "`" + condition.column + "`";
      if (vals != ""){
        vals += ",";
      }
      if (condition.type != "formula") {
        value = "'" + value + "'";
      }
      vals += value;
    });
  }
  finalQuery += " INSERT INTO " + functionObj.tableName;
  finalQuery += " (" + cols + ") values (" + vals + ") ";
  fs.writeFileSync(`${filePath}/${functionObj.name}.sql`, finalQuery);
};

const writeDeleteVSQLFile = (functionObj :any, filePath: string) => {
  let finalQuery = `DELETE FROM ${functionObj.tableName} `
  let whereConditions = JSON.parse(functionObj.whereConditions);

  let where = "";
  if (whereConditions !== [] && whereConditions) {
    whereConditions.map((condition : any) => {
      let value = "";
      if (condition.type == "value" || condition.type == "formula") {
        value = condition.value;
      } else {
        if (condition.value === null) {
          return;
        }
        value = condition.value.replace("'", "''");
      }
      let quotedValue = value;
      let matchValue = condition.signOperator + quotedValue;
      if (condition.signOperator == "contains")
      {
          matchValue = "LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "not contains")
      {
          matchValue = "NOT LIKE '%" + value + "%'";
      }
      else if (condition.signOperator == "starts with")
      {
          matchValue = "LIKE '" + value + "%'";
      }
      else if (condition.signOperator == "in")
      {
          matchValue = "IN (" + value + ")";
      }
      else if (condition.signOperator == "ends with")
      {
          matchValue = "LIKE '%" + value + "'";
      }
      else if (condition.signOperator == "is")
      {
          matchValue = "IS " + value;
      }
      else if (condition.signOperator == "is not")
      {
          matchValue = "IS NOT " + value;
      }
      finalQuery += " " + condition.conditionOperator + " `" + condition.column + "` " + matchValue;
    });
  }
  fs.writeFileSync(`${filePath}/${functionObj.name}.sql`, finalQuery);
};

const writeSQLFile = (functionObj :any, filePath: string) => {
  fs.writeFileSync(`${filePath}/${functionObj.name}.sql`, functionObj.sourceCode);
  return;
};

export const appConfigJson = (appId: string, funcJson: any, baseFolder: string, apiKey: string) => {
  let object : any = {
    "env": "PROD",
    "version": "1.0.0",
    "title": `${appId}`,
    "description": `${appId} Pulled from appdrag.com`,
    "domains": ["*"], 
    "publicFolder": "./public",
    "TypeAPI": "LOCAL",
    "TypeFS": "LOCAL",
    "redirect404toIndex": true,
    "acceptedFiles": "*.jpg|*.png|*.mp4|*.zip|*.jpeg|*.pdf",
    "uploadFolder": "public/uploads/",
    "globalEnv" : {
      APPID: appId,
      APIKEY: apiKey
    },
    "db": {
      "MYSQL": {
          "dump": `./DB/db.sql`,
          "database": `${appId}`,
          "host": "AUTO",
          "port": "AUTO",
          "user": "AUTO",
          "password": "AUTO",
          "apiToken": "AUTO",
          "apiEndpoint": ""
      }
    },
    "apiEndpoints": {}
  };
  for (const key in funcJson) {
    funcJson[key]['functions'].forEach((func : any) => {
      let pathToFunction: string;
      if (funcJson[key].name) {
        pathToFunction = `/${funcJson[key].name}/${func.name}`;
      } else {
        pathToFunction = `/${func.name}`;
      }
      let pathToFolder = pathToFunction.split('/').slice(0,-1).join('/') + '/';
      object.apiEndpoints[`${pathToFunction}`] = { 
          src:`./api${pathToFolder}`,
          vpath: `./api${pathToFunction}`,
          realpath:  `./${baseFolder}/api${pathToFunction}`,
          handler: `${func.name}.handler`,
          type: `${func.type}`,
          lastParams: JSON.parse(func.lastParams),
          method: func.method,
          output: func.output,
          parametersList: JSON.parse(func.parametersList),
          whereConditions: JSON.parse(func.whereConditions),
          tableName: func.tableName,
          orderByDirection: func.orderByDirection,
          orderByColumn: func.orderByColumn,
          outputColumns: JSON.parse(func.outputColumns),
          mappingColumns: JSON.parse(func.mappingColumns),
          sourceCode: func.sourceCode,
          isPrivate: func.isPrivate
      };
      if (func.envVars) {
        object.apiEndpoints[`${pathToFunction}`].envVars = JSON.parse(func.envVars);
      }
      if (func.type !== "SELECT" && func.type !== "UPDATE" && func.type !== "DELETE" && func.type !== "INSERT" && func.type.slice(0,3) !== 'SQL') {
        delete object.apiEndpoints[`${pathToFunction}`].sourceCode;
        delete object.apiEndpoints[`${pathToFunction}`].mappingColumns;
        delete object.apiEndpoints[`${pathToFunction}`].outputColumns;
        delete object.apiEndpoints[`${pathToFunction}`].orderByColumn;
        delete object.apiEndpoints[`${pathToFunction}`].orderByDirection;
        delete object.apiEndpoints[`${pathToFunction}`].tableName;
        delete object.apiEndpoints[`${pathToFunction}`].whereConditions;
      }
    });
  }
  let toWrite = JSON.stringify(object);
  fs.writeFileSync(`${baseFolder}/appconfig.json`, toWrite);
  return;
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