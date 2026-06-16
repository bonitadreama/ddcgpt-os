import { createWindow } from './windowManager.js?v=window-mobile-2';
import { getAssistantAppHTML } from './apps/assistant.js';
import { getFilesAppHTML, initFilesApp } from "./apps/files.js?v=portable-2";
import { getMemoriesAppHTML, initMemoriesApp } from "./apps/memories.js?v=portable-2";
import { getTerminalAppHTML, initTerminalApp } from "./apps/terminal.js?v=terminal-1";
import { getChangelogAppHTML } from "./apps/changelog.js?v=changelog-1";
import { createFolder, initFileSystem, saveFile } from "./filesystem.js?v=portable-2";
import { openCommandPalette, registerCommandPalette } from "./commandPalette.js?v=changelog-1";

// Initialize file system on load
initFileSystem();

function openAssistantApp() {
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
}

function openFilesApp() {
    const win = createWindow("Files", getFilesAppHTML());
    initFilesApp(win);
}

function openSearchApp() {
    createWindow("Search", "<p>Search the OS or the web.</p>");
}

function openPhotosApp() {
    createWindow("Photos", "<p>Upload and edit photos using the OS editor.</p>");
}

function openBrowserApp() {
    createWindow("Browser", "<p>Embedded GPT-powered browser coming soon.</p>");
}

function openMemoriesApp() {
    const win = createWindow("Memories", getMemoriesAppHTML());
    initMemoriesApp(win);
}

function openTerminalApp() {
    const win = createWindow("Terminal", getTerminalAppHTML());
    initTerminalApp(win, {
        openAssistantApp,
        openFilesApp,
        openMemoriesApp,
        openChangelogApp,
        openSettingsApp,
        openBrowserApp,
        openPhotosApp
    });
}

function openChangelogApp() {
    createWindow("Changelog", getChangelogAppHTML());
}

function openSettingsApp() {
    createWindow("Settings", "<p>Open Files or Memories to export and import your local data.</p>");
}

async function createQuickFile() {
    const name = prompt("New file name?");
    if (!name) return;

    await saveFile(`/${name}`, "");
    openFilesApp();
}

async function createQuickFolder() {
    const name = prompt("New folder name?");
    if (!name) return;

    await createFolder(`/${name}`);
    openFilesApp();
}

function clearOpenWindows() {
    document.querySelectorAll(".window").forEach((win) => win.remove());
}

function updateProfileName() {
    const currentName = localStorage.getItem("DDCGPT_PROFILE_NAME") || "";
    const name = prompt("Profile name?", currentName);
    if (name === null) return;

    const trimmedName = name.trim();
    if (trimmedName) {
        localStorage.setItem("DDCGPT_PROFILE_NAME", trimmedName);
    } else {
        localStorage.removeItem("DDCGPT_PROFILE_NAME");
    }

    const profileNameElement = document.getElementById("profile-name");
    if (profileNameElement) {
        profileNameElement.textContent = trimmedName || "User";
    }
}

registerCommandPalette([
    {
        id: "open-assistant",
        title: "Open Assistant",
        description: "Start a ChatGPT Assistant window.",
        icon: "A",
        keywords: "chat gpt helper",
        action: openAssistantApp
    },
    {
        id: "open-changelog",
        title: "Open Changelog",
        description: "See what changed and what is next.",
        icon: "L",
        keywords: "build log updates wip roadmap now next later",
        action: openChangelogApp
    },
    {
        id: "open-terminal",
        title: "Open Terminal",
        description: "Run local DDCGPT OS commands.",
        icon: "T",
        keywords: "shell command console cli",
        action: openTerminalApp
    },
    {
        id: "open-files",
        title: "Open Files",
        description: "Browse local IndexedDB files and folders.",
        icon: "F",
        keywords: "documents folders storage",
        action: openFilesApp
    },
    {
        id: "new-file",
        title: "New File",
        description: "Create a file at the desktop root.",
        icon: "+",
        keywords: "note text document",
        action: createQuickFile
    },
    {
        id: "new-folder",
        title: "New Folder",
        description: "Create a folder at the desktop root.",
        icon: "/",
        keywords: "directory project",
        action: createQuickFolder
    },
    {
        id: "open-memories",
        title: "Open Memories",
        description: "Review saved memory notes.",
        icon: "M",
        keywords: "memory notes context",
        action: openMemoriesApp
    },
    {
        id: "set-profile-name",
        title: "Set Profile Name",
        description: "Change the local top bar name.",
        icon: "U",
        keywords: "user identity settings",
        action: updateProfileName
    },
    {
        id: "clear-windows",
        title: "Clear Windows",
        description: "Close every open desktop window.",
        icon: "X",
        keywords: "close clean desktop",
        action: clearOpenWindows
    },
    {
        id: "refresh-os",
        title: "Refresh OS",
        description: "Reload the current DDCGPT OS session.",
        icon: "R",
        keywords: "restart reload",
        action: () => location.reload()
    }
]);

// Click handlers for dock apps
document.getElementById("dock-assistant").onclick = openAssistantApp;
document.getElementById("dock-files").onclick = openFilesApp;
document.getElementById("dock-search").onclick = openCommandPalette;
document.getElementById("dock-photos").onclick = openPhotosApp;
document.getElementById("dock-browser").onclick = openBrowserApp;
document.getElementById("dock-memories").onclick = openMemoriesApp;
document.getElementById("dock-settings").onclick = openSettingsApp;

const startupApp = location.hash.replace("#", "").toLowerCase();
if (startupApp === "terminal") {
    openTerminalApp();
}
if (startupApp === "changelog") {
    openChangelogApp();
}
