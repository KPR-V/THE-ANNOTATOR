import { initSearchBar } from './searchbar.js';
import { initColorPallete } from './colorpallete.js';
import { initTabSection } from './tabsection.js';
import { initHeader } from './header.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');

    
    const header = document.createElement('header');
    app.appendChild(header);
    initHeader(header);


    const searchbar = document.createElement('div');
    searchbar.id="searchContainer"
    app.appendChild(searchbar);
    initSearchBar(searchbar);
    
    
    const tabSection = document.createElement('div');
    app.appendChild(tabSection);
    initTabSection(tabSection);
    
    const colorPalette = document.createElement('div');
    colorPalette.id = 'colorPalette';
    app.appendChild(colorPalette);
    initColorPallete(colorPalette);

});
