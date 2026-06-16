let zIndexCounter = 10;

export function createWindow(title, contentHTML) {
    const win = document.createElement("div");
    win.className = "window";
    const viewportWidth = window.innerWidth;
    win.style.left = viewportWidth <= 560 ? "16px" : "200px";
    win.style.top = viewportWidth <= 560 ? "64px" : "120px";
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
        const maxLeft = Math.max(0, window.innerWidth - win.offsetWidth - 8);
        const maxTop = Math.max(40, window.innerHeight - header.offsetHeight - 8);
        const nextLeft = Math.min(Math.max(8, e.clientX - offsetX), maxLeft);
        const nextTop = Math.min(Math.max(48, e.clientY - offsetY), maxTop);
        win.style.left = `${nextLeft}px`;
        win.style.top  = `${nextTop}px`;
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
