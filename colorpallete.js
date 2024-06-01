export function initColorPallete(container) {
    container.innerHTML = `
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">Color Palette Selector</h1>
        <input type="color" id="colorPicker" value="#ffff00" style="display: block; margin: 0 auto; margin-bottom: 16px; background-color: #3f3f46;">
        <div id="colorInfo">
            <p>HEX: <span id="hexValue">#ffff00</span></p>
            <p>RGBA: <span id="rgbaValue">rgba(255, 255, 0, 1)</span></p>
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
    };

    const hexToRgba = (hex) => {
        const bigint = parseInt(hex.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, 1)`;
    };

    const saveColorInfo = (hostname, url, color, tabId) => {
        chrome.storage.local.set({
            colorinfo: {
                [hostname]: { color, url, tabId }
            }
        });
    };

    const sendMessageToTab = (tabId, color) => {
        chrome.tabs.sendMessage(tabId, { color: { color } });
    };

    document.getElementById('colorPicker').addEventListener('change', (e) => {
        const selectedColor = e.target.value;
        updateColorInfo(selectedColor);
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
            document.getElementById('colorPicker').value = hex;
            updateColorInfo(hex);
        });

        savedcolors1.insertBefore(colorDiv, savedcolors1.firstChild);

        
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const url = tabs[0].url;
                const hostname = new URL(url).hostname;
                saveColorInfo(hostname, url, hex, tabs[0].id);
                sendMessageToTab(tabs[0].id, hex);
            });
        }
    });

    
    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = tabs[0].url;
            const hostname = new URL(url).hostname;

            chrome.storage.local.get('colorinfo', (data) => {
                if (data.colorinfo && data.colorinfo[hostname]) {
                    const { color } = data.colorinfo[hostname];
                    updateColorInfo(color);
                }
            });
        });
    }
}
