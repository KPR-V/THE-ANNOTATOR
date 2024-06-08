export function initColorPallete(container) {
    container.innerHTML = `
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">Color Palette Selector</h1>
        <input type="color" id="colorPicker" style="display: block; margin: 0 auto; margin-bottom: 16px; background-color: #3f3f46;">
        <div id="colorInfo">
            <p>HEX: <span id="hexValue"></span></p>
            <p>RGBA: <span id="rgbaValue"></span></p>
        </div>
        <button id="saveColor">Save Color</button>
        <div id="savedColors">
            <h2 style="font-size: 20px; font-weight: 600;">Saved Colors</h2>
            <div id="savedcolors1"></div>
        </div>
    `;

    const updateColorInfo = (hex) => {
        const rgba = hexToRgba(hex);
        document.getElementById('hexValue').innerText = hex;
        document.getElementById('rgbaValue').innerText = rgba;
        document.getElementById('colorPicker').value = hex;
    };

    const hexToRgba = (hex) => {
        const bigint = parseInt(hex.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, 1)`;
    };

    const saveColorInfo = (hostname, url, color, tabId) => {
        chrome.storage.local.get('colorinfo', (data) => {
            let colorinfo = data.colorinfo || {};
            colorinfo[hostname] = { color, url, tabId };
            chrome.storage.local.set({ colorinfo });
        });
    };

    const sendMessageToTab = (tabId, color) => {
        chrome.tabs.sendMessage(tabId, { color: color });
    };

    const saveCurrentColor = (hex) => {
        chrome.storage.local.set({ currentColor: hex });
    };

    document.getElementById('colorPicker').addEventListener('change', (e) => {
        const selectedColor = e.target.value;
        updateColorInfo(selectedColor);
        saveCurrentColor(selectedColor);

        // Send the new color on change without saving it
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                sendMessageToTab(tabs[0].id, selectedColor ? selectedColor : '#ffff00');
            });
        }
    });

    document.getElementById('saveColor').addEventListener('click', () => {
        const savedcolors1 = document.getElementById('savedcolors1');
        const hex = document.getElementById('hexValue').innerText;
        const rgba = document.getElementById('rgbaValue').innerText;

        if (Array.from(savedcolors1.children).some(div => div.getAttribute('data-hex') === hex)) {
            return;
        }

        const colorDiv = document.createElement('div');
        colorDiv.className = 'saved-color';
        colorDiv.style.backgroundColor = hex;
        colorDiv.title = `HEX: ${hex}\nRGBA: ${rgba}`;
        colorDiv.setAttribute('data-hex', hex);
        colorDiv.addEventListener('click', () => {
            updateColorInfo(hex);
            saveCurrentColor(hex);
        });

        savedcolors1.insertBefore(colorDiv, savedcolors1.firstChild);

        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const url = tabs[0].url;
                const hostname = new URL(url).hostname;
                saveColorInfo(hostname, url, hex, tabs[0].id);
            });
        }
    });

    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = tabs[0].url;
            const hostname = new URL(url).hostname;

            chrome.storage.local.get(['colorinfo', 'currentColor'], (data) => {
                if (data.currentColor) {
                    updateColorInfo(data.currentColor);
                } else {
                    updateColorInfo('#ffff00');
                }

                if (data.colorinfo && data.colorinfo[hostname]) {
                    const { color } = data.colorinfo[hostname];
                    updateColorInfo(color);
                }
            });
        });
    }
}
