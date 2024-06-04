export function filterbutton(){

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
        
    
    

}