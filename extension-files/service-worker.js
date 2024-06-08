importScripts(chrome.runtime.getURL('extension-files/imported_file/jspdf.umd.min.js'));

let highlightedTexts = {};
let notesData = {};
let lastCaptureTime = 0;
const CAPTURE_INTERVAL = 1000; // 1 second interval

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.clear();
    chrome.storage.local.set({ highlightedTexts: {}, notesData: {} });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.from === "contentScript") {
        handleContentScriptMessage(message, sendResponse);
        return true;
    } else if (message.from === "searchbar" && message.action === "search") {
        handleSearchbarMessage(message, sender, sendResponse);
        return true;
    }
    return true; // Indicates that sendResponse will be called asynchronously
});

function handleContentScriptMessage(message, sendResponse) {
    try {
        switch (message.subject) {
            case "applyHighlight":
                applyHighlight(message, sendResponse);
                break;
            case "removeHighlight":
                removeHighlight(message, sendResponse);
                break;
            case "loadHighlights":
                loadHighlights(sendResponse);
                break;
            case "savenote":
                saveNote(message, sendResponse);
                break;
            case "loadNotes":
                loadNotes(message, sendResponse);
                break;
            case "deletenote":
                deleteNote(message, sendResponse);
                break;
            case "shareWebpage":
                exportData(message, sendResponse);
                break;
            case "shareWebpageAsPDF":
                exportDataAsPDF(message, () => {
                    openGmailWithPDF();
                    sendResponse({ ok: true });
                });
                break;
            case "captureWebpage":
                captureWebpage(sendResponse);
                break;
        }
    } catch (error) {
        console.error('Error handling content script message:', error);
        sendResponse({ status: "error", message: error.message });
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
    const { host } = message;
    chrome.storage.local.get(["highlightedTexts", "notesData"], (data) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
            const highlightedTexts = data.highlightedTexts || {};
            const notesData = data.notesData || {};
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
    return true;
}
function exportDataAsPDF(message, sendResponse) {
    const { jsPDF } = self.jspdf;
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

    const pdfBlob = doc.output('blob');
    const pdfFile = new Blob([pdfBlob], { type: 'application/pdf' });

    chrome.storage.local.set({ pdfData: pdfFile }, () => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
            sendResponse({ status: "success" });
            downloadPDF(sendResponse);
        }
    });
}

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
    const { jsPDF } = self.jspdf;
    const pdf = new jsPDF();
    pdf.addImage(dataUrl, 'JPEG', 0, 0);
    const pdfBlob = pdf.output('blob');
    sendResponse({ success: true, pdf: pdfBlob });
}

function openGmailWithPDF() {
    chrome.storage.local.get("pdfData", (data) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            console.error('Failed to retrieve PDF data from local storage.');
            return;
        }

        const pdfData = data.pdfData;

        if (!(pdfData instanceof Blob)) {
            console.error('Stored pdfData is not a Blob');
            console.error('Failed to retrieve valid PDF data.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function() {
            const base64PDF = reader.result.split(',')[1];
            const email = `mailto:mail.google.com?subject=${encodeURIComponent('PDF with annotations and notes')}&body=${encodeURIComponent('Please find the attached PDF with the annotations and notes.')}&attachment=${base64PDF}`;
            chrome.tabs.create({ active: true, url: email });
        };
        reader.readAsDataURL(pdfData);
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

function downloadPDF(sendResponse) {
    chrome.storage.local.get("pdfData", (data) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
            const pdfData = data.pdfData;
            if (pdfData instanceof Blob) {
                const fileReader = new FileReader();
                fileReader.onloadend = function() {
                    const url = fileReader.result;
                    chrome.downloads.download({
                        url: url,
                        filename: 'annotations_notes.pdf',
                        saveAs: true
                    }, (downloadId) => {
                        if (chrome.runtime.lastError) {
                            console.error(chrome.runtime.lastError);
                            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
                        } else {
                            sendResponse({ status: "success", downloadId: downloadId });
                        }
                    });
                };
                fileReader.readAsDataURL(pdfData);
            } else {
                console.error('Stored pdfData is not a Blob');
                sendResponse({ status: "error", message: "Stored pdfData is not a Blob" });
            }
        }
    });
}
