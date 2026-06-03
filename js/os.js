// Main OS initialization file
// Add any global OS functionality here

function updateProfileName() {
    const profileNameElement = document.getElementById("profile-name");
    if (!profileNameElement) return;

    const savedName = localStorage.getItem("DDCGPT_PROFILE_NAME");
    profileNameElement.textContent = savedName?.trim() || "User";
}

// Update time display
function updateTime() {
    const timeElement = document.getElementById("time");
    if (timeElement) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeElement.textContent = `${hours}:${minutes}`;
    }
}

// Update time on load and every minute
updateProfileName();
updateTime();
setInterval(updateTime, 60000);
