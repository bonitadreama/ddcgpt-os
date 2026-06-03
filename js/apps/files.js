import { listDirectory, readFile, saveFile, deleteFile } from "../filesystem.js";

export function getFilesAppHTML() {
    return `
        <div class="files-app">
            <div class="files-toolbar">
                <button id="new-file">New File</button>
                <button id="new-folder">New Folder</button>
            </div>
            <div id="files-list">Loading...</div>
        </div>
    `;
}

export function initFilesApp(win) {
    const list = win.querySelector("#files-list");

    async function loadFiles() {
        const files = await listDirectory("/");
        list.innerHTML = files
            .map(f => `<div class="file-item" data-path="${f}">${f}</div>`)
            .join("");
    }

    loadFiles();

    // Create new file
    win.querySelector("#new-file").onclick = async () => {
        const name = prompt("File name?");
        if (!name) return;
        await saveFile(`/${name}`, "Empty new file");
        loadFiles();
    };

    // Clicking a file
    win.addEventListener("click", async (e) => {
        if (e.target.classList.contains("file-item")) {
            const filePath = e.target.dataset.path;
            const content = await readFile(filePath);
            alert(`FILE: ${filePath}\n\n${content}`);
        }
    });
}
