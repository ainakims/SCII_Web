// Cache genérico en memoria con TTL, para endpoints de lectura que pegan a
// consultas/SPs pesados pero cuyos datos casi no cambian (ej. catálogo de
// pacientes). No requiere Redis ni ninguna dependencia nueva: el backend
// corre como un solo proceso Node (sin PM2/cluster), así que un Map en
// memoria es suficiente — si en algún momento se escala a varias instancias,
// esto habría que moverlo a un cache compartido (Redis).
interface EntradaCache<T> {
  valor: T;
  expiraEn: number;
}

const almacen = new Map<string, EntradaCache<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entrada = almacen.get(key);
  if (!entrada) return undefined;
  if (Date.now() > entrada.expiraEn) {
    almacen.delete(key);
    return undefined;
  }
  return entrada.valor as T;
}

export function cacheSet<T>(key: string, valor: T, ttlMs: number): void {
  almacen.set(key, { valor, expiraEn: Date.now() + ttlMs });
}

export function cacheInvalidar(...keys: string[]): void {
  keys.forEach((key) => almacen.delete(key));
}
