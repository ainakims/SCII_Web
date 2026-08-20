"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheInvalidar = cacheInvalidar;
const almacen = new Map();
function cacheGet(key) {
    const entrada = almacen.get(key);
    if (!entrada)
        return undefined;
    if (Date.now() > entrada.expiraEn) {
        almacen.delete(key);
        return undefined;
    }
    return entrada.valor;
}
function cacheSet(key, valor, ttlMs) {
    almacen.set(key, { valor, expiraEn: Date.now() + ttlMs });
}
function cacheInvalidar(...keys) {
    keys.forEach((key) => almacen.delete(key));
}
