chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.clear();
    console.log("Local storage cleared");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.from === "contentScript") {
        
        
        if (message.subject === "applyHighlight") {
            console.log("Apply highlight command received");
            chrome.storage.local.get("highlightedTexts", (data) => {
                let highlightedTexts = data.highlightedTexts || {};
                highlightedTexts[message.color] = highlightedTexts[message.color] || {};
                highlightedTexts[message.color][message.WebsiteHostName] = highlightedTexts[message.color][message.WebsiteHostName] || [];
                highlightedTexts[message.color][message.WebsiteHostName].push({
                    text: message.selectedText,
                    date: new Date().toISOString(),
                    id: message.id,
                    color: message.color
                });
                chrome.storage.local.set({ highlightedTexts }, () => {
                    sendResponse({ success: true });
                    console.log("Response sent and data stored");
                });
            });
            return true; 
        } 
        
        
        
        else if (message.subject === "removeHighlight") {
            console.log("Remove highlight command received");
            chrome.storage.local.get("highlightedTexts", (data) => {
                let highlightedTexts = data.highlightedTexts || {};
                if (highlightedTexts[message.color] && highlightedTexts[message.color][message.WebsiteHostName]) {
                    highlightedTexts[message.color][message.WebsiteHostName] = highlightedTexts[message.color][message.WebsiteHostName].filter(highlight => highlight.id !== message.id);
                    chrome.storage.local.set({ highlightedTexts }, () => {
                        sendResponse({ success: true });
                        console.log("Highlight removed and response sent");
                    });
                }
            });
            return true;
        } 
        
        
        
        else if (message.subject === "loadHighlights") {
            chrome.storage.local.get("highlightedTexts", (data) => {
                sendResponse(data.highlightedTexts || {});
                console.log("Highlights data sent");
            });
            return true;
        } 
        
        
        else if (message.subject === "savenote") {
            chrome.storage.local.get('notes', (data) => {
                let notes = data.notes || {};
                notes[message.host] = {
                    noteContent: message.noteContent,
                    notePosition: message.notePosition
                };
                chrome.storage.local.set({ notes }, () => {
                    sendResponse({ success: true });
                    console.log("Note saved");
                });
            });
            return true;
        }
    } 
    
    
    else if (message.action === 'deletenote') {
        console.log("Delete note command received");
        chrome.storage.local.get('notes', (data) => {
            let notes = data.notes || {};
            if (notes[message.host]) {
                delete notes[message.host];
                chrome.storage.local.set({ notes }, () => {
                    sendResponse({ success: true });
                    console.log("Note deleted and response sent");
                });
            }
        });
        return true;
    } 
    else if (message.from === "searchbar" && message.action === "search") {
        chrome.storage.local.get("highlightedTexts", (data) => {
            const { criteria, value } = message;
            const results = [];
            const highlightedTexts = data.highlightedTexts || {};
        
            for (const color in highlightedTexts) {
                for (const website in highlightedTexts[color]) {
                    highlightedTexts[color][website].forEach(item => {
                        if ((criteria === "color" && color === value) ||
                            (criteria === "keyword" && item.text.includes(value)) ||
                            (criteria === "date" && new Date(item.date).toDateString() === new Date(value).toDateString())) {
                            results.push({ color, text: item.text, id: item.id });
                        }
                    });
                }
            }
        
            chrome.tabs.sendMessage(sender.tab.id, { from: "searchbar", results });
        });
        }
        else if (message.from === "contentScript" && message.subject === "captureWebpage") {
            chrome.tabs.captureVisibleTab(null, {}, (dataUrl) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false });
                } else {
                    generatePDF(dataUrl, sendResponse);
                }
            })
            }
    else if (message.action === 'loadnote') {
        console.log("Load note command received");
        chrome.storage.local.get('notes', (data) => {
            const noteData = data.notes ? data.notes[message.host] : null;
            sendResponse(noteData);
            console.log("Note data sent");
        });
        return true;
    }
});

function generatePDF(capturedImage, sendResponse) {
    // var doc = new jsPDF();
    // doc.addImage(capturedImage, 'JPEG', 10, 10, 180, 120); 
    // doc.save('annotated_page.pdf');
    sendResponse({ success: true });
    console.log("PDF response sent");
}

function sendEmailWithAnnotations(data) {
    const email = "mailto:?subject=Annotated Page&body=" + encodeURIComponent(
        `Title: ${data.title}\n\nURL: ${data.url}\n\nAnnotations:\n${data.annotations.map(a => `Text: ${a.text}, Color: ${a.color}`).join('\n')}\n\nNotes:\n${data.notes.map(n => `Content: ${n.content}, Position: ${JSON.stringify(n.position)}`).join('\n')}`
    );
    chrome.tabs.create({ url: email });
}
