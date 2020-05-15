"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const filesystem_1 = require("../utils/filesystem");
const cloudbackend_1 = require("../utils/cloudbackend");
const fetch = require('node-fetch');
const unzipper = require('unzipper');
exports.parseDirectory = (token, appId, files, lastfile, currentPath, absolutePath) => {
    return new Promise((resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
        for (var x = 0; x < files.length; x++) {
            let path;
            if (currentPath === '') {
                path = files[x].path;
            }
            else {
                path = `${currentPath}/${files[x].path}`;
            }
            if (files[x].type === 'FOLDER') {
                if (files[x].path === 'CloudBackend') {
                    continue;
                }
                let newFiles = yield filesystem_1.isFolder(token, appId, path, absolutePath);
                if (newFiles.length > 0) {
                    let newLast = path + '/' + newFiles[newFiles.length - 1].path;
                    yield exports.parseDirectory(token, appId, newFiles, newLast, path, absolutePath);
                }
            }
            else {
                const regex = RegExp(/(.html|.js|.xml|.css|.txt)$/gm);
                if (fs.existsSync(`${absolutePath}/${path}`) && !(regex.test(path))) {
                    if (x + 1 === files.length) {
                        resolve();
                    }
                    else {
                        continue;
                    }
                }
                let file = fs.createWriteStream(`${absolutePath}/${path}`, { 'encoding': 'utf-8' });
                let response = yield fetch(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/${path}`, {
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
    }));
};
const replaceLinks = (filePath, appId) => {
    if (fs.existsSync(filePath)) {
        let file_content = fs.readFileSync(filePath);
        let regexp = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/`, "g");
        let regexp2 = new RegExp(`https://cf.appdrag.com/${appId}/`, "g");
        let regexp3 = new RegExp(`//cf.appdrag.com/${appId}/`, "g");
        let regexp4 = new RegExp(`//s3-eu-west-1.amazonaws.com/dev.appdrag.com/resources/`, "g");
        let regexp5 = new RegExp('//cf.appdrag.com/resources/', "g");
        file_content = file_content.toString('utf-8');
        file_content = file_content.replace(regexp, "./").replace(regexp2, './').replace(regexp3, './').replace(regexp4, './').replace(regexp5, './');
        fs.writeFileSync(filePath, file_content);
    }
};
exports.parseHtmlFiles = (appId, absolutePath) => {
    let files = fs.readdirSync(absolutePath);
    files.forEach((file) => {
        if (file.slice(-5) === '.html') {
            replaceLinks(`${absolutePath}/${file}`, appId);
        }
    });
};
exports.downloadResources = (absolutePath) => __awaiter(void 0, void 0, void 0, function* () {
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
    for (let x = 0; x < urls.length; x++) {
        let path = urls[x].replace(/.*resources\//g, "");
        let file = fs.createWriteStream(`${absolutePath}/${path}`, { encoding: 'utf8' });
        let response = yield fetch(urls[x], {
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
});
exports.parseFunctionsDeploy = (token, appId, funcs, absolutePath) => __awaiter(void 0, void 0, void 0, function* () {
    let apiKey = yield getApiKey(token, appId);
    if (!fs.existsSync(absolutePath)) {
        fs.mkdirSync(absolutePath);
    }
    if (!fs.existsSync(`${absolutePath}/api`)) {
        fs.mkdirSync(`${absolutePath}/api`);
    }
    for (let x = 0; x < funcs.length; x++) {
        let newPath = `${absolutePath}/api/${funcs[x].name}`;
        if (funcs[x].type !== 'FOLDER') {
            if (!fs.existsSync(newPath)) {
                fs.mkdirSync(newPath);
            }
            yield downloadAndWriteFunction(token, appId, newPath, funcs[x], apiKey);
        }
    }
});
const downloadAndWriteFunction = (token, appId, path, functionObj, apiKey) => __awaiter(void 0, void 0, void 0, function* () {
    yield writeEnvFile(path, functionObj, apiKey);
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
    let url = yield cloudbackend_1.getFunctionURL(data);
    let response = yield fetch(url, {
        method: 'GET'
    });
    response.body.pipe(file);
    file.on('close', () => {
        fs.createReadStream(filePath)
            .pipe(unzipper.Extract({ path: path }))
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
});
const getApiKey = (token, appId) => __awaiter(void 0, void 0, void 0, function* () {
    let res = yield fetch('https://api.appdrag.com/CloudBackend.aspx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams({ command: 'CloudDBGetSecretKey', token: token, appID: appId })
    });
    res = yield res.json();
    return res.secret_key;
});
const writeEnvFile = (path, functionObj, apiKey) => __awaiter(void 0, void 0, void 0, function* () {
    let envFile = fs.createWriteStream(`${path}/.env`);
    envFile.write('APIKEY=' + apiKey);
    if (functionObj.envVars) {
        let envVars = JSON.parse(functionObj.envVars);
        delete envVars.APPID;
        delete envVars.APIKEY;
        if (Object.keys(envVars).length > 0) {
            Object.keys(envVars).forEach(val => {
                envFile.write('\n' + val + '=' + envVars[val]);
            });
        }
    }
    if (functionObj.type === 'SQLSELECT') {
        fs.writeFileSync(`${path}/main.json`, JSON.stringify(functionObj));
        fs.writeFileSync(`${path}/main.sql`, functionObj.sourceCode);
        return;
    }
    else {
        fs.writeFileSync(`${path}/backup.json`, JSON.stringify(functionObj));
    }
});
//# sourceMappingURL=deploy.js.map