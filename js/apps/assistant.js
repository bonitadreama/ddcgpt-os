export function getAssistantAppHTML() {
    return `
        <div class="assistant-container">
            <div class="assistant-output" id="assistant-output">
                <p><em>ChatGPT is online.</em></p>
            </div>

            <div class="assistant-input-area">
                <input id="assistant-input" type="text" placeholder="Ask me something..." />
                <button id="assistant-send">Send</button>
            </div>
        </div>
    `;
}
