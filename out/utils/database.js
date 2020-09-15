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
const vscode = require("vscode");
const common_1 = require("../utils/common");
const fetch = require('node-fetch');
const FormData = require('form-data');
exports.downloadDb = (appId, token, absolutePath) => __awaiter(void 0, void 0, void 0, function* () {
    let data = {
        command: 'CloudDBExportFile',
        token: token,
        appID: appId,
    };
    var opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams(data),
    };
    let databaseUrl = yield fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
    databaseUrl = yield databaseUrl.json();
    if (databaseUrl.status !== 'OK') {
        let version = yield getDbVersions(appId, token);
        if (!version) {
            return;
        }
        yield downloadLastDbVersion(appId, token, version, absolutePath);
        return;
    }
    databaseUrl = databaseUrl.url;
    let file = fs.createWriteStream(`${absolutePath}`);
    let response = yield fetch(databaseUrl, {
        method: 'GET',
    });
    response.body.pipe(file);
    file.on('close', () => {
        return;
    });
});
const getDbVersions = (appId, token) => __awaiter(void 0, void 0, void 0, function* () {
    let data = {
        command: 'GetFileVersions',
        token: token,
        appID: appId,
        path: 'CloudBackend/db/backup.sql',
    };
    var opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams(data),
    };
    let fileVersions = yield fetch('https://api.appdrag.com/api.aspx', opts);
    fileVersions = yield fileVersions.json();
    if (fileVersions.status === 'KO') {
        let token_ref = common_1.config.get('refreshToken');
        yield common_1.refreshToken(token_ref);
        fileVersions = yield fetch('https://api.appdrag.com/api.aspx', opts);
        fileVersions = yield fileVersions.json();
        if (fileVersions.status === 'KO') {
            throw new Error('Invalid appId provided and/or please login again.');
        }
    }
    let versionId = fileVersions[0].VersionId;
    return versionId;
});
const downloadLastDbVersion = (appId, token, version, absolutePath) => __awaiter(void 0, void 0, void 0, function* () {
    let file = fs.createWriteStream(`${absolutePath}`);
    let data = {
        command: 'CloudDBDownloadRestore',
        token: token,
        appID: appId,
        version: version,
    };
    var opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams(data),
    };
    let dbUrl = yield fetch('https://api.appdrag.com/CloudBackend.aspx', opts);
    dbUrl = yield dbUrl.json();
    if (dbUrl.status === 'KO') {
        return;
    }
    let response = yield fetch(dbUrl.url, {
        method: 'GET',
    });
    response.body.pipe(file);
    file.on('close', () => {
        vscode.window.showInformationMessage('Done !');
    });
});
exports.pushDbToCloudBackend = (appId, token, filePath) => __awaiter(void 0, void 0, void 0, function* () {
    let file = fs.readFileSync(filePath);
    let form = new FormData();
    form.append('command', 'CloudDBRestoreDB');
    form.append('upload', file, filePath);
    form.append('appID', appId);
    form.append('token', token);
    let url = 'https://api.appdrag.com/CloudBackend.aspx';
    form.submit(url, (err, res) => {
        if (res.statusMessage === 'OK') {
            vscode.window.showInformationMessage(`${filePath} successfully uploaded !`);
            return;
        }
        else {
            throw new Error(`Error when trying to upload file`);
        }
    });
});
//# sourceMappingURL=database.js.map