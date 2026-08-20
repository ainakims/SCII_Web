"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJwtUser = generateJwtUser;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function generateJwtUser(jwtDataUser) {
    try {
        const payload = jwtDataUser;
        const token = jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, {});
        return token;
    }
    catch (error) {
        JSON.stringify(error.message);
        return null;
    }
}
