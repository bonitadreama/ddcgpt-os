import { createWindow } from "./windowManager.js";
import { getFilesAppHTML, initFilesApp } from "./apps/files.js";
import { saveFile } from "./filesystem.js";

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

    document.getElementById("ctx-new-folder").onclick = () => {
        alert("Folders coming soon!"); // You can expand this later
    };

    document.getElementById("ctx-refresh").onclick = () => {
        location.reload();
    };

    // Desktop icon bar removed; dock holds app shortcuts now.
}

