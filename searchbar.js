export function initSearchBar(container) {
    container.innerHTML = `
        
            <form id="searchForm" style="flex-grow: 1; border-radius: 9999px; display: flex; align-items: center; gap: 3px;">
                <input type="search" id="search" placeholder="Search..." style="flex-grow: 1; background-color: #3f3f46; border-radius: 9999px; padding: 8px; color: white;">
                <button type="submit" style="background-color: #3f3f46; cursor: pointer; padding: 8px; border-radius: 50%;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 50 50" style="width: 30px; height: 30px;">
                        <path d="M 21 3 C 11.6 3 4 10.6 4 20 C 4 29.4 11.6 37 21 37 C 24.354553 37 27.47104 36.01984 30.103516 34.347656 L 42.378906 46.621094 L 46.621094 42.378906 L 34.523438 30.279297 C 36.695733 27.423994 38 23.870646 38 20 C 38 10.6 30.4 3 21 3 z M 21 7 C 28.2 7 34 12.8 34 20 C 34 27.2 28.2 33 21 33 C 13.8 33 8 27.2 8 20 C 8 12.8 13.8 7 21 7 z"></path>
                    </svg>
                </button>
            </form>
            <select id="searchCriteria" style="background-color: #3f3f46; color: white; border-radius: 8px; padding: 8px;">
                <option value="keyword">Keyword</option>
                <option value="date">Date</option>
                <option value="color">Color</option>
            </select>
        
    `;

    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const searchValue = document.getElementById('search').value;
        const criteria = document.getElementById('searchCriteria').value;
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.tabs.sendMessage(
                tabs[0].id,
                { from: "searchbar", action: "search", criteria: criteria, value: searchValue }
            );
        });


    });
}
