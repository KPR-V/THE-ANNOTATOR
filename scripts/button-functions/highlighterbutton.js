export function highlighterbutton(){


    document.getElementById('highlighter').addEventListener('click', () => {
        let isActive = false

        if (typeof chrome !== 'undefined' && chrome.tabs) {

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            
             const tabid = tabs[0].id
             const url = tabs[0].url;
             const websiteHostName = new URL(url).hostname;
             if (isActive) {
                 chrome.tabs.sendMessage(tabid, { highlight: { from: "highlighter", action: "highlightoff", websiteHostName, tabid } });
                 isActive = false;
             } else {
                 chrome.tabs.sendMessage(tabid, { highlight: { from: "highlighter", action: "highlighton", websiteHostName, tabid } });
                 isActive = true;
             }

        });

        
        } else {
            console.log("Chrome API is not available.");
        }
    });



}