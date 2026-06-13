/**
 * Thin promise wrapper around IndexedDB. Zero dependencies (no npm idb package).
 * All functions promisify IDBRequest/IDBTransaction events.
 */

/**
 * Promisifies an IDBRequest.
 * @template T
 * @param {IDBRequest<T>} idbReq
 * @returns {Promise<T>}
 */
export function req(idbReq) {
  return new Promise((resolve, reject) => {
    idbReq.onsuccess = () => resolve(/** @type {T} */ (idbReq.result));
    idbReq.onerror = () => reject(idbReq.error);
  });
}

/**
 * Opens (and upgrades) the IndexedDB database.
 * @param {string} name
 * @param {number} version
 * @param {(db: IDBDatabase, oldVersion: number) => void} onUpgrade
 * @returns {Promise<IDBDatabase>}
 */
export function openDB(name, version, onUpgrade) {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(name, version);
    r.onupgradeneeded = (e) => onUpgrade(r.result, e.oldVersion);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/**
 * Runs a transaction over stores, awaiting completion. Resolves with the callback's return value.
 * @template T
 * @param {IDBDatabase} db
 * @param {string|string[]} stores
 * @param {IDBTransactionMode} mode
 * @param {(tx: IDBTransaction) => T | Promise<T>} fn
 * @returns {Promise<T>}
 */
export function tx(db, stores, mode, fn) {
  return new Promise(async (resolve, reject) => {
    const t = db.transaction(stores, mode);
    /** @type {T} */
    let out;
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('transaction aborted'));
    try {
      out = await fn(t);
    } catch (e) {
      reject(e);
      t.abort();
    }
  });
}

/**
 * Gets a record by key from an object store.
 * @param {IDBObjectStore} store
 * @param {IDBValidKey} key
 * @returns {Promise<any>}
 */
export function get(store, key) {
  return req(store.get(key));
}

/**
 * Puts a record into an object store (insert or overwrite).
 * @param {IDBObjectStore} store
 * @param {any} value
 * @returns {Promise<IDBValidKey>}
 */
export function put(store, value) {
  return req(store.put(value));
}

/**
 * Gets all records from an object store.
 * @param {IDBObjectStore} store
 * @returns {Promise<any[]>}
 */
export function getAll(store) {
  return req(store.getAll());
}
