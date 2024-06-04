export function sharebutton(){
    
    document.getElementById('share').addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                chrome.tabs.sendMessage(activeTab.id, { from: "contentScript", action: "shareWebpage" }, (response) => {
                    if (response && response.success) {
                        console.log('Page shared successfully.');
                    } else {
                        console.log('Failed to share the page.');
                    }
                });
            });
        } else {
            console.log("Chrome API is not available.");
        }
    });



}