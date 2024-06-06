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
        handleContentScriptMessage(message, sendResponse);
    } else if (message.from === "searchbar" && message.action === "search") {
        handleSearchbarMessage(message, sender, sendResponse);
    }

    return true; // Indicates that sendResponse will be called asynchronously
});

function handleContentScriptMessage(message, sendResponse) {
    try {
        if (message.subject === "applyHighlight") {
            applyHighlight(message, sendResponse);
        } else if (message.subject === "removeHighlight") {
            removeHighlight(message, sendResponse);
        } else if (message.subject === "loadHighlights") {
            loadHighlights(sendResponse);
        } else if (message.subject === "savenote") {
            saveNote(message, sendResponse);
        } else if (message.subject === "loadNotes") {
            loadNotes(message, sendResponse);
        } else if (message.action === 'deletenote') {
            deleteNote(message, sendResponse);
        } else if (message.subject === "exportData") {
            exportData(message, sendResponse);
        } else if (message.subject === "captureWebpage") {
            captureWebpage(sendResponse);
        }
    } catch (error) {
        console.error('Error handling content script message:', error);
        if (sendResponse) sendResponse({ status: "error", message: error.message });
    }
}

function applyHighlight(message, sendResponse) {
    const { color, WebsiteHostName, selectedText, id, date } = message;
    if (!highlightedTexts[color]) {
        highlightedTexts[color] = {};
    }
    if (!highlightedTexts[color][WebsiteHostName]) {
        highlightedTexts[color][WebsiteHostName] = [];
    }
    highlightedTexts[color][WebsiteHostName].push({ text: selectedText, id, date });

    chrome.storage.local.set({ highlightedTexts }, () => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
            sendResponse({ status: "success", message: "Highlight saved" });
        }
    });
}

function removeHighlight(message, sendResponse) {
    const { color, WebsiteHostName, id } = message;
    if (highlightedTexts[color] && highlightedTexts[color][WebsiteHostName]) {
        highlightedTexts[color][WebsiteHostName] = highlightedTexts[color][WebsiteHostName].filter(h => h.id !== id);
        chrome.storage.local.set({ highlightedTexts }, () => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                sendResponse({ status: "error", message: chrome.runtime.lastError.message });
            } else {
                sendResponse({ status: "success", message: "Highlight removed" });
            }
        });
    }
}

function loadHighlights(sendResponse) {
    chrome.storage.local.get("highlightedTexts", (data) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
            highlightedTexts = data.highlightedTexts || {};
            sendResponse(highlightedTexts);
        }
    });
}

function saveNote(message, sendResponse) {
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
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
            sendResponse({ status: "success", message: "Note saved" });
        }
    });
}

function loadNotes(message, sendResponse) {
    const { host } = message;
    chrome.storage.local.get("notesData", (data) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
            notesData = data.notesData || {};
            sendResponse(notesData[host] || []);
        }
    });
}

function deleteNote(message, sendResponse) {
    const { host, noteId } = message;
    if (notesData[host]) {
        notesData[host] = notesData[host].filter(note => note.noteId !== noteId);
        chrome.storage.local.set({ notesData }, () => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                sendResponse({ status: "error", message: chrome.runtime.lastError.message });
            } else {
                sendResponse({ status: "success", message: "Note deleted" });
            }
        });
    }
}

function exportData(message, sendResponse) {
    const { host, url, title } = message;
    chrome.storage.local.get(["highlightedTexts", "notesData"], (data) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
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
        }
    });
}


let lastCaptureTime = 0;
const CAPTURE_INTERVAL = 1000; // 1 second interval

function captureWebpage(sendResponse) {
    const now = Date.now();
    if (now - lastCaptureTime < CAPTURE_INTERVAL) {
        sendResponse({ success: false, message: "Capture calls are being throttled." });
        return;
    }

    lastCaptureTime = now;

    chrome.tabs.captureVisibleTab(null, {}, (dataUrl) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ success: false, message: chrome.runtime.lastError.message });
        } else {
            generatePDF(dataUrl, sendResponse);
        }
    });
}







function handleSearchbarMessage(message, sender, sendResponse) {
    chrome.storage.local.get("highlightedTexts", (data) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
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

            chrome.tabs.sendMessage(sender.tab.id, { from: "searchbar", results }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    sendResponse({ status: "error", message: chrome.runtime.lastError.message });
                } else {
                    sendResponse({ status: "success", message: "Search completed", results: response });
                }
            });
        }
    });
}
