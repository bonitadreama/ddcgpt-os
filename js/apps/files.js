import {
    createFolder,
    deletePath,
    listDirectory,
    readFile,
    renamePath,
    saveFile
} from "../filesystem.js?v=portable-2";
import { attachDataPortability } from "./dataPortability.js?v=portable-2";

export function getFilesAppHTML() {
    return `
        <div class="files-app">
            <div class="files-toolbar">
                <input id="item-name" type="text" placeholder="Name" />
                <button id="new-file">New File</button>
                <button id="new-folder">New Folder</button>
                <button id="folder-up" title="Go up one folder">Up</button>
                <button data-export-state>Export</button>
                <button data-import-state>Import</button>
                <input data-import-state-input class="state-import-input" type="file" accept="application/json,.json" />
            </div>
            <div class="files-status" id="files-status"></div>
            <div class="files-path" id="files-path">/</div>
            <div class="files-body">
                <div id="files-list">Loading...</div>
                <div class="file-preview">
                    <div class="file-preview-title" id="file-preview-title">Select a file</div>
                    <textarea id="file-editor" placeholder="File contents"></textarea>
                    <button id="save-file" disabled>Save</button>
                </div>
            </div>
        </div>
    `;
}

export function initFilesApp(win) {
    win.classList.add("files-window");
    const windowWidth = Math.min(660, window.innerWidth - 48);
    win.style.width = `${windowWidth}px`;
    win.style.left = `${Math.max(16, Math.round((window.innerWidth - windowWidth) / 2))}px`;

    const list = win.querySelector("#files-list");
    const pathLabel = win.querySelector("#files-path");
    const editor = win.querySelector("#file-editor");
    const previewTitle = win.querySelector("#file-preview-title");
    const saveButton = win.querySelector("#save-file");
    const upButton = win.querySelector("#folder-up");
    const nameInput = win.querySelector("#item-name");
    const status = win.querySelector("#files-status");
    let currentPath = "/";
    let selectedFile = null;

    function joinPath(parent, name, type = "file") {
        const base = parent === "/" ? "/" : parent;
        const child = `${base}${name}`;
        return type === "folder" ? `${child.replace(/\/$/, "")}/` : child;
    }

    function parentPath(path) {
        if (path === "/") return "/";
        const trimmed = path.replace(/\/$/, "");
        const slash = trimmed.lastIndexOf("/");
        return slash <= 0 ? "/" : `${trimmed.slice(0, slash)}/`;
    }

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function setSelectedFile(path, content = "") {
        selectedFile = path;
        previewTitle.textContent = path ? path : "Select a file";
        editor.value = content;
        editor.disabled = !path;
        saveButton.disabled = !path;
    }

    function setStatus(message = "") {
        status.textContent = message;
    }

    function getTypedName() {
        const name = nameInput.value.trim();
        if (!name) {
            setStatus("Enter a name first.");
            nameInput.focus();
            return null;
        }
        if (name.includes("/")) {
            setStatus("Use a simple name without slashes.");
            nameInput.focus();
            return null;
        }
        return name;
    }

    async function loadFiles() {
        pathLabel.textContent = currentPath;
        upButton.disabled = currentPath === "/";

        const files = await listDirectory(currentPath);
        if (!files.length) {
            list.innerHTML = `<div class="files-empty">This folder is empty.</div>`;
            return;
        }

        list.innerHTML = files
            .map((item) => `
                <div class="file-item" data-path="${escapeHTML(item.path)}" data-type="${item.type}">
                    <button class="file-open" title="Open ${escapeHTML(item.name)}">
                        <span class="file-icon">${item.type === "folder" ? "Folder" : "File"}</span>
                        <span class="file-name">${escapeHTML(item.name)}</span>
                    </button>
                    <div class="file-actions">
                        <button class="file-rename">Rename</button>
                        <button class="file-delete">Delete</button>
                    </div>
                </div>
            `)
            .join("");
    }

    setSelectedFile(null);
    loadFiles();

    attachDataPortability(win, {
        setStatus,
        onImported: async () => {
            currentPath = "/";
            setSelectedFile(null);
            await loadFiles();
        }
    });

    win.querySelector("#new-file").onclick = async () => {
        const name = getTypedName();
        if (!name) return;
        await saveFile(joinPath(currentPath, name), "");
        nameInput.value = "";
        setStatus(`Created ${name}.`);
        loadFiles();
    };

    win.querySelector("#new-folder").onclick = async () => {
        const name = getTypedName();
        if (!name) return;
        await createFolder(joinPath(currentPath, name, "folder"));
        nameInput.value = "";
        setStatus(`Created ${name}.`);
        loadFiles();
    };

    upButton.onclick = () => {
        currentPath = parentPath(currentPath);
        setSelectedFile(null);
        loadFiles();
    };

    saveButton.onclick = async () => {
        if (!selectedFile) return;
        await saveFile(selectedFile, editor.value);
        setStatus(`Saved ${selectedFile}.`);
        loadFiles();
    };

    win.addEventListener("click", async (e) => {
        const item = e.target.closest(".file-item");
        if (!item) return;

        const filePath = item.dataset.path;
        const type = item.dataset.type;

        if (e.target.closest(".file-delete")) {
            await deletePath(filePath);
            if (selectedFile === filePath) setSelectedFile(null);
            setStatus(`Deleted ${filePath}.`);
            loadFiles();
            return;
        }

        if (e.target.closest(".file-rename")) {
            const currentName = item.querySelector(".file-name").textContent;
            item.classList.add("is-renaming");
            item.querySelector(".file-open").disabled = true;
            item.querySelector(".file-name").innerHTML = `
                <input class="rename-input" type="text" value="${escapeHTML(currentName)}" />
            `;
            item.querySelector(".file-actions").innerHTML = `
                <button class="file-rename-save">Save</button>
                <button class="file-rename-cancel">Cancel</button>
            `;
            item.querySelector(".rename-input").focus();
            return;
        }

        if (e.target.closest(".file-rename-cancel")) {
            loadFiles();
            return;
        }

        if (e.target.closest(".file-rename-save")) {
            const input = item.querySelector(".rename-input");
            const newName = input.value.trim();
            if (!newName || newName.includes("/")) {
                setStatus("Use a simple name without slashes.");
                input.focus();
                return;
            }
            await renamePath(filePath, newName);
            if (selectedFile === filePath) setSelectedFile(null);
            setStatus(`Renamed to ${newName}.`);
            loadFiles();
            return;
        }

        if (e.target.closest(".file-open")) {
            if (type === "folder") {
                currentPath = filePath;
                setSelectedFile(null);
                loadFiles();
                return;
            }

            const content = await readFile(filePath);
            setSelectedFile(filePath, content || "");
        }
    });
}
