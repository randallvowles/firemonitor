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

            fireListingService: "//home.chpc.utah.edu/~u0751826/fireapi/listing",
            fireDataService: "//home.chpc.utah.edu/~u0751826/fireapi/fires",
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
        fireMonitorEmitter: {
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



    // Time to fetch the json objects
    jsonFetch(state.http.fireListingService, {}, function (data) {
        state.store.fireCache = data;
        state.store.defaultFireId = Object.keys(data.CURRENT_FIRES)[0];
        // var windowUrl = getWindowArgs();
        // var fireId = windowUrl.fire !== null ? windowUrl.fire : state.store.defaultFireId;
        // state.store.current_fireId = fireId
        // console.log(fireId);
        console.log('Fire Metadata Cache', data);
        //maybe send the keys to the dropdown menu at this point
        // _buildDropdownFireSelect();
        jsonFetch(state.http.fireDataService, { id: state.store.defaultfireId }, function (d) {
            state.store.fullFireData = d;
            console.log('Specific Fire Data', d);
            console.log(state.store)
            var key;
            for (key in d.nearest_stations) {
                stidStack.push(d.nearest_stations[key]["STID"]);
                stidAndDist.push(d.nearest_stations[key]["DFP"]);
            };
            state.store.stidList = stidStack.join(",");
            state.api.stid = state.store.stidList
            Mesonet.fetch({
                apiArgs: state.api
            })
        })
    })

    // Show response in console?
    parseRunFlags('showResponse', '1', null, true, function () { console.log(Mesonet); });
    // Disable precision in table
    parseRunFlags('disablePrec', '1', 'disablePrecision', true);
    // Ascend Table?
    parseRunFlags(
        'tableAscend', '1',
        'ascendTable', true,
        function () {
            if (state.runFlags.ascendTable) { state.fireMonitorEmitter.props.descend = false; }
        }
    );
    // Show time format as UNIX time
    parseRunFlags('timeFormatUnix', '1', 'showUnixTime', true);
    parseRunFlags('timeFormatDATTIM', '1', 'showDATTIMtime', true);
    // Highlight rows
    if (typeof state.http.thisURL.highlight !== "undefined") {
        parseHighlightRowOptions();
    }
    // Update the user's time format setting
    state.tabTableEmitter.props.timeUTC = state.P._isUTC();

    // While we are waiting, let's generate the toolbar links.
    populateToolbar();

    $.when(Mesonet.ready()).done(function () {
        // Check the API response to make sure we have data and not just an error message.
        if (Mesonet.store.status !== 1) {
            d3.select(_HASH_ + state.ui.loading.progressBarId).classed(state.ui.css.hide, true);
            d3.select(_HASH_ + state.ui.loading.errMessageId).text("Rhut Rho!");

            createAlertBox({
                alertType: "danger",
                message: "Error code: <b>" + Mesonet.store.telemetry[0] + "<b/>",
                closeMessage: false
            }, "page-is-loading")

            return;
        }

        
    })





    function _buildDropdownFireSelect() {
        var _m = state.store.fireCache;
        var key;
        for (key in _m) {
            state.store.fireList.push(key);
            d3.select(_ID_ + state.toolbar.id)
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


    function jsonFetch(url, args, callback) {
        var request = new XMLHttpRequest();
        request.open("GET", serialize(url, args))
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200) {
                callback(JSON.parse(request.responseText))
            }
        }
        request.send(null);

        function serialize(url, obj) {
            var str = ['?'];
            for (var p in obj) {
                if (obj.hasOwnProperty(p)) {
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                }
            }
            return url + str.join("&");
        }
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

    /** Parses out runtime flags */
    function parseRunFlags(flag, value, _flag, _bool, callback) {
        if (
            typeof state.http.thisURL[flag] !== "undefined" &&
            (state.http.thisURL[flag] === value || value === null)
        ) {
            if (_flag !== null) { state.runFlags[_flag] = _bool; }
            delete state.api[flag];
            if (typeof callback === "function") { callback(); };
        }
    }

    function parseHighlightRowOptions() {
        var parts = state.http.thisURL.highlight.split(",");
        state.runFlags.highlightRowItems[0] = parts[0].length === 12 ? Number(parts[0]) : false
        if (parts.length > 1) {
            state.runFlags.highlightRowItems[1] = Number(parts[1]) - 1;
        }
        state.runFlags.highlightRows = !state.runFlags.highlightRowItems[0] ? false : true;
        delete state.api.highlight;
    }

    /**
     * Appends a BS Alert box
     * props.alertType, BS3 alert type
     * props.message, string of text message
     */
    function createAlertBox(props, renderTo) {
        // Gett'n ready for JSX yo!
        var btnId = "alertBoxBtn" + Math.round(Math.random() * 10000000);

        var html = "<div class=\"alert alert-" + props.alertType + " alert-dismissible\" role=\"alert\">" +
            (
                typeof props.closeMessage === "undefined" || props.closeMessage
                    ? "<button id=\"" + btnId + "\" type=\"button\" " +
                    "class=\"close\" data-dismiss=\"alert\" aria-label=\"Close\">" +
                    "<span aria-hidden=\"true\">&times;</span></button>"
                    : ""
            ) +
            props.message +
            "</div>"

        d3.select("#" + renderTo).append("div").classed("row", true)
            .append("div").classed("col-sm-12", true).html(html);

        return btnId;
    }


})();