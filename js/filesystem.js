// A simple virtual file system using IndexedDB

let db;
let dbPromise;

function normalizeFilePath(path) {
    const clean = String(path || "").trim().replace(/\\/g, "/");
    if (!clean || clean === "/") return "/";
    return `/${clean.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function normalizeFolderPath(path) {
    const normalized = normalizeFilePath(path);
    return normalized === "/" ? "/" : `${normalized}/`;
}

function getName(path) {
    const trimmed = path === "/" ? "/" : path.replace(/\/$/, "");
    return trimmed.split("/").pop() || "/";
}

function getParent(path) {
    if (path === "/") return "";
    const trimmed = path.replace(/\/$/, "");
    const slash = trimmed.lastIndexOf("/");
    return slash <= 0 ? "/" : `${trimmed.slice(0, slash)}/`;
}

function getChildPath(parent, name, type = "file") {
    const safeName = String(name || "").trim().replace(/^\/+|\/+$/g, "");
    const base = normalizeFolderPath(parent);
    const child = `${base}${safeName}`;
    return type === "folder" ? normalizeFolderPath(child) : normalizeFilePath(child);
}

function normalizeEntry(raw) {
    const path = raw.path || raw;
    const looksFolder = path.endsWith("/");
    const type = raw.type || (looksFolder ? "folder" : "file");
    return {
        path: type === "folder" ? normalizeFolderPath(path) : normalizeFilePath(path),
        name: raw.name || getName(path),
        type,
        content: raw.content ?? ""
    };
}

function transactionDone(tx, resolve, reject, value) {
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted."));
}

export function initFileSystem() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open("DDCGPT_FS", 1);

        request.onupgradeneeded = function(event) {
            db = event.target.result;
            if (!db.objectStoreNames.contains("files")) {
                db.createObjectStore("files", { keyPath: "path" });
            }
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            console.log("File system loaded");
            resolve(db);
        };

        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

async function getStore(mode = "readonly") {
    const database = await initFileSystem();
    const tx = database.transaction("files", mode);
    return {
        tx,
        store: tx.objectStore("files")
    };
}

export async function saveFile(path, content = "") {
    const entry = normalizeEntry({
        path: normalizeFilePath(path),
        type: "file",
        content
    });

    return new Promise(async (resolve, reject) => {
        const { tx, store } = await getStore("readwrite");
        store.put(entry);
        tx.oncomplete = () => resolve(entry);
        tx.onerror = () => reject(tx.error);
    });
}

export async function createFolder(path) {
    const entry = normalizeEntry({
        path: normalizeFolderPath(path),
        type: "folder",
        content: ""
    });

    return new Promise(async (resolve, reject) => {
        const { tx, store } = await getStore("readwrite");
        store.put(entry);
        tx.oncomplete = () => resolve(entry);
        tx.onerror = () => reject(tx.error);
    });
}

export async function readFile(path) {
    const filePath = normalizeFilePath(path);

    return new Promise(async (resolve, reject) => {
        const { store } = await getStore("readonly");
        const req = store.get(filePath);

        req.onsuccess = () => resolve(req.result?.content || null);
        req.onerror = () => reject(req.error);
    });
}

export async function listDirectory(prefix = "/") {
    const directory = normalizeFolderPath(prefix);

    return new Promise(async (resolve, reject) => {
        const { store } = await getStore("readonly");
        const results = [];

        const request = store.openCursor();
        request.onsuccess = function(e) {
            const cursor = e.target.result;
            if (!cursor) {
                results.sort((a, b) => {
                    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
                    return a.name.localeCompare(b.name);
                });
                resolve(results);
                return;
            }

            const entry = normalizeEntry(cursor.value);
            if (entry.path !== directory && getParent(entry.path) === directory) {
                results.push(entry);
            }
            cursor.continue();
        };
        request.onerror = () => reject(request.error);
    });
}

export async function exportFileSystem() {
    return new Promise(async (resolve, reject) => {
        const { store } = await getStore("readonly");
        const entries = [];
        const request = store.openCursor();

        request.onsuccess = function(e) {
            const cursor = e.target.result;
            if (!cursor) {
                entries.sort((a, b) => a.path.localeCompare(b.path));
                resolve({
                    app: "DDCGPT OS",
                    kind: "indexeddb-filesystem",
                    schemaVersion: 1,
                    exportedAt: new Date().toISOString(),
                    counts: {
                        files: entries.filter((entry) => entry.type === "file").length,
                        folders: entries.filter((entry) => entry.type === "folder").length,
                        memories: entries.filter((entry) => entry.path.startsWith("/Memories/") && entry.type === "file").length
                    },
                    entries
                });
                return;
            }

            entries.push(normalizeEntry(cursor.value));
            cursor.continue();
        };

        request.onerror = () => reject(request.error);
    });
}

export async function importFileSystem(packageData, options = {}) {
    const entries = normalizeImportEntries(packageData);
    const replace = options.replace !== false;

    return new Promise(async (resolve, reject) => {
        const { tx, store } = await getStore("readwrite");

        if (replace) {
            store.clear();
        }

        entries.forEach((entry) => {
            store.put(entry);
        });

        transactionDone(tx, resolve, reject, {
            imported: entries.length,
            files: entries.filter((entry) => entry.type === "file").length,
            folders: entries.filter((entry) => entry.type === "folder").length,
            memories: entries.filter((entry) => entry.path.startsWith("/Memories/") && entry.type === "file").length
        });
    });
}

function normalizeImportEntries(packageData) {
    if (!packageData || typeof packageData !== "object") {
        throw new Error("Import file is not a valid DDCGPT OS export.");
    }

    const rawEntries = Array.isArray(packageData.entries)
        ? packageData.entries
        : Array.isArray(packageData.files)
            ? packageData.files
            : null;

    if (!rawEntries) {
        throw new Error("Import file does not include file system entries.");
    }

    const entries = rawEntries.map((entry) => normalizeEntry(entry));
    const seen = new Set();

    entries.forEach((entry) => {
        if (!entry.path || entry.path === "/") {
            throw new Error("Import contains an invalid path.");
        }
        if (seen.has(entry.path)) {
            throw new Error(`Import contains a duplicate path: ${entry.path}`);
        }
        seen.add(entry.path);
    });

    return entries;
}

export async function deleteFile(path) {
    return deletePath(path);
}

export async function deletePath(path) {
    const isFolder = path.endsWith("/");
    const target = isFolder ? normalizeFolderPath(path) : normalizeFilePath(path);

    return new Promise(async (resolve, reject) => {
        const { tx, store } = await getStore("readwrite");
        const request = store.openCursor();

        request.onsuccess = function(e) {
            const cursor = e.target.result;
            if (!cursor) return;

            const entryPath = cursor.key;
            if (entryPath === target || (isFolder && entryPath.startsWith(target))) {
                cursor.delete();
            }
            cursor.continue();
        };

        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

export async function renamePath(path, newName) {
    const safeName = String(newName || "").trim().replace(/^\/+|\/+$/g, "");
    if (!safeName || safeName.includes("/")) {
        throw new Error("Use a simple name without slashes.");
    }

    const isFolder = path.endsWith("/");
    const oldPath = isFolder ? normalizeFolderPath(path) : normalizeFilePath(path);
    const newPath = getChildPath(getParent(oldPath), safeName, isFolder ? "folder" : "file");

    return new Promise(async (resolve, reject) => {
        const { tx, store } = await getStore("readwrite");
        const entries = [];
        const request = store.openCursor();

        request.onsuccess = function(e) {
            const cursor = e.target.result;
            if (!cursor) return;

            const entry = normalizeEntry(cursor.value);
            if (entry.path === oldPath || (isFolder && entry.path.startsWith(oldPath))) {
                entries.push(entry);
            }
            cursor.continue();
        };

        request.onerror = () => reject(request.error);

        tx.oncomplete = async () => {
            if (!entries.length) {
                resolve(null);
                return;
            }

            const { tx: writeTx, store: writeStore } = await getStore("readwrite");
            entries.forEach((entry) => {
                const movedPath = entry.path === oldPath
                    ? newPath
                    : `${newPath}${entry.path.slice(oldPath.length)}`;
                writeStore.delete(entry.path);
                writeStore.put({
                    ...entry,
                    path: movedPath,
                    name: getName(movedPath)
                });
            });
            writeTx.oncomplete = () => resolve(newPath);
            writeTx.onerror = () => reject(writeTx.error);
        };
    });
}
