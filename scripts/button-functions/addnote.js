export function addnote(){

    document.getElementById('notes').addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                chrome.tabs.sendMessage(activeTab.id, { from: "addnote", action: "createanote" });
            });
        } else {
            console.log("Chrome API is not available.");
        }
    });



}