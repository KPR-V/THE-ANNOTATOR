let highlightedTexts = {};
let notesData = {};

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
        } else if (message.subject === "shareWebpage") {
            exportData(message, sendResponse);
        } else if (message.subject === "shareWebpageAsPDF") {
            exportDataAsPDF(message, () => {
                openGmailWithPDF();
                sendResponse({ ok: true });
            });
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
            sendResponse(response, { ok: true });
        }
    });
    return true; // keep the message channel open to the sender until sendResponse is called
}

function exportDataAsPDF(message, sendResponse) {
    importScripts(chrome.runtime.getURL('imported file/jspdf.umd.min.js'));
    const { jsPDF } = window.jspdf;
    const { data } = message;
    const doc = new jsPDF();
    let y = 10;

    doc.text(`Title: ${data.title}`, 10, y);
    y += 10;
    doc.text(`URL: ${data.url}`, 10, y);
    y += 10;
    doc.text('Annotations:', 10, y);
    y += 10;

    data.annotations.forEach((annotation, index) => {
        doc.text(`${index + 1}. ${annotation.text} (Color: ${annotation.color})`, 10, y);
        y += 10;
    });

    y += 10;
    doc.text('Notes:', 10, y);
    y += 10;

    data.notes.forEach((note, index) => {
        doc.text(`${index + 1}. ${note.content} (Position: Top ${note.position.top}, Left ${note.position.left})`, 10, y);
        y += 10;
    });

    // Save the PDF to local storage
    const pdfData = doc.output('blob');
    chrome.storage.local.set({ pdfData }, () => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
            sendResponse({ status: "success" });
        }
    });
}

function openGmailWithPDF() {
    chrome.storage.local.get("pdfData", (data) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            alert('Failed to retrieve PDF data from local storage.');
        } else {
            const pdfData = data.pdfData;
            const reader = new FileReader();
            reader.onload = function() {
                const base64PDF = reader.result.split(',')[1];
                const email = `mailto:?subject=${encodeURIComponent('PDF with annotations and notes')}&body=${encodeURIComponent('Please find the attached PDF with the annotations and notes.')}&attachment=${base64PDF}`;
                chrome.tabs.create({ url: email });
            };
            reader.readAsDataURL(pdfData);
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

function generatePDF(dataUrl, sendResponse) {
    importScripts(chrome.runtime.getURL('imported file/jspdf.umd.min.js'));
    const { jsPDF } = window.jspdf;
    const imgData = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, "");
    const pdf = new jsPDF();
    pdf.addImage(imgData, 'JPEG', 0, 0);
    const output = pdf.output('datauristring');
    sendResponse({ success: true, pdf: output });
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
