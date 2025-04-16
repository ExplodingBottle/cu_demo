/*
 * This file is part of ChiffonUpdater
 *
 * SPDX-License-Identifier: MIT
 */

var translator;
var websiteBusy = false;
var contentFrame;
var agentDownloadDiv;
var actionsSummary;
var lastResults;
var lastRollbackInfos;

const ERROR_NOT_CONFIGURED = 6;

let pageNumber, ascendant, sortMode;

function openCatalog() {
    if (!websiteBusy) {
        navigationList.push(catalogBrowseEntry);
        catalogBrowseEntry.selectEntry();
    }
}

function createBannerForResults(productName, olderVersion, newerVersion, date, features, isDowngrade, status) {
    let color = "#116e64";
    let icon = "download_icon";
    let text = translator.getTranslationByKey(isDowngrade ? "history.downgrade" : "history.update", productName, olderVersion, newerVersion);
    if (status == UPDATE_ACTION_CANCELLED) {
        color = "darkgoldenrod";
        icon = "cancelled";
        text = translator.getTranslationByKey("history.cancelled", text);
    } else if (status == UPDATE_ACTION_FAILED) {
        color = "darksalmon";
        icon = "error";
        text = translator.getTranslationByKey("history.failed", text);
    } else {
        text = translator.getTranslationByKey("history.succeed", text);
    }
    let featuresText = features.join(", ");
    let dtText = "";
    if (date != null && date != "") {
        let date2 = new Date(date);
        dtText = translator.getTranslationByKey("history.date", date2.toLocaleString());
    }
    let banner = `<div class="display-banner" style="background-color: ${color};">
    <h3 style="width: 100%;"><img src="res/img/${icon}.png" width="64" height="64"><details><summary>
            ${text}</summary><br><br>${translator.getTranslationByKey("history.features", featuresText)}<br>
            ${dtText}</h3></details>
            </div>`
    return banner;

    // ${translator.getTranslationByKey("history.date", date2.toLocaleString())}
}

let idTableUpd = [];
let idTableRollback = [];
function setAllUpdatesState(state) {
    for (let i = 0; i < idTableUpd.length; i++) {
        let mainCheckbox = document.getElementById("main-upd-" + i);
        mainCheckbox.checked = state;
        updatesSelect(true, i, null);
    }
}

function setAllRollbackState(state) {
    for (let i = 0; i < idTableRollback.length; i++) {
        let mainCheckbox = document.getElementById("main-rbk-" + i);
        mainCheckbox.checked = state;
        rollbackSelectProduct(i);
    }
}

function rollbackSelectProduct(prodId) {
    let mainCheckbox = document.getElementById("main-rbk-" + prodId);
    for (let i = 0; i < idTableRollback[prodId][1].length; i++) {
        let versCheckbox = document.getElementById("vers-rbk-" + prodId + "-" + i);
        versCheckbox.disabled = !mainCheckbox.checked;
    }
    let atLeastOne = false;
    for (let i = 0; i < idTableRollback.length; i++) {
        let chkBoxTest = document.getElementById("main-rbk-" + i);
        if (chkBoxTest.checked) {
            atLeastOne = true;
            break;
        }
    }
    let rollbackButton = document.getElementById("rollback-updates");
    rollbackButton.disabled = !atLeastOne;

}

function updatesSelect(mainSelect, mainId, prodId) {
    let table = idTableUpd[mainId];
    if (mainSelect) {
        let mainCheckbox = document.getElementById("main-upd-" + mainId);
        for (let i = 0; i < table.length; i++) {
            let prodCheckbox = document.getElementById("prod-upd-" + mainId + "-" + i);
            prodCheckbox.checked = mainCheckbox.checked;
        }
    } else {
        let mainCheckbox = document.getElementById("main-upd-" + mainId);
        let firstVal = null;
        let willIndeterminate = false;
        for (let i = 0; i < table.length; i++) {
            let prodCheckbox = document.getElementById("prod-upd-" + mainId + "-" + i);
            if (firstVal == null) {
                firstVal = prodCheckbox.checked;
            }
            if (firstVal != prodCheckbox.checked) {
                mainCheckbox.indeterminate = true;
                willIndeterminate = true;
                break;
            }
        }
        if (!willIndeterminate) {
            mainCheckbox.indeterminate = false;
            mainCheckbox.checked = firstVal;
        }
    }
    let atLeastOne = false;
    for (let i = 0; i < idTableUpd.length && !atLeastOne; i++) {
        let table = idTableUpd[i];
        for (let k = 0; k < table.length && !atLeastOne; k++) {
            let prodCheckbox = document.getElementById("prod-upd-" + i + "-" + k);
            if (prodCheckbox.checked) {
                atLeastOne |= true;
                break;
            }
        }
    }
    let installButton = document.getElementById("install-updates");
    installButton.disabled = !atLeastOne;

}

function createRollbackBanners(products) {
    let banners = ``;
    idTableRollback = [];
    products.forEach(product => {
        let atLeastOne = false;
        let uninstHybInfs = [];
        product.getHybridInformations().forEach((hybInf) => {
            if (hybInf.isForUninstall()) {
                uninstHybInfs.push(hybInf);
                atLeastOne = true;
            }
        });
        if (atLeastOne) {
            let prodIter = idTableRollback.length;
            idTableRollback.push([product, uninstHybInfs]);
            let detailText = translator.getTranslationByKey("select.update.banner.product.details", product.getFeatures().join(", "), product.getInstallPath());
            let firstVer = true;

            banners += `<div class="display-banner" style="background-color: #116e64;">
        <h3 style="width: 100%;"><img src="res/img/icon.png" width="64" height="64"><details><summary>
                ${translator.getTranslationByKey("select.update.banner.product", product.getProductName(), product.getCurrentVersion())}
                <input id="main-rbk-${prodIter}" onclick="rollbackSelectProduct(${prodIter})" type="checkbox" class="b-checkbox"/></summary><br><br>${detailText}
                <br>${translator.getTranslationByKey("select.rollback.select")}`;
            for (let hybIter = 0; hybIter < uninstHybInfs.length; hybIter++) {
                let hybInfos = uninstHybInfs[hybIter];
                let checkSup = firstVer ? "checked" : "";
                let updDetails = "";
                if (hybInfos.getReleaseDate() != null) {
                    let date = new Date(hybInfos.getReleaseDate());
                    updDetails += translator.getTranslationByKey("select.update.banner.details", date.toLocaleDateString()) + "<br>";
                }
                if (hybInfos.getInstallDate() != null) {
                    let date = new Date(hybInfos.getInstallDate());
                    updDetails += translator.getTranslationByKey("select.rollback.installedon", date.toLocaleString()) + "<br>";
                }
                if (hybInfos.getDescription() != null && hybInfos.getDescription() != "") {
                    updDetails += translator.getTranslationByKey("select.rollback.versiondesc", hybInfos.getDescription()) + "<br>";
                }
                if (updDetails == "") {
                    updDetails += translator.getTranslationByKey("select.rollback.noinfo");
                }

                banners += `<div class="display-banner" style="background-color: #078c7e;">
                    <h4 style="width: 100%;"><details><summary>
                            ${translator.getTranslationByKey("select.rollback.version", hybInfos.getVersionName())}
                            <input id="vers-rbk-${prodIter}-${hybIter}" name="vers-rbk-${prodIter}-radio" type="radio" class="b-checkbox" ${checkSup} disabled/></summary><br>${updDetails}`;
                banners += `</details></h4>
                            </div>`;
                firstVer = false;
            }
            banners += `</details></h3>
                </div>`;
        }
    });
    return banners;
}

function createUpdateBanners(products) {
    let banners = ``;
    let updateTree = {};
    idTableUpd = [];

    products.forEach((product) => {
        product.getHybridInformations().forEach((hybInf) => {
            if (!hybInf.isForUninstall()) {
                let updDat = product.getProductName() + ";" + hybInf.getVersionName() + ";" + hybInf.getReleaseDate();
                if (!(updDat in updateTree)) {
                    updateTree[updDat] = [hybInf.getDescription(), []];
                }
                updateTree[updDat][1].push(product);
            }
        });
    });

    for (update in updateTree) {
        let updsTable = [];
        let mainId = idTableUpd.length;
        idTableUpd.push(updsTable);


        let updSplit = update.split(";");
        let text = translator.getTranslationByKey("select.update.banner1", updSplit[0], updSplit[1]);
        let dateText = "";
        if (updSplit[2] != "null") {
            dateText = translator.getTranslationByKey("select.update.banner.details", new Date(parseInt(updSplit[2])).toLocaleDateString());
        }
        let descText = "";
        if (updateTree[update][0] != "" && updateTree[update][0] != null) {
            descText = translator.getTranslationByKey("select.update.banner.details2", updateTree[update][0]);
        }

        banners += `<div class="display-banner" style="background-color: #116e64;">
        <h3 style="width: 100%;"><img src="res/img/download_icon.png" width="64" height="64"><details><summary>
                ${text}<input id="main-upd-${mainId}" onclick="updatesSelect(true, ${mainId}, null)" type="checkbox" class="b-checkbox"/></summary><br><br>${dateText}
                <br>${descText}<br><br>${translator.getTranslationByKey("select.update.banner.installon")}`;
        updateTree[update][1].forEach(prodTarget => {

            let prodId = updsTable.length;
            updsTable.push(prodTarget);

            let prodText = translator.getTranslationByKey("select.update.banner.product", updSplit[0], prodTarget.getCurrentVersion());
            let detailText = translator.getTranslationByKey("select.update.banner.product.details", prodTarget.getFeatures().join(", "), prodTarget.getInstallPath());
            banners += `<div class="display-banner" style="background-color: #078c7e;">
                    <h4 style="width: 100%;"><details><summary>
                            ${prodText}<input id="prod-upd-${mainId}-${prodId}" onclick="updatesSelect(false, ${mainId}, ${prodId})" type="checkbox" class="b-checkbox"/></summary><br>${detailText}`;
            banners += `</details></h4>
                            </div>`;
        });
        banners += `</details></h3>
                </div>`;

    }
    return banners;

    // ${translator.getTranslationByKey("history.date", date2.toLocaleString())}
}

function pageUpdate(i) {
    if (websiteBusy) {
        return;
    }
    pageNumber += i;
    fireCatalogUpdate(false);
}

function catalogSort(method) {
    if (websiteBusy) {
        return;
    }
    if (method == sortMode) {
        ascendant = !ascendant;
    } else {
        sortMode = method;
        ascendant = true;
    }
    fireCatalogUpdate();
}

function getCatalogIcon(method) {
    let icon = sortMode == method ? (ascendant ? "sorted" : "sorted_desc") : "sort";
    return `<img src="res/img/${icon}.png" width="32" height="32">`
}

let cachedCatalog = [];
function catalogDisplayInformations(itemId) {
    let rightItem = cachedCatalog.at(itemId);
    if (rightItem == null) {
        return;
    }
    let catalogInfos = window.open("", "_blank", "popup,width=500,height=600");
    catalogInfos.document.title = translator.getTranslationByKey("catalog.infos.details");
    catalogInfos.document.head.innerHTML += `<link rel="stylesheet" href="res/css/style.css">`;
    catalogInfos.document.body.setAttribute("style", `
    padding-top: 10px;
    background-color: #078c7e;
    color: white;
    text-wrap: wrap;
    overflow-wrap: break-word;
    `);
    let pending = `<img src="res/img/download_icon.png"><h3>${translator.getTranslationByKey("catalog.infos.detailed", rightItem.getProductName(), rightItem.getProductVersion())}</h3>`;
    if (rightItem.getReleaseDate() != null) {
        pending += `<h4>${translator.getTranslationByKey("select.update.banner.details", new Date(rightItem.getReleaseDate()).toLocaleDateString())}</h4>`;
    }
    let downloadUrl = cfg_backendUrl + "catalog/pool/" + rightItem.getDownloadFileName();
    pending += "<div>" + translator.getTranslationByKey("catalog.infos.download", `<a href="${downloadUrl}">${rightItem.getDownloadFileName()}</a>`) + "</div>";
    if (rightItem.getVersionDescription() != null && rightItem.getVersionDescription() != "") {
        pending += `<h4>${translator.getTranslationByKey("catalog.infos.detailed3")}</h4>${rightItem.getVersionDescription()}`;
    }
    catalogInfos.document.body.innerHTML = pending;
}

function fireCatalogUpdate(resetSearch) {

    if (websiteBusy) {
        return;
    }
    if (resetSearch) {
        pageNumber = 0;
        ascendant = true;
        sortMode = AGENT_CATALOG_SORT_NAME;
    }
    let searchContent = document.getElementById("catalog-search-content");
    let searchBox = document.getElementById("catalog-search");
    let controlBar = document.getElementById("catalog-search-controlbar");

    websiteBusy = true;
    controlBar.innerText = translator.getTranslationByKey("catalog.loading");

    let pendingControlBar = "";
    let pendingSearchContent = "";

    cudFetchCatalog(pageNumber, (results) => {
        let maxPages = results[0];
        let catalog = results[1];
        if (catalog.length == 0) {
            controlBar.innerHTML = translator.getTranslationByKey("catalog.noresults");
            searchContent.innerHTML = "";
            websiteBusy = false;
            return;
        }
        if (pageNumber > 0) {
            pendingControlBar += `<a href="javascript:void(0)" onclick="pageUpdate(-1)">${translator.getTranslationByKey("catalog.previous")}</a>`;
        } else {
            pendingControlBar += `<a>${translator.getTranslationByKey("catalog.previous")}</a>`;
        }
        pendingControlBar += " | ";
        if (pageNumber + 1 < maxPages) {
            pendingControlBar += `<a href="javascript:void(0)" onclick="pageUpdate(1)">${translator.getTranslationByKey("catalog.next")}</a>`;
        } else {
            pendingControlBar += `<a>${translator.getTranslationByKey("catalog.next")}</a>`;
        }
        pendingControlBar += " | " + translator.getTranslationByKey("catalog.current", pageNumber + 1, maxPages) + "<br>";

        pendingSearchContent = `<table class="catalog-table"><tr>
        <th><a href="javascript:void(0)" onclick="catalogSort(AGENT_CATALOG_SORT_NAME)">${getCatalogIcon(AGENT_CATALOG_SORT_NAME)}${translator.getTranslationByKey("catalog.infos.name")}</a></th>
        <th><a href="javascript:void(0)" onclick="catalogSort(AGENT_CATALOG_SORT_VERSION)">${getCatalogIcon(AGENT_CATALOG_SORT_VERSION)}${translator.getTranslationByKey("catalog.infos.version")}</a></th>
        <th><a href="javascript:void(0)" onclick="catalogSort(AGENT_CATALOG_SORT_DATE)">${getCatalogIcon(AGENT_CATALOG_SORT_DATE)}${translator.getTranslationByKey("catalog.infos.releasedate")}</a></th>
        <th>${translator.getTranslationByKey("catalog.infos.moreinfos")}</th></tr></thead><tbody>
        `;
        cachedCatalog = catalog;
        catalog.forEach(item => {
            let relDate = "";
            if (item.getReleaseDate() != null) {
                relDate = new Date(item.getReleaseDate()).toLocaleDateString();
            }
            pendingSearchContent += `<tr>
            <td>${item.getProductName()}</td><td>${item.getProductVersion()}</td><td>${relDate}</td><td><a onclick="catalogDisplayInformations(${catalog.indexOf(item)})" href="javascript:void(0)">${translator.getTranslationByKey("catalog.infos.moreinfos")}</a></td>
            </tr>`
        });
        pendingSearchContent += `</tbody></table>`

        controlBar.innerHTML = pendingControlBar;
        searchContent.innerHTML = pendingSearchContent;
        websiteBusy = false;
    }, sortMode, searchBox.value, !ascendant);
}

function openHistory() {
    if (!websiteBusy) {
        navigationList.push(actionHistoryNavigationEntry);
        actionHistoryNavigationEntry.selectEntry();
    }
}

function downloadAgent() {
    agentDownloadDiv.innerHTML = `
    <iframe style="display: none;" id="download-frame" src="${cfg_backendUrl + "config/webcompat/agent_dl.html"}">

    </iframe>
    `;
}

function startProductsSearch() {
    let navEntry = productsSearchNavigationEntry;
    navigationList.push(navEntry);
    navEntry.selectEntry();
}

function showConnectionEntry() {
    if (typeof cfg_frontendConfigured == "undefined" || !cfg_frontendConfigured) {
        onDriverError(ERROR_NOT_CONFIGURED);
        return;
    }

    navigationList.push(connectionNavigationEntry);
    connectionNavigationEntry.selectEntry();
}

let lastSelectedBeforeError;
function driverErrorRetry() {
    if (lastSelectedBeforeError != null) {
        lastSelectedBeforeError.selectEntry();
    }
}

function showUpdatePage() {
    if (!websiteBusy) {
        navigationList.push(selectingUpdates);
        selectingUpdates.selectEntry();
    }
}

function showRollbackPage() {
    if (!websiteBusy) {
        navigationList.push(rollbackUpdates);
        rollbackUpdates.selectEntry();
    }
}

function showRollbackSummary() {
    if (!websiteBusy) {
        lastRollbackInfos = [];
        for (let i = 0; i < idTableRollback.length; i++) {
            let infos = idTableRollback[i];
            let prodCheck = document.getElementById("main-rbk-" + i);
            if (prodCheck.checked) {
                for (let k = 0; k < infos[1].length; k++) {
                    let prodRadio = document.getElementById("vers-rbk-" + i + "-" + k);
                    if (prodRadio.checked) {
                        lastRollbackInfos.push([infos[0], infos[1][k]]);
                    }
                }
            }
        }
        actionsSummary = { "action": ACTION_TYPE_ROLLBACK, "actionsTree": lastRollbackInfos };
        navigationList.push(summaryNavigationEntry);
        summaryNavigationEntry.selectEntry();
    }
}

function showUpdatesSummary() {
    if (!websiteBusy) {
        let updates = [];
        for (let i = 0; i < idTableUpd.length; i++) {
            let table = idTableUpd[i];
            for (let k = 0; k < table.length; k++) {
                let prodCheckbox = document.getElementById("prod-upd-" + i + "-" + k);
                if (prodCheckbox.checked) {
                    updates.push(table[k]);
                }
            }
        }
        actionsSummary = { "action": ACTION_TYPE_UPDATE, "actionsTree": updates };
        navigationList.push(summaryNavigationEntry);
        summaryNavigationEntry.selectEntry();
    }
}

function performActions() {
    if (!websiteBusy) {
        navigationList.push(performingActionsNavigationEntry);
        performingActionsNavigationEntry.selectEntry();
    }
}

function onDriverError(errorCode) {
    websiteBusy = false;
    lastSelectedBeforeError = currentNavigationEntry;
    let err = "0x" + errorCode.toString(16);
    let errorEntry = new NavigationEntry("website.error", (entry) => {
        let targetText = `<div class="content-message">
            <div class="content-message-top">
                <img src="res/img/error.png" width="128" height="128">
                <div class="content-message-inner">
                    <h1>${translator.getTranslationByKey("website.error.text")}</h1><h2>${translator.getTranslationByKey("website.error.text2", err)}</h2>
                </div>
            </div>
            `;

        let keyTest = "website.error." + errorCode.toString(16);
        let translated = translator.getTranslationByKey(keyTest);
        if (translated != keyTest) {
            targetText += "<h4>" + translated + "</h4>";
        }

        if (errorCode == CONNECTION_OPEN_FAILED) {
            // Display the download button!
            targetText += `<div class="agent-download-div"><h2><a href="javascript:void(0)" onclick="downloadAgent();" class="agent-download-button">
            <img src="res/img/download_icon.png" width="128" height="128">
            ${translator.getTranslationByKey("agent.download.button")}</a></h2></div>
            `
        }

        targetText += `<br>${translator.getTranslationByKey("website.error.text3")}</div><br>
        <div class="content-message-push-right"><a href="javascript:void(0)" onclick="driverErrorRetry()">
        <img src="res/img/arrow.png" width="32" height="32">
        ${translator.getTranslationByKey("website.error.retry")}
        </a></div>
        `;
        contentFrame.innerHTML = targetText;
    });
    navigationList.push(errorEntry);
    errorEntry.selectEntry();
}

function showAbout() {
    if (!websiteBusy) {
        aboutNavigationEntry.selectEntry();
    }
}
function showCookiesPolicy() {
    if (!websiteBusy) {
        cookiesNavigationEntry.selectEntry();
    }
}

window.addEventListener("load", (evt) => {
    translator = new WebsiteTranslator(() => {
        document.title = translator.getTranslationByKey("website.title");

        let lowerBanner = document.getElementById("lower-banner");
        lowerBanner.innerHTML = `<br>
        <a href="javascript:void(0)" onclick="showAbout()">${translator.getTranslationByKey("about.title")}</a>
        <a href="javascript:void(0)" onclick="showCookiesPolicy()">${translator.getTranslationByKey("about.cookie.title")}</a>
        `;

        document.getElementById("upper-banner-title").innerText = translator.getTranslationByKey("website.title");
        document.getElementById("upper-banner-subtitle").innerText = translator.getTranslationByKey("website.subtitle");
        contentFrame = document.getElementById("content-frame");
        agentDownloadDiv = document.getElementById("download-div");
        cudSetErrorCallback(onDriverError);

        showConnectionEntry();
    });
});
