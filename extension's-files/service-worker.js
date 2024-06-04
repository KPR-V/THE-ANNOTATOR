let highlightedTexts = {};
let notesData = {};

function generatePDF(capturedImage, sendResponse) {
    sendResponse({ success: true });
    console.log("PDF response sent");
}

function sendEmailWithAnnotations(data) {
    const email = "mailto:?subject=Annotated Page&body=" + encodeURIComponent(
        `Title: ${data.title}\n\nURL: ${data.url}\n\nAnnotations:\n${data.annotations.map(a => `Text: ${a.text}, Color: ${a.color}`).join('\n')}\n\nNotes:\n${data.notes.map(n => `Content: ${n.content}, Position: ${JSON.stringify(n.position)}`).join('\n')}`
    );
    chrome.tabs.create({ url: email });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.clear();
    chrome.storage.local.set({ highlightedTexts: {}, notesData: {} });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.from === "contentScript") {
        if (message.subject === "applyHighlight") {
            const { color, WebsiteHostName, selectedText, id, date } = message;
            if (!highlightedTexts[color]) {
                highlightedTexts[color] = {};
            }
            if (!highlightedTexts[color][WebsiteHostName]) {
                highlightedTexts[color][WebsiteHostName] = [];
            }
            highlightedTexts[color][WebsiteHostName].push({ text: selectedText, id, date });

            chrome.storage.local.set({ highlightedTexts }, () => {
                sendResponse({ status: "success", message: "Highlight saved" });
            });
        } else if (message.subject === "removeHighlight") {
            const { color, WebsiteHostName, id } = message;
            if (highlightedTexts[color] && highlightedTexts[color][WebsiteHostName]) {
                highlightedTexts[color][WebsiteHostName] = highlightedTexts[color][WebsiteHostName].filter(h => h.id !== id);
                chrome.storage.local.set({ highlightedTexts }, () => {
                    sendResponse({ status: "success", message: "Highlight removed" });
                });
            }
        } else if (message.subject === "loadHighlights") {
            chrome.storage.local.get("highlightedTexts", (data) => {
                highlightedTexts = data.highlightedTexts || {};
                sendResponse(highlightedTexts);
            });
        } else if (message.subject === "savenote") {
            const { host, noteId, noteContent, notePosition } = message;
            if (!notesData[host]) {
                notesData[host] = [];
            }
            const noteIndex = notesData[host].findIndex(note => note.noteId === noteId);
            if (noteIndex > -1) {
                notesData[host][noteIndex] = { noteId, noteContent, notePosition };
            } else {
                notesData[host].push({ noteId, noteContent, notePosition });
            }
            chrome.storage.local.set({ notesData }, () => {
                sendResponse({ status: "success", message: "Note saved" });
            });
        } else if (message.subject === "loadNotes") {
            const { host } = message;
            chrome.storage.local.get("notesData", (data) => {
                notesData = data.notesData || {};
                sendResponse(notesData[host] || []);
            });
        } else if (message.action === 'deletenote') {
            const { host, noteId } = message;
            if (notesData[host]) {
                notesData[host] = notesData[host].filter(note => note.noteId !== noteId);
                chrome.storage.local.set({ notesData }, () => {
                    sendResponse({ status: "success", message: "Note deleted" });
                });
            }
        } else if (message.subject === "exportData") {
            const { host, url, title } = message;
            chrome.storage.local.get(["highlightedTexts", "notesData"], (data) => {
                highlightedTexts = data.highlightedTexts || {};
                notesData = data.notesData || {};
                const response = {
                    ok: true,
                    data: {
                        annotations: [],
                        notes: []
                    }
                };
                for (let color in highlightedTexts) {
                    if (highlightedTexts[color][host]) {
                        highlightedTexts[color][host].forEach((annotation) => {
                            response.data.annotations.push({ ...annotation, color });
                        });
                    }
                }
                if (notesData[host]) {
                    response.data.notes = notesData[host];
                }
                sendResponse(response);
            });
        } else if (message.subject === "captureWebpage") {
            chrome.tabs.captureVisibleTab(null, {}, (dataUrl) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false });
                } else {
                    generatePDF(dataUrl, sendResponse);
                }
            });
        }
    } else if (message.from === "searchbar" && message.action === "search") {
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

    return true;
});
