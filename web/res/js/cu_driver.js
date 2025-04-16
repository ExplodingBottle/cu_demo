/*
 * This file is part of ChiffonUpdater
 *
 * SPDX-License-Identifier: MIT
 */

/* This is the driver for the ChiffonUpdater agent */

/* Settings */
const DRIVER_AGENT_BASE_PORT = 17458;
const DRIVER_PORT_MAX_ITER = 20;
const DRIVER_REQUEST_TIMEOUT = 3000;
const REQUEST_REFRESH_DELAY = 1000;

/* Errors */
const CONNECTION_OPEN_FAILED = 1;
const CONNECTION_REFUSED = 2;
const CONNECTION_PENDING_OPEN = 3;
const CONNECTION_ALREADY_OPEN = 4;
const CONNECTION_NOT_OPENED = 5;
// 6 is reserved
const CONFIGURATION_FEED_FAILED = 7;
const DRIVER_BUSY = 8;
const PRODUCTS_SEARCH_FAILED = 9;
const CATALOG_FETCH_FAILED = 10;
const HISTORY_FETCH_FAILED = 11;
const PERFORM_ACTIONS_FAILED = 12;
const INVALID_ACTION_TYPE = 13;

{
    let cudCurrentConnection;
    let driverBusy = false;
    let cudErrorCallback;
    let connectionOpenedCallback;
    let isStorageAllowed = false;
    let testAgentConnections = [];
    let currentSearchedProducts = [];

    class AgentConnection {
        #portNumber;
        #authCookie;

        performRequestAsync(request, callback, informations) {
            let requestUrl = `http://127.0.0.1:${this.#portNumber}/agent/${request.getRequestName()}`;
            let parametersList = request.getRequestParametersFromInformations(informations);
            if (parametersList == null) { // Shouldn't happen, just to be sure.
                parametersList = {};
            }
            if (request.requiresAuthCookie()) {
                parametersList["cookie"] = this.#authCookie;
            }

            let isFirstParameter = true;
            let argsList = "";
            for (let paramName in parametersList) {
                let paramValue = parametersList[paramName];
                if (paramValue != null) {
                    argsList += (isFirstParameter ? "?" : "&") + encodeURI(paramName) + "=" + encodeURI(paramValue);
                    isFirstParameter = false;
                }
            }

            let xhrRequest = new XMLHttpRequest();
            xhrRequest.timeout = DRIVER_REQUEST_TIMEOUT;
            xhrRequest.onload = () => {
                if (callback != null) {
                    callback(new RequestResults(false, request.getInformationsFromResponseData(xhrRequest.status, xhrRequest.responseText)));
                }
            };
            xhrRequest.onerror = () => {
                if (callback != null) {
                    callback(new RequestResults(true, null));
                }
            };
            xhrRequest.onabort = xhrRequest.onerror;
            xhrRequest.ontimeout = xhrRequest.onerror;
            xhrRequest.open("GET", requestUrl + argsList);
            xhrRequest.send();
        }

        setAuthenticationCookie(authCookie) {
            this.#authCookie = authCookie;
        }

        constructor(portNumber) {
            this.#portNumber = portNumber;
        }
    }

    let privRemoveTestConnection = function (conn) {
        let i = testAgentConnections.indexOf(conn);
        if (i > -1) {
            testAgentConnections.splice(i, 1);
            if (testAgentConnections.length <= 0) {
                driverBusy = false;
                privCallErrorCallback(CONNECTION_OPEN_FAILED);
            }
        }
    }

    let privCallErrorCallback = function (errorCode) {
        if (cudErrorCallback != null) {
            cudErrorCallback(errorCode);
        } else {
            console.log(`Driver default error callback called. Error code: 0x${errorCode.toString(16)}`);
        }
    }

    let privAgentReadyTask = function () {
        console.log("The agent and the driver are now ready.");
        driverBusy = false;
        if (connectionOpenedCallback != null) {
            connectionOpenedCallback();
        }
    }

    let privSavePersistentAccessKey = function () {
        if (!isStorageAllowed) {
            privAgentReadyTask();
            return;
        }
        cudCurrentConnection.performRequestAsync(REQUEST_KEY_PERSISTENCE, (results) => {
            if (!results.hasRequestFailed() && results.getRequestInformations() != null) {
                if (results.getRequestInformations()[0]) {
                    console.log("The agent has granted a persistent access key.");
                    localStorage.setItem("ChiffonUpdaterAccessKey", results.getRequestInformations()[1]);
                }
            } else {
                console.log("An error has occured while retrieving the persistent access key but will be ignored.");
            }
            privAgentReadyTask();
        }, null);
    }

    let privWaitForConfigurationFeed = function () {
        cudCurrentConnection.performRequestAsync(REQUEST_STATUS, (results) => {
            if (!results.hasRequestFailed() && results.getRequestInformations() != null) {
                switch (results.getRequestInformations()) {
                    case AGENT_STATE_IDLE:
                        console.log("The agent has configured itself and is now idle.");
                        privSavePersistentAccessKey();
                        return;
                    case AGENT_STATE_BUSY:
                        setTimeout(privWaitForConfigurationFeed, REQUEST_REFRESH_DELAY);
                        return;
                    case AGENT_STATE_UNCONFIGURED:
                    default:
                }
            }

            cudCurrentConnection = null;
            driverBusy = false;
            privCallErrorCallback(CONFIGURATION_FEED_FAILED);
        }, null);
    }

    let privWaitForConnectionAccept = function (connection, backendURL) {
        if (cudCurrentConnection != connection) {
            privRemoveTestConnection(connection);
        }
        connection.performRequestAsync(REQUEST_CONTROL_ACCEPTED, (results) => {
            if (!results.hasRequestFailed() && results.getRequestInformations() != null) {
                if (cudCurrentConnection == connection) {
                    switch (results.getRequestInformations()) {
                        case "true":
                            testAgentConnections = [];
                            console.log("Connection accepted!");
                            connection.performRequestAsync(REQUEST_FEED_CONFIG, (results) => {
                                if (!results.hasRequestFailed() && results.getRequestInformations()) {
                                    console.log("Must wait for the agent to configure itself.");
                                    privWaitForConfigurationFeed();
                                } else {
                                    driverBusy = false;
                                    cudCurrentConnection = null;
                                    privCallErrorCallback(CONFIGURATION_FEED_FAILED);
                                }
                            }, backendURL);
                            return;
                        case "wait":
                            setTimeout(() => {
                                privWaitForConnectionAccept(connection, backendURL);
                            }, REQUEST_REFRESH_DELAY);
                            return;
                        case "false":
                            driverBusy = false;
                            testAgentConnections = [];
                            cudCurrentConnection = null;
                            privCallErrorCallback(CONNECTION_REFUSED);
                            return;
                        default:
                    }
                }
            }
            privRemoveTestConnection(connection);

        }, null);
    }


    let privSearchProductsWait = function (productsSearchEndCallback) {
        cudCurrentConnection.performRequestAsync(REQUEST_STATUS, (results) => {
            if (!results.hasRequestFailed() && results.getRequestInformations() != null) {
                switch (results.getRequestInformations()) {
                    case AGENT_STATE_IDLE:
                        console.log("The agent has finished searching for products and other informations. Obtaining results...");

                        cudCurrentConnection.performRequestAsync(REQUEST_SEARCH_RESULTS, (results) => {
                            if (!results.hasRequestFailed() && results.getRequestInformations() != null) {
                                currentSearchedProducts = results.getRequestInformations();
                                console.log("Results obtained.");
                                driverBusy = false;
                                productsSearchEndCallback(currentSearchedProducts);
                                return
                            }
                            driverBusy = false;
                            privCallErrorCallback(PRODUCTS_SEARCH_FAILED);
                        }, null);

                        return;
                    case AGENT_STATE_BUSY:
                        setTimeout(() => {
                            privSearchProductsWait(productsSearchEndCallback);
                        }, REQUEST_REFRESH_DELAY);
                        return;
                    case AGENT_STATE_UNCONFIGURED:
                    default:
                }
            }
            driverBusy = false;
            privCallErrorCallback(PRODUCTS_SEARCH_FAILED);
        }, null);
    }

    let privPerformActionsWait = function (performActionsEndCallback) {
        cudCurrentConnection.performRequestAsync(REQUEST_STATUS, (results) => {
            if (!results.hasRequestFailed() && results.getRequestInformations() != null) {
                switch (results.getRequestInformations()) {
                    case AGENT_STATE_IDLE:
                        console.log("The agent has finished performing actions. Obtaining results...");

                        cudCurrentConnection.performRequestAsync(REQUEST_ACTION_RESULTS, (results) => {
                            if (!results.hasRequestFailed() && results.getRequestInformations() != null) {
                                console.log("Results obtained.");
                                driverBusy = false;
                                performActionsEndCallback(results.getRequestInformations());
                                return
                            }
                            driverBusy = false;
                            privCallErrorCallback(PERFORM_ACTIONS_FAILED);
                        }, null);

                        return;
                    case AGENT_STATE_BUSY:
                        setTimeout(() => {
                            privPerformActionsWait(performActionsEndCallback);
                        }, REQUEST_REFRESH_DELAY);
                        return;
                    case AGENT_STATE_UNCONFIGURED:
                    default:
                }
            }
            driverBusy = false;
            privCallErrorCallback(PERFORM_ACTIONS_FAILED);
        }, null);
    }

    function cudPerformActions(actionCallback, actionType, list) {
        if (actionType != ACTION_TYPE_ROLLBACK && actionType != ACTION_TYPE_UPDATE) {
            privCallErrorCallback(INVALID_ACTION_TYPE);
            return;
        }
        if (cudCurrentConnection == null) {
            privCallErrorCallback(CONNECTION_NOT_OPENED);
            return;
        }
        if (driverBusy) {
            privCallErrorCallback(DRIVER_BUSY);
            return;
        }
        driverBusy = true;
        cudCurrentConnection.performRequestAsync(REQUEST_PERFORM_ACTIONS, (results) => {
            if (!results.hasRequestFailed()) {
                console.log("Actions will be performed as the request has been sent.");
                privPerformActionsWait(actionCallback);
                driverBusy = false;
                return;
            }
            driverBusy = false;
            privCallErrorCallback(PERFORM_ACTIONS_FAILED);
        }, [actionType, list]);
    }

    function cudFetchActionsHistory(historyCallback) {
        if (cudCurrentConnection == null) {
            privCallErrorCallback(CONNECTION_NOT_OPENED);
            return;
        }
        if (driverBusy) {
            privCallErrorCallback(DRIVER_BUSY);
            return;
        }
        driverBusy = true;
        cudCurrentConnection.performRequestAsync(REQUEST_ACTIONS_HISTORY, (results) => {
            if (!results.hasRequestFailed()) {
                driverBusy = false;
                historyCallback(results.getRequestInformations());
                return;
            }
            driverBusy = false;
            privCallErrorCallback(HISTORY_FETCH_FAILED);
        }, null);
    }

    function cudFetchCatalog(pageNumber, catalogFetchEndCallback, sortMethod, search, descendant) {
        if (cudCurrentConnection == null) {
            privCallErrorCallback(CONNECTION_NOT_OPENED);
            return;
        }
        if (driverBusy) {
            privCallErrorCallback(DRIVER_BUSY);
            return;
        }
        if (sortMethod == null) {
            sortMethod = AGENT_CATALOG_SORT_NAME;
        }
        driverBusy = true;
        cudCurrentConnection.performRequestAsync(REQUEST_FETCH_CATALOG, (results) => {
            if (!results.hasRequestFailed() && results.getRequestInformations() != null) {
                driverBusy = false;
                catalogFetchEndCallback(results.getRequestInformations());
                return;
            }
            driverBusy = false;
            privCallErrorCallback(CATALOG_FETCH_FAILED);
        }, [pageNumber, sortMethod, descendant == true, search]);
    }

    function cudSearchProducts(productsSearchEndCallback) {
        if (cudCurrentConnection == null) {
            privCallErrorCallback(CONNECTION_NOT_OPENED);
            return;
        }
        if (driverBusy) {
            privCallErrorCallback(DRIVER_BUSY);
            return;
        }
        driverBusy = true;
        currentSearchedProducts = [];
        cudCurrentConnection.performRequestAsync(REQUEST_SEARCH_PRODUCTS, (results) => {
            if (!results.hasRequestFailed() && results.getRequestInformations()) {
                console.log("Search products request sent. Waiting for completion.");
                privSearchProductsWait(productsSearchEndCallback)
            } else {
                driverBusy = false;
                privCallErrorCallback(PRODUCTS_SEARCH_FAILED);
            }
        }, null);
    }

    function cudGetCachedProductsSearchResults() {
        return currentSearchedProducts;
    }

    function cudOpenConnection(backendURL, connectionOpenedCallbackArg) {
        if (cudCurrentConnection != null) {
            privCallErrorCallback(CONNECTION_ALREADY_OPEN);
            return;
        }
        if (testAgentConnections.length) {
            privCallErrorCallback(CONNECTION_PENDING_OPEN);
            return;
        }
        if (driverBusy) {
            privCallErrorCallback(DRIVER_BUSY);
            return;
        }
        driverBusy = true;
        connectionOpenedCallback = connectionOpenedCallbackArg;
        currentSearchedProducts = [];

        let persistentAccessKey = null;
        try {
            persistentAccessKey = localStorage.getItem("ChiffonUpdaterAccessKey");
            isStorageAllowed = true;
        } catch (error) {
            console.log("Driver couldn't load the persistent access key because of an error. Error: " + error);
            isStorageAllowed = false;
        }

        for (let port = DRIVER_AGENT_BASE_PORT; port < DRIVER_AGENT_BASE_PORT + DRIVER_PORT_MAX_ITER; port++) {
            let connection = new AgentConnection(port);
            testAgentConnections.push(connection);
            connection.performRequestAsync(REQUEST_PING, (results) => {
                if (!results.hasRequestFailed() && results.getRequestInformations() && cudCurrentConnection == null) {
                    console.log(`Connection on port ${port} responded to the ping.`);
                    connection.performRequestAsync(REQUEST_REQUEST_CONTROL, (results) => {
                        if (!results.hasRequestFailed() && results.getRequestInformations() != null && cudCurrentConnection == null) {
                            connection.setAuthenticationCookie(results.getRequestInformations());
                            console.log("Authentication cookie has been recieved.");
                            cudCurrentConnection = connection;

                            privWaitForConnectionAccept(connection, backendURL);
                            return;
                        }
                        privRemoveTestConnection(connection);

                    }, persistentAccessKey);
                    return;
                }
                privRemoveTestConnection(connection);

            }, null);
        }
    }

    function cudSetErrorCallback(callback) {
        cudErrorCallback = callback;
    }
}


