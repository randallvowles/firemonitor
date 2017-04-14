/*!
 * MesoWest/SynopticLabs Quality Control Segments Web Application
 * (C) 2016 Mesowest/Synoptic Labs.  All rights reserved.
 */
(function () {
    "use strict";

    var _HASH_ = "#";
    var _CLASS_ = "."

    var state = {
        VERSION: "1.0.0",
        firstRun: true,
        runFlags: {
            showBetaQCDatabaseMessage: false
        },
        ui: {
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
        },
        http: {
            api: {
                timeformat: "%s|%z|%Z",
                obtimezone: "local",
                showemptystations: 1,
                // start: 201601010000,
                // end: 201602152359,
                // end: 201601152359,
            },
            urls: {
                openInNewWindow: true,
                // slStationQCURL: "/qc/station.html",
                slTabTableURL: "./tabtable.html"
            }
        },
        netTableEmitter: {
            props: {
                currentPos: 0,
                stationIdx: 0,
                stationPerPage: 10000,
                firstRun: true,
                timeInterval: 86400, // 1 day
                numberOfPeriods: 15
            },
            store: {
                qcEvents: {},
                sensors: {},
                flags: {}
            }
        }
    };


    d3.select(_HASH_ + state.ui.appContainer.id).classed("hide", true);

    // Get the user's cookie, determine if the cookie needs to be replaced or not
    state.P = new User({ cookie_name: "mesowest", cookie_ttl: 1 });
    if (state.P.VERSION !== "0.3.2") {
        state.P.deleteCookie();
        state.P = new User({ cookie_name: "mesowest", cookie_ttl: 1 });
    }

    // Determine the token and initlize the Mesonet class
    state.http.apiToken = typeof state.P.getToken() === null ? state.P.getToken() : "demotoken";
    var Mesonet = new MesonetAPI({ token: state.http.apiToken, service: "QcSegments" });


    // Get our runtime options
    state.http.thisURL = Mesonet.parseApiArgs();
    state.http.api = mergeObject(state.http.api, Mesonet.parseApiArgs());

    if (typeof state.http.api.dev !== "undefined") {
        Mesonet.setDevServer(true);
    }

    // If we are using the QC Test DB, need to tell the user.
    if (typeof state.http.api.qctestdb !== "undefined" || state.http.api.qctestdb === "1") {
        state.runFlags.showBetaQCDatabaseMessage = true;
        createAlertBox({
            closeMessage: false,
            alertType: "danger",
            message: "Using the QC Test Database",
        }, "alert-box-container")
    }


    Mesonet.loadOnDemand(true, { apiArgs: state.http.api })
    $.when(Mesonet.ready()).done(function () {
        console.log(Mesonet);
        if (Mesonet.store.status === 1) {
            Mesonet.fetch({
                apiArgs: mergeObject(
                    state.http.api,
                    // { stid: getStationsSubsetByIndex(0, state.netTableEmitter.props.stationPerPage) }
                    {network: 65}
                ),
            }, initApp);
        }
        else {
            console.log("Rhut Rho!");
            console.table(Mesonet.state.telemetry);
        }
    });


    function initApp() {

        d3.selectAll(_HASH_ + state.ui.appContainer.id).classed(state.ui.css.hide, false);
        d3.select(_HASH_ + state.ui.loading.id).classed(state.ui.css.hide, true);

        // Clean up the environment a bit
        distroyAllTooltips();
        resetStore(state.netTableEmitter.store);

        if (Mesonet.store.status !== 1) {
            alert(Mesonet.store.telemetry.join('\n\n'));
            return;
        }

        var appContainer = document.getElementById('app-container');
        if (appContainer.firstChild) {
            appContainer.removeChild(appContainer.firstChild)
        }
        setTableTimeParameters();
        generateAppContainer('app-container');

        var t0 = performance.now();
        Domket.render(generateTable({}), 'table-container');
        renderSelectors();
        console.log('render time', performance.now() - t0);

        Domket.render(generatePaginationSelectors(), 'table-pagination-container');
        updateStationIdx(20);
        state.netTableEmitter.props.firstRun = false;


        if (!state.firstRun) {
            window.scrollTo({
                left: 0,
                top: document.getElementById('app-toolbar').getBoundingClientRect().top - 5,
                behavior: 'smooth'
            });
        }
        state.firstRun = false;
    }

    function setTableTimeParameters() {
        var timeInterval = 3600;
        var numberOfPeriods = 24;

        if (typeof state.http.api.start !== "undefined") {
            if (typeof state.http.api.end !== "undefined") {
                // have start/end
                var s = Mesonet.apiDateToEpoch(state.http.api.start);
                var e = Mesonet.apiDateToEpoch(state.http.api.end);
                if (e - s > 86400) {
                    numberOfPeriods = Math.ceil((e - s) / 86400);
                    timeInterval = 86400;
                }
            }
            else if (state.http.api.start.split(',') > 0) {
                // using shorthand notation
            }
            else {
                console.log("WTF")
            }
        }
        else if (typeof state.http.api.recent !== "undefined") {
            // using recent
        }
        else {
            alert('no time given');
        }
        state.netTableEmitter.props.timeInterval = timeInterval;
        state.netTableEmitter.props.numberOfPeriods = numberOfPeriods;
    }


    function generateAppContainer(renderTo) {
        // {type: 'div', props: {className:''}, children: []}
        var panelDefaultTitle = 'Hello';
        var panelDefaultText = 'You can mouse over any cell below to see more information.';

        var html = {
            type: 'div',
            props: { className: 'row' },
            children: [
                { type: 'div', props: { id: 'alert-box-container' }, children: [] },
                {
                    type: 'div', props: { className: 'col-sm-12 col-md-4' }, children: [
                        { type: 'div', props: { id: 'sensor-selector-container' }, children: [] },
                        { type: 'div', props: { id: 'flag-selector-container' }, children: [] }
                    ]
                },
                {
                    type: 'div', props: { className: 'col-sm-12 col-md-8' }, children: [
                        {
                            type: 'div', props: { className: 'text-center' }, children: [
                                {
                                    type: 'div', props: { className: 'btn-group btn-group-sm', role: 'group' }, children: [
                                        { type: 'button', props: { className: 'btn btn-default', type: 'button' }, children: ['24 hrs.'] },
                                        { type: 'button', props: { className: 'btn btn-default', type: 'button' }, children: ['7 days'] },
                                        { type: 'button', props: { className: 'btn btn-default', type: 'button' }, children: ['14 days'] },
                                        { type: 'button', props: { className: 'btn btn-default', type: 'button' }, children: ['30 days'] },
                                        { type: 'button', props: { className: 'btn btn-default', type: 'button' }, children: ['60 days'] },
                                    ]
                                }
                            ]
                        },
                        { type: 'div', props: { className: 'vspace-0' }, children: [] },
                        {
                            type: 'div', props: { id: 'table-display-container', style: 'height:175px' }, children: [
                                {
                                    type: 'div', props: { className: 'panel panel-default', style: '155px' }, children: [
                                        {
                                            type: 'div', props: { className: 'panel-heading' }, children: [
                                                { type: 'b', props: {}, children: [panelDefaultTitle] }
                                            ]
                                        },
                                        { type: 'div', props: { className: 'panel-body' }, children: [panelDefaultText] }
                                    ]
                                }
                            ]
                        },
                        { type: 'div', props: { id: 'table-container', className: 'panel-default' }, children: [] },
                        { type: 'div', props: { id: 'table-pagination-container' }, children: [] }
                    ]
                }
            ]
        }

        Domket.render(html, renderTo)
    }



    /** This is just wrapped for easy use. */
    function mergeObject(base, top) {
        return Mesonet._mergeObject(base, top);
    }

    function deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }


    function getStationsSubsetByIndex(start, end) {
        return Mesonet.store.tableOfContentsIndex.slice(start, end).join(',');
    }

    function updateStationIdx(pos) {
        state.netTableEmitter.props.stationIdx = pos + 1;
    }

    function resetStore(store) {
        Object.keys(store).map(function (k) { store[k] = {}; })
    }


    function updatePaginationSelectors(pos) {
        // Really need to get the update function in Domket working...
        var renderTo = 'table-pagination-container';
        var container = document.getElementById(renderTo);
        if (container.firstChild) {
            container.removeChild(container.firstChild)
        }
        Domket.render(generatePaginationSelectors(pos), renderTo);
    }


    function generatePaginationSelectors(pos) {

        var _pos = typeof pos === "undefined" ? state.netTableEmitter.props.currentPos : Number(pos);

        var result = {
            type: 'div',
            props: { className: 'text-center' },
            children: [
                {
                    type: 'nav',
                    props: { 'aria-label': 'Page navigation' },
                    children: [
                        { type: 'ul', props: { className: 'pagination pagination-sm' }, children: [] }
                    ]
                }
            ]
        }

        // We only want to show ~20 per page (we'll get this from `state`) so we need to figure out
        // how many selectors to make.
        var stidPerPage = state.netTableEmitter.props.stationPerPage;
        var nPagers = Math.ceil(Mesonet.store.tableOfContentsIndex.length / stidPerPage);
        var pagers = range(nPagers);


        var startPos = nPagers - _pos < 10 ? nPagers - 10 : _pos
        startPos = startPos < 0 ? 0 : startPos; // Error correction

        var showLeftArrow = (startPos > 0) && (nPagers > 10) ? true : false;
        var showRightArrow = nPagers - _pos > 10 ? true : false;


        var _pagers = pagers.slice(startPos, startPos + 10);

        var arrowTemplate = {
            type: 'li', props: {}, children: [
                {
                    type: 'a',
                    props: { href: '#' },
                    children: [{ type: 'span', props: { 'aria-hidden': true }, children: [] }]
                }
            ]
        }

        if (showLeftArrow) {
            var larrow = deepCopy(arrowTemplate);
            larrow.children[0].props.onClick = function () { updatePaginationSelectors(startPos - 1) };
            larrow.children[0].children[0].children = ['<<'];
            result.children[0].children[0].children.push(larrow);
        }
        _pagers.map(function (k) {
            result.children[0].children[0].children.push({
                type: 'li', props: {}, children: [
                    {
                        type: 'a',
                        props: {
                            href: '#',
                            data__listpos: '' + k,
                            onClick: function () { paginationHandler(k) },
                            onMouseover: function () {
                                $(this).tooltip({
                                    "title": _getNames(stidPerPage, k),
                                    "placement": "top",
                                    "html": true,
                                    "container": "body"
                                }).tooltip("show");
                            }
                        },
                        children: ['' + (k + 1)]
                    }
                ]
            })
        })
        if (showRightArrow) {
            var rarrow = deepCopy(arrowTemplate);
            rarrow.children[0].props.onClick = function () { updatePaginationSelectors(startPos + 1) };
            rarrow.children[0].children[0].children = ['>>'];
            result.children[0].children[0].children.push(rarrow);
        }

        return result;

        function _getNames(stidPerPage, k) {
            var start = (k * stidPerPage);
            var s = getStationsSubsetByIndex(start, start + stidPerPage)

            var _s = '<div class=\"text-left\">'
            s.split(',').map(function (k, i) {
                _s += i % 5 === 0 ? ('<br/>' + k + ', ') : (k + ', ');
            })
            s += "</div>"
            return _s;
        }
    }

    function distroyAllTooltips() {
        $('.tooltip').tooltip('destroy');
    }

    /** Helper function to create an array from [1,... n]. */
    function range(n, shift) {
        var arr = []
        if (typeof shift === 'number') { for (var i = 0; i < n; i++) { arr[i] = i + shift; } }
        else { for (var i = 0; i < n; i++) { arr[i] = i; } }
        return arr
    }

    function paginationHandler(pos) {
        state.netTableEmitter.props.firstRun = true;

        var stidPerPage = state.netTableEmitter.props.stationPerPage;
        var start = (pos * stidPerPage);
        var stids = getStationsSubsetByIndex(start, start + stidPerPage)

        state.netTableEmitter.props.currentPos = pos;
        Mesonet.fetch({ apiArgs: mergeObject(state.http.api, { stid: stids }), }, initApp);
    }



    function generateTable(props, renderTo) {

        var _props = mergeObject(state.netTableEmitter.props, props);
        _props.stationsNames = Mesonet.store.lastFetch.tableOfContentsIndex;
        var nPeriods = ((86400 / _props.timeInterval) * _props.numberOfPeriods) + 2;

        _props.stationsNames.map(function (k, i) {
            var t0 = Mesonet.apiDateToEpoch(state.http.api.start);
            range(nPeriods).map(function (idx) {
                var start = t0 + (_props.timeInterval * (idx - 1));
                var stop = t0 + (_props.timeInterval * idx);
                _getQCSpans(k, start, stop);
            })
        })

        var table = {
            type: 'table',
            props: { className: 'table table-bordered table-hover table-no-pad' },
            children: [
                { type: 'tbody', props: { id: 'table-row-container' }, children: [] }
            ]
        };

        _props.stationsNames.map(function (k) {
            table.children[0].children.push({
                type: 'tr', props: {}, children: generateTdElements(
                    k, nPeriods, _props.timeInterval
                )
            })
        })
        return table;
    }

    function renderSelectors() {
        // Create the selectors to select with
        var sensorSelectors = [{ type: 'ul', props: { className: 'list-unstyled' }, children: [] }]
        Object.keys(state.netTableEmitter.store.sensors).map(function (k) {
            sensorSelectors[0].children.push({
                type: 'li', props: {}, children: [
                    {
                        type: 'input',
                        props: {
                            id: 'sensor_selector_' + k,
                            type: 'checkbox',
                            checked: true,
                            onChange: function () { _selectorChange(k, 'sensor'); }
                        },
                        children: []
                    },
                    { type: 'label', props: { for: 'sensor_selector_' + k }, children: [k] }
                ]
            })
        });
        Domket.render(sensorSelectors, 'sensor-selector-container');

        // Create the selectors to select with
        var flagSelectors = [{ type: 'ul', props: { className: 'list-unstyled' }, children: [] }]
        Object.keys(state.netTableEmitter.store.flags).map(function (k) {
            flagSelectors[0].children.push({
                type: 'li', props: {}, children: [
                    {
                        type: 'input',
                        props: {
                            id: 'flag_selector_' + k,
                            type: 'checkbox',
                            checked: true,
                            onChange: function () { _selectorChange(k, 'flag'); }
                        },
                        children: []
                    },
                    {
                        type: 'label',
                        props: { for: 'flag_selector_' + k },
                        children: [Mesonet.store.lastFetch.qcLongName[k]]
                    }
                ]
            })
        });
        Domket.render(flagSelectors, 'flag-selector-container');
    }

    function _selectorChange(selector, type) {
        var storeType = type === 'sensor'
            ? 'sensors'
            : type === 'flag'
                ? 'flags'
                : false

        var _selector = storeType === 'flag' ? Number(selector) : selector;

        state.netTableEmitter.store[storeType][_selector] =
            document.getElementById(type + '_selector_' + _selector).checked

        _updateTableColors();

    }


    function _updateTableColors() {
        var activeClass = "green";
        var _store = state.netTableEmitter.store;

        Domket.classed('.bang-bang', 'green', false)

        // @todo: Det D3 the hell out of here!
        Object.keys(_store.flags).map(function (k) {
            if (_store.flags[k]) {
                d3.selectAll("d[data-qc_flag=\"" + k + "\"]").each(function (d) {
                    if (
                        (_store.flags[this.dataset.qc_flag]) &&
                        typeof _store.sensors[this.dataset.sensor] !== "undefined" ||
                        _store.sensors[this.dataset.sensor]
                    ) {
                        d3.select(this.parentNode).classed(activeClass, _store.sensors[this.dataset.sensor]);

                        var __this = this;
                        d3.select(this.parentNode).classed(activeClass, function (d) {
                            return _store.sensors[__this.dataset.sensor]
                        });
                    }
                });
            }
        });
    }


    function generateActiveClassList(stid, time) {
        var stack = {};
        var haveSensor = false;
        var haveFlag = false;

        state.netTableEmitter.store.qcEvents[stid][time].map(function (k, i) {
            if (typeof stack['sensor__' + k.sensor.split('_qc_')[0]] === "undefined" &&
                state.netTableEmitter.store.sensors[k.sensor.split('_qc_')[0]]
            ) {
                haveSensor = true
                stack['sensor__' + k.sensor.split('_qc_')[0]] = 1
            }
            if (
                typeof stack['qc__' + k.qc_flag] === "undefined" &&
                state.netTableEmitter.store.flags[k.qc_flag]
            ) {
                haveFlag = true;
                stack['qc__' + k.qc_flag] = 1
            }
        })

        var result = 'bang-bang';
        if (haveSensor && haveFlag) { result += ' green'; }

        return result;
    }

    function humanDate(time) {
        var t = Mesonet.parseAPITime(time + '|-0000|UTC')
        return t.monthName + ' ' + t.day + ', ' + t.year;
    }

    function humanTime(time) {
        var t = Mesonet.parseAPITime(time + '|-0000|UTC')
        return t.monthName + ' ' + t.day + ', ' + t.year + '  ' + t.hour + ':' + t.min;
    }

    function humanTimeDisplay(time) {
        return state.netTableEmitter.props.timeInterval >= 86400
            ? humanDate(time)
            : humanTime(time);
    }

    function hudSegmentTime(time) {
        var _t = Mesonet.parseAPITime(time)
        return _t.monthName + " " + _t.day + " " + _t.hour + ":" + _t.min;
    }

    function updateHUD(stid, start) {

        var html = {
            type: 'div',
            props: { className: "panel panel-default", style: 'height:155px' },
            children: [
                {
                    type: 'div',
                    props: { className: "panel-heading" },
                    children: [
                        { type: 'b', children: [Mesonet.store.station[Mesonet.store.tableOfContents[stid]].NAME] },
                        { type: 'span', children: [' at ' + humanTimeDisplay(start)] },
                        { type: 'span', props: { className: 'pull-right' }, children: ['deets go here'] }
                    ]
                },
                {
                    type: 'div',
                    props: { className: 'panel-body' },
                    children: [
                        {
                            type: 'div',
                            props: { className: 'col-sm-12' },
                            children: [{ type: 'ul', props: { className: 'list-unstyled' }, children: [] }]
                        },
                    ]
                }
            ]
        }

        // make the rows
        state.netTableEmitter.store.qcEvents[stid][start].map(function (k, i) {
            var s = '';
            if (i < 3) {
                s = generateHumanHUDSegment(k);
            }
            else if (i === 3) {
                s = '<b>' +
                    state.netTableEmitter.store.qcEvents[stid][start].length +
                    ' events not shown</b>. Click on cell for more information.'

                s = {
                    type: 'span',
                    props: {},
                    children: [
                        {
                            type: 'b', children: [
                                state.netTableEmitter.store.qcEvents[stid][start].length +
                                ' events not shown'
                            ]
                        },
                        { type: 'span', children: [' Click on cell for more information.'] }
                    ]
                }
            }

            if (i < 4) {
                html.children[1].children[0].children[0].children.push({
                    type: 'li',
                    props: {},
                    children: [s]
                });
            }
        });

        return html;
    }

    function generateHumanHUDSegment(obj) {
        return hudSegmentTime(obj.start) + ' - ' + hudSegmentTime(obj.end) +
            ' ' + obj.sensor + ' ' + Mesonet.store.lastFetch.qcLongName[obj.qc_flag]
    }

    function hrefHandler(url, newWindow) {
        if ((typeof newWindow !== "undefined" && newWindow) || state.http.openInNewWindow) {
            window.open(url, '_blank');
        }
        else {
            window.location.href = url;
        }
    }



    function generateTdElements(idName, nPeriods, dt) {
        var _LF = Mesonet.store.lastFetch;
        // var dt = 86400
        var t0 = Mesonet.apiDateToEpoch(state.http.api.start);
        var result = [];
        var idx = 0;
        while (idx < nPeriods) {
            var td = { type: 'td', props: {}, children: [] }
            if (idx === 0) {
                td.props.id = 'table_stid__' + idName;
                td.children.push(idName);
            }
            else {
                if (typeof _LF.station[_LF.tableOfContents[idName]].QC !== "undefined") {
                    _LF.station[_LF.tableOfContents[idName]].QC.map(function (k) {
                        var start = t0 + (dt * (idx - 1));
                        var stop = t0 + (dt * idx);

                        if (!(
                            Mesonet._parseAPITime(k.end) <= t0 + (dt * (idx - 1)) ||
                            (Mesonet._parseAPITime(k.start) >= t0 + (dt * idx))
                        )) {
                            td.props.className = 'native-tooltip ' + generateActiveClassList(idName, start);
                            var _idx = idx;
                            td.props.id = idName + '__' + (t0 + (dt * (_idx - 1)));
                            td.props.onMouseover = function () {
                                var _start = start;
                                var _stid = idName;
                                document.getElementById('table-display-container').innerHTML = '';
                                Domket.render(updateHUD(_stid, _start), 'table-display-container')
                            };
                            td.props.onClick = function () {
                                var _start = start;
                                var _stid = idName;
                                var _url = state.http.urls.slTabTableURL +
                                    '?token=' + state.http.api.token +
                                    '&stid=' + idName +
                                    (state.runFlags.showBetaQCDatabaseMessage ? "&qctestdb=1&qcbeta=1&dev=8089" : "") +
                                    '&start=' + Mesonet.epochToApi(_start) + ',' + 
                                    (state.netTableEmitter.props.timeInterval / 60)

                                hrefHandler(_url, true);
                            };
                            td.children = generateToolTip(start).concat(generateDateSetNodes(idName, start))
                        }
                    })
                }
            }
            result.push(td);
            idx++;
        }
        return result;
    }

    /** Generate tooltips */
    function generateToolTip(start) {
        return [{
            type: 'span',
            props: { className: 'native-tooltiptext' },
            children: [humanTimeDisplay(start)]
        }]
    }

    /** Generate `data-*` nodes for active cells */
    function generateDateSetNodes(stid, time) {
        var result = [];
        state.netTableEmitter.store.qcEvents[stid][time].map(function (k, i) {
            result.push({
                type: 'd',
                props: {
                    data__sensor: k.sensor.split('_qc_')[0],
                    data__qc_flag: k.qc_flag
                    // data__select: 0 // Might be useful for counters and such.
                }
            })
        });
        return result;
    }


    /** Condenses the QC events and store them in the state. */
    function _getQCSpans(stid, start, stop) {
        var _lf = Mesonet.store.lastFetch
        var result = {}
        var segments = typeof _lf.station[_lf.tableOfContents[stid]].QC === "undefined"
            ? []
            : _lf.station[_lf.tableOfContents[stid]].QC;

        if (segments.length > 0) {
            result = {};
            // Loop over all the segments for this station, and append to node.
            segments.map(function (k, i) {
                // while we are here, let's get a list of flags & sensors
                if (state.netTableEmitter.props.firstRun) {
                    if (typeof state.netTableEmitter.store.sensors[k.sensor] === "undefined") {
                        state.netTableEmitter.store.sensors[k.sensor.split('_qc_')[0]] = true;
                    }
                    if (typeof state.netTableEmitter.store.flags[k.qc_flag] === "undefined") {
                        state.netTableEmitter.store.flags[k.qc_flag] = true;
                    }
                }

                if (!(Mesonet._parseAPITime(k.end) <= start || Mesonet._parseAPITime(k.start) >= stop)) {
                    if (typeof result[start] === "undefined") { result[start] = []; }
                    result[start].push(k)
                }
            })
        }
        // Send upstream
        if (typeof state.netTableEmitter.store.qcEvents[stid] === "undefined") {
            state.netTableEmitter.store.qcEvents[stid] = {};
        }
        state.netTableEmitter.store.qcEvents[stid][start] = result[start];

        return;
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

}());