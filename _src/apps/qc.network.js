/*!
 * MesoWest/SynopticLabs Quality Control Segments Web Application
 * (C) 2016-2017 Mesowest/Synoptic Labs.  All rights reserved.
 */
(function () {
    "use strict";

    var _ID_ = "#";
    var _CLASS_ = "."

    var state = {
        runFlags: {
            kioskMode: false,
            kioskTableHover: false,
            touchDevice: (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0)),
            enabledTouchControls: false
        },
        localStorage: {
            cookieName: "mesowest",
            cookieTTL: 1
        },
        ui: {
            showBetaQCDatabaseMessage: false,
            appContainer: "app-container",
            appLoading: "app-loading",
            appLoadingProgressBar: "progress-bar",
            alertBoxContainer: "alert-box-container",
            css: {
                hide: "hide",
            }
        },
        filterSelectors: {
            whiteList: { f: {}, s: {} },
            completeBlackList: { s: {}, f: {} },
            counts: {}
        },
        http: {
            openInNewWindow: true,
            slStationQCURL: "./station.html",
            slTabTableURL: "./tabtable.html"
        },
        tableEmitter: {
            timeInterval: 86400,
        },
        toolbar: {
            id: "toolbar-local-tools-container",
            notifyCursorModeId: "notify-cursor-mode"
        },
        urls: {
            slStationQC: "./station.html",
            slTabTable: "./tabtable.html"
        },
        defaultToken: "demotoken",
        api: {}
    };

    // --- DO NOT LET THIS LINE MAKE IT INTO THE WILD !!! ---
    // console.log(state);

    d3.select(_ID_ + state.ui.appContainer).classed("hide", true);

    var P = new User({
        cookie_name: state.localStorage.cookieName,
        cookie_ttl: state.localStorage.cookieTTL
    });
    var APITOKEN = typeof P.getToken() === null ? P.getToken() : state.defaultToken;
    var Mesonet = new MesonetAPI({ token: APITOKEN, service: "QcSegments" });

    state.api = Mesonet.parseApiArgs();
    state.api.timeformat = "%s|%z|%Z";
    state.api.obtimezone = "local";
    state.api.diag = typeof state.api.diag === "undefined" ? false : state.api.diag;
    state.api.showemptystations = typeof state.api.showemptystations === "undefined"
        ? 0
        : state.api.showemptystations;
    state.api.status = typeof state.api.status === "undefined"
        ? 'active'
        : state.api.status;

    // Use the Dev server?
    if (typeof state.api.dev !== "undefined") { Mesonet.setDevServer(true); }

    // Deal with the touch controls
    if (state.runFlags.touchDevice) { createTouchScreenControls(); }

    // Kiosk Mode
    if (typeof state.api.kioskMode !== "undefiend" && state.api.kioskMode === '2') {
        delete state.api.kioskMode

        state.runFlags.kioskMode = true;
        state.runFlags.kioskTableHover = true;

        d3.select('footer').remove();
        document.body.style.zoom = "0.75";

        // This is wrapped because when there is no alert, it will break.
        if (document.getElementById("site-alert")) {
            document.getElementById("site-alert").style.display = 'none';
        }

        createTouchScreenControls();
        setTimeout(function () { window.location.reload(true) }, 5 * 60 * 1000);
    }

    Mesonet.fetchVariables(true);
    Mesonet.fetch({ apiArgs: state.api });

    $.when(Mesonet.ready()).done(function () {
        // console.log(Mesonet)

        // Should be updated to newer pattern
        document.getElementById(state.ui.appLoadingProgressBar).style.width = "100%";

        // Check the API response to make sure we have data and not just an error message.
        if (Mesonet.store.status !== 1) {
            createAlertBox({
                alertType: "danger",
                message: Mesonet.store.telemetry[0],
            }, state.ui.alertBoxContainer)
            return;
        }

        // If we are using the QC Test DB, need to tell the user.
        if (typeof state.api.qctestdb !== "undefined" && state.api.qctestdb === "1") {
            state.ui.showBetaQCDatabaseMessage = true;
            createAlertBox({
                alertType: "danger",
                message: "Using the QC Test Database",
            }, state.ui.alertBoxContainer)
        }

        d3.select(_ID_ + state.ui.appLoading).classed("hide", true);
        d3.select(_ID_ + state.ui.appContainer).classed("hide", false);

        tableEmitter();
    });

    function createTouchScreenControls() {

        if (state.runFlags.enabledTouchControls) {
            return;
        }
        else {
            state.runFlags.enabledTouchControls = true;
            state.runFlags.kioskTableHover = true;
        }

        // Again, JSX would be great!
        var a = '&nbsp;<span alt="Toggle Cursor Mode" id="toolbar-cursor-toggle">Table Hover&nbsp;' +
            '<i class="fa fa-toggle-on" id="notify-cursor-mode"></i></span>';

        document.getElementById('touch-toggle-controller').innerHTML = a;
        d3.select(_ID_ + 'touch-toggle-controller').on('touchstart', function (d) {
            state.runFlags.kioskTableHover = state.runFlags.kioskTableHover ? false : true;
            d3.select(_ID_ + state.toolbar.notifyCursorModeId)
                .classed('fa-toggle-on', state.runFlags.kioskTableHover)

            d3.select(_ID_ + state.toolbar.notifyCursorModeId)
                .classed('fa-toggle-off', !state.runFlags.kioskTableHover)
        })
    }

    function hrefHandler(url, newWindow) {
        if ((typeof newWindow !== "undefined" && newWindow) || state.http.openInNewWindow) {
            window.open(url, '_blank');
        }
        else {
            window.location.href = url;
        }
        return;
    }

    /** Table emitter */
    function tableEmitter(props) {

        // This will be surfaced eventually
        props = {
            tableContainer: "table-container",
            tableId: "qc-table",
        };

        var startTime = 0;
        var endTime = 0;
        if (typeof state.api.start === "undefined") {
            var _recent = typeof state.api.recent === "undefined" ? 1440 : state.api.recent;
            startTime = Mesonet.epochDate(new Date(new Date() - (_recent * 60 * 1000)));
            endTime = Mesonet.epochDate(new Date());
        }
        else {
            startTime = Mesonet.apiDateToEpoch(state.api.start);
            endTime = Mesonet.apiDateToEpoch(state.api.end);
        }

        var timeInterval = typeof state.api.display_interval === "undefined"
            ? (endTime - startTime) < 86401
                ? 3600
                : 86400
            : Number(state.api.display_interval);

        state.tableEmitter.timeInterval = timeInterval;

        // var t0 = performance.now();

        // We want an array with the start points in epoch time.  Remember that the last element
        // is the start of the last bin, it's not the `endTime`
        // Need to reduce the events down
        // @todo: Should be moved to improved map method.
        var qcEvents = {};
        var stid = Object.keys(Mesonet.store.tableOfContents);
        var intervals = [];
        var i = startTime;
        while (i < endTime) {
            intervals.push(i);
            qcEvents[i] = {};
            var ii = 0;
            var ll = stid.length;
            while (ii < ll) {
                if (typeof qcEvents[i][stid[ii]] === "undefined") { qcEvents[i][stid[ii]] = {}; }
                qcEvents[i][stid[ii]] = getEvents(qcEvents, stid[ii], i, i + timeInterval);
                ii++;
            }
            i = i + timeInterval;
        }
        stid = null;

        // We will use this later in the table cell generation chain. These are unique
        // flags and sensor information that needs to be carried along.
        var filterSelectors = { s: {}, f: {} };

        d3.select(_ID_ + props.tableContainer).selectAll("table").remove();
        var table = d3.select(_ID_ + props.tableContainer)
            .append("table").attr("id", props.tableId)
            .classed(props.tableId, true)
            .classed("pull-left table-hover", true);

        // Make the header
        table.append("thead").append("tr")
            .selectAll("th").data(["stid"].concat(intervals)).enter().append("th")
            .text(function (d) {
                if (d === "stid") { return null; }
                var _t = Mesonet.parseAPITime(d);
                if (timeInterval === 86400) { return _t.monthName + " " + _t.day; }
                else { return _t.monthName + " " + _t.day + " " + _t.hour + ":" + _t.min; }
            });

        // Create the rows
        var rows = table.append("tbody").selectAll("tr")
            .data(function () { return Mesonet.store.station.map(function (d) { return d.STID; }); })
            .enter().append("tr");

        // Create and populate the cells
        var cells = rows.selectAll('td')
            .data(function (row) {
                var _this = this;
                return ["stid"].concat(intervals).map(function (d) {
                    var _stid = d3.select(_this).datum();
                    return {
                        name: d,
                        value: d === "stid" ? _stid : qcEvents[d][_stid],
                        stid: _stid
                    };
                });
            })
            .enter().append("td")
            .text(function (d) { return d.name === "stid" ? d.value : null; })
            .attr("data-epoch", function (d) {
                return typeof d !== "undefined" && typeof d.name === "number"
                    ? Number(d.name) + timeInterval
                    : "null";
            })
            .classed("qc-active", false)
            .each(function (d) {
                // Bind the QC events to the cell
                var _this = this;
                var o = reduceQcStack(d.value);
                if (o !== null) {
                    Object.keys(o).map(function (k) {
                        // Update our unique controls (global) object.
                        if (typeof filterSelectors.f["qc_" + o[k].flag] === "undefined") {
                            filterSelectors.f["qc_" + o[k].flag] = true;
                        }
                        if (typeof filterSelectors.s[o[k].flag] === "undefined") {
                            filterSelectors.s[o[k].sensor] = true;
                        }
                        d3.select(_this).append("d")
                            .attr("data-stid", d.stid)
                            .attr("data-sensor", o[k].sensor)
                            .attr("data-qc_flag", o[k].flag)
                            .attr("data-count", o[k].count);

                        d3.select(_this).classed("qc-active", true);
                    });
                }
            })
            .on("mouseover", function (d) {
                // Call Bootstrap tooltip, this is one of the few jQuery dependencies
                if (d3.select(this).classed("qc-active")) {
                    $(this).tooltip({
                        "title": generateTooltipText(d),
                        "placement": "top",
                        "html": true,
                        "container": "body"
                    }).tooltip("show");
                }
            })
            .classed("clickable", true)
            .on("click", function (d) {
                if (state.runFlags.kioskTableHover) {
                    if (d3.select(this).classed("qc-active")) {
                        $(this).tooltip({
                            "title": generateTooltipText(d),
                            "placement": "top",
                            "html": true,
                            "container": "body"
                        }).tooltip("show");
                    }
                }
                else {
                    if (typeof d.name !== "undefined" && d.name === "stid") {
                        var _url = state.urls.slStationQC +
                            "?stid=" + d.value +
                            "&start=" + Mesonet.epochToApi(startTime);

                        if (state.ui.showBetaQCDatabaseMessage) { _url += "&qctestdb=1&qcbeta=1" }
                        hrefHandler(_url);
                    }
                    else {
                        var _end = Number(d3.select(this).attr("data-epoch"));
                        var _start = _end - timeInterval;
                        var _url = state.urls.slTabTable +
                            "?stid=" + d.stid +
                            "&start=" + Mesonet.epochToApi(_start) +
                            "&end=" + Mesonet.epochToApi(_end);

                        if (state.ui.showBetaQCDatabaseMessage) {
                            _url += "&qctestdb=1&qcbeta=1&dev=8089";
                        }
                        hrefHandler(_url);
                    }
                }
            });

        generateControls(filterSelectors);
        updateTableColors();
        return;
    }


    function updateTableColors() {
        updateFilterSelectorsUIState('update')

        // Deep copy object: http://stackoverflow.com/a/5344074/4835631
        var whitelist = JSON.parse(JSON.stringify(state.filterSelectors.whiteList));
        var counts = JSON.parse(JSON.stringify(whitelist));
        // Reset the table first!
        d3.selectAll('td.qc-active:not(.bang-sl-qc):not(.bang-sl-data-check):not(.bang-madis)')
            .each(function (d) { d3.select(this.parentNode).classed('hidden', false) })

        d3.selectAll(".qc-active").each(function (d) {
            d3.select(this).attr("class", "qc-active clickable");
        });

        Object.keys(whitelist.f).map(function (k) {
            var keepGoing = true;
            var _class = ''
            if (whitelist.f[k]) {
                d3.selectAll("d[data-qc_flag=\"" + k.split("qc_")[1].toString() + "\"]")
                    .each(function (d) {

                        if (
                            whitelist.f[this.dataset.qc_flag] &&
                            typeof whitelist.s[this.dataset.sensor] !== "undefined" ||
                            whitelist.s[this.dataset.sensor]
                        ) {
                            // Any "QC" flag that is "bad" should be in this array
                            [1].map(function (k, i) {
                                d.value.map(function (kk) {
                                    if (kk.qc_flag === k && whitelist.f['qc_' + k]) {
                                        _class = ' bang-sl-qc';
                                        keepGoing = false;
                                    }
                                })
                            });

                            if (keepGoing) {
                                d.value.map(function (k, i) {
                                    if (
                                        Mesonet.store.qcSource[k.qc_flag] === 'SynopticLabs' &&
                                        whitelist.f['qc_' + k.qc_flag]
                                    ) {
                                        _class = " bang-sl-data-check";
                                        keepGoing = false;
                                    }

                                    if (
                                        keepGoing &&
                                        Mesonet.store.qcSource[k.qc_flag] === 'MADIS' &&
                                        whitelist.f['qc_' + k.qc_flag]
                                    ) {
                                        _class = " bang-madis";
                                    }
                                });
                            }
                            counts.f["qc_" + this.dataset.qc_flag] += Number(this.dataset.count);
                            counts.s[this.dataset.sensor] += Number(this.dataset.count);
                            d3.select(this.parentNode).classed(_class, true);

                        }
                        keepGoing = true;
                    });
            }
            else {
                counts.f[k] = 0;
            }
        });
        state.filterSelectors.counts = counts;
        d3.selectAll('td.qc-active:not(.bang-sl-qc):not(.bang-sl-data-check):not(.bang-madis)')
            .each(function (d) { d3.select(this.parentNode).classed('hidden', true) })

        updateUICounters()
        return;
    }


    function generateControls(_fs) {

        var props = {
            containerId: "filter-selectors-container"
        };

        // Generate the QC flags UI selectors
        d3.select(_ID_ + props.containerId).append("p").text("QA/QC Flags");

        d3.select(_ID_ + props.containerId).append("div")
            .attr("class", "btn-group btn-group-xs")
            .attr("role", "group")
            .append("button").attr("name", "filter_selector_toggle_on")
            .attr("class", "btn btn-default")
            .attr("type", "button")
            .attr("value", "Select_All")
            .text("Select All")
            .on("click", function () {
                updateFilterSelectorsUIState('toggleFlagOn');
                updateTableColors();
            });

        d3.select(_ID_ + props.containerId + " > div")
            .append("button").attr("name", "filter_selector_toggle_off")
            .attr("class", "btn btn-default")
            .attr("type", "button")
            .attr("value", "Unselect_All")
            .text("Unselect All")
            .on("click", function () {
                updateFilterSelectorsUIState('toggleFlagOff');
                updateTableColors();
            });

        var p = d3.select(_ID_ + props.containerId)
            .append("div").classed("vspace-0", true)
            .append("ul").classed("filter-selectors list-unstyled", true)
            .selectAll("input")
            .data(Object.keys(_fs.f)).enter().append("li");

        p.append("input").attr("name", "filter_selector_flag")
            .attr("id", function (d) { return "flag_selector__" + d; })
            .attr("type", "checkbox")
            .attr("class", "filter_selector_flag")
            .property("checked", function (d) { return _fs.f[d]; })
            .attr("value", function (d) { return d; });

        p.append("label")
            .attr("for", function (d) { return "flag_selector__" + d; })
            .text(function (d) {
                return Mesonet.store.qcLongName[d.split("qc_")[1]]
                    .replace('Statistical', 'Stat.')
                    .replace('Consistency', 'Const.')
                    .replace('Persistence', 'Pers.')
            })
            .on("mouseover", function (d) {
                var _d = d.split("qc_")[1]
                d3.selectAll("d[data-qc_flag=\"" + _d + "\"]").each(function (_d) {
                    d3.select(this.parentNode).classed("highlight-border", true)
                })
            })
            .on("mouseout", function (d) {
                var _d = d.split("qc_")[1]
                d3.selectAll("d[data-qc_flag=\"" + _d + "\"]").each(function (_d) {
                    d3.select(this.parentNode).classed("highlight-border", false)
                })
            })
            .append("span").attr("id", function (d) { return "active_count__" + d; })


        // Generate the SENSOR flags UI selectors
        d3.select(_ID_ + props.containerId).append("hr").append("div").classed("vspace-0");
        d3.select(_ID_ + props.containerId).append("p").text("Sensors/Variables");

        d3.select(_ID_ + props.containerId).append("div")
            .attr("class", "btn-group btn-group-xs group2")
            .attr("role", "group")
            .append("button").attr("name", "sensor_selector_toggle_on")
            .attr("class", "btn btn-default")
            .attr("type", "button")
            .attr("value", "Select_All")
            .text("Select All")
            .on("click", function () {
                updateFilterSelectorsUIState('toggleSensorOn');
                updateTableColors();
            });

        d3.selectAll(_ID_ + props.containerId + " > .group2")
            .append("button").attr("name", "sensor_selector_toggle_off")
            .attr("class", "btn btn-default")
            .attr("type", "button")
            .attr("value", "Unselect_All")
            .text("Unselect All")
            .on("click", function () {
                updateFilterSelectorsUIState('toggleSensorOff');
                updateTableColors();
            });

        p = d3.select(_ID_ + props.containerId)
            .append("div").classed("vspace-0", true)
            .append("ul").classed("filter-selectors list-unstyled", true).selectAll("input")
            .data(Object.keys(_fs.s)).enter().append("li").classed('list-unstyled', true);

        p.append("input").attr("name", "filter_selector_sensor")
            .attr("id", function (d) { return "sensor_selector__" + d; })
            .attr("type", "checkbox")
            .attr("class", "filter_selector_sensor")
            .property("checked", function (d) { return _fs.s[d]; })
            .attr("value", function (d) { return d; });

        p.append("label")
            .attr("for", function (d) { return "sensor_selector__" + d; })
            .text(function (d) {
                return typeof Mesonet.store.sensors.sensorByName[d] !== "undefined"
                    ? Mesonet.store.sensors.sensorByName[d].longName
                    : d;
            })
            .on("mouseover", function (d) {
                d3.selectAll("d[data-sensor=\"" + d + "\"]").each(function (d) {
                    d3.select(this.parentNode).classed("highlight-border", true)
                })
            })
            .on("mouseout", function (d) {
                d3.selectAll("d[data-sensor=\"" + d + "\"]").each(function (d) {
                    d3.select(this.parentNode).classed("highlight-border", false)
                })
            })
            .append("span").attr("id", function (d) { return "active_count__" + d; });

        // // Update the `.table-container` offset
        // var _offset = (document.getElementById("filter-selectors-container")
        //     .getBoundingClientRect().width + 40) + "px";
        // document.getElementById("table-container").style.marginLeft = _offset;

        // Set the listener for selector changes
        d3.selectAll(".filter-selectors input").on("change", function (d) {
            d3.selectAll("[name=\"filter_selector_flag\"]")
                .each(function (d) { updateTableColors(); })
            d3.selectAll("[name=\"filter_selector_sensor\"]")
                .each(function (d) { updateTableColors(); })
        });
        return;
    }


    function updateUICounters() {
        Object.keys(state.filterSelectors.counts.s).map(function (k) {
            d3.select(_ID_ + 'active_count__' + k).text(function (d) {
                var _count = typeof state.filterSelectors.counts.s[k] === 'number'
                    ? state.filterSelectors.counts.s[k] === 0
                        ? null
                        : ' (' + state.filterSelectors.counts.s[k] + ')'
                    : null
                return _count;
            })
        })
        Object.keys(state.filterSelectors.counts.f).map(function (k) {
            d3.select(_ID_ + 'active_count__' + k).text(function (d) {
                var _count = typeof state.filterSelectors.counts.f[k] === 'number'
                    ? state.filterSelectors.counts.f[k] === 0
                        ? null
                        : ' (' + state.filterSelectors.counts.f[k] + ')'
                    : null
                return _count;
            })
        })
    }


    function updateFilterSelectorsUIState(mode) {
        mode = typeof mode === 'undefined' ? 'update' : mode
        var _whitelist = { s: {}, f: {} };
        switch (mode) {
            case 'toggleFlagOn':
                d3.selectAll('.filter_selector_flag')
                    .property('checked', true).attr('value', true)
                    .each(function (d) {
                        d3.select(this).property('checked', true)
                        _whitelist.f[d] = true
                    });
                break;
            case 'toggleFlagOff':
                d3.selectAll('.filter_selector_flag')
                    .property('checked', false).attr('value', false);
                break;
            case 'toggleSensorOn':
                d3.selectAll('.filter_selector_sensor')
                    .property('checked', true).attr('value', true)
                    .each(function (d) {
                        d3.select(this).property('checked', true);
                        _whitelist.s[d] = true;
                    });
                break;
            case 'toggleSensorOff':
                d3.selectAll('.filter_selector_sensor')
                    .property('checked', false).attr('value', false);
                break;
            case 'update':
                d3.selectAll('[name=\"filter_selector_flag\"]')
                    .each(function (d) { _whitelist.f[d] = d3.select(this).property("checked"); });
                d3.selectAll('[name=\"filter_selector_sensor\"]')
                    .each(function (d) { _whitelist.s[d] = d3.select(this).property('checked'); });
                break;
            default:
                console.warn('wut?');
        }
        state.filterSelectors.whiteList = _whitelist;
        return _whitelist
    }


    function getEvents(qcEvents, stid, timeStart, timeEnd) {

        if (qcEvents[stid] === null) { return; }
        if (typeof Mesonet.store.station[Mesonet.store.tableOfContents[stid]].QC === "undefined") {
            return null;
        }

        var _ts = typeof timeStart === "number" ? timeStart : Number(timeStart);
        var _te = typeof timeEnd === "number" ? timeEnd : Number(timeEnd);
        var events = [];

        Mesonet.store.station[Mesonet.store.tableOfContents[stid]].QC.map(function (d, i) {
            // Using the negation case. See my notes.
            if (
                !(Mesonet.parseAPITime(d.end).epoch <= _ts ||
                    Mesonet.parseAPITime(d.start).epoch >= _te)
            ) {
                events.push(d);
            }
        });
        return events;
    }


    // Helper functions
    function generateTooltipText(d) {
        // Need to return an HTML string to inject into the tooltip.
        // Man ES6 would be great right now.
        var time = ''
        var t = Mesonet.parseAPITime(d.name);
        time = state.tableEmitter.timeInterval === 86400
            ? t.monthName + " " + t.day
            : t.monthName + " " + t.day + " " + t.hour + ":" + t.min;

        var o = reduceQcStack(d.value);
        var s = "<div style='border-bottom:1px solid white; text-align:left'><b>" +
            d.stid + " - " + time + "</b></div>" +
            "<table class\"qc-tooltip\" style='text-align:left;'><thead>" +
            "<tr><th>&nbsp;</th><th>Sensor</th><th>QC Flag</th></tr>" +
            "</thead><tbody>";

        Object.keys(o).map(function (k) {
            var _t = Mesonet.parseAPITime(o[k].start);
            var _ts = _t.monthName + "&nbsp;" + _t.day;
            _t = Mesonet.parseAPITime(o[k].end);
            var _te = _t.monthName + "&nbsp;" + _t.day;

            s += "<tr><td>" + _ts + " - " + _te + "</td><td>" +
                (typeof Mesonet.store.sensors.sensorByName[o[k].sensor] !== "undefined"
                    ? Mesonet.store.sensors.sensorByName[o[k].sensor].longName
                    : o[k].sensor) +
                "</td><td>" + o[k].flag_name + "</td></tr>";
        });

        s += "</tbody></table>";
        return s;
    }

    // Worker function to reduce a QC segment stack
    function reduceQcStack(arr) {
        if (typeof arr === "undefined" || typeof arr !== "object" || arr === null) {
            return null;
        }
        var reducedEvents = {};
        arr.map(function (k, i) {
            var key = k.sensor.replace("_qc_", "_") + "__" + k.qc_flag;
            if (typeof reducedEvents[key] === "undefined") {
                reducedEvents[key] = {
                    start: k.start,
                    end: k.end,
                    broken: false,
                    sensor: k.sensor.split("_qc_")[0],
                    flag_name: Mesonet.store.qcLongName[k.qc_flag],
                    flag: k.qc_flag,
                    count: 0
                };
            }
            reducedEvents[key].count++

            if (k.start < reducedEvents[key].start) {
                reducedEvents[key].start = k.start;
                reducedEvents[key].broken = true;
            }
            if (k.end > reducedEvents[key].end) {
                reducedEvents[key].end = k.end;
                reducedEvents[key].broken = true;
            }
        })
        return reducedEvents;
    }

    /**
     * Appends a BS Alert box
     * props.alertType, BS3 alert type
     * props.message, string of text message
     */
    function createAlertBox(props, renderTo) {
        d3.select(_ID_ + renderTo).append("div").classed("row", true)
            .append("div").classed("col-sm-12", true)
            .append("div").classed("alert alert-dismissible", true)
            .classed("alert-" + props.alertType, true).attr("role", "alert")
            .text(props.message)
            .append("button").classed("close", true)
            .classed(state.ui.css.hide, function () {
                return !(typeof props.closeMessage === "undefined" ? true : props.closeMessage);
            })
            .attr("data-dismiss", "alert")
            .append("span").attr("aria-hidden", "true").html("&times;")
        return;
    }
}());