import { createFolder, saveFile } from "./filesystem.js?v=files-crud-3";

export function initDesktop() {
    const desktop = document.getElementById("desktop");
    const ctx = document.getElementById("context-menu");

    // Prevent the default browser right-click menu
    desktop.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        ctx.style.display = "flex";
        ctx.style.left = `${e.clientX}px`;
        ctx.style.top  = `${e.clientY}px`;
    });

    // Hide context menu on click elsewhere
    document.addEventListener("click", () => {
        ctx.style.display = "none";
    });

    // Context menu actions
    document.getElementById("ctx-new-file").onclick = async () => {
        const name = prompt("New file name?");
        if (name) {
            await saveFile(`/${name}`, "Empty file");
            alert("File created.");
        }
    };

    document.getElementById("ctx-new-folder").onclick = async () => {
        const name = prompt("New folder name?");
        if (name) {
            await createFolder(`/${name}`);
            alert("Folder created.");
        }
    };

    document.getElementById("ctx-refresh").onclick = () => {
        location.reload();
    };

    // Desktop icon bar removed; dock holds app shortcuts now.
}

