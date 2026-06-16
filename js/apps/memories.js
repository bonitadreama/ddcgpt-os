import {
    createFolder,
    deletePath,
    listDirectory,
    readFile,
    saveFile
} from "../filesystem.js?v=portable-2";
import { attachDataPortability } from "./dataPortability.js?v=portable-2";

const MEMORY_ROOT = "/Memories/";

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function slugify(value) {
    const slug = String(value || "memory")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 44);
    return slug || "memory";
}

function formatDate(value) {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}

function safeParseMemory(path, content) {
    try {
        const parsed = JSON.parse(content || "{}");
        return {
            path,
            id: parsed.id || path,
            title: parsed.title || "Untitled memory",
            body: parsed.body || "",
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            source: parsed.source || "",
            createdAt: parsed.createdAt || parsed.updatedAt || new Date().toISOString(),
            updatedAt: parsed.updatedAt || parsed.createdAt || new Date().toISOString()
        };
    } catch {
        return {
            path,
            id: path,
            title: path.split("/").pop()?.replace(/\.memory\.json$/, "") || "Recovered memory",
            body: content || "",
            tags: ["imported"],
            source: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
}

function serializeMemory(memory) {
    return JSON.stringify(memory, null, 2);
}

function makeMemoryPath(title) {
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    return `${MEMORY_ROOT}${stamp}-${slugify(title)}.memory.json`;
}

export function getMemoriesAppHTML() {
    return `
        <div class="memories-app">
            <div class="memories-sidebar">
                <div class="memories-search-row">
                    <input id="memory-search" type="search" placeholder="Search memories" autocomplete="off" />
                    <button id="memory-new" title="New memory" aria-label="New memory">+</button>
                </div>
                <div class="memory-filters" aria-label="Memory filters">
                    <button class="memory-filter is-active" data-filter="all">All</button>
                    <button class="memory-filter" data-filter="tagged">Tagged</button>
                    <button class="memory-filter" data-filter="recent">Recent</button>
                </div>
                <div id="memory-list" class="memory-list">Loading memories...</div>
            </div>
            <div class="memory-editor">
                <div class="memory-editor-header">
                    <div>
                        <div class="memory-editor-label">Working memory</div>
                        <div id="memory-current-path" class="memory-path">/Memories/</div>
                    </div>
                    <button id="memory-delete" class="memory-danger" disabled>Delete</button>
                </div>
                <input id="memory-title" class="memory-title-input" type="text" placeholder="Memory title" />
                <textarea id="memory-body" class="memory-body-input" placeholder="Capture the note, decision, context, or thing the agent should remember."></textarea>
                <div class="memory-meta-grid">
                    <label>
                        Tags
                        <input id="memory-tags" type="text" placeholder="project, person, decision" />
                    </label>
                    <label>
                        Source
                        <input id="memory-source" type="text" placeholder="chat, file, meeting, idea" />
                    </label>
                </div>
                <div class="memory-footer">
                    <div id="memory-status" class="memory-status">Ready.</div>
                    <div class="memory-actions">
                        <button data-export-state>Export</button>
                        <button data-import-state>Import</button>
                        <button id="memory-save">Save memory</button>
                    </div>
                    <input data-import-state-input class="state-import-input" type="file" accept="application/json,.json" />
                </div>
            </div>
        </div>
    `;
}

export function initMemoriesApp(win) {
    win.classList.add("memories-window");
    const windowWidth = Math.min(680, window.innerWidth - 48);
    win.style.width = `${windowWidth}px`;
    const centeredLeft = Math.max(16, Math.round((window.innerWidth - windowWidth) / 2));
    win.style.left = `${Math.min(centeredLeft, 120)}px`;
    win.style.top = `${Math.max(56, Math.round((window.innerHeight - 560) / 2))}px`;

    const list = win.querySelector("#memory-list");
    const search = win.querySelector("#memory-search");
    const newButton = win.querySelector("#memory-new");
    const deleteButton = win.querySelector("#memory-delete");
    const saveButton = win.querySelector("#memory-save");
    const titleInput = win.querySelector("#memory-title");
    const bodyInput = win.querySelector("#memory-body");
    const tagsInput = win.querySelector("#memory-tags");
    const sourceInput = win.querySelector("#memory-source");
    const status = win.querySelector("#memory-status");
    const pathLabel = win.querySelector("#memory-current-path");
    const filters = Array.from(win.querySelectorAll(".memory-filter"));

    let memories = [];
    let selectedPath = null;
    let activeFilter = "all";

    function setStatus(message) {
        status.textContent = message;
    }

    function getDraftMemory() {
        const now = new Date().toISOString();
        const existing = memories.find((memory) => memory.path === selectedPath);
        const title = titleInput.value.trim() || "Untitled memory";
        return {
            id: existing?.id || crypto.randomUUID(),
            path: selectedPath || makeMemoryPath(title),
            title,
            body: bodyInput.value.trim(),
            tags: tagsInput.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            source: sourceInput.value.trim(),
            createdAt: existing?.createdAt || now,
            updatedAt: now
        };
    }

    function selectMemory(memory) {
        selectedPath = memory?.path || null;
        titleInput.value = memory?.title || "";
        bodyInput.value = memory?.body || "";
        tagsInput.value = memory?.tags?.join(", ") || "";
        sourceInput.value = memory?.source || "";
        pathLabel.textContent = selectedPath || "/Memories/new";
        deleteButton.disabled = !selectedPath;
        win.querySelectorAll(".memory-item").forEach((item) => {
            item.classList.toggle("is-selected", item.dataset.path === selectedPath);
        });
    }

    function getFilteredMemories() {
        const q = search.value.trim().toLowerCase();
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        return memories.filter((memory) => {
            if (activeFilter === "tagged" && !memory.tags.length) return false;
            if (activeFilter === "recent" && new Date(memory.updatedAt).getTime() < oneWeekAgo) return false;
            if (!q) return true;

            const haystack = [
                memory.title,
                memory.body,
                memory.source,
                memory.tags.join(" ")
            ].join(" ").toLowerCase();
            return haystack.includes(q);
        });
    }

    function renderList() {
        const filtered = getFilteredMemories();
        if (!filtered.length) {
            list.innerHTML = `<div class="memory-empty">No matching memories.</div>`;
            return;
        }

        list.innerHTML = filtered.map((memory) => {
            const tags = memory.tags.slice(0, 3).map((tag) => `<span>${escapeHTML(tag)}</span>`).join("");
            const excerpt = memory.body || "No note body yet.";
            return `
                <button class="memory-item ${memory.path === selectedPath ? "is-selected" : ""}" data-path="${escapeHTML(memory.path)}">
                    <span class="memory-item-title">${escapeHTML(memory.title)}</span>
                    <span class="memory-item-excerpt">${escapeHTML(excerpt)}</span>
                    <span class="memory-item-meta">
                        <span>${escapeHTML(formatDate(memory.updatedAt))}</span>
                        <span>${escapeHTML(memory.source || "local")}</span>
                    </span>
                    <span class="memory-tags">${tags}</span>
                </button>
            `;
        }).join("");
    }

    async function loadMemories() {
        await createFolder(MEMORY_ROOT);
        const entries = await listDirectory(MEMORY_ROOT);
        const files = entries.filter((entry) => entry.type === "file");
        const loaded = await Promise.all(files.map(async (entry) => {
            const content = await readFile(entry.path);
            return safeParseMemory(entry.path, content);
        }));

        memories = loaded.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        renderList();

        if (selectedPath) {
            const selected = memories.find((memory) => memory.path === selectedPath);
            if (selected) selectMemory(selected);
        } else if (memories.length) {
            selectMemory(memories[0]);
        } else {
            selectMemory(null);
            setStatus("Create your first memory.");
        }
    }

    newButton.onclick = () => {
        selectedPath = null;
        selectMemory(null);
        titleInput.focus();
        setStatus("New memory draft.");
    };

    saveButton.onclick = async () => {
        const memory = getDraftMemory();
        await saveFile(memory.path, serializeMemory(memory));
        selectedPath = memory.path;
        setStatus(`Saved ${memory.title}.`);
        await loadMemories();
    };

    deleteButton.onclick = async () => {
        if (!selectedPath) return;
        const memory = memories.find((item) => item.path === selectedPath);
        const confirmed = confirm(`Delete "${memory?.title || "this memory"}"?`);
        if (!confirmed) return;

        await deletePath(selectedPath);
        selectedPath = null;
        setStatus("Memory deleted.");
        await loadMemories();
    };

    search.addEventListener("input", renderList);

    filters.forEach((button) => {
        button.onclick = () => {
            activeFilter = button.dataset.filter;
            filters.forEach((filter) => filter.classList.toggle("is-active", filter === button));
            renderList();
        };
    });

    list.addEventListener("click", (event) => {
        const item = event.target.closest(".memory-item");
        if (!item) return;
        const memory = memories.find((entry) => entry.path === item.dataset.path);
        if (memory) {
            selectMemory(memory);
            setStatus(`Opened ${memory.title}.`);
        }
    });

    loadMemories().catch((error) => {
        console.error(error);
        setStatus("Could not load memories.");
    });

    attachDataPortability(win, {
        setStatus,
        onImported: async () => {
            selectedPath = null;
            await loadMemories();
        }
    });
}
