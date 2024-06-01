import { initSearchBar } from './searchbar.js';
import { initColorPallete } from './colorpallete.js';
import { initTabSection } from './tabsection.js';
import { initHeader } from './header.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');

    // Initialize Header
    const header = document.createElement('header');
    app.appendChild(header);
    initHeader(header);

    // Initialize Searchbar
    const searchbar = document.createElement('div');
    searchbar.id="searchContainer"
    app.appendChild(searchbar);
    initSearchBar(searchbar);
    
    // Initialize Tab Section
    const tabSection = document.createElement('div');
    app.appendChild(tabSection);
    initTabSection(tabSection);
    // Initialize Color Palette
    const colorPalette = document.createElement('div');
    colorPalette.id = 'colorPalette';
    app.appendChild(colorPalette);
    initColorPallete(colorPalette);

});
