import { addnote } from "./button-functions/addnote.js";
import { highlighterbutton } from "./button-functions/highlighterbutton.js";
import { saveaspdf } from "./button-functions/saveaspadf.js";
import { sharebutton } from "./button-functions/sharebutton.js";
import {filterbutton} from "./button-functions/filterbutton.js"

export function initTabSection(container) {
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; margin-top: 24px; color: white; width: 100%; justify-content: space-around; gap: 8px; align-items: center;">
            <div style="display: flex; gap: 8px; align-items: center;">
                <button id="highlighter" style="background-color: #3f3f46; cursor: pointer; padding: 8px; border-radius: 50%;">
                    <img src="svgs/highlighter-draw-svgrepo-com.svg" alt="Highlighter" width="40" height="40" style="width: 40px; height: 40px;">
                </button>
                <button id="notes" style="background-color: #3f3f46; cursor: pointer; padding: 8px; border-radius: 50%;">
                    <img src="svgs/notes-notepad-svgrepo-com.svg" alt="Notes" width="40" height="40" style="width: 40px; height: 40px;">
                </button>
                <div style="position: relative;">
                    <button id="filter" style="background-color: #3f3f46; cursor: pointer; padding: 8px; border-radius: 50%;">
                        <img src="svgs/filter-svgrepo-com.svg" alt="Add Filter" width="40" height="40" style="width: 40px; height: 40px;">
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
                    <img src="svgs/share-svgrepo-com.svg" alt="share" width="40" height="40" style="width: 40px; height: 40px;">
                </button>
                <button id="save" style="background-color: #3f3f46; cursor: pointer; padding: 8px; border-radius: 50%;">
                    <img src="svgs/save-file-save-svgrepo-com.svg" alt="save" width="40" height="40" style="width: 40px; height: 40px;">
                </button>
            </div>
        </div>
    `;

    filterbutton()
    highlighterbutton()
     addnote()
    saveaspdf()
    sharebutton()
}
