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
const archiver = require("archiver");
const fs = require("fs");
const common_1 = require("./common");
const fetch = require('node-fetch');
exports.pushFiles = (appId, absolutePath, filePath, token, destPath) => __awaiter(void 0, void 0, void 0, function* () {
    let fileContent = fs.createReadStream(absolutePath);
    let fileSizeInBytes = fs.statSync(absolutePath).size;
    let url = yield exports.getSignedURL(appId, filePath, token);
    if (url.status === 'KO') {
        url = yield exports.getSignedURL(appId, filePath, token);
        if (url.status === 'KO') {
            let token_ref = common_1.config.get('refreshToken');
            yield common_1.refreshToken(token_ref);
            throw new Error('Please login again.');
        }
    }
    url = url.signedURL;
    let res = yield exports.pushToAwsS3(fileContent, fileSizeInBytes, url);
    yield exports.unzipAndDelete(appId, token, destPath, filePath);
});
exports.requestFiles = (currentFolder, rootFiles, requestData, lastFile) => __awaiter(void 0, void 0, void 0, function* () {
    let data = new URLSearchParams({ 'command': 'GetDirectoryListing', 'token': "config.get('token')'", 'appID': "appID", 'path': currentFolder || '', 'order': 'name' });
    yield fetch('https://api.appdrag.com/api.aspx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: data
    });
    return;
});
exports.createZip = (targetToZip, destPath) => __awaiter(void 0, void 0, void 0, function* () {
    let isErr = false;
    yield exports.pushZip(targetToZip, destPath).catch((err) => {
        isErr = true;
    });
    return isErr;
});
exports.pushZip = (targetToZip, destPath) => {
    console.log(targetToZip, destPath);
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
exports.getSignedURL = (appId, filePath, token) => __awaiter(void 0, void 0, void 0, function* () {
    let data = new URLSearchParams({
        command: 'GetUploadUrl',
        token: token,
        appID: appId,
        filekey: filePath
    });
    var opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: data,
    };
    let response = yield fetch('https://api.appdrag.com/api.aspx', opts);
    response = yield response.json();
    return response;
});
exports.pushToAwsS3 = (fileContent, fileSizeInBytes, url) => __awaiter(void 0, void 0, void 0, function* () {
    var opts = {
        method: 'PUT',
        headers: { 'Content-length': fileSizeInBytes },
        body: fileContent
    };
    let response = yield fetch(url, opts);
    try {
        response = yield response.json();
        return response;
    }
    catch (_a) {
        return response;
    }
});
exports.unzipAndDelete = (appId, token, destPath, filePath) => __awaiter(void 0, void 0, void 0, function* () {
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
    yield fetch('https://api.appdrag.com/api.aspx?', opts_unzip);
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
    yield fetch('https://api.appdrag.com/api.aspx?', opts_delete);
});
exports.getDirectoryListing = (token, appId, pathToPull) => __awaiter(void 0, void 0, void 0, function* () {
    let data = {
        command: 'GetDirectoryListing',
        token: token,
        appID: appId,
        path: pathToPull,
        order: 'name',
    };
    var opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: new URLSearchParams(data),
    };
    let response = yield fetch('https://api.appdrag.com/api.aspx', opts);
    try {
        return response.json();
    }
    catch (_b) {
        return response;
    }
});
exports.parseDirectory = (token, appId, files, lastfile, currentPath, absolutePath) => __awaiter(void 0, void 0, void 0, function* () {
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
            let newFiles = yield exports.isFolder(token, appId, path, absolutePath);
            if (newFiles.length > 0) {
                yield exports.parseDirectory(token, appId, newFiles, lastfile, path, absolutePath);
            }
        }
        else {
            let file = fs.createWriteStream(`${absolutePath}/${path}`, { 'encoding': 'utf-8' });
            let response = yield fetch(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/${encodeURI(path)}`, {
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
});
exports.isFolder = (token, appId, path, absolutePath) => __awaiter(void 0, void 0, void 0, function* () {
    if (!fs.existsSync(`${absolutePath}/${path}`)) {
        fs.mkdirSync(`${absolutePath}/${path}`);
    }
    let newFiles = yield exports.getDirectoryListing(token, appId, path);
    return newFiles;
});
exports.pullSingleFile = (appId, path, absolutePath) => __awaiter(void 0, void 0, void 0, function* () {
    let response = yield fetch(`https://s3-eu-west-1.amazonaws.com/dev.appdrag.com/${appId}/${encodeURI(path)}`, {
        method: 'GET'
    });
    if (response.status === 403) {
        throw new Error('File does not exist.');
    }
    else {
        let file = fs.createWriteStream(`${absolutePath}/${path}`, { 'encoding': 'utf-8' });
        response.body.pipe(file);
        file.on('finish', () => {
            file.close();
        });
    }
});
//# sourceMappingURL=filesystem.js.map