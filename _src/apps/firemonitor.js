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
            // json_url: 'http://home.chpc.utah.edu/~u0540701/storage/fire_data/',
            // json_metadatastash: "current_metadatastash.json",
            // json_full: "current_fire_data.json",
            json_cache: "//home.chpc.utah.edu/~u0751826/fireapi/listing.py?callback=?",
            json_baseURL: "http://home.chpc.utah.edu/~u0751826/fireapi/fires.py?id=",
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
            fireCache: {},
            current_fireId: "",
            tableData: [],
            defaultFireId: "",
            fullFireData: [],
            stidList: []
        }
    };

    var _ID_ = "#";
    var _CLASS_ = ".";

    // Start off by hiding app while we load the canons
    d3.selectAll(_ID_ + state.ui.appContainer.id).classed(state.ui.css.hide, true);

    // Get the user's cookie, determine if the cookie needs to be replaced or not
    state.P = new User({
        cookie_name: "mesowest",
        cookie_ttl: 1
    });
    if (state.P.VERSION !== "0.3.2") {
        state.P.deleteCookie();
        state.P = new User({
            cookie_name: "mesowest",
            cookie_ttl: 1
        });
    }

    // Determine the token and initlize the Mesonet class
    state.apiToken = typeof state.P.getToken() === null ? state.P.getToken() : "demotoken";
    var Mesonet = new MesonetAPI({
        token: state.apiToken,
        service: "TimeSeries"
    });
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

    var windowUrl = getWindowArgs();
    var fireId = windowUrl.fire !== null ? windowUrl.fire : state.store.defaultFireId;
    state.store.current_fireId = fireId
    console.log(fireId);

    // Time to fetch the json objects
    jsonFetch(state.http.json_cache, function (d) {
        state.store.fireCache = d;
        state.store.defaultFireId = d["CURRENT_FIRES"][0];
        //maybe send the keys to the dropdown menu at this point
        console.log(d);
        _buildDropdownFireSelect();
        jsonFetch(state.http.json_baseURL + state.http.json_full + state.store.current_fireId, function (j) {
            state.store.fullFireData = j;
            console.log(j);
            var _f = state.store.current_fireId;
            var key;
            for (key in j[_f]["nearest_stations"]) {
                stidStack.push(j[_f]["nearest_stations"][key]["STID"]);
                stidAndDist.push(j[_f]["nearest_stations"][key]["DFP"]);
            };
            state.store.stidList = stidStack.join(",");
            state.api.stid = state.store.stidList
            Mesonet.fetch({
                apiArgs: state.api
            })
        })
    })




    function _buildDropdownFireSelect() {
        var _m = state.store.fireCache;
        var key;
        for (key in _m) {
            state.store.fireList.push(key);
            d3.selectAll(_ID_ + state.toolbar.id)
                .append("ul").classed("nav navbar-nav", true)
                .append("li").classsed("dropdown", true)
                .append("a").classed("dropdown-toggle", true)
                .attr("data-toggle", "dropdown").attr("role", "button")
                .attr("aria-haspopup", "true").attr("aria-expanded", "false")
                .append("span").classed("caret", true)
                .each(function (d) {
                    d3.select(this)
                        .append("li")
                        .append("a")
                        .attr("href", "http://home.chpc.utah.edu/~u0540701/fireperimeter/table.html?fire=" + key)
                        .text(key)
                })
        }

    }

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

    function getWindowArgs() {
        var a = {};
        var b = window.location.search.substring(1).split("&");
        var pair;
        var c;
        var l = b.length;
        if (window.location.search.substring(1).split("=") === 1) {
            return "undefined";
        } else {
            for (var i = 0; i < l; i++) {
                // Grab the values and add a key
                pair = b[i].split("=");
                if (typeof a[pair[0]] === "undefined") {
                    a[pair[0]] = decodeURIComponent(pair[1]);
                    // if (pair[1].split(",").length > 1) {
                    //     a[pair[0]] = pair[1].split(",");
                    // }
                }
            }
            return a;
        }
    }


})();