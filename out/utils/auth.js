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
const requestNative = require("request-promise-native");
const url_1 = require("url");
function loginRequest(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = {
            command: 'Login',
            email: email,
            password: password
        };
        let response = yield requestNative({
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
            uri: "https://api.appdrag.com/api.aspx",
            body: new url_1.URLSearchParams(data).toString(),
        });
        return response;
    });
}
exports.loginRequest = loginRequest;
function codeRequest(email, password, code) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = {
            command: 'Login',
            email: email,
            password: password,
            verificationCode: code
        };
        console.log(data);
        let response = yield requestNative({
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
            uri: "https://api.appdrag.com/api.aspx",
            body: new url_1.URLSearchParams(data).toString(),
        });
        return response;
    });
}
exports.codeRequest = codeRequest;
//# sourceMappingURL=auth.js.map