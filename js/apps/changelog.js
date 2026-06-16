const recentUpdates = [
    {
        date: "2026-06-06",
        title: "Build log window",
        body: "Added a dedicated changelog surface so the public WIP has its own place to explain what is moving."
    },
    {
        date: "2026-06-05",
        title: "Tiny terminal",
        body: "Added local commands for help, app launch, root file listing, profile identity, date, echo, and clear."
    },
    {
        date: "2026-06-04",
        title: "Command palette",
        body: "Added Ctrl+K and Search-dock access for launching apps and quick actions from one focused surface."
    },
    {
        date: "2026-06-03",
        title: "Files became real",
        body: "Connected the dock to the IndexedDB Files app with create, edit, rename, delete, and folder handling."
    }
];

const lanes = [
    {
        label: "Now",
        title: "Make the prototype legible",
        body: "Keep the public WIP easy to understand: working apps, visible progress, and honest edges."
    },
    {
        label: "Next",
        title: "Connect useful flows",
        body: "Recent files, safer delete, lightweight settings, and more command-palette shortcuts."
    },
    {
        label: "Later",
        title: "Give the OS deeper memory",
        body: "Import/export state, richer notes, and assistant workflows that can work across the local surface."
    }
];

export function getChangelogAppHTML() {
    return `
        <div class="changelog-app">
            <header class="changelog-header">
                <div>
                    <p class="changelog-kicker">Public WIP</p>
                    <h2>Build log</h2>
                </div>
                <span class="changelog-live">Active</span>
            </header>

            <section class="changelog-lanes" aria-label="Build direction">
                ${lanes.map((lane) => `
                    <article class="changelog-lane">
                        <span>${lane.label}</span>
                        <strong>${lane.title}</strong>
                        <p>${lane.body}</p>
                    </article>
                `).join("")}
            </section>

            <section class="changelog-timeline" aria-label="Recent updates">
                <h3>Recent updates</h3>
                <ol>
                    ${recentUpdates.map((update) => `
                        <li>
                            <time>${update.date}</time>
                            <div>
                                <strong>${update.title}</strong>
                                <p>${update.body}</p>
                            </div>
                        </li>
                    `).join("")}
                </ol>
            </section>
        </div>
    `;
}
