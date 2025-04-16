/*
 * This file is part of ChiffonUpdater
 *
 * SPDX-License-Identifier: MIT
 */

var navigationList = [];
var currentNavigationEntry;

var navigationDisplay;

class NavigationEntry {
    #selectedCallback;
    #navigationLocalizationKey;

    constructor(navigationLocalizationKey, selectedCallback) {
        this.#navigationLocalizationKey = navigationLocalizationKey;
        this.#selectedCallback = selectedCallback;
    }

    selectEntry() {
        if (currentNavigationEntry == this || websiteBusy) {
            return;
        }
        currentNavigationEntry = this;
        if (this.#selectedCallback != null) {
            this.#selectedCallback(this);
        }

        updateNavigationDisplayList();
    }

    getLocalizationKey() {
        return this.#navigationLocalizationKey;
    }

    removeEntriesAfter() {
        let i = navigationList.indexOf(this);
        if (i > -1) {
            i++;
            navigationList.splice(i, navigationList.length - i);
        }
    }
}

function selectEntryBridge(itemId) {
    let item = navigationList[itemId];
    if (item != null && item != undefined) {
        item.selectEntry();
    }
}

function updateNavigationDisplayList() {
    let rebuiltHTML = "";

    navigationList.forEach(entry => {
        let radioIcon = currentNavigationEntry == entry ? "radio_selected" : "radio";
        rebuiltHTML +=
            `<a class="navigation-entry" onclick="selectEntryBridge(${navigationList.indexOf(entry)})" href="javascript:void(0)">
        <img src="res/img/${radioIcon}.png" width="16" height="16"><div class="navigation-inner">${translator.getTranslationByKey(entry.getLocalizationKey())}</div>
        </a>`;
    });

    navigationDisplay.innerHTML = rebuiltHTML;
}

window.addEventListener("load", (evt) => {
    navigationDisplay = document.getElementById("navigation");
});
