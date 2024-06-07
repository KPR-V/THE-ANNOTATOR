export function highlighterbutton() {
    document.getElementById('highlighter').addEventListener('click', () => {
        let isActive = false;

        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tabId = tabs[0].id;
                const url = tabs[0].url;
                const websiteHostName = new URL(url).hostname;

                chrome.storage.local.get('colorinfo', (data) => {
                    const colorinfo = data.colorinfo || {};
                    const color = colorinfo[websiteHostName]?.color || '#ffff00'; // Default color

                    if (isActive) {
                        chrome.tabs.sendMessage(tabId, { highlight: { from: "highlighter", action: "highlightoff", websiteHostName, tabId, color } });
                        isActive = false;
                    } else {
                        chrome.tabs.sendMessage(tabId, { highlight: { from: "highlighter", action: "highlighton", websiteHostName, tabId, color } });
                        isActive = true;
                    }
                });
            });
        } else {
            console.log("Chrome API is not available.");
        }
    });
}
