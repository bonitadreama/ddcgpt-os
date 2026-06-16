import { listDirectory } from "../filesystem.js?v=files-crud-3";

export function getTerminalAppHTML() {
    return `
        <div class="terminal-app">
            <div class="terminal-output" data-terminal-output></div>
            <form class="terminal-input-row" data-terminal-form>
                <span class="terminal-prompt">ddcgpt$</span>
                <input class="terminal-input" data-terminal-input autocomplete="off" spellcheck="false" />
            </form>
        </div>
    `;
}

export function initTerminalApp(win, actions = {}) {
    const output = win.querySelector("[data-terminal-output]");
    const form = win.querySelector("[data-terminal-form]");
    const input = win.querySelector("[data-terminal-input]");
    const history = [];
    let historyIndex = 0;

    appendSystemLine(output, "DDCGPT terminal ready.");
    appendSystemLine(output, "Type help to see available commands.");
    input.focus();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const command = input.value.trim();
        if (!command) return;

        history.push(command);
        historyIndex = history.length;
        appendCommandLine(output, command);
        input.value = "";
        await runCommand(command, output, actions);
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            historyIndex = Math.max(0, historyIndex - 1);
            input.value = history[historyIndex] || "";
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            historyIndex = Math.min(history.length, historyIndex + 1);
            input.value = history[historyIndex] || "";
        }
    });
}

async function runCommand(rawCommand, output, actions) {
    const [command, ...args] = rawCommand.split(/\s+/);
    const rest = args.join(" ");

    switch (command.toLowerCase()) {
        case "help":
            appendLines(output, [
                "help        show available commands",
                "about       describe this prototype",
                "apps        list launchable apps",
                "ls          list root files and folders",
                "open NAME   open files, changelog, memories, assistant, settings, browser, or photos",
                "whoami      show local profile name",
                "date        show current date and time",
                "echo TEXT   print text",
                "clear       clear terminal output"
            ]);
            break;
        case "about":
            appendSystemLine(output, "DDCGPT OS is a local-first browser OS prototype, currently in public WIP mode.");
            break;
        case "apps":
            appendSystemLine(output, "assistant, files, changelog, memories, settings, browser, photos");
            break;
        case "ls":
            await listRootDirectory(output);
            break;
        case "open":
            openApp(rest.toLowerCase(), output, actions);
            break;
        case "whoami":
            appendSystemLine(output, localStorage.getItem("DDCGPT_PROFILE_NAME") || "User");
            break;
        case "date":
            appendSystemLine(output, new Date().toLocaleString());
            break;
        case "echo":
            appendSystemLine(output, rest || "");
            break;
        case "clear":
            output.innerHTML = "";
            break;
        default:
            appendSystemLine(output, `Unknown command: ${escapeHTML(command)}. Try help.`);
    }
}

async function listRootDirectory(output) {
    const entries = await listDirectory("/");
    if (!entries.length) {
        appendSystemLine(output, "/ is empty");
        return;
    }

    appendLines(output, entries.map((entry) => {
        const marker = entry.type === "folder" ? "/" : "";
        return `${entry.name}${marker}`;
    }));
}

function openApp(name, output, actions) {
    const launchers = {
        assistant: actions.openAssistantApp,
        files: actions.openFilesApp,
        changelog: actions.openChangelogApp,
        memories: actions.openMemoriesApp,
        settings: actions.openSettingsApp,
        browser: actions.openBrowserApp,
        photos: actions.openPhotosApp
    };

    const launcher = launchers[name];
    if (!launcher) {
        appendSystemLine(output, "Usage: open files");
        return;
    }

    appendSystemLine(output, `Opening ${name}...`);
    launcher();
}

function appendCommandLine(output, command) {
    appendLine(output, `<span class="terminal-prompt">ddcgpt$</span> ${escapeHTML(command)}`);
}

function appendSystemLine(output, text) {
    appendLine(output, escapeHTML(text));
}

function appendLines(output, lines) {
    lines.forEach((line) => appendSystemLine(output, line));
}

function appendLine(output, html) {
    const line = document.createElement("div");
    line.className = "terminal-line";
    line.innerHTML = html;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
