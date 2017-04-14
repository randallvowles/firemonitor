/*!
 * tabtable.js - Tabular table application for SynopticLabs
 * @author MesoWest/SynopticLabs (2016)
 * @version 1.2.0
 */
(function () {
    "use strict";

    var state = {
        VERSION: "1.3.0",
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
            },
            // Move out as emitter
            userSettings: {
                showSensorId: "#show-sensor-menu"
            }
        },
        http: {
            self: "tabtable.html",
            qcNetworkURL: "./network.html",
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
                containerId: "tabtable-container",
                tableId: "tabtable",
                tableClassList: "tabtable table table-condensed table-striped table-hover pull-left table-bordered",
                hiddenSensorClass: "hidden-sensor",
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
        weatherSummaryEmitter: {
            props: {
                containerId: "weather-summary-container",
                tableId: "weather-summary",
                classList: "weather-summary-table table table-condensed table-bordered"
            }
        }
    };

    var _HASH_ = "#";
    var _CLASS_ = "."

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
    // state.api.precip = 1;
    // state.api.pmode = "interval";
    state.api.units = state.P.getUnits();


    if (typeof state.http.thisURL.token !== "undefined") {
        state.apiToken = state.http.thisURL.token;
        Mesonet.setToken(state.apiToken);
    }

    if (typeof state.api.dev !== "undefined") {
        Mesonet.setDevServer(true);
        d3.select(_HASH_ + 'notify-dev-server')
            .classed('fa-chevron-right', false).classed('fa-code', true)
    }

    Mesonet.fetch({ apiArgs: state.api });

    // Enable beta features?
    parseRunFlags(
        'enableBetaFeatures', '1',
        'enableBetaFeatures', true,
        function () {
            console.log("Beta features enabled.");
            state.runFlags.hideBetaFeaturesMessage = false;
            state.P.setBetaFeatures(true);
        }
    );
    parseRunFlags(
        'enableBetaFeatures', '0',
        'enableBetaFeatures', false,
        function () {
            state.P.setBetaFeatures(false);
        }
    );
    state.runFlags.enableBetaFeatures =
        state.P.useBetaFeatures() || state.runFlags.enableBetaFeatures ? true : false;

    // Show response in console?
    parseRunFlags('showResponse', '1', null, true, function () { console.log(Mesonet); });

    // Hide Madis flags?
    // parseRunFlags('hideMadis', '1', 'hideMADISQCFlags', true);

    parseRunFlags("dev", null, 'enableBetaFeatures', true, function () {
        state.runFlags.disablePrecision = true;
    });

    // Disable precision in table
    parseRunFlags('disablePrec', '1', 'disablePrecision', true);

    // Ascend Table?
    parseRunFlags(
        'tableAscend', '1',
        'ascendTable', true,
        function () {
            if (state.runFlags.ascendTable) { state.tabTableEmitter.props.descend = false; }
        }
    );

    // Show time format as UNIX time
    parseRunFlags('timeFormatUnix', '1', 'showUnixTime', true);
    parseRunFlags('timeFormatDATTIM', '1', 'showDATTIMtime', true);

    // Highlight rows
    if (typeof state.http.thisURL.highlight !== "undefined") {
        parseHighlightRowOptions();
    }

    // If we are using the QC Test DB, need to tell the user.
    if (typeof state.api.qctestdb !== "undefined" || state.api.qctestdb === "1") {
        state.runFlags.showBetaQCDatabaseMessage = true;
        createAlertBox({
            closeMessage: false,
            alertType: "danger",
            message: "Using the QC Test Database",
        }, "alert-box-container")
    }

    if (!state.runFlags.hideBetaFeaturesMessage) {
        state.ui.betaFeaturesMessageActive = true;
        createBetaFeaturesMessage();
    }

    // Update the user's time format setting
    state.tabTableEmitter.props.timeUTC = state.P._isUTC();

    // While we are waiting, let's generate the toolbar links.
    populateToolbar();

    $.when(Mesonet.ready()).done(function () {

        // For demo/testing only!
        // Mesonet.store.station[0].QC = {};
        // Mesonet.store.station[0].QC.air_temp_set_1 = [null, null, null, null, null, null, null];
        // Mesonet.store.station[0].QC.air_temp_set_1[2] = [1, 2, 6, 18];
        // Mesonet.store.station[0].QC.air_temp_set_1[4] = [2, 6, 18];
        // Mesonet.store.station[0].QC.air_temp_set_1[5] = [18];


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


        // Does the user want the MADIS Flags hidden?
        if (state.runFlags.hideMADISQCFlags) { stripMADISFlags(); }

        d3.selectAll(_HASH_ + state.ui.appContainer.id).classed(state.ui.css.hide, false);
        d3.select(_HASH_ + state.ui.loading.id).classed(state.ui.css.hide, true);

        stationDetailsEmitter();
        weatherSummaryEmitter();
        tabTableEmitter();

        // Why in the hell does this not work?
        // Do we want the "best case" selection.
        // if (state.P.isSensorBestChoice()) { showSensorBestChoice() }

        // Set event listeners.
        // Can this be moved the the componenet? And can we get rid of D3 here?
        d3.selectAll(state.ui.userSettings.showSensorId).on("click", function (d) {
            settingsModalEmitter(d3.select(this).attr("id"));
        });

        document.getElementById("toolbar__view-show-default")
            .addEventListener("click", function () { showDefaultSensors(); });

        document.getElementById("toolbar__view-show-all")
            .addEventListener("click", function () { showAllSensors(); });

        document.getElementById("toolbar__view-show-all-best")
            .addEventListener("click", function () { showSensorBestChoice(); });

        document.getElementById("toolbar__view-show-units").addEventListener("click", function () {
            settingsModalEmitter("show-units");
        });

        if (state.runFlags.enableBetaFeatures) {

            window.onkeydown = function (key) {

                // Show default sensors, `ALT + 1`
                if (key.altKey && key.keyCode === 49) { showDefaultSensors(); }

                // Show all with best choice, `ALT + 2`
                if (key.altKey && key.keyCode === 50) { showSensorBestChoice(); }

                // Show all sensors, `ALT + 3`
                if (key.altKey && key.keyCode === 51) { showAllSensors(); }

                // Go to first QC Segment
                if (key.altKey && key.shiftKey && key.keyCode === 40) {
                    var el = document.querySelectorAll(".bang")[0];
                    if (el) {
                        el.setAttribute("id", "__first_qc_element");
                        scrollToElementById(el.id, -200)
                    }
                }

                // Switch to/from Expiremental QC database
                if (typeof state.api.dev !== "undefined" && state.api.dev === "8089") {
                    if (key.altKey && key.shiftKey && key.keyCode === 69) {
                        cout("Not yet.")
                    }
                }

                // Toggle time format from human to UNIX
                if (key.altKey && key.shiftKey && key.keyCode === 85) { toggleUnixTime(); }

                // Toggle time format from human to DATTIM
                if (key.altKey && key.keyCode === 85) { toogleDATTIMTime(); }

                // Get Station details
                if (key.altKey && key.keyCode === 68) {
                    alert("Station Id: " + Mesonet.store.station[0].ID)
                }

                // Show page help info
                if (key.keyCode === 72) {
                    if (!state.ui.betaFeaturesMessageActive) { createBetaFeaturesMessage(); }
                }
            }
        }
    });


    /* ========================================================================================== *
     * All the good parts that make this happen.
     *
     * This section is broken down into the emitters first and then supporting functions.
     * ========================================================================================== */


    /** Emits the 24 hour weather summary */
    function weatherSummaryEmitter() {
        var props = state.weatherSummaryEmitter.props;

        var _r = Mesonet.store;
        var _s = _r.station[0]["24H_SUMMARY"];

        var tableHeaders = ["sensor", "min", "min_time", "max", "max_time"];
        var tableHeadersName = ["", "Minimum", "Maximum"];
        var tableColspan = [1, 2, 2];
        var rankedSensors = _r.ui.build._o;
        var whiteList = [
            "air_temp", "dew_point_temperature", "relative_humidity",
            "wind_speed", "wind_gust", "solar_radiation"
        ];

        // Create and append table to DOM, but first check to see if we have a table node.
        d3.select(_HASH_ + props.id).selectAll("table").remove();
        var table = d3.select(_HASH_ + props.containerId).append("table")
            .attr("id", props.tableId)
            .classed(props.classList, true);

        // Make the header, then rows, then cells
        table.append("thead").append("tr").selectAll("th")
            .data(tableHeadersName).enter().append("th")
            .attr("colspan", function (d, i) { return tableColspan[i]; })
            .text(function (d, i) { return tableHeadersName[i]; })
            .classed(state.ui.css.textCenter, function (d, i) {
                return tableColspan[i] > 1 ? true : false;
            });

        var rows = table.append("tbody").selectAll("tr").data(rankedSensors).enter()
            .append("tr")
            .classed(state.ui.css.tableEmptyRow, function (d) {
                return typeof _s[d] === "undefined" || !_s[d].min || !_s[d].max ? true : false;
            })
            .classed(state.ui.css.hidden, function (d) {
                // If not on the white list, empty value or we have multiples.
                // The last set, handles the derived variables problem.
                return typeof _s[d] === "undefined" ||
                    !_s[d].min ||
                    !_s[d].max ||
                    whiteList.indexOf(d.split("_set_")[0]) === -1 ||
                    Number(d.split("_set_")[1].split("d")[0]) > 1 ||
                    d.split("_set_")[1].split("d").length > 1
                    ? true
                    : false;
            });

        var cells = rows.selectAll('td')
            .data(function (row) {
                return tableHeaders.map(function (d) {
                    // A bit of error checking
                    if (typeof _s[row] !== "undefined") {
                        return {
                            name: d,
                            value: d === "sensor" ? row : _s[row][d],
                            type: row.split("_set_")[0]
                        };
                    }
                    return {};
                });
            })
            .enter().append("td")
            .html(function (d) {
                // Escape plan for METAR values
                if (typeof d.value === "boolean" && !d.value) { return; }

                var _t = {};
                switch (d.name) {
                    case "sensor":
                        var _n = Number(d.value.split("_set_")[1].split("d")[0]);
                        _n = _n === 1 ? "" : " #" + _n;
                        return _r.ui.sensors[_r.ui.toc[d.value.split("_set_")[0]]].shortname + _n;
                    case "min_time":
                        _t = Mesonet.parseAPITime(d.value, !state.P._isUTC());
                        return _t.monthName + " " + _t.day + " " + _t.hour + ":" + _t.min;
                    case "max_time":
                        _t = Mesonet.parseAPITime(d.value, !state.P._isUTC());
                        return _t.monthName + " " + _t.day + " " + _t.hour + ":" + _t.min;;
                    default:
                        return typeof d.value === "undefined"
                            ? ""
                            : Number(d.value).toFixed(Units.get(_r.units[d.type]).precision) +
                            "&nbsp;" + Units.get(_r.units[d.type]).html;
                }
            })
            .on("mouseover", function (d) {
                // Call Bootstrap tooltip, this is one of the few jQuery dependencies
                if (d.name === "sensor") {
                    $(this).tooltip({
                        "title": formatSensor(
                            _r.ui.sensors[_r.ui.toc[d.value.split("_set_")[0]]].longname
                        ),
                        "placement": "right",
                        "html": true,
                        "container": "body"
                    }).tooltip("show");
                }
            });

        stripeTable(props.tableId, state.ui.css.hidden);
    }


    /** Emits the time series table */
    function tabTableEmitter() {

        var _M = Mesonet.store;
        var _s = _M.station[0];
        var whiteList = state.P.getSensors();
        var props = state.tabTableEmitter.props;

        var DisplayUnits = new Units();

        // Get the ranked sensors
        var rankedSensorStack = prepend("date_time", _M.ui.build._o);

        // Let's re-organize the response so it's easier to render as a table.
        var obsByTime = [];
        _s.OBSERVATIONS.date_time.map(function (k, i) {
            obsByTime.push({ idx: i });
            (Object.keys(_s.OBSERVATIONS)).map(function (sensor, sidx) {
                // console.log("THIS GUY", sensor, "itt", i)
                if (sensor === "date_time") {
                    obsByTime[i][sensor] = _s.OBSERVATIONS[sensor][i];
                }
                else if (
                    _s.QC_FLAGGED &&
                    _s.QC && // temp patch!
                    typeof _s.QC[sensor] !== "undefined" &&
                    _s.QC[sensor][i] !== "undefined" &&
                    _s.QC[sensor][i] !== null
                ) {
                    // We have some QC
                    obsByTime[i][sensor] = [_s.OBSERVATIONS[sensor][i], _s.QC[sensor][i]];
                }
                else {
                    // We don't have any QC
                    obsByTime[i][sensor] = [_s.OBSERVATIONS[sensor][i], false];

                    // Some telemetry here
                    if (_s.QC_FLAGGED && typeof _s.QC === "undefined") {
                        telemetry();
                        console.warn("API issue detected. QC mismatch.");
                    }
                }
            })
        })

        // Descending array?
        obsByTime = props.descend ? obsByTime.reverse() : obsByTime;

        // Determine the time time zone
        props.timeZone = (obsByTime[0].date_time).split("|").length > 1
            ? (obsByTime[0].date_time).split("|")[2]
            : null;

        // Create and append table to DOM, but first check to see if we have a table node.
        d3.select("body #" + props.containerId).selectAll("table").remove();
        var table = d3.select("body #" + props.containerId)
            .append("table")
            .attr("id", props.tableId)
            .attr("class", props.tableClassList);

        // Make the header
        table.append("thead").attr("class", "fixed-header").append("tr")
            .selectAll("th").data(rankedSensorStack).enter().append("th")
            .attr("id", function (d) { return d; })
            .classed("tabtable-header pull-left", true)
            .attr("class", function (d) { return d.split("_set_")[0]; }, true)
            .classed("hidden hidden-sensor", function (d) {
                var _s = d.split("_set_")[0];

                // Let's populate our state default status right here
                if (typeof _M.ui.sensors[_M.ui.toc[_s]] !== "undefined") {
                    state.tabTableEmitter.sensorState.defaultState[_s] =
                        _M.ui.sensors[_M.ui.toc[_s]].default;

                    if (state.tabTableEmitter.firstTime) {
                        state.tabTableEmitter.sensorState.currentState[_s] =
                            _M.ui.sensors[_M.ui.toc[_s]].default;
                    }
                }
                return !(
                    state.P.displaySensor(_s) === null
                        ? _M.ui.sensors[_M.ui.toc[_s]].default
                        : state.P.displaySensor(_s)
                );
            })
            .html(function (d) {
                var _v = d.split("_set_");

                // Number of similar sensors
                var _n = d !== "date_time" ? Number(d.split("_set_")[1].split("d")[0]) : 1;
                d3.select(this).classed(
                    "multi-sensor multi-" + _v[0] + "-sensor-" + _n,
                    function () { return _n > 1 ? true : false; }
                );
                _n = _n === 1 ? "" : " #" + _n;

                // Is variable derived? Look for `d`.
                var _w = typeof _v[1] !== "undefined" && _v[1].split("d").length > 1
                    ? "<sup>&#8226;</sup>"
                    : "";

                d3.select(this).classed("derived-variable", function () {
                    return _w === "<sup>&#8226;</sup>" ? true : false;
                });

                // Updated for the UI helper
                return d === "date_time"
                    ? "Time"
                    : _M.ui.sensors[_M.ui.toc[_v[0]]].shortname + _w + _n;
            })
            .on("mouseover", function (d) {
                if (d !== "date_time") {
                    $(this).tooltip({
                        "title": formatSensor(_M.ui.sensors[_M.ui.toc[d.split("_set_")[0]]].longname) +
                        (typeof _s.SENSOR_VARIABLES[d.split("_set_")[0]][d].position === "undefined" ||
                            _s.SENSOR_VARIABLES[d.split("_set_")[0]][d].position === null ?
                            "" :
                            "<br/>Height: " + _s.SENSOR_VARIABLES[d.split("_set_")[0]][d].position + "m"),
                        "placement": "top",
                        "html": true,
                        "container": "body"
                    }).tooltip("show");
                }
            })
            .property("sorted", false)
            .on("click", function (d) {
                var _thisId = d3.select(this).attr("id");
                var _this = this;
                var isSorted = d3.select(this).property("sorted");
                d3.select(_this).property("sorted", function (d) { return isSorted ? false : true; });

                if (_thisId !== "date_time") {
                    rows.sort(function (a, b) {
                        // Typeguarding for null values.  See commit #90eb9ea
                        var _a = a[d] === null ? -9999 : typeof a[d] === "object" ? a[d][0] : a[d];
                        var _b = b[d] === null ? -9999 : typeof b[d] === "object" ? b[d][0] : b[d];
                        return isSorted ? _a - _b : _b - _a;
                    });
                }
                else {
                    props.descend = props.descend ? false : true;
                    tabTableEmitter();
                    isSorted = props.descend ? false : true;
                }

                // Remove (hide) all the filter icons
                d3.selectAll(".fixed-header").selectAll("i").each(function () {
                    d3.select(this).classed("fa-chevron-circle-up", false);
                    d3.select(this).classed("fa-chevron-circle-down", false);
                });

                d3.select(_HASH_ + _thisId).select("i")
                    .classed("fa-chevron-circle-up", function () { return isSorted ? true : false; })
                    .classed("fa-chevron-circle-down", function () { return !isSorted ? true : false; });
            })
            .append("i").attr("class", "sort-icon fa")
            .classed("fa-chevron-circle-down", function (d) {
                // Set inital icon state
                return d === "date_time" ? true : false;
            });


        // Add the units to the table. We add this as a `TD` in the `THEAD` node.  If you change
        // this to `TH` you will need to update the filtering of `TH` elements in the update
        // table width routine.
        table.select("thead").append("tr")
            .selectAll("th").data(rankedSensorStack).enter().append("td")
            .attr("id", function (d) { return d === "date_time" ? "date-time-locale" : ""; })
            .classed("tabtable-units clickable", true)
            .classed("hidden", function (d) {
                var _s = d.split("_set_")[0];
                return !(
                    state.P.displaySensor(_s) === null
                        ? _M.ui.sensors[_M.ui.toc[_s]].default
                        : state.P.displaySensor(_s)
                );
            })
            .html(function (d) {
                var _v = d.split("_set_");

                // Number of similar sensors
                var _n = d !== "date_time" ? Number(d.split("_set_")[1].split("d")[0]) : 1;
                d3.select(this).classed(
                    "multi-sensor multi-" + _v[0] + "-sensor-" + _n,
                    function () { return _n > 1 ? true : false; }
                );

                return d === "date_time" ?
                    null :
                    typeof DisplayUnits.get(_M.units[d.split("_set_")[0]]).html === "undefined" ?
                        _M.units[d.split("_set_")[0]] :
                        DisplayUnits.get(_M.units[d.split("_set_")[0]]).html;
            })
            .on("click", function (d) { settingsModalEmitter(d3.select(this).attr("class"), props); });

        // Create the rows
        var rows = table.append("tbody").selectAll("tr").data(obsByTime).enter().append("tr");

        // Create and populate the cells
        var cells = rows.selectAll('td')
            .data(function (row) {
                return rankedSensorStack.map(function (d) {
                    return {
                        name: d,
                        value: row[d] === null ? false : row[d]
                    };
                });
            })
            .enter().append("td")
            .attr("id", function (d) {
                return d.name === "date_time" ? "t" + Mesonet._parseAPITime(d.value) : null;
            })
            .attr("class", function (d) { return d.name; })
            .classed("hidden", function (d) {
                var _s = d.name.split("_set_")[0];
                return !(state.P.displaySensor(_s) === null
                    ? _M.ui.sensors[_M.ui.toc[_s]].default
                    : state.P.displaySensor(_s)
                );
            })
            .classed("first-column", function (d) { return d.name === "date_time" ? true : false; })
            .text(function (d) {
                var _v = (d.name).split("_set_");

                // Number of similar sensors
                var _n = d.name !== "date_time"
                    ? Number(((d.name).split("_set_")[1]).split("d")[0])
                    : 1;

                d3.select(this).classed(
                    "multi-sensor multi-" + (d.name).split("_set_")[0] + "-sensor-" + _n,
                    function () { return _n > 1 ? true : false; }
                );

                _v = typeof d.value === "undefined" ? "" : typeof d.value === "object"
                    ? d.value[0]
                    : d.value;

                _v = typeof _v === "boolean" ? "" : _v;

                // Unit precision
                var _p = typeof _M.units[d.name.split("_set_")[0]] === "undefined"
                    ? 2
                    : DisplayUnits.get(_M.units[d.name.split("_set_")[0]]).precision;

                return d.name === "date_time"
                    ? formatDate(_v, props.timeUTC)
                    : typeof _v === "number"
                        ? state.runFlags.disablePrecision
                            ? Number(_v)
                            : Number(_v).toFixed(_p)
                        : _v;
            })
            .classed("metar-message", function (d) {
                return d.name.split("_set_")[0] === "metar" ? true : false;
            })
            .attr("class", function (d) {

                if (typeof d.value === "undefined" || d.name === "date_time") { return false; }

                var classList = d3.select(this).attr("class");
                var keepGoing = true;

                // Any "QC" flag that is "bad" should be in this array
                [1].map(function (k, i) {
                    if (typeof d.value[1] !== "undefined" && !!d.value) {
                        if (!!d.value[1] && d.value[1].indexOf(k) > -1) {
                            classList += " bang-sl-qc";
                            keepGoing = false;
                        }
                    }
                });

                if (keepGoing) {
                    if (typeof d.value[1] !== "undefined" && !!d.value && !!d.value[1]) {
                        d.value[1].map(function (k, i) {
                            if (_M.qcTypes[k].sourceId === 1 || _M.qcTypes[k].sourceId === 4) {
                                classList += " bang-sl-data-check";
                                keepGoing = false;
                            }

                            if (keepGoing && _M.qcTypes[k].sourceId === 2) {
                                classList += " bang-madis";
                            }
                        });
                    }
                }
                return classList;
            })
            .on("mouseover", function (d) {
                if (typeof d.value === "object" && !!d.value[1] && d.name !== "date_time") {
                    var s = "<div class=\"qc-tooltip\"><ul class=\"qc-tooltip\">";
                    d.value[1].forEach(function (_d) {
                        s += "<li>" + _M.qcTypes[_d].longName + "</li>";
                    });
                    s += "</ul></div>";

                    $(this).tooltip({
                        "title": s,
                        "placement": "top",
                        "html": true,
                        "container": "body"
                    }).tooltip("show");
                }
            });

        // Set the time zone selector
        d3.select("#date-time-locale")
            .html(function (d) {
                var _s = [
                    "<span class=\"event-tip\">UTC<br/>Change to " + props.timeZone + "</span>",
                    "<span class=\"event-tip\">" + props.timeZone + "<br/>Change to UTC</span>"
                ];
                return d === "date_time" && props.timeUTC ? _s[0] : _s[1];
            })
            .on("click", function (d) {
                d3.selectAll("#tabtable-message, #tabtable-progress").classed(state.ui.css.hide, false);
                d3.selectAll("#tabtable-container").classed(state.ui.css.hide, true);

                props.timeUTC = props.timeUTC ? false : true;
                state.P.setValue("options.timeUTC", props.timeUTC);

                Mesonet.fetch({ apiArgs: state.api });
                $.when(Mesonet.ready()).done(function () {
                    d3.selectAll(_HASH_ + props.containerId).classed(state.ui.css.hide, false);
                    d3.selectAll("#tabtable-message, #tabtable-progress").classed(state.ui.css.hide, true);
                    tabTableEmitter();
                });
            });

        d3.selectAll(".multi-sensor").classed(state.ui.css.hide, state.P.isSensorBestChoice());
        _updateHiddenSensorCount();

        // Highlight rows for the user
        if (state.runFlags.highlightRows) {
            var row = "t" + Mesonet.apiDateToEpoch(state.runFlags.highlightRowItems[0], true);
            var firstNode = document.getElementById(row);
            if (firstNode !== null) {
                firstNode.parentNode.classList += " highlight";
                if (state.runFlags.highlightRowItems[1] > 0) {
                    var i = 0;
                    while (i < state.runFlags.highlightRowItems[1]) {
                        row = document.getElementById(row).parentNode.nextSibling.querySelector("td").id;
                        document.getElementById(row).parentNode.classList += " highlight";
                        i++;
                    }
                }
            }
        }

        // If the users has unselected all the sensors, then hide the table.  We have to
        // let the table render, else the data binding in the DOM, goes away and we don't
        // have a page anymore. After all that, then set the sticky headers.
        table.classed("hidden", function (d) { return whiteList.length < 2 ? true : false; });
        setStickyHeader("tabtable-container", "tabtable");
        state.tabTableEmitter.firstTime = false;

        return;

        /** Updates the number of sensors that are not shown */
        function _updateHiddenSensorCount() {

            var _h = d3.selectAll(".hidden-sensor");
            var _hc = _h._groups[0].length;

            if (_hc > 0) {
                d3.select("#hidden-sensor-count").classed("hidden", false);
                d3.select("#hidden-sensor-count").text(_hc);
            }
            else {
                d3.select("#hidden-sensor-count").classed("hidden", true);
            }
        }


    }


    /** Render table & update text fields */
    function stationDetailsEmitter() {
        var props = state.stationDetailsEmitter.props;
        // I can't wait to have my new DOM tools in place.  Make this thing a lot nicer.

        var _s = Mesonet.store.station[0];

        d3.select(_HASH_ + props.id).append("h3").text(_s.NAME + " (" + _s.STID + ")");
        d3.select(_HASH_ + props.id).append("p").text(
            _s.COUNTY + " County, " + _s.STATE + ", " + _s.COUNTRY
        );
        d3.select(_HASH_ + props.id).append("p").text(
            _s.LATITUDE + " N, " + _s.LONGITUDE + " E, Elevation " + _s.ELEVATION + " ft."
        );

        d3.select(_HASH_ + props.id).append("p").append("a")
            .on('click', function (d) {
                var url = state.http.qcNetworkURL + "?" +
                    "radius=" + _s.STID + ",50&" +
                    "&display_interval=3600" +
                    "&status=active" +
                    "&showemptystations=0" +
                    (state.runFlags.showBetaQCDatabaseMessage
                        ? "&qctestdb=1&qcbeta=1&dev=8089"
                        : ""
                    ) +
                    (typeof state.api.recent !== "undefined"
                        ? "&recent=" + state.api.recent
                        : "&start=" + state.api.start.split(",")[0] + "&end=" + (typeof state.api.end === "undefined"
                            ? Mesonet.epochToApi(Mesonet.apiDateToEpoch(Number(state.api.start.split(",")[0])) + 86400)
                            : state.api.end
                        )
                    )
                hrefHandler(url, true);
            })
            .text("Data accessed from " + _s.MNET_LONGNAME);
    }


    /**
     * Displays the settings menu
     *
     * @param {string} tab
     * @returns {boolean} - True: Good, False: Fail
     */
    function settingsModalEmitter(tab) {
        var __this = this;
        var _ui = Mesonet.store.ui;

        // A bit of error checking and type guarding...
        var _selected = tab.split(" ")[0];

        _buildSensorSelectors();
        _buildUnitSelectors();

        // Modal behaviors
        var reloadPage = false;
        var reEmitTable = false;

        /** Register button listeners */

        // Unit selector listener.  Listens for any unit selector
        d3.selectAll(".units-selector").on("click", function () {
            reloadPage = true;
            var _p = d3.select(this).attr("id").split("-");
            state.P.setValue("options.units." + _p[1], _p[2]);
        });

        // Listener: Settings -> Sensors -> Best Choice
        d3.select("#sensors-best-choice").on("click", function () {
            d3.selectAll(".multi-sensor").classed(
                state.ui.css.hide,
                function () { return d3.select(this).property("checked"); }
            );
            state.P.setSensorBestChoice(d3.select(this).property("checked"));
        });

        // Set the default state of the unit convention
        // Listens for the `units-conv` class
        d3.selectAll(".units-conv").on("click", function () {
            reloadPage = true;

            var isMetric = d3.select(this).property("value") === "0" ? true : false;

            // Update cookie and API arguments
            state.P._isMetric(isMetric);
            state.api.units = state.P.getUnits();

            // Now some UI stuff
            var _state = isMetric ? 0 : 1;
            var _u = [
                ["hpa", "m", "c", "mm", "hpa", "mps"],
                ["inhg", "ft", "f", "in", "inhg", "kts"]
            ];

            state.P.getUnits(-1).map(function (d, i) {
                d3.select("#units-" + d + "-" + _u[_state][i]).property("checked", true);
                state.P.setValue("options.units." + d, _u[_state][i]);
            });
        });

        // Select default (`whiteList`) sensors
        d3.select("#sensors-default-set").on("click", function () {
            reEmitTable = true;
            d3.select("#settings-sensor-list").selectAll("input").each(function () {
                if (this.value !== "parent") {
                    // cout(this.value);
                    d3.select(this).property("checked", function (d) {
                        state.P.setSensor(this.value, _ui.sensors[_ui.toc[this.value]].default);
                        return _ui.sensors[_ui.toc[this.value]].default;
                    });
                    _updateParentSelectors();
                }
            });
        });

        // Select all sensors
        d3.select("#sensors-select-all").on("click", function () {
            reEmitTable = true;
            var _b = d3.selectAll("#settings-sensor-list").selectAll("input").property("checked", true);
            for (var el in _b._groups[0]) {
                if (_b._groups[0][el].value !== "date_time") {
                    state.P.addSensor(_b._groups[0][el].value);
                }
            }
        });

        // Unselect all Sensors
        d3.select("#sensors-unselect-all").on("click", function () {
            reEmitTable = true;
            state.P.removeAllSensors();
            d3.select("#settings-sensor-list").selectAll("input").each(function () {
                d3.select(this).property("indeterminate", false);
                d3.select(this).property("checked", false);
            });
        });

        // View sensors for just this station
        d3.select("#sensor-list-this-station").on("click", function () {
            d3.selectAll("#settings-sensor-list").selectAll("li").classed(
                "hidden",
                function (d) { return (d3.select("." + d))._groups[0][0] !== null ? false : true; }
            );
        });

        // View the global sensor inventory
        d3.select("#sensor-list-full-inventory").on("click", function () {
            d3.selectAll("#settings-sensor-list").selectAll("li").classed("hidden", false);
        });

        // Now show the modal
        $("#settings-editor").on('shown.bs.modal', function () {
            var _tab = "";
            switch (tab.split(" ")[0]) {
                case "show-preferences":
                    _tab = "general";
                    break;
                case "show-sensor-menu":
                    _tab = "sensors";
                    break;
                case "tabtable-units":
                    _tab = "units";
                    break;
                case "show-units":
                    _tab = "units";
                    break;
                default:
                    _tab = "general";
            }
            $("a[href=\"#prefs-" + _tab + "\"]").tab('show');
        });
        $("#settings-editor").modal("show");

        $("#settings-editor").on('hidden.bs.modal', function () {
            if (reloadPage) {
                location.reload(true);
            }
            else if (reEmitTable) {
                tabTableEmitter();
            }
            else {
                tabTableEmitter();
            }
        });

        return;

        /** Generate the unit configuration */
        function _buildUnitSelectors() {
            state.P.getUnits(-1).map(function (d) {
                d3.select("#units-" + d + "-" + state.P.getUnits(d)).property("checked", true);
            });
        }

        /** Generate the avaiable sensor list */
        function _buildSensorSelectors() {

            d3.select("#sensors-best-choice").property("checked", state.P.isSensorBestChoice());

            var classPrefix = "sensor-group-";
            d3.selectAll("#settings-sensor-list").select("ol").remove();
            var _ul = d3.selectAll("#settings-sensor-list").append("ol");

            var _t = {};
            var i = 0;
            var l = _ui.sensors.length;
            var currentGroup = -1;
            while (i < l) {
                _t = _ui.sensors[i];

                if (_t.group !== currentGroup) {
                    // Determine if we have moved into a new group and if so then set the new name.
                    currentGroup = _t.group;

                    _ul.append("li").classed(classPrefix + currentGroup, true)
                        .append("input").attr("type", "checkbox")
                        .attr("id", classPrefix + currentGroup)
                        .classed("sensor-parent", true)
                        // .property("value", _ui.group_name[currentGroup]);
                        .property("value", "parent");

                    d3.select(_HASH_ + classPrefix + currentGroup).each(function (d) {
                        d3.select(this.parentNode).append("label")
                            .attr("for", _HASH_ + classPrefix + currentGroup)
                            .text(_ui.group_name[currentGroup]);
                    });

                    d3.selectAll("." + classPrefix + currentGroup).append("ol");

                }

                // Append the sensor since the group is already set
                d3.selectAll("." + classPrefix + currentGroup).select("ol").append("li")
                    .classed("nested-selector", true).append("input")
                    .attr("type", "checkbox")
                    .property("checked", function () {
                        return state.P.displaySensor(_t.apiname) === null
                            ? _t.default
                            : state.P.displaySensor(_t.apiname);
                    })
                    .attr("id", "sensor-selector__" + _t.apiname)
                    .classed("sensor-selector", true)
                    .property("parent", classPrefix + currentGroup)
                    .property("value", _t.apiname)
                    .on("change", function (d) {
                        if (d3.select(this).property("checked")) {
                            state.P.addSensor(d3.select(this).property("value"));
                        }
                        else {
                            state.P.removeSensor(d3.select(this).property("value"));
                        }
                    });

                d3.select("#sensor-selector__" + _t.apiname).each(function (d) {
                    d3.select(this.parentNode)
                        .append("label")
                        .classed("sensor-selector", true)
                        .attr("for", "#sensor-selector__" + _t.apiname)
                        .text(formatSensor(_t.longname));
                });

                i++;
            }

            // Set the inital state of the parent checkboxes.
            _updateParentSelectors();

            // If the parent is selected, select all the children
            d3.selectAll(".sensor-parent").each(function () {
                // Find the parent
                d3.select(this).on("change", function () {
                    var _state = d3.select(this).property("checked");
                    d3.selectAll("." + this.id + " > ol > li > input").each(function (d) {
                        state.P.setSensor(this.value, _state);
                        d3.select(this).property("checked", _state);
                    });
                });
            });

            // **ParentCheckbox**, If the child is selected, then determine the parent's checked state
            d3.selectAll(".sensor-selector").each(function () {
                // Find the parent
                d3.select(this).on("change", function () {
                    // Now that we have the parent, see if any or all of the children are selected
                    d3.select(_HASH_ + d3.select(this).property("parent")).property("checked", function () {
                        // At this point we are at the parent level.
                        var n = 0;
                        var n0 = 0;
                        d3.selectAll("." + this.id).each(function () {
                            return d3.select(this).selectAll(".nested-selector > input").each(function () {
                                n += d3.select(this).property("checked") ? 1 : 0;
                                n0++;

                                // console.log(this.value + ", " + d3.select(this).property("checked"));
                                state.P.setSensor(this.value, d3.select(this).property("checked"));

                                // This is the value of the children elements
                                return d3.select(this).property("checked");
                            });
                        });
                        var _f = function (id, b) {
                            d3.select(_HASH_ + id).property("indeterminate", false);
                            d3.select(_HASH_ + id).property("checked", b);
                        };
                        var _f2 = function (id) {
                            d3.select(_HASH_ + id).property("indeterminate", true);
                        };
                        n === 0
                            ? _f(this.id, false)
                            : n < n0
                                ? _f2(this.id)
                                : _f(this.id, true);
                    });
                });
            });
        }

        /**
         * Set the inital state of the parent checkboxes.  See the **ParentCheckbox**, for
         * notes about the process.
         */
        function _updateParentSelectors() {
            d3.selectAll(".sensor-selector").each(function () {
                d3.select(_HASH_ + d3.select(this).property("parent")).property("checked", function () {
                    var n = 0;
                    var n0 = 0;
                    d3.selectAll("." + this.id).each(function () {
                        return d3.select(this).selectAll(".nested-selector > input").each(function () {
                            n += d3.select(this).property("checked") ? 1 : 0;
                            n0++;
                            return d3.select(this).property("checked");
                        });
                    });
                    var _f = function (id, b) {
                        d3.select(_HASH_ + id).property("indeterminate", false);
                        d3.select(_HASH_ + id).property("checked", b);
                    };
                    var _f2 = function (id) {
                        d3.select(_HASH_ + id).property("indeterminate", true);
                    };
                    n === 0
                        ? _f(this.id, false)
                        : n < n0
                            ? _f2(this.id) :
                            _f(this.id, true);
                });
            });
        }
    }


    /** Enables the "sticky" header for scrolling tabular data */
    function setStickyHeader(tableContainer, tableId) {
        // Reset the view port, if the user hits the refresh button
        // window.onbeforeunload = function () { window.scrollTo(0, 0); }

        // Accounts for the table's border
        var tdOffset = 0.5;

        var thisAnchor = document.getElementById(tableContainer)
            .querySelector("table > thead")
            .querySelectorAll("tr")[0]
            .querySelectorAll("th")[0];
        var anchorTopOffset = thisAnchor.getBoundingClientRect().top;
        var anchorLeftOffset = thisAnchor.getBoundingClientRect().left;

        // var anchorTopOffset = 0;

        // Create the header clone
        var _fh = document.getElementById(tableContainer).querySelector("table > thead").cloneNode(true);
        document.getElementById(tableContainer).appendChild(document.createElement("div"))
            .setAttribute("id", "fixed-top-container");
        document.getElementById("fixed-top-container").appendChild(document.createElement("TABLE"))
            .appendChild(_fh).setAttribute("id", "fixed-top");

        // Deliberatly clone the classes.
        if (navigator.platform === "iPad") {
            document.getElementById("fixed-top-container").querySelector("table")
                .classList.add(document.getElementById(tableContainer).querySelector("table").classList.value);
        }
        else {
            document.getElementById("fixed-top-container").querySelector("table")
                .classList = document.getElementById(tableContainer).querySelector("table").classList.value;
        }

        document.getElementById("fixed-top").querySelectorAll("tr")[1]
            .parentNode.removeChild(document.getElementById("fixed-top").querySelectorAll("tr")[1]);

        // Since we cloned the table header, all the Id's are duplicates, so lets fix that.
        var list = document.querySelectorAll("#fixed-top > tr")[0].querySelectorAll("th");
        var i = 0;
        var l = list.length;
        while (i < l) {
            list[i].id = list[i].id + "-h";
            i++;
        }

        // Listen for the scroll
        var ticking = false;
        window.addEventListener("scroll", function (e) {
            if (!ticking && thisAnchor.getBoundingClientRect().width > 1) {
                window.requestAnimationFrame(function () {
                    var offsetY = window.scrollY;
                    if (offsetY > anchorTopOffset) {
                        document.getElementById("fixed-top").style.display = "block";
                        document.getElementById("fixed-top").style.left =
                            (anchorLeftOffset + (-1 * window.scrollX) - tdOffset) + "px";
                    } else if (offsetY < anchorTopOffset) {
                        document.getElementById("fixed-top").style.display = "none";
                    }
                    window.scrollX > 0 ? _autoScale(findTheRightWindowSize(30)) : _autoScale("100%");
                    ticking = false;
                });
                _updateTdWidth(tableId, "fixed-top");
            }
            ticking = true;
        });

        function _autoScale(a) {
            // Faster version!
            document.querySelector("body").style.width = a;

            // Reuseable version
            // document.querySelectorAll(".window-auto-scale").forEach(function (d) {
            //     d.style.width = a;
            // });
        }

        function _updateTdWidth(srcId, destId) {
            var q = document.getElementById(srcId).getElementsByTagName("th");
            var i = 0;
            var l = q.length;
            var _w = 0;
            while (i < l) {
                _w = Math.ceil(document.getElementById(q[i].id).getBoundingClientRect().width);
                document.getElementById(q[i].id + "-h").style.minWidth = _w + "px";
                document.getElementById(q[i].id).style.minWidth = _w + "px";
                i++;
            }
            return;
        }
    }


    /** Telemetry stuff */
    function telemetry() {
        d3.select(_HASH_ + "notify-telemetry-icon").classed("hidden", false);
    }


    /** Removes all the MADIS flags from the API response.  At this time there is no reset here. */
    function stripMADISFlags() {
        var _s = Mesonet.store.station[0];
        (Object.keys(_s.QC)).map(function (k) {
            _s.QC[k].map(function (t, i) {
                if (t !== null) {
                    for (var ii = 0; ii < _s.QC[k][i].length;) {
                        if (Mesonet.store.qcTypes[_s.QC[k][i][ii]].SOURCE_ID === "2") {
                            _s.QC[k][i].splice(_s.QC[k][i].indexOf(_s.QC[k][i][ii], 1))
                            ii--
                        }
                        ii++
                    }
                    _s.QC[k][i] = _s.QC[k][i].length > 0 ? _s.QC[k][i] : null;
                }
            })
        });
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


    function populateToolbar() {
        // This function will be completely rewritten using better DOM tactics.

        var a = "<ul class=\"nav navbar-nav\">" +
            "<li class=\"dropdown\">" +
            "<a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\" role=\"button\" " +
            "aria-haspopup=\"true\" aria-expanded=\"false\">View <span class=\"caret\"></span></a>" +
            "<ul class=\"dropdown-menu\">" +
            "<li><a href=\"#\" id=\"toolbar__view-show-default\">Show Default Sensors</a></li>" +
            "<li><a href=\"#\" id=\"toolbar__view-show-all-best\">Show All Sensors (Best Choice)</a></li>" +
            "<li><a href=\"#\" id=\"toolbar__view-show-all\">Show All Sensorts</a></li>" +
            "<li role=\"separator\" class=\"divider\"></li>" +
            "<li><a href=\"#\" id=\"toolbar__view-show-units\">Units &amp; Measure</a></li>" +
            "</ul>" +
            "</li>" +
            "</ul>"

        document.getElementById(state.toolbar.id).innerHTML = a;
    }


    function showDefaultSensors() {
        distroyTooltips();
        state.P.setSensorBestChoice(true);
        state.P.removeAllSensors();
        Object.keys(state.tabTableEmitter.sensorState.defaultState).map(function (k) {
            if (state.tabTableEmitter.sensorState.defaultState[k]) { state.P.addSensor(k) }
        })
        tabTableEmitter();
    }


    function showSensorBestChoice() {
        distroyTooltips();
        state.P.setSensorBestChoice(true);
        Object.keys(state.tabTableEmitter.sensorState.defaultState).map(function (k) {
            state.P.addSensor(k);
        })
        tabTableEmitter();
    }


    function showAllSensors() {
        distroyTooltips();
        state.P.setSensorBestChoice(false);
        Object.keys(state.tabTableEmitter.sensorState.defaultState).map(function (k) {
            state.P.addSensor(k);
        })
        tabTableEmitter();
    }


    function toggleUnixTime() {
        state.runFlags.showUnixTime = state.runFlags.showUnixTime ? false : true;
        tabTableEmitter();
    }


    function toogleDATTIMTime() {
        state.runFlags.showDATTIMtime = state.runFlags.showDATTIMtime ? false : true;
        tabTableEmitter();
    }


    function createBetaFeaturesMessage() {
        var message = "<p class\"lead\">Beta features enabled</p>" +
            "<ul><li><code>ALT + [1,2,3]</code> for different view modes</li>" +
            "<li><code>ALT + d</code> to see the station's Id</li>" +
            "<li><code>ALT + SHIFT + Down Arrow</code> to go to first available QC segment</li>" +
            "<li><code>ALT + SHIFT + U</code> to toggle UNIX time stamps vs. human time format</li>" +
            "<li><code>ALT + U</code> to toggle API time format vs. human time format</li></ul>";

        document.getElementById(
            createAlertBox({
                alertType: "success",
                message: message,
            }, "alert-box-container")
        ).addEventListener("click", function () { setBetaFeaturesMessage(false); });

        setBetaFeaturesMessage(true);
    }


    function setBetaFeaturesMessage(b) {
        state.ui.betaFeaturesMessageActive = b;
    }


    function scrollToElementById(id, offset) {
        window.scrollTo(0, (document.getElementById(id).getBoundingClientRect().top) + offset)
    }


    function distroyTooltips() {
        document.querySelectorAll("[id^='tooltip']").forEach(function (k) {
            removeElementById(k.id);
        })
    }


    function removeElementById(id) {
        var el = document.getElementById(id);
        return el.parentElement.removeChild(el);
    }


    function hrefHandler(url, newWindow) {
        if ((typeof newWindow !== "undefined" && newWindow) || state.http.openInNewWindow) {
            window.open(url, '_blank');
        }
        else {
            window.location.href = url;
        }
    }


    /**
     * Formats the date
     *
     * @param {string | object<Date> | number} - Date in either string, Date or Epoch integer
     * @param {bool} - UTC timezone? Default is true
     * @return {string} - Formatted time
     */
    function formatDate(_date, UTC, YEAR) {

        if (
            typeof state.runFlags.showUnixTime !== "undefined" &&
            state.runFlags.showUnixTime
        ) {
            // If we want the time in unix format.
            return Mesonet._parseAPITime(_date, false);
        }

        var _t = {};
        if (
            typeof state.runFlags.showDATTIMtime !== "undefined" &&
            state.runFlags.showDATTIMtime
        ) {
            // If we want the time in unix format.
            _t = Mesonet.parseAPITime(_date, false);
            return _t.year + _t.month + _t.day + _t.hour + _t.min;
        }

        var _utc = state.tabTableEmitter.props.timeUTC;
        _utc = typeof _utc === "undefined" ? true : _utc;
        var _p = _date.split("|").length > 1 ? _date.split("|") : null;
        _t = Mesonet.parseAPITime(_date, !_utc);

        return _t.monthName + " " + _t.day + " " + _t.hour + ":" + _t.min;
    }


    /**
     * Pretty formatter for defaulted Mesonet API sensor names
     * @param a {string} - sensor name
     */
    function formatSensor(a) {
        return (typeof a !== "string" || a.split("_").length === 1)
            ? a
            : a.split("_").map(function (d) { return d.charAt(0).toUpperCase() + d.slice(1); }).join(" ");
    }


    /**
     * Stripes HTML table.
     * Used when you are show/hiding rows dynamically.  If your table is static, recommend using
     * CSS stylings.
     *
     * @param tableId {string} - Id of table to apply styling to.
     * @param hideClass {string} - CSS class of hidden rows.  These will be skipped.
     */
    function stripeTable(tableId, hideClass, altClass) {
        altClass = typeof altClass === "undefined" ? "alt" : altClass;
        var rows = document.getElementById(tableId).querySelectorAll("table tbody tr");
        var offset = 0;
        var i = 0;
        var l = rows.length;
        while (i < l) {

            // If the row we are looking at is already marked as `hidden` then move on.
            if (rows[i].className.match(hideClass)) {
                offset++;
                i++;
                continue;
            }

            // We want to apply our CSS to the even rows
            var _l = rows[i].className.split(" ").length;
            if ((i - offset) % 2 === 0) {
                rows[i].className = rows[i].className + _space(_l) + altClass;
            }
            else {
                rows[i].className = rows[i].className.replace(_space(_l), null);
            }

            i++;
        }

        function _space(_l) {
            return typeof _l === "undefined"
                ? " "
                : _l > 1
                    ? " "
                    : "";
        }

    }


    /**
     * Returns a HH:MM (am/pm) formatted date string for display
     * @param a {number} - Our odd-ball time format.
     */
    function formatTime(a) {
        var _t = Mesonet.epochDate(Mesonet._parseAPITime(a)).toString().substring(16, 21);
        var _a = Number(_t.substring(0, 2));
        return _a > 12 ? (_a - 12) + _t.substring(2, 5) + " pm" : _a + _t.substring(2, 5) + " am";
    }


    /**
     * Returns the correction for the window sizing
     * @param offset {number} - pixel offset.  Usually for correcting CSS styles.
     * @return {string} - pixel width in "px".
     */
    function findTheRightWindowSize(offset) {
        offset = typeof offset === "undefined" ? 0 : offset;
        var _a = document.getElementById("tabtable").scrollWidth + offset;
        var _b = document.querySelector("body").getBoundingClientRect().width;
        return (Math.max(_a, _b) - 2) + "px";
    }


    /**
     * Prepends a value to an array.
     *
     * @param v {any} - Value to prepend
     * @param a {Array} - Array to prepend to
     * @returns {Array}
     *
     * See http://stackoverflow.com/a/6195753/4835631
     */
    function prepend(v, a) {
        var _a = a.slice(0);
        _a.unshift(v);
        return _a;
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

    // /** Appends a container componenet */
    // function createComponentContainer(props, renderTo, callback) {
    //     // Gett'n ready for JSX yo!
    //     var html =  "<div class=\"row\"" +
    //         (typeof props.containerId !== "undefined" ? props.containerId : "") + ">" +
    //             "<div class=\"col-sm-12\">" +
    //             "<p class=\"lead\">" + props.title + "</p>" +
    //             "<hr/>" +
    //             "<div id=" + props.id + "></div>" +
    //             "</div>" +
    //             "</div>";

    //     document.getElementById(renderTo).appendChild(html);

    //     if (typeof callback === "function") { callback(); }
    // }

})();





// Little helper...
// Remove me before production.
function cout(s) {
    if (typeof s === "undefined") {
        console.log("BANG!");
    }
    else {
        console.log(s);
    }
}


// /**
//  * Converts epoch date to API date.
//  */
// Mesonet.prototype.epochToApi = function (epoch) {
//     var _s = typeof epoch === "number"
//         ? this.epochDate(epoch).toJSON()
//         : Number(this.epochDate(epoch)).toJSON();

//     return (_s.split(".")[0]).replace(/[:T-]/g, "").slice(0, 12);
// };


// /**
//  * Returns the UTC Unix time from our odd-ball time format response
//  *
//  * `dateString` has the timezone format of `%s|%z|%Z` so we
//  * need to break apart the values and then get the parts from it.
//  *
//  * @param {string} dateString
//  * @returns {number}
//  */
// Mesonet.prototype._parseAPITime = function (dateString, local) {
//     /**
//      * We expect the response to look like:
//      *     `1451580960|-0800|PST`
//      * The first segment is the _local unix time_ not the UTC unix time. This
//      * is a by product of the Mesonet API.  The following is the UTC offset
//      * which we will convert to milliseconds and simple add to the local unix
//      * time.
//      */
//     var _p = dateString.split("|");

//     var _h = [3];
//     _h[0] = _p[1].slice(0, 1) === "-" ? -1 : 1;
//     _h[1] = Number(_p[1].slice(1, 3)) * 3600;
//     _h[2] = Number(_p[1].slice(3, 5)) * 60;

//     var _date = null;
//     if (typeof local === "undefined" || !local) {
//         _date = _p === -1 ? null : Number(_p[0]) - _h[0] * (_h[1] + _h[2]);
//     }
//     else {
//         _date = _p === -1 ? null : Number(_p[0]);
//     }

//     return _date;
// };


// /**
//  * Epoch Date methods
//  * @param {date | string | number}
//  * @returns {number | date}
//  */
// Mesonet.prototype.epochDate = function (_date) {

//     /**
//      * Logic
//      * if UTC
//      *     if _date is Date object
//      *     if _date is a string
//      *     if _date is a Unix time
//      * Not UTC
//      *     if _date is Date object
//      *     if _date is a string
//      *     if _date is a Unix time
//      */


//     if (Object.prototype.toString.call(_date) === "[object Date]") {
//         return Math.round(new Date(_date).getTime() / 1000.0);
//     }
//     else if (typeof _date === "number") {
//         return new Date(_date * 1000);
//     }
//     else {
//         return Math.round(new Date(_date).getTime() / 1000.0);
//     }

// };


// Mesonet.prototype.parseAPITime = function (t, local) {
//     // needs to accept either a number (unix time, utc) or an api string

//     // Determine the `local` time option
//     local = typeof local === "undefined" || typeof local !== "boolean" ? false : local;

//     var _tz = local ? t.split("|")[2] : "UTC";
//     var _tzo = local ? t.split("|")[1].slice(0, 3) + ":" + t.split("|")[1].slice(3, 5) : "+00:00";

//     // Create a Date object
//     _t = new Date(this._parseAPITime(t, local) * 1000).toISOString();
//     _tISO = local ? _t.split("Z")[0] + _tzo : _t;

//     var _m = [
//         "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
//     ];

//     // 012345678901234567892123
//     // 2015-12-31T16:56:00.000Z

//     // ISO 8601 format
//     // 2016-12-31T14:02:00+00:00
//     return {

//         iso8601: _tISO,
//         year: pad(Number(_tISO.slice(0, 4)), 4),
//         month: pad(Number(_tISO.slice(5, 7)), 2),
//         monthName: _m[Number(_tISO.slice(5, 7)) - 1],
//         day: pad(Number(_tISO.slice(8, 10)), 2),
//         hour: pad(Number(_tISO.slice(11, 13)), 2),
//         min: pad(Number(_tISO.slice(14, 16)), 2),
//         sec: pad(Number(_tISO.slice(17, 19)), 2),
//         msec: pad(Number(_tISO.slice(20, 23)), 3),
//         tzone: _tz,
//         tzo: _tzo
//     };

//     // http://stackoverflow.com/a/10073788/4835631
//     function pad(n, width, c) {
//         c = typeof c === "undefined" ? "0" : c;
//         n = n.toString();
//         return n.length >= width ? n : new Array(width - n.length + 1).join(c) + n;
//     }
// };