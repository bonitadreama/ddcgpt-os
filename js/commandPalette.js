let commands = [];
let activeIndex = 0;
let paletteRoot;
let searchInput;
let resultsList;

export function registerCommandPalette(commandList) {
    commands = commandList;
    ensurePalette();
    renderResults("");
}

export function openCommandPalette() {
    ensurePalette();
    paletteRoot.classList.add("is-open");
    paletteRoot.setAttribute("aria-hidden", "false");
    searchInput.value = "";
    activeIndex = 0;
    renderResults("");
    searchInput.focus();
}

export function closeCommandPalette() {
    if (!paletteRoot) return;
    paletteRoot.classList.remove("is-open");
    paletteRoot.setAttribute("aria-hidden", "true");
}

function ensurePalette() {
    if (paletteRoot) return;

    paletteRoot = document.createElement("div");
    paletteRoot.id = "command-palette";
    paletteRoot.setAttribute("aria-hidden", "true");
    paletteRoot.innerHTML = `
        <div class="command-palette-backdrop"></div>
        <section class="command-palette-panel" role="dialog" aria-label="Command palette">
            <div class="command-palette-search">
                <input id="command-palette-input" type="text" autocomplete="off" placeholder="Search apps and actions" />
            </div>
            <div id="command-palette-results" class="command-palette-results"></div>
        </section>
    `;

    document.body.appendChild(paletteRoot);
    searchInput = paletteRoot.querySelector("#command-palette-input");
    resultsList = paletteRoot.querySelector("#command-palette-results");

    paletteRoot.querySelector(".command-palette-backdrop").addEventListener("click", closeCommandPalette);
    searchInput.addEventListener("input", () => {
        activeIndex = 0;
        renderResults(searchInput.value);
    });

    searchInput.addEventListener("keydown", (event) => {
        const matches = getMatches(searchInput.value);

        if (event.key === "Escape") {
            event.preventDefault();
            closeCommandPalette();
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            activeIndex = Math.min(activeIndex + 1, matches.length - 1);
            renderResults(searchInput.value);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            renderResults(searchInput.value);
            return;
        }

        if (event.key === "Enter" && matches[activeIndex]) {
            event.preventDefault();
            runCommand(matches[activeIndex]);
        }
    });

    document.addEventListener("keydown", (event) => {
        const isMacCombo = event.metaKey && event.key.toLowerCase() === "k";
        const isWindowsCombo = event.ctrlKey && event.key.toLowerCase() === "k";

        if (isMacCombo || isWindowsCombo) {
            event.preventDefault();
            openCommandPalette();
        }
    });
}

function renderResults(query) {
    const matches = getMatches(query);

    if (!matches.length) {
        resultsList.innerHTML = `<div class="command-empty">No matching commands</div>`;
        return;
    }

    resultsList.innerHTML = matches.map((command, index) => `
        <button class="command-result ${index === activeIndex ? "is-active" : ""}" type="button" data-command-id="${command.id}">
            <span class="command-result-icon">${command.icon}</span>
            <span class="command-result-text">
                <strong>${command.title}</strong>
                <span>${command.description}</span>
            </span>
        </button>
    `).join("");

    resultsList.querySelectorAll(".command-result").forEach((button) => {
        button.addEventListener("click", () => {
            const command = commands.find((item) => item.id === button.dataset.commandId);
            if (command) runCommand(command);
        });
    });
}

function getMatches(query) {
    const normalizedQuery = query.trim().toLowerCase();
    const ranked = commands.filter((command) => {
        const haystack = `${command.title} ${command.description} ${command.keywords || ""}`.toLowerCase();
        return !normalizedQuery || haystack.includes(normalizedQuery);
    });

    return ranked.slice(0, 10);
}

function runCommand(command) {
    closeCommandPalette();
    command.action();
}
