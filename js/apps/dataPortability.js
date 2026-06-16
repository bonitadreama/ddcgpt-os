import {
    exportFileSystem,
    importFileSystem
} from "../filesystem.js?v=portable-2";

export function attachDataPortability(win, options = {}) {
    const exportButton = win.querySelector(options.exportSelector || "[data-export-state]");
    const importButton = win.querySelector(options.importSelector || "[data-import-state]");
    const importInput = win.querySelector(options.inputSelector || "[data-import-state-input]");
    const setStatus = typeof options.setStatus === "function" ? options.setStatus : () => {};
    const onImported = typeof options.onImported === "function" ? options.onImported : () => {};

    if (exportButton) {
        exportButton.onclick = async () => {
            try {
                const packageData = await exportFileSystem();
                downloadExport(packageData);
                setStatus(`Exported ${packageData.counts.files} files, ${packageData.counts.folders} folders, and ${packageData.counts.memories} memories.`);
            } catch (error) {
                console.error(error);
                setStatus("Export failed.");
            }
        };
    }

    if (importButton && importInput) {
        importButton.onclick = () => importInput.click();
        importInput.onchange = async () => {
            const file = importInput.files?.[0];
            importInput.value = "";
            if (!file) return;

            try {
                const packageData = JSON.parse(await file.text());
                const label = getImportLabel(packageData);
                const confirmed = confirm(`Import ${label}? This will replace the current local Files and Memories data in this browser.`);
                if (!confirmed) {
                    setStatus("Import cancelled.");
                    return;
                }

                const result = await importFileSystem(packageData, { replace: true });
                setStatus(`Imported ${result.files} files, ${result.folders} folders, and ${result.memories} memories.`);
                await onImported(result);
            } catch (error) {
                console.error(error);
                setStatus(error.message || "Import failed.");
            }
        };
    }
}

function downloadExport(packageData) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const blob = new Blob([JSON.stringify(packageData, null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ddcgpt-os-export-${stamp}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

function getImportLabel(packageData) {
    const counts = packageData?.counts || {};
    const entries = Array.isArray(packageData?.entries) ? packageData.entries : [];
    const files = counts.files ?? entries.filter((entry) => entry.type !== "folder").length;
    const folders = counts.folders ?? entries.filter((entry) => entry.type === "folder").length;
    const memories = counts.memories ?? entries.filter((entry) => String(entry.path || "").startsWith("/Memories/")).length;
    return `${files} files, ${folders} folders, and ${memories} memories`;
}
