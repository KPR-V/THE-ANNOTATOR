export function saveaspdf(){

    document.getElementById('save').addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                chrome.tabs.sendMessage(activeTab.id, { from: "contentScript", action: "captureWebpage" }, (response) => {
                    if (response && response.success) {
                        console.log('Page saved successfully.');
                    } else {
                        console.log('Failed to save the page.');
                    }
                });
            });
        } else {
            console.log("Chrome API is not available.");
        }
    });




}