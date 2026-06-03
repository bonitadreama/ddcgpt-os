let zIndexCounter = 10;

export function createWindow(title, contentHTML) {
    const win = document.createElement("div");
    win.className = "window";
    win.style.left = "200px";
    win.style.top = "120px";
    win.style.zIndex = zIndexCounter++;

    win.innerHTML = `
        <div class="window-header">
            <div class="window-title">${title}</div>
            <div class="window-buttons">
                <div class="win-btn win-close"></div>
            </div>
        </div>
        <div class="window-content">${contentHTML}</div>
    `;

    document.getElementById("window-layer").appendChild(win);

    // bring to front on click
    win.addEventListener("mousedown", () => {
        win.style.zIndex = zIndexCounter++;
    });

    // dragging
    const header = win.querySelector(".window-header");
    let offsetX, offsetY, isDragging = false;

    header.addEventListener("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - win.offsetLeft;
        offsetY = e.clientY - win.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        win.style.left = `${e.clientX - offsetX}px`;
        win.style.top  = `${e.clientY - offsetY}px`;
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
    });

    // close button
    win.querySelector(".win-close").addEventListener("click", () => {
        win.remove();
    });

    return win;
}
