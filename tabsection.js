export function initTabSection(container) {
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; margin-top: 24px; color: white; width: 100%; justify-content: space-around; gap: 8px; align-items: center;">
            <div style="display: flex; gap: 8px; align-items: center;">
                <button id="highlighter" style="background-color: #3f3f46; cursor: pointer; padding: 8px; border-radius: 50%;">
                    <img src="highlighter-draw-svgrepo-com.svg" alt="Highlighter" width="40" height="40" style="width: 40px; height: 40px;">
                </button>
                <button id="notes" style="background-color: #3f3f46; cursor: pointer; padding: 8px; border-radius: 50%;">
                    <img src="notes-notepad-svgrepo-com.svg" alt="Notes" width="40" height="40" style="width: 40px; height: 40px;">
                </button>
                <div style="position: relative;">
                    <button id="filter" style="background-color: #3f3f46; cursor: pointer; padding: 8px; border-radius: 50%;">
                        <img src="filter-svgrepo-com.svg" alt="Add Filter" width="40" height="40" style="width: 40px; height: 40px;">
                    </button>
                    <div id="dropdown" style="display: none; position:absolute; width:192px ;margin-top: 8px ; right: 0; background-color: #3f3f46; padding: 8px; color:white ;border-radius: 8px; z-index: 10; boxShadow: 0px 0px 10px rgba(0,0,0,0.1);">
        <select id="criteriaSelect" style="display: block; width: 100%; padding: 8px; font-size: 14px; color: white; border-radius: 4px;">
            <option value="">Select Criteria</option>
            <option value="date">Date</option>
            <option value="color">Color</option>
        </select>
        <div id="criteriaInputContainer" style="margin-top: 8px;"></div>
        <button id="applyFilter" style="display: block; width: 100%; padding: 8px; font-size: 14px; color: white; border-radius: 4px; background-color: #3f3f46; margin-top: 8px;">Apply Filter</button>
    </div>
                </div>
                <button id="share" style="background-color: #3f3f46; cursor: pointer; padding: 8px; border-radius: 50%;">
                    <img src="share-svgrepo-com.svg" alt="share" width="40" height="40" style="width: 40px; height: 40px;">
                </button>
                <button id="save" style="background-color: #3f3f46; cursor: pointer; padding: 8px; border-radius: 50%;">
                    <img src="save-file-save-svgrepo-com.svg" alt="save" width="40" height="40" style="width: 40px; height: 40px;">
                </button>
            </div>
        </div>
    `;

    const dropdown = document.getElementById('dropdown');
const filterButton = document.getElementById('filter');

const toggleDropdown = () => {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    document.getElementById('criteriaSelect').value = '';
    document.getElementById('criteriaInputContainer').innerHTML='';
};

filterButton.addEventListener('click', () => {
    toggleDropdown();
});
    
    document.getElementById('criteriaSelect').addEventListener('change', (e) => {
        const criteriaInputContainer = document.getElementById('criteriaInputContainer');
        criteriaInputContainer.innerHTML = '';
    
        const selectedCriteria = e.target.value;
        if (selectedCriteria === 'date') {
            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.style.cssText = 'display: block; width: 100%; padding: 8px; font-size: 14px; color: white; border-radius: 4px; background-color: #3f3f46;';
            dateInput.placeholder = 'YYYY-MM-DD';
            criteriaInputContainer.appendChild(dateInput);
        } else if (selectedCriteria === 'color') {
            const colorSelect = document.createElement('select');
            colorSelect.style.cssText = 'display: block; width: 100%; padding: 8px; font-size: 14px; color: white; border-radius: 4px; background-color: #3f3f46;';
            
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.text = 'Select Color';
            colorSelect.appendChild(defaultOption);
    
            
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const activeTab = tabs[0];
                    const url = tabs[0].url;
                    const websiteHostName = new URL(url).hostname;
                    chrome.storage.local.get([websiteHostName], (result) => {
                        const colorOptions = result[websiteHostName]?.colors || [];
                        colorOptions.forEach((color,index) => {
                            const option = document.createElement('option');
                            option.value = color.toLowerCase();
                            option.text = color;
                            option.index= index;
                            colorSelect.appendChild(option);
                        });
                    });
                });
            } else {
                console.log("Chrome API is not available.");
            }
    
            criteriaInputContainer.appendChild(colorSelect);
        }

        


    });
    
    document.getElementById('applyFilter').addEventListener('click', () => {
        const criteriaSelect = document.getElementById('criteriaSelect');
        const criteriaInputContainer = document.getElementById('criteriaInputContainer');
        const selectedCriteria = criteriaSelect.value;
        let filterValue = '';
    
        if (selectedCriteria === 'date') {
            const dateInput = criteriaInputContainer.querySelector('input[type="date"]');
            filterValue = dateInput ? dateInput.value : '';
        } else if (selectedCriteria === 'color') {
            const colorSelect = criteriaInputContainer.querySelector('select');
            filterValue = colorSelect ? colorSelect.value : '';
        }
    
        if (selectedCriteria && filterValue) {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                    chrome.tabs.sendMessage(
                        tabs[0].id,
                        { from: "searchbar", action: "search", criteria: selectedCriteria, value: filterValue }
                    );
                });
            } else {
                console.log("Chrome API is not available.");
            }
        }
    });
    



    document.addEventListener('mousedown', (event) => {
        if (!dropdown.contains(event.target) && !filterButton.contains(event.target)) {
            dropdown.style.display = 'none';
            document.getElementById('criteriaSelect').value = '';
            document.getElementById('criteriaInputContainer').innerHTML='';
        }
    });
    


    



    document.getElementById('highlighter').addEventListener('click', () => {
        let isActive = false

        if (typeof chrome !== 'undefined' && chrome.tabs) {

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            
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








    document.getElementById('notes').addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                chrome.tabs.sendMessage(activeTab.id, { from: "addnote", action: "createanote" });
            });
        } else {
            console.log("Chrome API is not available.");
        }
    });







    document.getElementById('save').addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                chrome.tabs.sendMessage(activeTab.id, { from: "contentScript", subject: "captureWebpage" }, (response) => {
                    if (response && response.success) {
                        console.log('Page saved successfully.');
                    } else {
                        console.log('Failed to save the page.');
                    }
                });
            });
        } else {
            console.log("Chrome API is not available.");
        }
    });







    document.getElementById('share').addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                chrome.tabs.sendMessage(activeTab.id, { from: "contentScript", subject: "shareWebpage" }, (response) => {
                    if (response && response.success) {
                        console.log('Page shared successfully.');
                    } else {
                        console.log('Failed to share the page.');
                    }
                });
            });
        } else {
            console.log("Chrome API is not available.");
        }
    });





}
