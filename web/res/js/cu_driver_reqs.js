/*
 * This file is part of ChiffonUpdater
 *
 * SPDX-License-Identifier: MIT
 */

/* Requests and their handling code for the driver */

const AGENT_STATE_IDLE = "IDLE";
const AGENT_STATE_BUSY = "BUSY";
const AGENT_STATE_UNCONFIGURED = "UNCONFIGURED";

const AGENT_CATALOG_SORT_NAME = "name";
const AGENT_CATALOG_SORT_DATE = "date";
const AGENT_CATALOG_SORT_VERSION = "version";

const UPDATE_ACTION_SUCCESS = 0;
const UPDATE_ACTION_CANCELLED = 1;
const UPDATE_ACTION_FAILED = -1;

const ACTION_TYPE_UPDATE = "update";
const ACTION_TYPE_ROLLBACK = "rollback";

class RequestResults {
    #failed;
    #informations;

    constructor(failed, informations) {
        this.#failed = failed;
        this.#informations = informations;
    }

    hasRequestFailed() {
        return this.#failed;
    }

    getRequestInformations() {
        return this.#informations;
    }
}

class CatalogEntry {
    #productName;
    #productVersion;
    #versionDescription;
    #downloadFileName;
    #releaseDate

    constructor(productName, productVersion, versionDescription, downloadFileName, releaseDate) {
        this.#productName = productName;
        this.#productVersion = productVersion;
        this.#versionDescription = versionDescription;
        this.#downloadFileName = downloadFileName;
        this.#releaseDate = releaseDate;
    }

    getProductName() {
        return this.#productName;
    }

    getProductVersion() {
        return this.#productVersion;
    }

    getVersionDescription() {
        return this.#versionDescription;
    }

    getDownloadFileName() {
        return this.#downloadFileName;
    }

    getReleaseDate() {
        return this.#releaseDate;
    }
}

class ActionHistoryRecord {
    #productName;
    #actionDate;
    #previousVersion;
    #targetVersion;
    #features;
    #downgrade;
    #status;

    constructor(productName, actionDate, previousVersion, targetVersion, features, downgrade, status) {
        this.#productName = productName;
        this.#actionDate = actionDate;
        this.#previousVersion = previousVersion;
        this.#targetVersion = targetVersion;
        this.#features = features;
        this.#downgrade = downgrade;
        this.#status = status;
    }

    getProductName() {
        return this.#productName;
    }

    getActionDate() {
        return this.#actionDate;
    }

    getPreviousVersion() {
        return this.#previousVersion;
    }

    getTargertVersion() {
        return this.#targetVersion;
    }

    getFeatures() {
        return this.#features;
    }

    isDowngrade() {
        return this.#downgrade;
    }

    getStatus() {
        return this.#status;
    }
}

class HybridInformations {
    #versionName;
    #forUninstall;
    #installDate;
    #releaseDate;
    #description;

    constructor(versionName, forUninstall, installDate, releaseDate, description) {
        this.#versionName = versionName;
        this.#forUninstall = forUninstall;
        this.#installDate = installDate;
        this.#releaseDate = releaseDate;
        this.#description = description;
    }

    getVersionName() {
        return this.#versionName;
    }

    isForUninstall() {
        return this.#forUninstall;
    }

    getInstallDate() {
        return this.#installDate;
    }

    getReleaseDate() {
        return this.#releaseDate;
    }

    getDescription() {
        return this.#description;
    }
}

class SearchResult {
    #productName;
    #currentVersion;
    #installPath;
    #features;
    #hybridInformations

    constructor(productName, currentVersion, installPath, features, hybridInformations) {
        this.#productName = productName;
        this.#currentVersion = currentVersion;
        this.#installPath = installPath;
        this.#features = features;
        this.#hybridInformations = hybridInformations;
    }

    getProductName() {
        return this.#productName;
    }

    getCurrentVersion() {
        return this.#currentVersion;
    }

    getInstallPath() {
        return this.#installPath;
    }

    getFeatures() {
        return this.#features;
    }

    getHybridInformations() {
        return this.#hybridInformations;
    }
}

class AgentDriverRequest {
    #requestName;
    #infosTransformationFunction;
    #resultsTransformationFunction;
    #requiresAuthCookie;

    constructor(requestName, infosTransformationFunction, resultsTransformationFunction, requiresAuthCookie) {
        this.#requestName = requestName;
        this.#infosTransformationFunction = infosTransformationFunction;
        this.#resultsTransformationFunction = resultsTransformationFunction;
        this.#requiresAuthCookie = requiresAuthCookie;
    }

    getRequestName() {
        return this.#requestName;
    }

    requiresAuthCookie() {
        return this.#requiresAuthCookie;
    }

    getRequestParametersFromInformations(infos) {
        if (this.#infosTransformationFunction != null) {
            return this.#infosTransformationFunction(infos);
        } else {
            return {};
        }
    }

    getInformationsFromResponseData(status, data) {
        if (this.#resultsTransformationFunction != null) {
            return this.#resultsTransformationFunction(status, data);
        } else {
            return data;
        }
    }
}

function cudSharedReadStringWithSize(input) {
    let result = null;
    let splitStr = input.split("\n");
    if (splitStr.length >= 1) {
        let length = parseInt(splitStr[0]);
        if (isNaN(length)) {
            return [input, result];
        }
        let remainingString = input.substring(splitStr[0].length + 1, input.length); // + 1 because of \n
        result = remainingString.substring(0, length);
        input = remainingString.substring(length + 1, remainingString.length);
    }
    return [input, result];
}

function cudSharedReadSmallStringsArray(input) {
    let splitStr = input.split("\n");
    if (splitStr.length >= 1) {
        let lRead = splitStr[0].length + 1;
        let length = parseInt(splitStr[0]);
        if (isNaN(length)) {
            return [input, null];
        }
        let array = [];
        for (let i = 0; i < length; i++) {
            array.push(splitStr[1 + i]);
            lRead += splitStr[1 + i].length + 1;
        }
        return [input.substring(lRead, input.length), array]; // + length = + 1*length (because of \n)
    }
    return [input, null];
}

function cudSharedReadStr(input) {
    let splitStr = input.split("\n");
    if (splitStr.length >= 1) {
        return [input.substring(splitStr[0].length + 1, input.length), splitStr[0]];
    }
    return [input, null];
}

function cudSharedReadNumber(input) {
    let res = cudSharedReadStr(input);
    if (res[1] == "null") {
        res[1] = null;
    }
    if (res[1] != null) {
        res[1] = parseInt(res[1]);
        if (isNaN(res[1])) {
            res[1] = null;
        }
    }
    return res;
}

const REQUEST_STATUS = new AgentDriverRequest("status", null, (statusCode, data) => {
    let dat = data.trim();
    if (statusCode == 200 && (dat == AGENT_STATE_IDLE || dat == AGENT_STATE_BUSY || dat == AGENT_STATE_UNCONFIGURED)) {
        return dat;
    }
    return false;
}, true);
const REQUEST_FEED_CONFIG = new AgentDriverRequest("feed_configuration", (infos) => {
    if (infos != null) {
        return { "backend": infos };
    }
    return {};
}, (statusCode, data) => {
    if (statusCode == 200) {
        return true;
    }
    return false;
}, true);
const REQUEST_KEY_PERSISTENCE = new AgentDriverRequest("key_persistence", null, (statusCode, data) => {
    if (statusCode == 200 && data.trim() != "") {
        return [true, data];
    }
    if (statusCode == 401) {
        return [false, null];
    }
    return null;
}, true);
const REQUEST_CONTROL_ACCEPTED = new AgentDriverRequest("control_accepted", null, (statusCode, data) => {
    let dat = data.trim();
    if (statusCode == 200 && (dat == "false" || dat == "wait" || dat == "true")) {
        return dat;
    }
    return null;
}, true);
const REQUEST_REQUEST_CONTROL = new AgentDriverRequest("request_control", (infos) => {
    if (infos != null) {
        return { "accessKey": infos };
    }
    return {};
}, (statusCode, data) => {
    if (statusCode == 200 && data.trim() != "") {
        return data;
    }
    return null;
}, false);
const REQUEST_SEARCH_PRODUCTS = new AgentDriverRequest("search_products", null, (statusCode, data) => {
    if (statusCode == 200) {
        return true;
    }
    return false;
}, true);
const REQUEST_SEARCH_RESULTS = new AgentDriverRequest("search_results", null, (statusCode, data) => {

    if (statusCode == 200 && data.trim() != "null") {
        let callWithDat = function (cBack) {
            let res = cBack(data);
            data = res[0];
            return res[1];
        };
        let results = [];
        while (!data.trim() == "") {
            let productName = callWithDat(cudSharedReadStringWithSize);
            let currentVersion = callWithDat(cudSharedReadStringWithSize);
            let installPath = callWithDat(cudSharedReadStringWithSize);
            let features = callWithDat(cudSharedReadSmallStringsArray);

            let hybridInfosList = [];
            let hybridInfosCount = callWithDat(cudSharedReadNumber);
            for (let i = 0; i < hybridInfosCount; i++) {
                let hybInfosName = callWithDat(cudSharedReadStringWithSize);
                let availForUninst = callWithDat(cudSharedReadStr);
                let installDate = callWithDat(cudSharedReadNumber);
                let releaseDate = callWithDat(cudSharedReadNumber);
                let hybInfoDesc = callWithDat(cudSharedReadStringWithSize);

                let hybInfos = new HybridInformations(hybInfosName, availForUninst == "true", installDate, releaseDate, hybInfoDesc);
                hybridInfosList.push(hybInfos);
            }


            let result = new SearchResult(productName, currentVersion, installPath, features, hybridInfosList);
            results.push(result);
        }
        return results;
    }
    return null;
}, true);
const REQUEST_ACTION_RESULTS = new AgentDriverRequest("action_results", null, (statusCode, data) => {
    if (statusCode == 200 && data.trim() != "null") {
        let results = [];
        let split = data.split("\n");
        let cachedSearch = cudGetCachedProductsSearchResults();
        split.forEach(record => {
            let split2 = record.split("=");
            if (split2.length == 2) {
                let id = parseInt(split2[0]);
                let result = parseInt(split2[1]);
                if (!isNaN(id) && !isNaN(result)) {
                    results.push([cachedSearch[id], result]);
                }
            }
        });
        return results;
    }
    return null;
}, true);
const REQUEST_ACTIONS_HISTORY = new AgentDriverRequest("actions_history", null, (statusCode, data) => {
    if (statusCode == 200 && data.trim() != "null") {
        let results = [];
        let split = data.split("\n");
        split.forEach(record => {
            let split2 = record.split(";");
            if (split2.length == 7) {
                let productName = split2[0];
                let actionDate = parseInt(split2[1]);
                if (isNaN(actionDate)) {
                    actionDate = null;
                }
                let installVers = split2[2];
                let targetVers = split2[3];
                let features = split2[4].split(",");
                let downgrade = "true" == split2[5];
                let status = parseInt(split2[6]);
                if (isNaN(status)) {
                    status = null;
                }
                results.push(new ActionHistoryRecord(productName, actionDate, installVers, targetVers, features, downgrade, status));
            }
        });
        return results;
    }
    return null;
}, true);
const REQUEST_PERFORM_ACTIONS = new AgentDriverRequest("perform_actions", (infos) => {
    if (infos != null && infos.length == 2) {
        let params = { "action": infos[0] };
        if (infos[0] == ACTION_TYPE_UPDATE) {
            let ids = [];
            let results = cudGetCachedProductsSearchResults();
            infos[1].forEach(product => {
                ids.push(results.indexOf(product));
            });
            params["update_list"] = ids.join(";");
            return params;
        }
        if (infos[0] == ACTION_TYPE_ROLLBACK) {
            let rb_list = [];
            let results = cudGetCachedProductsSearchResults();
            infos[1].forEach(rbkInfo => {
                rb_list.push(results.indexOf(rbkInfo[0]) + ":" + rbkInfo[1].getVersionName());
            });
            params["rollback_list"] = rb_list.join(";");
            return params;
        }
    }
    return {};
}, (statusCode, data) => {
    if (statusCode == 200) {
        return true;
    }
    return false;
}, true);
const REQUEST_FETCH_CATALOG = new AgentDriverRequest("fetch_catalog", (infos) => {
    if (infos != null) {
        if (infos[1] == null) {
            infos[1] = AGENT_CATALOG_SORT_NAME;
        }
        let infosWritten = { "page": infos[0], "sort": infos[1] };
        if (infos[2] == true) { // Sanitization
            infosWritten["descendantSort"] = "true";
        }
        if (infos[3] != null) {
            infosWritten["search"] = infos[3];
        }

        return infosWritten;
    }
    return {};
}, (statusCode, data) => {
    let callWithDat = function (cBack) {
        let res = cBack(data);
        data = res[0];
        return res[1];
    };
    if (statusCode == 200) {
        let pageCount = callWithDat(cudSharedReadNumber);
        let catalog = [];
        while (!data.trim() == "") {
            let releaseDate = callWithDat(cudSharedReadNumber);
            let productName = callWithDat(cudSharedReadStringWithSize);
            let targetVersion = callWithDat(cudSharedReadStringWithSize);
            let description = callWithDat(cudSharedReadStringWithSize);
            let downloadFileName = callWithDat(cudSharedReadStringWithSize);
            catalog.push(new CatalogEntry(productName, targetVersion, description, downloadFileName, releaseDate));
        }
        return [pageCount, catalog];
    }
    return null;

}, true);
const REQUEST_PING = new AgentDriverRequest("ping", null, (statusCode, data) => {
    if (statusCode == 200) {
        return true;
    }
    return false;
}, false);