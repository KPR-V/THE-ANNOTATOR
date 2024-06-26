document.addEventListener("DOMContentLoaded", () => {
    loadHighlights();
    loadNotes();
});

function loadJsPDF(callback) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('extension-files/imported_file/jspdf.umd.min.js');
    script.onload = callback;
    document.head.appendChild(script);
}

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
            let parent = span.parentNode;
            let textNode = document.createTextNode(span.textContent);
            parent.replaceChild(textNode, span);
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
                    span.style.backgroundColor = color;
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

function getTextNodesIn(node) {
    let textNodes = [];
    if (node.nodeType === 3) {
        textNodes.push(node);
    } else {
        let children = node.childNodes;
        for (let i = 0; i < children.length; i++) {
            textNodes.push(...getTextNodesIn(children[i]));
        }
    }
    return textNodes;
}

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
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
        } else {
            applyStoredHighlights(response);
        }
    });
}

function createNote() {
    console.log("Entering create note");
    const noteDiv = document.createElement('div');
    noteDiv.style.position = 'absolute';
    noteDiv.style.top = '300px';
    noteDiv.style.left = '360px';
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

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete note';
    deleteButton.style.backgroundColor = 'red';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.padding = '8px';

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
            const noteId = noteDiv.getAttribute('data-note-id') || new Date().getTime().toString();
            noteDiv.setAttribute('data-note-id', noteId);
            chrome.runtime.sendMessage({
                from: "contentScript",
                subject: "savenote",
                host: window.location.hostname,
                noteId: noteId,
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
            noteDiv.setAttribute('data-note-id', response.noteId);
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
        element.style.top = `${element.offsetTop - pos2}px`;
        element.style.left = `${element.offsetLeft - pos1}px`;
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function loadNotes() {
    chrome.runtime.sendMessage({
        from: "contentScript",
        subject: "loadNotes",
        host: window.location.hostname
    }, (response) => {
        if (response) {
            response.forEach(noteData => {
                const noteDiv = document.createElement('div');
                noteDiv.style.position = 'absolute';
                noteDiv.style.top = noteData.notePosition.top;
                noteDiv.style.left = noteData.notePosition.left;
                noteDiv.style.width = '200px';
                noteDiv.style.minHeight = '150px';
                noteDiv.style.border = '1px solid #000';
                noteDiv.style.backgroundColor = '#fff';
                noteDiv.style.zIndex = 1000;
                noteDiv.style.resize = 'both';
                noteDiv.style.overflow = 'auto';
                noteDiv.style.padding = '10px';
                noteDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
                noteDiv.setAttribute("data-note-id", noteData.noteId);
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

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete note';
                deleteButton.style.backgroundColor = 'red';
                deleteButton.style.cursor = 'pointer';
                deleteButton.style.padding = '8px';

                nav.appendChild(addButton);
                nav.appendChild(deleteButton);
                noteDiv.appendChild(nav);

                const textarea = document.createElement('textarea');
                textarea.style.width = '100%';
                textarea.style.minHeight = '100px';
                textarea.value = noteData.noteContent;
                textarea.disabled = true;
                noteDiv.appendChild(textarea);

                document.body.appendChild(noteDiv);
                dragElement(noteDiv);

                addButton.addEventListener('click', () => {
                    textarea.disabled = false;
                    textarea.focus();
                });

                deleteButton.addEventListener('click', () => {
                    document.body.removeChild(noteDiv);
                    chrome.runtime.sendMessage({ from: "contentScript", action: 'deletenote', host: window.location.hostname, noteId: noteData.noteId });
                });

                textarea.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        textarea.disabled = true;
                        chrome.runtime.sendMessage({
                            from: "contentScript",
                            subject: "savenote",
                            host: window.location.hostname,
                            noteId: noteData.noteId,
                            noteContent: textarea.value,
                            notePosition: { top: noteDiv.style.top, left: noteDiv.style.left }
                        });
                    }
                });
            });
        }
    });
}
function sharePageAnnotations() {
    const annotations = [];
    const notes = [];
    console.log("Entered share page");
    document.querySelectorAll('span[data-highlight-id]').forEach(span => {
        annotations.push({
            text: span.textContent,
            color: span.style.backgroundColor
        });
    });
    document.querySelectorAll('div[data-note="true"]').forEach(note => {
        const textarea = note.querySelector('textarea');
        notes.push({
            content: textarea.value,
            position: { top: note.style.top, left: note.style.left }
        });
    });
    chrome.runtime.sendMessage({
        from: 'contentScript',
        subject: 'shareWebpageAsPDF',
        data: {
            title: document.title,
            url: window.location.href,
            annotations,
            notes
        }
    }, response => {
        if (response.ok) {
            alert('Page annotations shared successfully!');
        } else {
            alert('Failed to share page annotations.');
        }
    });
}

function captureAndExportPage(callback) {
    const annotations = [];
    const notes = [];
    document.querySelectorAll('span[data-highlight-id]').forEach(span => {
        annotations.push({
            text: span.textContent,
            color: span.style.backgroundColor
        });
    });
    document.querySelectorAll('div[data-note="true"]').forEach(note => {
        const textarea = note.querySelector('textarea');
        notes.push({
            content: textarea.value,
            position: { top: note.style.top, left: note.style.left }
        });
    });
    chrome.runtime.sendMessage({
        from: 'contentScript',
        subject: 'captureWebpage',
        data: {
            title: document.title,
            url: window.location.href,
            annotations,
            notes,
            host: window.location.hostname
        }
    }, callback);
    console.log("Message sent to service worker");
}

function savePageAsPDF() {
    console.log("Entered save as PDF");
    captureAndExportPage((response) => {
        if (response.ok) {
            console.log('Page saved successfully.');
        } else {
            console.log('Failed to save the page:', response.message);
        }
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.highlight) {
        if (message.highlight.action === 'highlighton') {
            applyHighlight(message.highlight.color, message.highlight.websiteHostName);
            sendResponse({ status: 'Highlight applied' });
        } else if (message.highlight.action === 'highlightoff') {
            removeHighlight(message.highlight.color, message.highlight.websiteHostName);
            sendResponse({ status: 'Highlight removed' });
        }
    } else if (message.from === 'addnote' && message.action === 'createanote') {
        createNote();
        sendResponse({ status: 'Note created' });
    } else if (message.from === 'contentScript' && message.action === 'captureWebpage') {
        savePageAsPDF();
        sendResponse({ status: 'Webpage captured' });
    } else if (message.from === 'contentScript' && message.action === 'shareWebpage') {
        sharePageAnnotations();
        sendResponse({ status: 'Webpage shared' });
    } else if (message.from === 'searchbar' && message.action === 'search') {
        applyFilter(message.criteria, message.value);
        sendResponse({ status: 'Filter applied' });
    }
    return true; // keep the message channel open until sendResponse is called
});

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