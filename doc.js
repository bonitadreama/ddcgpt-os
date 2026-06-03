import { createWindow } from './windowManager.js';

// Click handlers for dock apps
document.getElementById("dock-assistant").onclick = () => {
    createWindow("ChatGPT Assistant", "<p>Hello. What can I help you build?</p>");
};

document.getElementById("dock-search").onclick = () => {
    createWindow("Search", "<p>Search the OS or the web.</p>");
};

document.getElementById("dock-files").onclick = () => {
    createWindow("Files", "<p>Your file system will appear here.</p>");
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
// JavaScript Document
