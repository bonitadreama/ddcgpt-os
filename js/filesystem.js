// A simple virtual file system using IndexedDB

let db;

export function initFileSystem() {
    const request = indexedDB.open("DDCGPT_FS", 1);

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        const store = db.createObjectStore("files", { keyPath: "path" });
        store.transaction.oncomplete = () => {
            console.log("File system initialized");
        };
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("File system loaded");
    };
}

export function saveFile(path, content) {
    return new Promise((resolve) => {
        const tx = db.transaction("files", "readwrite");
        const store = tx.objectStore("files");
        store.put({ path, content });
        tx.oncomplete = resolve;
    });
}

export function readFile(path) {
    return new Promise((resolve) => {
        const tx = db.transaction("files", "readonly");
        const store = tx.objectStore("files");
        const req = store.get(path);

        req.onsuccess = () => resolve(req.result?.content || null);
    });
}

export function listDirectory(prefix = "/") {
    return new Promise((resolve) => {
        const tx = db.transaction("files", "readonly");
        const store = tx.objectStore("files");
        const results = [];

        store.openCursor().onsuccess = function(e) {
            const cursor = e.target.result;
            if (!cursor) return resolve(results);

            if (cursor.key.startsWith(prefix)) {
                results.push(cursor.key);
            }
            cursor.continue();
        };
    });
}

export function deleteFile(path) {
    return new Promise((resolve) => {
        const tx = db.transaction("files", "readwrite");
        const store = tx.objectStore("files");
        store.delete(path);
        tx.oncomplete = resolve;
    });
}
