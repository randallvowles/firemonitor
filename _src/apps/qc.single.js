/*!
 * MesoWest/SynopticLabs Quality Control Segments Web Application
 * Main handler for MW/SL QC Tools
 * 
 * (C) 2016 Mesowest/Synoptic Labs.  All rights reserved.
 */
// *** This is old. Please rewrite me. ***
(function () {
    "use strict";

    d3.select("#app-container").classed("hide", true);

    // Global variables
    var APITOKEN = "demotoken";
    var QCLOOKUP = {};
    var QCLOOKUPLN = {};
    var VARLONGNAME = {};
    var QCVENDORS = {};
    var QCVENDORSLN = {};
    var ACTIVE_FILTER = { flag: [], sensor: [] };

    var M = new Mesonet({ token: APITOKEN, service: "QcSegments" });
    var args = M.windowArgs();

    // Overide the default token
    if (typeof args.token !== "undefined") {
        APITOKEN = args.token;
        M.setApiToken(APITOKEN);
        console.log("Alternate token defined.  #uziuc");
    }

    // Allow the user to pass a `start` time.
    args.year = typeof args.start !== "undefined" ? args.start.slice(0, 4) : args.year;

    M.fetch({
        service: "QcSegments",
        data_complete: true,
        ledger: true,
        api_args: {
            complete: 1,
            stid: args.stid,
            start: Number(args.year + "01010000"),
            end: Number(args.year + "12312359")
        }
    });

    if (
        typeof M.windowArgs()["showResponse"] !== "undefined" 
        && M.windowArgs()["showResponse"] === "1"
    ) {
        M.printResponse();
    }

    // Wait for our async call to return
    $.when(M.async()).done(function () {
        var __r = M.response;

        // We are just going to patch these for now.
        QCLOOKUP = M.qcLookupTable();
        QCLOOKUPLN = M.qcLookupTableFullName();
        QCVENDORS = M.qcLookupVendorID();
        QCVENDORSLN = M.qcLookupVendorIDLN();
        VARLONGNAME = M.variableLookupTable();

        __buildSearchUI();

        var calendarConfig = {
            show_doy: false,
            year: args.year,
            container_id: "day-of-year-calendar-container",
            table_id: "day-of-year-calendar",
            table_class: "table table-condensed table-bordered doy-picker",
            mwActiveClass: "mw-bang",
            madisActiveClass: "madis-bang",
            table_null_class: "table-null",
            stid: M.response.station[0].STID,
            responseErrClass: "alert alert-warning",
            esponseErrTitleClass: "",
            responseErrTextClass: "lead text-center"
        };

        // Set the day-of-year toggle
        if (calendarConfig.show_doy) {
            $('#show-doy-toggle-icon').addClass("fa-toggle-on");
        } else {
            $('#show-doy-toggle-icon').addClass('fa-toggle-off');
        }

        // Set page title
        d3.select("#station-name").append("h3").text(__r.station[0].NAME + " (" + __r.station[0].STID + ")");
        d3.select("#station-name").append("p").classed("lead", true).text(
            __r.station[0].COUNTY + 
            " County, " + __r.station[0].STATE + ", " + __r.station[0].COUNTRY
        );

        d3.select("#station-name").append("p").append("a")
            .attr("href", function () {
                return "/network.html?radius=" + 
                    __r.station[0].STID + ",50&" +
                    "&display_interval=3600" +
                    "&status=active" +
                    "&showemptystations=0" +
                    // "network=" + __r.station[0].MNET_ID + 
                    "&recent=1440"
            })
            .text("Operated by " + __r.station[0].MNET_LONGNAME);
            
        d3.select("#station-name").append("p").text(
            __r.station[0].LATITUDE + "N, " + __r.station[0].LONGITUDE + "E, Elevation " + __r.station[0].ELEVATION + "ft."
        );

        // Build table, register the tooltips and key listeners
        M.makeSingleYearDisplay({ filter: ACTIVE_FILTER, options: calendarConfig });
        __fireTooltip({ filter: ACTIVE_FILTER });
        $('[data-toggle="tooltip"]').click(function () { __fireQcDirector($(this).attr('id')); });
        $('#show-doy-toggle-btn').click(function () { __fireDoyToggle(M, calendarConfig); });
        document.addEventListener('keydown', __shortcutKeyListener, false);


        // Initiate filter selector listener & handler
        $('input[class^="filter"]').click(function () {
            var _$ = $(this);
            __syncCheckBox(_$.attr('id'), "-b");

            // We want to know what options are selected and NOT include those
            // in our exclude (filter) list.  If the `Select All` option is
            // selected then we want to flush the exclude list.  First listen 
            // for changes in Sensors, then QC Flags.
            var selectedSelectors = [];
            var i, l;
            if (_$.is(".filter-selector-sensor")) {
                selectedSelectors = [];
                ACTIVE_FILTER.sensor = [];

                if ($(".filter-selector-all-sensor").prop({ checked: true })) {
                    $(".filter-selector-all-sensor").prop({ checked: false });
                }

                // We display based on negation; i.e. we white-list these            
                selectedSelectors = $(".filter-selector-sensor:checkbox:not(:checked)");
                l = selectedSelectors.size();

                for (i = 0; i < l; i++) {
                    ACTIVE_FILTER.sensor.push(selectedSelectors[i].getAttribute('value'));
                }

            } else if (_$.is(".filter-selector-flag")) {
                selectedSelectors = [];
                ACTIVE_FILTER.flag = [];

                if ($(".filter-selector-all-flag").prop({ checked: true })) {
                    $(".filter-selector-all-flag").prop({ checked: false });
                }

                selectedSelectors = $(".filter-selector-flag:checkbox:not(:checked)");
                l = selectedSelectors.size();

                for (i = 0; i < l; i++) {
                    ACTIVE_FILTER.flag.push(Number(selectedSelectors[i].getAttribute('value')));
                }

            } else if (_$.is(".filter-selector-all-sensor")) {
                // For the next two cases, we will see if we need to reset the 
                // the selectors to the default state.
                if ($(".filter-selector-sensor:checked").size() > 0) {
                    $(".filter-selector-all-sensor").prop({ checked: true });
                    $(".filter-selector-sensor").prop({ checked: false });
                }
                ACTIVE_FILTER.sensor = [];
            } else if (_$.is(".filter-selector-all-flag")) {
                if ($(".filter-selector-flag:checked").size() > 0) {
                    $(".filter-selector-all-flag").prop({ checked: true });
                    $(".filter-selector-flag").prop({ checked: false });
                }
                ACTIVE_FILTER.flag = [];
            } else {
                // Not sure how we'd get here, but in case we do...
                console.log("Filter selector error.  #b4skf");
            }

            __syncCheckBox(_$.attr('id'), "-b");

            // Rebuild the display & re-register tooltips and shortcut keys          
            M.makeSingleYearDisplay({ filter: ACTIVE_FILTER, options: calendarConfig });
            $('[data-toggle="tooltip"]').click(function () { __fireQcDirector($(this).attr('id')); });
            __fireTooltip({ filter: ACTIVE_FILTER });
        });

        d3.select("#app-loading").classed("hide", true);
        d3.select("#app-container").classed("hide", false);
    });

    /* ------------------------------------------------------------------------------------------
     * Supporting functions
     * -----------------------------------------------------------------------------------------*/

    /**
     * Shortcut key handler
     * @param {any} e
     */
    function __shortcutKeyListener(e) {
        if (e.keyCode === 83) { $('#filter-modal').modal('toggle'); }
    }

    /**
     * QC Director handler
     * @param {string} id
     */
    function __fireQcDirector(id) {
        $('#qc-director-progress').hide();
        $('#qcd-24hr-view-btn').click(function () { console.log(this); __fire24hrView(id); });
        $('#qc-director').modal('show');
    }

    /**
     * Tooltip handler, when `data-toggle` is fired
     */
    function __fireTooltip(args) {
        if (typeof args === "undefined") {
            args = {};
        }

        $('[data-toggle="tooltip"]').each(function () {
            $(this).tooltip({
                title: function () { return __makeTooltip($(this).attr('id'), args); },
                html: true
            });
        });
    }

    /**
     * Toggle's Day of Year numbers on calendar
     */
    function __fireDoyToggle(M, calendarConfig) {

        if (calendarConfig.show_doy) {
            calendarConfig.show_doy = false;
            $('#show-doy-toggle-icon').removeClass("fa-toggle-on");
            $('#show-doy-toggle-icon').addClass("fa-toggle-off");
        } else {
            calendarConfig.show_doy = true;
            $('#show-doy-toggle-icon').removeClass("fa-toggle-off");
            $('#show-doy-toggle-icon').addClass("fa-toggle-on");
        }

        M.makeSingleYearDisplay({ filter: ACTIVE_FILTER, options: calendarConfig });
        __fireTooltip({ filter: ACTIVE_FILTER });
        $('[data-toggle="tooltip"]').click(function () { __fireQcDirector($(this).attr('id')); });

    }

    /**
     * Sync two HTML IDs
     */
    function __syncCheckBox(el, pair) {
        if (!el || !pair) { return false; }
        var re = new RegExp(pair + "$");
        var syncFrom, syncTo;
        if (el.match(re)) {
            syncFrom = el;
            syncTo = el.replace(re, "");
        } else {
            syncFrom = el;
            syncTo = el + pair;
        }
        document.getElementById(syncTo).checked = document.getElementById(syncFrom).checked;
        return true;
    }


    /**
     * Create the Search UI modal
     * Run once on page load
     */
    function __buildSearchUI() {
        // Assumes `__r` defined.
        var __r = M.response;

        // Sensor & Qc Flag stacks for this case.
        var stack_sensor = [];
        var stack_sensor_count = [];
        var stack_flag = [];
        var stack_flag_count = [];
        var i, j, lj;
        var li = __r.sensor.stack.length;
        for (i = 0; i < li; i++) {
            lj = __r.sensor.stack[i].length;
            for (j = 0; j < lj; j++) {
                if (!__has(__r.sensor.stack[i][j], stack_sensor)) {
                    stack_sensor.push(__r.sensor.stack[i][j]);
                }
            }
        }
        li = __r.qc.stack.length;
        for (i = 0; i < li; i++) {
            lj = __r.qc.stack[i].length;
            for (j = 0; j < lj; j++) {
                if (!__has(__r.qc.stack[i][j], stack_flag)) {
                    stack_flag.push(__r.qc.stack[i][j]);
                }
            }
        }

        // Render the filter tools, but keep them hidden.
        __buildSearchUIFilterSelector({ selector: "sensor", stack: stack_sensor });
        __buildSearchUIFilterSelector({ selector: "sensor-b", stack: stack_sensor });
        __buildSearchUIFilterSelector({ selector: "flag", stack: stack_flag });
        __buildSearchUIFilterSelector({ selector: "flag-b", stack: stack_flag });

        /** Create and append to DOM the variable selectors */
        function __buildSearchUIFilterSelector(args) {

            var stack = args.stack;

            // If we have a sync'd pair then we need the suffix (type, pair)
            var parts = args.selector.split("-");
            typeof parts[1] === "undefined" ? parts[1] = "" : parts[1] = "-" + parts[1];

            // If the selector exists, then delete it
            // if (document.getElementById("filter-container-selector-" + args.selector) !== "undefined") {
            //     console.log("here");
            //     document.getElementById("filter-container-selector-" + args.selector).innerHTML = "";
            // }

            // a: label, b: input
            var a, b, li, ul;

            // Turn all on/off
            ul = document.createElement("UL");
            li = document.createElement("LI");

            a = document.createElement("LABEL");
            a.setAttribute("class", "checkbox-inline");
            b = document.createElement("INPUT");
            b.setAttribute("type", "checkbox");
            b.setAttribute("class", "filter-selector-all-" + parts[0]);
            b.setAttribute("id", "filter-selector-all-" + args.selector);
            b.setAttribute("value", "all");
            b.setAttribute("checked", "checked");
            a.appendChild(b);

            b = document.createElement("SPAN");
            b.appendChild(document.createTextNode("Select All"));
            a.appendChild(b);

            li.appendChild(a);
            ul.appendChild(li);
            document.getElementById("filter-container-selector-" + args.selector)
                .appendChild(ul);

            var i = 0;
            var l = stack.length;
            for (i = 0; i < l; i++) {

                // Create the LI node
                li = document.createElement("LI");
                a = document.createElement("LABEL");
                a.setAttribute("class", "checkbox-inline");

                // Create the checkbox
                b = document.createElement("INPUT");
                b.setAttribute("type", "checkbox");
                //b.setAttribute("class", "filter-selector-" + args.selector);
                b.setAttribute("class", "filter-selector-" + parts[0]);
                b.setAttribute("id", "filter-selector-" + stack[i] + parts[1]);
                b.setAttribute("value", stack[i]);
                a.appendChild(b);

                // Add the LI text
                b = document.createElement("SPAN");
                if (parts[0] === "sensor") {
                    b.appendChild(document.createTextNode(VARLONGNAME[stack[i]]));
                }
                else if (parts[0] === "flag") {
                    b.appendChild(document.createTextNode(QCLOOKUPLN[stack[i]]));
                }
                else {
                    b.appendChild(document.createTextNode(stack[i]));
                }
                a.appendChild(b);

                // // Add the counts badge to the text
                // b = document.createElement("SPAN");
                // b.setAttribute("class", "badge filter-item-count");
                // b.setAttribute("id", "filter-select-count-" + stack[i]);
                // if (parts[0] === "sensor") {
                //     // @todo: add filtering here
                //     if (!M._has(stack[i], ACTIVE_FILTER.sensor)) {
                //         b.appendChild(document.createTextNode(
                //             __r.qc.ledger.station[__r.station[0].STID].B[stack[i]].total
                //         ));
                //     }    
                // }
                // else if (parts[0] === "flag") {
                //     if (!M._has(stack[i], ACTIVE_FILTER.flag)) {
                //         b.appendChild(document.createTextNode(
                //             __r.qc.ledger.station[__r.station[0].STID].A["F" + stack[i]].total
                //         ));
                //     }    
                // }
                // else {
                //     b.appendChild(document.createTextNode(stack[i]));
                // }
                // a.appendChild(b);

                li.appendChild(a);
                ul.appendChild(li);
                document.getElementById("filter-container-selector-" + args.selector)
                    .appendChild(ul);
            }
        }
    }


    /** Create tooltips */
    function __makeTooltip(id, args) {

        if (typeof args.filter !== "undefined") {
            if (typeof args.filter.flag === "undefined") {
                args.filter.flag = [];
            }
            if (typeof args.filter.sensor === "undefined") {
                args.filter.sensor = [];
            }
        } else {
            args.filter = { flag: [], sensor: [] };
        }

        // The HTML ID contains all the you need to index the qc segment.
        var parts = id.split("-");
        var spans = M.response.qc.events[parts[0]][Number(parts[1])];
        var cSpans = __collapseSpans(spans);

        var r = "<table><thead>" +
            "<tr><th>Time Span</th><th>Sensor</th><th>Flag Name</th></tr>" +
            "</thead><tbody>";

        // Filter
        var thisFlag, thisSensor;
        var ping = false;
        for (var key in cSpans) {

            // Do we have a value that should be filtered out?
            thisFlag = cSpans[key].flagID;
            thisSensor = cSpans[key].sensor;
            thisSensor = thisSensor.replace(/\_qc\_+./, '');

            if (
                (typeof args.filter !== "undefined") &&
                (
                    (!__has(thisFlag, args.filter.flag)) &&
                    (!__has(thisSensor, args.filter.sensor))
                )
            ) {
                ping = true;
                r += "<tr>" +
                    "<td>" + cSpans[key].startFMT + " " + cSpans[key].endFMT + "</td>" +
                    "<td>" + VARLONGNAME[thisSensor] + "</td>" +
                    "<td>" + QCLOOKUPLN[thisFlag] + "</td>" +
                    "</tr>";
            }
        }

        r += "</tbody></table>";
        if (ping === true) {
            return r;
        } else {
            return;
        }

        /** Collapse the events */
        function __collapseSpans(spans) {
            // @todo: Need to check the dates and get the longest spanning date.
            var cs = {};
            var idx, sensor;
            for (var i = 0; i < spans.length; i++) {
                sensor = spans[i].sensor.replace(/\_qc\_+./, '');
                idx = sensor + "-" + spans[i].qc_flag;
                if (typeof cs[idx] === "undefined") {
                    cs[idx] = {
                        flagLN: QCLOOKUPLN[spans[i].qc_flag],
                        flagID: spans[i].qc_flag,
                        // !!! If we get an `undefined` sensor, this is probably where it is at.
                        sensor: (VARLONGNAME[sensor] === "undefined" ? VARLONGNAME[sensor] : sensor),
                        start: spans[i].start,
                        startFMT: __fmtDate(spans[i].start),
                        end: spans[i].end,
                        endFMT: __fmtDate(spans[i].end)
                    };
                } else {
                    // do nothing yet
                }
            }
            return cs;

            /** Formats the date */
            function __fmtDate(_date) {
                var monthLookup = [
                    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                ];
                return monthLookup[Number((_date).slice(5, 7)) - 1] +
                    " " + (_date).slice(8, 10);
            }
        }
    }

    /**
     * Click handler
     */
    function __fire24hrView(id) {
        var parts = id.split("-");
        window.location.href = "//synopticlabs.org/demos/qc/tabtable.html?stid=" + parts[0] + "&start=" + M.epochToApi(Number(parts[1])) + ",1440";
    }

    /** Does the array contain? */
    function __has(item, arr) {
        if (typeof arr === "undefined") { return false; }
        var i = 0;
        var l = arr.length;
        for (i = 0; i < l; i++) {
            if (arr[i] === item) {
                return true;
            }
        }
        return false;
    }

}()); // Close
