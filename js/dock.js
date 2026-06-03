import { createWindow } from './windowManager.js';
import { getAssistantAppHTML } from './apps/assistant.js';
import { getFilesAppHTML, initFilesApp } from "./apps/files.js";
import { initFileSystem } from "./filesystem.js";

// Initialize file system on load
initFileSystem();

// Click handlers for dock apps
document.getElementById("dock-assistant").onclick = () => {
    const win = createWindow("ChatGPT Assistant", getAssistantAppHTML());

    const input = win.querySelector("#assistant-input");
    const output = win.querySelector("#assistant-output");
    const sendBtn = win.querySelector("#assistant-send");

    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // User bubble
        output.innerHTML += `<p><strong>You:</strong> ${text}</p>`;

        // Temporary AI response (we will connect GPT later)
        setTimeout(() => {
            output.innerHTML += `<p><strong>ChatGPT:</strong> I heard you. (GPT output goes here)</p>`;
            output.scrollTop = output.scrollHeight;
        }, 150);

        input.value = "";
    }

    sendBtn.onclick = sendMessage;
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
};

document.getElementById("dock-files").onclick = () => {
    const win = createWindow("Files", getFilesAppHTML());
    initFilesApp(win);
};

document.getElementById("dock-search").onclick = () => {
    createWindow("Search", "<p>Search the OS or the web.</p>");
};

document.getElementById("dock-photos").onclick = () => {
    createWindow("Photos", "<p>Upload and edit photos using the OS editor.</p>");
};

document.getElementById("dock-browser").onclick = () => {
    createWindow("Browser", "<p>Embedded GPT-powered browser coming soon.</p>");
};

document.getElementById("dock-memories").onclick = () => {
    createWindow("Memories", "<p>Save personal OS memories here.</p>");
};

document.getElementById("dock-settings").onclick = () => {
    createWindow("Settings", "<p>Customize your OS, export your state, change wallpaper.</p>");
};
