// import { jsPDF } from 'js/jspdf.umd.min.js';

function applyHighlight(color, WebsiteHostName) {
    console.log("Entered apply highlight");
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    let selectedText = selection.toString();

    let span = document.createElement("span");
    span.style.backgroundColor = color;
    span.style.color = "inherit";
    span.textContent = selectedText;
    span.setAttribute("data-highlight-id", new Date().getTime());

    let range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(span);

    chrome.runtime.sendMessage({
        from: "contentScript",
        subject: "applyHighlight",
        color: color,
        WebsiteHostName: WebsiteHostName,
        selectedText: selectedText,
        id: span.getAttribute("data-highlight-id"),
        date: new Date().toISOString()
    });
    console.log("Exiting apply highlight");
}

function removeHighlight(color, WebsiteHostName) {
    console.log("Entered remove highlight");
    let spans = document.querySelectorAll(`span[style*="background-color:${color}"]`);
    spans.forEach(span => {
        if (span.getAttribute('data-highlight-id')) {
            span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
            chrome.runtime.sendMessage({
                from: "contentScript",
                subject: "removeHighlight",
                color: color,
                WebsiteHostName: WebsiteHostName,
                id: span.getAttribute('data-highlight-id')
            });
        }
    });
    console.log("Exiting remove highlight");
}

// Enable partial selection
function enablePartialSelection() {
    document.body.style.userSelect = "auto";
    console.log("Partial selection activated");
}


function applyStoredHighlights(highlightedTexts) {
    for (let color in highlightedTexts) {
        if (highlightedTexts.hasOwnProperty(color)) {
            let websiteHighlights = highlightedTexts[color][window.location.hostname];
            if (websiteHighlights) {
                websiteHighlights.forEach(highlight => {
                    let span = document.createElement("span");
                    span.style.backgroundColor = highlight.color;
                    span.style.color = "inherit";
                    span.textContent = highlight.text;
                    span.setAttribute("data-highlight-id", highlight.id);

                    let range = document.createRange();
                    range.selectNodeContents(document.body);
                    range.collapse(false);

                    let nodes = getTextNodesIn(document.body);
                    let startNode = findTextNode(nodes, highlight.text);
                    if (startNode) {
                        let range = document.createRange();
                        range.setStart(startNode.node, startNode.startOffset);
                        range.setEnd(startNode.node, startNode.startOffset + highlight.text.length);
                        range.surroundContents(span);
                    }
                });
            }
        }
    }
}

// Function to get all text nodes in a given node
function getTextNodesIn(node) {
    let textNodes = [];
    if (node.nodeType == 3) {
        textNodes.push(node);
    } else {
        let children = node.childNodes;
        for (let i = 0; i < children.length; i++) {
            textNodes.push.apply(textNodes, getTextNodesIn(children[i]));
        }
    }
    return textNodes;
}

// Function to find the text node containing a specific text
function findTextNode(nodes, text) {
    for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        let nodeText = node.textContent;
        let index = nodeText.indexOf(text);
        if (index !== -1) {
            return {
                node: node,
                startOffset: index
            };
        }
    }
    return null;
}
function loadHighlights() {
    chrome.runtime.sendMessage({
        from: "contentScript",
        subject: "loadHighlights"
    }, (response) => {
        applyStoredHighlights(response);
    });
}
document.addEventListener("DOMContentLoaded", loadHighlights);
// Create and manage notes
function createNote() {
    console.log("Entering create note");
    const noteDiv = document.createElement('div');
    noteDiv.style.position = 'absolute';
    noteDiv.style.top = '100px';
    noteDiv.style.left = '100px';
    noteDiv.style.width = '200px';
    noteDiv.style.minHeight = '150px';
    noteDiv.style.border = '1px solid #000';
    noteDiv.style.backgroundColor = '#fff';
    noteDiv.style.zIndex = 1000;
    noteDiv.style.resize = 'both';
    noteDiv.style.overflow = 'auto';
    noteDiv.style.padding = '10px';
    noteDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    noteDiv.setAttribute("data-note", "true");

    const nav = document.createElement('nav');
    nav.style.display = 'flex';
    nav.style.justifyContent = 'space-between';
    nav.style.minHeight = '10vh';

    const addButton = document.createElement('button');
    addButton.textContent = 'Add text';
    addButton.style.backgroundColor = 'yellow';
    addButton.style.cursor = 'pointer';
    addButton.style.padding = '8px';
    addButton.style.borderRadius = '50%';

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete note';
    deleteButton.style.backgroundColor = 'red';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.padding = '8px';
    deleteButton.style.borderRadius = '50%';

    nav.appendChild(addButton);
    nav.appendChild(deleteButton);
    noteDiv.appendChild(nav);

    const textarea = document.createElement('textarea');
    textarea.style.width = '100%';
    textarea.style.minHeight = '100px';
    noteDiv.appendChild(textarea);

    document.body.appendChild(noteDiv);

    dragElement(noteDiv);

    addButton.addEventListener('click', () => {
        textarea.disabled = false;
        textarea.focus();
    });

    deleteButton.addEventListener('click', () => {
        document.body.removeChild(noteDiv);
        chrome.runtime.sendMessage({ action: 'deletenote', host: window.location.hostname });
    });

    textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            textarea.disabled = true;
            chrome.runtime.sendMessage({
                from: "contentScript",
                subject: "savenote",
                host: window.location.hostname,
                noteContent: textarea.value,
                notePosition: { top: noteDiv.style.top, left: noteDiv.style.left }
            });
        }
    });

    chrome.runtime.sendMessage({ action: 'loadnote', host: window.location.hostname }, (response) => {
        if (response) {
            textarea.value = response.noteContent;
            noteDiv.style.top = response.notePosition.top;
            noteDiv.style.left = response.notePosition.left;
            textarea.disabled = true;
        }
    });
    console.log("Load note message sent");
}

function dragElement(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + 'px';
        element.style.left = (element.offsetLeft - pos1) + 'px';
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Export page data as PDF
function savePageAsPDF() {
    console.log("Entered save as PDF");
    captureAndExportPage((response) => {
        if (response.success) {
            console.log("Response is OK for PDF");
            const { annotations, notes } = response.data;
            const pdfContent = [];

            // Add title and URL to the PDF
            pdfContent.push(`Title: ${document.title}`);
            pdfContent.push(`URL: ${window.location.href}`);
            pdfContent.push('');

            // Add annotations to the PDF
            pdfContent.push('Annotations:');
            annotations.forEach((annotation, index) => {
                pdfContent.push(`${index + 1}. ${annotation.text} (Color: ${annotation.color})`);
            });
            pdfContent.push('');

            // Add notes to the PDF
            pdfContent.push('Notes:');
            notes.forEach((note, index) => {
                pdfContent.push(`${index + 1}. ${note.content}`);
            });

            // Convert the content to PDF
            const doc = new jsPDF();
            doc.text(pdfContent.join('\n'), 10, 10);
            doc.save(`${document.title.replace(/\s+/g, '_')}.pdf`);
            console.log("PDF created successfully");
        }
    });
}

// Function to capture and export the page as PDF
function captureAndExportPage(callback) {
    console.log("Entered the capture PDF function");
    const annotations = [];
    const notes = [];

    // Get all highlighted text
    document.querySelectorAll('span[data-highlight-id]').forEach(span => {
        annotations.push({
            text: span.textContent,
            color: span.style.backgroundColor
        });
    });

    // Get all notes
    document.querySelectorAll('div[data-note="true"]').forEach(note => {
        const textarea = note.querySelector('textarea');
        notes.push({
            content: textarea.value,
            position: { top: note.style.top, left: note.style.left }
        });
    });

    // Send the data to the service worker
    chrome.runtime.sendMessage({
        from: 'contentScript',
        subject: 'captureWebpage',
        data: {
            title: document.title,
            url: window.location.href,
            annotations,
            notes
        }
    }, callback);
    console.log("Message sent to service worker");
}

// Share annotated webpage data via email
function sharePageAnnotations() {
    const annotations = [];
    const notes = [];
    console.log("Entered share page");

    // Get all highlighted text
    document.querySelectorAll('span[data-highlight-id]').forEach(span => {
        annotations.push({
            text: span.textContent,
            color: span.style.backgroundColor
        });
    });

    // Get all notes
    document.querySelectorAll('div[data-note="true"]').forEach(note => {
        const textarea = note.querySelector('textarea');
        notes.push({
            content: textarea.value,
            position: { top: note.style.top, left: note.style.left }
        });
    });

    // Send the data to the service worker
    chrome.runtime.sendMessage({
        from: 'contentScript',
        subject: 'shareWebpage',
        data: {
            title: document.title,
            url: window.location.href,
            annotations,
            notes
        }
    }, response => {
        if (response.success) {
            alert('Page annotations shared successfully!');
        } else {
            alert('Failed to share page annotations.');
        }
    });
}

// Bind functions to respective keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'h') {
        applyHighlight('yellow', window.location.hostname);
    } else if (e.altKey && e.key === 'r') {
        removeHighlight('yellow', window.location.hostname);
    } else if (e.altKey && e.key === 'n') {
        createNote();
    } else if (e.altKey && e.key === 's') {
        savePageAsPDF();
    } else if (e.altKey && e.key === 'e') {
        sharePageAnnotations();
    }
});

enablePartialSelection();

// Listen for messages from background or popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.from === "highlighter") {
        if (request.action === "highlighton") {
            applyHighlight(request.color, request.websiteHostName);
        } else if (request.action === "highlightoff") {
            removeHighlight(request.color, request.websiteHostName);
        }
    } else if (request.from === "addnote" && request.action === "createanote") {
        createNote();
    } else if (request.from === "contentScript" && request.action === "captureWebpage") {
        savePageAsPDF();
    } else if (request.from === "contentScript" && request.action === "shareWebpage") {
        sharePageAnnotations();
    }
});
