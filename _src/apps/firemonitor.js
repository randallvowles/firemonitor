/*!
 * firemonitor.js - Fire Monitor application for SynopticLabs
 * @author MesoWest/SynopticLabs (2017)
 * @version 0.0.1
 */
(function () {
    "use strict";

    var state = {
        VERSION: "0.0.1",
        // M: {},
        // P: {},
        // apiToken: "",
        runFlags: {
            hideBetaFeaturesMessage: true,
            enableBetaFeatures: false,
            showBetaQCDatabaseMessage: false,
            ascendTable: false,
            hideMADISQCFlags: false,
            disablePrecision: false,
            showUnixTime: false,
            showDATTIMtime: false,
            highlightRows: false,
            highlightRowItems: [false, 0]
        },
        api: {},
        ui: {
            betaFeaturesMessageActive: false,
            notifyTelemetry: false,
            appContainer: {
                id: "app-container"
            },
            css: {
                hide: "hide",
                lead: "lead",
                textCenter: "text-center",
                pullLeft: "pull-left",
                hidden: "hidden",
                tableEmptyRow: "empty-row"
            },
            loading: {
                id: "page-is-loading",
                progressBarId: "loading-progress",
                errMessageId: "loading-message"
            }
        },
        http: {
            json_url: 'http://home.chpc.utah.edu/~u0540701/storage/fire_data/',
            json_metadatastash: "current_metadatastash.json",
            json_full: "current_fire_data.json",
            self: "firemonitor.html",
            // qcNetworkURL: "./network.html",
            mwHome: "//mesowest.utah.edu",
            openInNewWindow: true
        },
        toolbar: {
            id: "toolbar-local-tools-container"
        },
        stationDetailsEmitter: {
            props: {
                id: "station-info"
            }
        },
        tabTableEmitter: {
            props: {
                containerId: "firemonitor-container",
                tableId: "firemonitor",
                tableClassList: "firemonitor table table-condensed table-striped table-hover pull-left table-bordered",
                // hiddenSensorClass: "hidden-sensor",
                qcFlagClass: "bang",
                descend: true,
                showSensorBestChoice: true
            },
            sensorState: {
                defaultState: {},
                currentState: {}
            },
            firstTime: true
        },
        fireMetadataEmitter: {
            props: {
                containerId: "fire-metadata-container",
                tableId: "fire-metadata",
                classList: "fire-metadata-table table table-condensed table-bordered"
            }
        },
        store: {
            fireList: [],
            current_fireID: "",
            tableData: []
        }
    };

    var _ID_ = "#";
    var _CLASS_ = ".";

    // Start off by hiding app while we load the canons
    d3.selectAll(_HASH_ + state.ui.appContainer.id).classed(state.ui.css.hide, true);

    // Get the user's cookie, determine if the cookie needs to be replaced or not
    state.P = new User({ cookie_name: "mesowest", cookie_ttl: 1 });
    if (state.P.VERSION !== "0.3.2") {
        state.P.deleteCookie();
        state.P = new User({ cookie_name: "mesowest", cookie_ttl: 1 });
    }

    // Determine the token and initlize the Mesonet class
    state.apiToken = typeof state.P.getToken() === null ? state.P.getToken() : "demotoken";
    var Mesonet = new MesonetAPI({ token: state.apiToken, service: "TimeSeries" });
    Mesonet.fetchQCTypes(true);

    // Define API parameters
    state.http.thisURL = Mesonet.parseApiArgs();
    state.api = Mesonet.parseApiArgs();
    state.api.timeformat = "%s|%z|%Z";
    state.api.obtimezone = "local";
    state.api.qc = "all";
    state.api.uimode = "default";
    state.api["24hsummary"] = 1; // Argh!
    state.api.sensorvars = 1;
    state.api.complete = 1;
    state.api.recent = "61"
    // state.api.precip = 1;
    // state.api.pmode = "interval";
    state.api.units = state.P.getUnits();

    if (typeof state.http.thisURL.token !== "undefined") {
        state.apiToken = state.http.thisURL.token;
        Mesonet.setToken(state.apiToken);
    }

    var stidStack = [];
    var stidAndDist = [];

    function jsonFetch(url, callback) {
        var request = new XMLHttpRequest();
        request.open("GET", url)
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200) {
                json_total = JSON.parse(request.responseText)
                callback(JSON.parse(request.responseText))
            } else {
                console.log(url)
                console.log(request.responseText)
            }
        }
        request.send(null);
    }




})