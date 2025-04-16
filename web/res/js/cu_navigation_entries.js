/*
 * This file is part of ChiffonUpdater
 *
 * SPDX-License-Identifier: MIT
 */

/* All the constant navigation entries should go here */

const welcomeNavigationEntry = new NavigationEntry("action.welcome", (entry) => {
    navigationList = [entry];
    contentFrame.innerHTML = `<div class="content-message">
    <div class="content-message-top">
        <img src="res/img/icon.png" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("website.welcome.text1")}</h1><h2>${translator.getTranslationByKey("website.welcome.text2")}</h2>
        </div>
    </div>
    <h4>${translator.getTranslationByKey("website.welcome.text3")}</h4>
    <div class="agent-download-div"><h2><a href="javascript:void(0)" class="agent-download-button" onclick="startProductsSearch()">
        <img src="res/img/arrow.png" width="128" height="128">
        ${translator.getTranslationByKey("website.welcome.button")}</a></h2></div>
    </div>
    `;
});

let toCleanup;
function generateInfoEntry(title, content, withLicense) {
    return new NavigationEntry(title, (entry) => {
        entry.removeEntriesAfter();
        toCleanup.forEach(cl => {
            let id = navigationList.indexOf(cl);
            while (id > -1) {
                navigationList.splice(id, 1);
                id = navigationList.indexOf(cl);
            }
        });
        navigationList.push(entry);
        let licText = "";
        if (withLicense) {
            licText = `<br><br><textarea style="width: min(600px, 100%); height: 400px;" readonly>${mitLicense}</textarea>`;
        }
        contentFrame.innerHTML = `<div class="content-message">${translator.getTranslationByKey(content)}${licText}
            </div>`;
    });
}

const aboutNavigationEntry = generateInfoEntry("about.title", "text.about", true);
const cookiesNavigationEntry = generateInfoEntry("about.cookie.title", "text.cookie", false);
toCleanup = [aboutNavigationEntry, cookiesNavigationEntry];

const actionsResultEntry = new NavigationEntry("action.results", (entry) => {
    navigationList = [welcomeNavigationEntry, entry];

    let succeed = 0;
    let cancelled = 0;
    let failed = 0;
    let total = actionsSummary["actionsTree"].length;
    lastResults.forEach(result => {
        switch (result[1]) {
            case UPDATE_ACTION_SUCCESS:
                succeed++;
                break;
            case UPDATE_ACTION_CANCELLED:
                cancelled++;
                break;
            case UPDATE_ACTION_FAILED:
                failed++;
                break;
            default:
                break;
        }
    });

    let detailsText = "";
    let icon = "";
    if (succeed == 0) {
        detailsText = translator.getTranslationByKey("results.succeed.none");
        icon = "error";
    } else if (succeed == total) {
        detailsText = translator.getTranslationByKey("results.succeed.all");
        icon = "download_icon";
    } else {
        detailsText = translator.getTranslationByKey("results.succeed.some");
        icon = "warn";
    }

    let pendingResults = `<div class="content-message">
    <div class="content-message-top">
        <img src="res/img/${icon}.png" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("results.text")}</h1><h2>${detailsText}</h2>
        </div>
    </div>
    <table class="results-table"><tr>
        <th><img src="res/img/download_icon.png" style="float: left;" width="16" height="16">${translator.getTranslationByKey("results.table.succeed")}</th>
        <th><img src="res/img/cancelled.png" style="float: left;" width="16" height="16">${translator.getTranslationByKey("results.table.cancelled")}</th>
        <th><img src="res/img/error.png" style="float: left;" width="16" height="16">${translator.getTranslationByKey("results.table.failed")}</th>
        <th><img src="res/img/bulb.png" style="float: left;" width="16" height="16">${translator.getTranslationByKey("results.table.total")}</th></tr></thead><tbody>
        <tr><td>${succeed}</td><td>${cancelled}</td><td>${failed}</td><td>${total}</td></tr>
        </tbody></table><br>${translator.getTranslationByKey("results.detailed")}<br>`;

    lastResults.forEach(result => {
        if (actionsSummary["action"] == ACTION_TYPE_UPDATE) {
            let product = result[0];
            let updHybInf = null;
            product.getHybridInformations().forEach(hybInf => {
                if (!hybInf.isForUninstall()) {
                    updHybInf = hybInf;
                }
            });
            if (updHybInf != null) {
                pendingResults += createBannerForResults(product.getProductName(), product.getCurrentVersion(), updHybInf.getVersionName(), null, product.getFeatures(), false, result[1]);
            }
        }
        if (actionsSummary["action"] == ACTION_TYPE_ROLLBACK) {
            let product = result[0];
            let updVersName = null;

            lastRollbackInfos.forEach((infos) => {
                if (infos[0] == product) {
                    updVersName = infos[1].getVersionName();
                }
            })

            if (updVersName != null) {
                pendingResults += createBannerForResults(product.getProductName(), product.getCurrentVersion(), updVersName, null, product.getFeatures(), true, result[1]);
            }
        }
    });

    pendingResults += `</div><br>
        <div class="content-message-push-right">
        <img src="res/img/arrow.png" width="32" height="32">
        ${translator.getTranslationByKey("results.history.link",
        `<a href="javascript:void(0)" onclick="openHistory()">${translator.getTranslationByKey("action.choice.history")}</a>`)}
        </div>
    `;

    contentFrame.innerHTML = pendingResults;
});

const performingActionsNavigationEntry = new NavigationEntry("action.performing", (entry) => {
    entry.removeEntriesAfter();
    contentFrame.innerHTML = `<div class="content-message">
    <div class="content-message-top">
        <img src="res/img/download_icon.png" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("actions.performing.text")}</h1><h2>${translator.getTranslationByKey("actions.performing.text2")}</h2>
        </div>
    </div>
    </div>
    `;
    websiteBusy = true;
    cudPerformActions((results) => {
        lastResults = results;
        websiteBusy = false;
        actionsResultEntry.selectEntry();
    }, actionsSummary["action"], actionsSummary["actionsTree"]);
});

const summaryNavigationEntry = new NavigationEntry("action.summary", (entry) => {
    entry.removeEntriesAfter();
    let pending = `<div class="content-message">
    <div class="content-message-top">
        <img src="res/img/bulb.png"}" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("summary.title")}</h1><h2>${translator.getTranslationByKey("summary.title2")}</h2>
        </div>
    </div>`;
    if (actionsSummary != null) {
        pending += translator.getTranslationByKey(actionsSummary["action"] == ACTION_TYPE_UPDATE ? "summary.optype.update" : "summary.optype.rollback");
    }
    pending += `<button class="b-checkbox" onclick="performActions()">${translator.getTranslationByKey(actionsSummary["action"] == ACTION_TYPE_UPDATE ? "summary.perform.update" : "summary.perform.rollback")}</button><br><br><div>`;

    if (actionsSummary["action"] == ACTION_TYPE_ROLLBACK) {
        actionsSummary["actionsTree"].forEach(infos => {
            let product = infos[0];
            let hybridInfos = infos[1];

            let prodText = translator.getTranslationByKey("summary.infos.rollback", product.getProductName(), product.getCurrentVersion(), hybridInfos.getVersionName());
            let detailText = translator.getTranslationByKey("select.update.banner.product.details", product.getFeatures().join(", "), product.getInstallPath());

            let dateText = "";
            if (hybridInfos.getReleaseDate() != null) {
                dateText = translator.getTranslationByKey("select.update.banner.details", new Date(parseInt(hybridInfos.getReleaseDate())).toLocaleDateString()) + "<br>";
            }
            if (hybridInfos.getInstallDate() != null) {
                dateText += translator.getTranslationByKey("select.rollback.installedon", new Date(parseInt(hybridInfos.getInstallDate())).toLocaleString()) + "<br>";
            }
            let descText = "";
            if (hybridInfos.getDescription() != "" && hybridInfos.getDescription() != null) {
                descText = translator.getTranslationByKey("select.update.banner.details2", hybridInfos.getDescription());
            }

            pending += `<div class="display-banner" style="background-color: #116e64;">
                        <h4 style="width: 100%;"><details><summary>
                                ${prodText}</summary><br>${detailText}<br><br>${dateText}${descText}</details></h4></div>`;
        });
    }
    if (actionsSummary["action"] == ACTION_TYPE_UPDATE) {
        actionsSummary["actionsTree"].forEach(product => {

            let targetHyb;
            product.getHybridInformations().forEach(hybInf => {
                if (!hybInf.isForUninstall()) {
                    targetHyb = hybInf;
                }
            });
            if (targetHyb == null) {
                return;
            }
            let prodText = translator.getTranslationByKey("summary.infos.update", product.getProductName(), product.getCurrentVersion(), targetHyb.getVersionName());
            let detailText = translator.getTranslationByKey("select.update.banner.product.details", product.getFeatures().join(", "), product.getInstallPath());

            let dateText = "";
            if (targetHyb.getReleaseDate() != null) {
                dateText = translator.getTranslationByKey("select.update.banner.details", new Date(parseInt(targetHyb.getReleaseDate())).toLocaleDateString()) + "<br>";
            }
            let descText = "";
            if (targetHyb.getDescription() != "" && targetHyb.getDescription() != null) {
                descText = translator.getTranslationByKey("select.update.banner.details2", targetHyb.getDescription());
            }

            pending += `<div class="display-banner" style="background-color: #116e64;">
                        <h4 style="width: 100%;"><details><summary>
                                ${prodText}</summary><br>${detailText}<br><br>${dateText}${descText}</details></h4></div>`;
        });
    }

    pending += `</div></div>`;
    contentFrame.innerHTML = pending;
});

const actionHistoryNavigationEntry = new NavigationEntry("action.history", (entry) => {
    entry.removeEntriesAfter();
    websiteBusy = true;
    contentFrame.innerHTML = `<div class="content-message">
    <div class="content-message-top">
        <img src="res/img/icon.png" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("history.loading")}</h1><h2>${translator.getTranslationByKey("website.connecting.details")}</h2>
        </div>
    </div>
    </div>
    `;
    cudFetchActionsHistory(history => {
        let pending = `<div class="content-message">
        <div class="content-message-top">
        <img src="res/img/icon.png" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("history.loaded")}</h1><h2>${translator.getTranslationByKey("history.loaded2")}</h2>
        </div>
        </div>
        `;
        if (history == null || history.length == 0) {
            pending += `<img src="res/img/bulb.png" width="32" height="32">${translator.getTranslationByKey("history.norecords")}`
        } else {
            history.forEach(record => {
                pending += createBannerForResults(record.getProductName(), record.getPreviousVersion(), record.getTargertVersion(), record.getActionDate(), record.getFeatures(), record.isDowngrade(), record.getStatus());
            });
        }

        pending += "</div>";
        contentFrame.innerHTML = pending;
        websiteBusy = false;
    });


});

const connectionNavigationEntry = new NavigationEntry("action.connecting", (entry) => {
    entry.removeEntriesAfter();
    contentFrame.innerHTML = `<div class="content-message">
    <div class="content-message-top">
        <img src="res/img/icon.png" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("website.connecting.title")}</h1><h2>${translator.getTranslationByKey("website.connecting.details")}</h2>
        </div>
    </div>
    <h4>${translator.getTranslationByKey("website.connecting.notice")}</h4>
    ${translator.getTranslationByKey("website.connecting.notice2")}
    </div>
    `;

    websiteBusy = true;
    cudOpenConnection(cfg_backendUrl, () => {
        websiteBusy = false;
        welcomeNavigationEntry.selectEntry();
    });
});

const catalogBrowseEntry = new NavigationEntry("action.catalog.browse", (entry) => {
    entry.removeEntriesAfter();

    let contentPending = `<div class="content-message">
    <div class="content-message-top">
        <img src="res/img/icon.png" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("website.catalog.text1")}</h1><h2>${translator.getTranslationByKey("website.catalog.text2")}</h2>
        </div>
        </div>
    <div class="catalog-search-bar">
    <input type="text" id="catalog-search" placeholder="${translator.getTranslationByKey("catalog.search.placeholder")}">
    <button onclick="fireCatalogUpdate(true)">${translator.getTranslationByKey("catalog.search.action")}</button>
    </div>
    <div id="catalog-search-controlbar">
    </div>
    <div id="catalog-search-content">
    </div>
    `
    contentPending += `</div>`

    contentFrame.innerHTML = contentPending;

    let searchBox = document.getElementById("catalog-search");
    searchBox.onkeydown = (ev) => {
        if (ev.key == "Enter") {
            fireCatalogUpdate(true);
        }
    };
    fireCatalogUpdate(true);
});

const selectingUpdates = new NavigationEntry("action.selecting.updates", (entry) => {
    entry.removeEntriesAfter();

    let pending = `<div class="content-message">
    <div class="content-message-top">
        <img src="res/img/download_icon.png" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("select.update.text")}</h1><h2>${translator.getTranslationByKey("select.update.text2")}</h2>
        </div>
    </div>
        <button class="b-checkbox" onclick="showUpdatesSummary()" disabled id="install-updates">${translator.getTranslationByKey("select.update.reviewinst")}</button>
        <button class="b-checkbox" onclick="setAllUpdatesState(false)">${translator.getTranslationByKey("select.update.deselectall")}</button>
        <button class="b-checkbox" onclick="setAllUpdatesState(true)">${translator.getTranslationByKey("select.update.selectall")}</button><br><br>`;

    pending += createUpdateBanners(cudGetCachedProductsSearchResults());
    pending += "</div>";
    contentFrame.innerHTML = pending;
});

const rollbackUpdates = new NavigationEntry("action.selecting.rollback", (entry) => {
    entry.removeEntriesAfter();

    let pending = `<div class="content-message">
    <div class="content-message-top">
        <img src="res/img/icon.png" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("select.rollback.text")}</h1><h2>${translator.getTranslationByKey("select.rollback.text2")}</h2>
        </div>
    </div>
        <button class="b-checkbox" onclick="showRollbackSummary()" disabled id="rollback-updates">${translator.getTranslationByKey("select.rollback.reviewrbak")}</button>
        <button class="b-checkbox" onclick="setAllRollbackState(false)">${translator.getTranslationByKey("select.update.deselectall")}</button>
        <button class="b-checkbox" onclick="setAllRollbackState(true)">${translator.getTranslationByKey("select.update.selectall")}</button><br><br>`;

    pending += createRollbackBanners(cudGetCachedProductsSearchResults());
    pending += "</div>";
    contentFrame.innerHTML = pending;
});

const selectWhatToDoEntry = new NavigationEntry("action.whattodo", (entry) => {
    entry.removeEntriesAfter();
    let contentPending = `<div class="content-message">
    <div class="content-message-top">
        <img src="res/img/icon.png" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("website.action.waiting")}</h1><h2>${translator.getTranslationByKey("website.action.waiting2")}</h2>
        </div>
    </div>`

    if (cudGetCachedProductsSearchResults().length > 0) {
        contentPending += `
    <div class="agent-download-div">
    <div class="buttons-align">`;
        let needUpdate = false;
        let canRollback = false;
        cudGetCachedProductsSearchResults().forEach((entry => {
            entry.getHybridInformations().forEach((hybInf) => {
                if (!hybInf.isForUninstall()) {
                    needUpdate = true;
                } else {
                    canRollback = true;
                }
            });
        }));
        if (needUpdate) {
            contentPending += `<h2><a href="javascript:void(0)" class="agent-download-button" onclick="showUpdatePage()">
            <img src="res/img/download_icon.png" width="128" height="128">
            ${translator.getTranslationByKey("action.choice.update")}</a></h2>`;
        } else {
            contentPending += `<h2><div class="agent-download-button">
            <img src="res/img/bulb.png" width="128" height="128">
            ${translator.getTranslationByKey("action.choice.update.no")}</div></h2>`;
        }

        if (canRollback) {
            contentPending += `
            <h2><a href="javascript:void(0)" class="agent-download-button" onclick="showRollbackPage()">
                <img src="res/img/arrow.png" width="128" height="128">
                ${translator.getTranslationByKey("action.choice.rollback")}</a></h2>`;
        } else {
            contentPending += `<h2><div class="agent-download-button">
            <img src="res/img/bulb.png" width="128" height="128">
            ${translator.getTranslationByKey("action.choice.rollback.no")}</div></h2>`;
        }


        contentPending += `</div></div>`
    } else {
        contentPending += `<img src="res/img/bulb.png" width="32" height="32">${translator.getTranslationByKey("action.choice.noproducts")}`
    }


    contentPending += `</div>
    <br>
        <div class="content-message-push-right">
        <img src="res/img/arrow.png" width="32" height="32">
        ${translator.getTranslationByKey("action.something.else",
        `<a href="javascript:void(0)" onclick="openCatalog()">${translator.getTranslationByKey("action.choice.catalog")}</a>`,
        `<a href="javascript:void(0)" onclick="openHistory()">${translator.getTranslationByKey("action.choice.history")}</a>`)}
        </div>
    `;
    contentFrame.innerHTML = contentPending;
});

const productsSearchNavigationEntry = new NavigationEntry("action.searching", (entry) => {
    entry.removeEntriesAfter();
    contentFrame.innerHTML = `<div class="content-message">
    <div class="content-message-top">
        <img src="res/img/icon.png" width="128" height="128">
        <div class="content-message-inner">
            <h1>${translator.getTranslationByKey("website.searching.title")}</h1><h2>${translator.getTranslationByKey("website.searching.subtitle")}</h2>
        </div>
    </div>
    <progress class="search-progress"></progress>
    </div>
    `;
    websiteBusy = true;
    cudSearchProducts(() => {
        websiteBusy = false;
        navigationList.push(selectWhatToDoEntry);
        selectWhatToDoEntry.selectEntry();
    });
});