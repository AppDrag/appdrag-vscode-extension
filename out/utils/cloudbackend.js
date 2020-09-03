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
const common_1 = require("./common");
const filesystem_1 = require("../utils/filesystem");
const fetch = require('node-fetch');
const unzipper = require('unzipper');
exports.getFunctionsList = (appId, token) => __awaiter(void 0, void 0, void 0, function* () {
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
    let response = yield fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
    response = yield response.json();
    return response;
});
exports.parseFunctions = (token, appId, funcs, absolutePath) => __awaiter(void 0, void 0, void 0, function* () {
    if (!fs.existsSync(`${absolutePath}/CloudBackend`)) {
        fs.mkdirSync(`${absolutePath}/CloudBackend/`);
        fs.mkdirSync(`${absolutePath}/CloudBackend/code`);
    }
    else if (!fs.existsSync(`${absolutePath}/CloudBackend/code`)) {
        fs.mkdirSync(`${absolutePath}/CloudBackend/code`);
    }
    for (let x = 0; x < funcs.length; x++) {
        let newPath = `${absolutePath}/CloudBackend/code/${funcs[x].id}`;
        if (funcs[x].type !== 'FOLDER') {
            if (!fs.existsSync(newPath)) {
                fs.mkdirSync(newPath);
            }
            yield exports.downloadAndWriteFunction(token, appId, newPath, funcs[x]);
        }
    }
});
exports.downloadAndWriteFunction = (token, appId, path, functionObj) => __awaiter(void 0, void 0, void 0, function* () {
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
    let url = yield exports.getFunctionURL(data);
    let response = yield fetch(url, {
        method: 'GET'
    });
    response.body.pipe(file);
    file.on('close', () => {
        fs.createReadStream(filePath)
            .pipe(unzipper.Extract({ path: path }))
            .on('close', () => {
            fs.unlinkSync(filePath);
        });
    });
});
exports.getFunctionURL = (data) => __awaiter(void 0, void 0, void 0, function* () {
    let opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams(data)
    };
    console.log(data);
    let res = yield fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
    res = yield res.json();
    return res.url;
});
exports.writeScriptFile = (functionList, absolutePath) => {
    let modules = [];
    functionList.forEach(func => {
        if (func.libs) {
            let libs = JSON.parse(func.libs);
            libs.forEach((lib) => {
                if (modules.indexOf(lib) < 0) {
                    modules.push(lib);
                }
            });
        }
    });
    fs.writeFileSync(absolutePath + '/install.sh', 'npm init --force --yes\nnpm install ' + modules.join('\nnpm install ').replace(/,/g, " "));
};
exports.apiJson = (api, appId) => {
    let finalObj = {
        appId: appId,
        funcs: {
            '/': []
        }
    };
    api.forEach((func) => {
        if (func.type === 'FOLDER') {
            finalObj.funcs[func.name] = {
                id: func.id
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
            }
            else {
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
exports.pushFunctions = (appId, token, currFolder, basePath, folders) => __awaiter(void 0, void 0, void 0, function* () {
    for (let x = 0; x < folders.length; x++) {
        let folder = folders[x];
        let zipPath = `${appId}_${folder}.zip`;
        let folderPath = basePath + folder;
        let zipErr = yield filesystem_1.createZip(folderPath, zipPath);
        if (zipErr) {
            throw new Error('Error zipping file');
        }
        let fileContent = fs.createReadStream(zipPath);
        let fileSizeInBytes = fs.statSync(zipPath).size;
        let url = yield filesystem_1.getSignedURL(appId, `CloudBackend/api/${zipPath}`, token);
        if (url.status === 'KO') {
            let token_ref = common_1.config.get('refreshToken');
            yield common_1.refreshToken(token_ref);
            url = yield filesystem_1.getSignedURL(appId, `CloudBackend/api/${zipPath}`, token);
            if (url.status === 'KO') {
                return;
            }
        }
        url = url.signedURL;
        yield filesystem_1.pushToAwsS3(fileContent, fileSizeInBytes, url);
        let response = yield exports.restoreCloudBackendFunction(appId, token, folder);
        if (response.status === 'OK') {
            fs.unlinkSync(zipPath);
        }
    }
});
exports.restoreCloudBackendFunction = (appId, token, folder) => __awaiter(void 0, void 0, void 0, function* () {
    let data = {
        command: 'CloudAPIRestoreAPI',
        token: token,
        appID: appId,
        version: '',
        functionID: folder,
    };
    var opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams(data),
    };
    let response = yield fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
    return yield response.json();
});
//# sourceMappingURL=cloudbackend.js.map