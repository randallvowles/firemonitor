/*!
 * MesonetJS - a Mesonet API JavaScript SDK
 * @author MesoWest/SynopticLabs
 * @version 0.7.3
 */
var Mesonet = (function() {

    "use strict";

    /** Constructor */
    function Mesonet(args) {

        // Data containers & configuration objects used in the class
        this.response = {
            station: [],
            summary: {},
            tableOfContents: {},
            sensor: {
                stack: [],
                metadata: {},
                units: {}
            },
            qc: {
                flags: {},
                stack: [],
                active: [],
                metadata: {}
            }
        };

        // @TODO: Need to be defaulted in functions
        this.config = {
            fetch: {
                service: "TimeSeries",
                api_token: "not-set",
                getVariableMetadata: true,
                getQcMetadata: true,
                getNetworkMetadata: false
            },
            table: {
                //stid: "hol",
                //stidx: 67,
                qcFailClass: "qc-fail",
                tableID: "tabular-data", // might be updated via the function call
                tableClass: "",
                detached: "qc-codes",
                showUnits: true,
                descend: false,
                responseErrClass: "",
                responseErrTitleClass: "",
                responseErrTextClass: ""
            }
        };


        if (typeof args !== "undefined") {
            this.config.fetch.api_token = args.token;
            this.config.fetch.service = args.service;
        }

        this.urlArgs = this._urlArgs();
    }

    var version = "0.7.3";
    var activeRequest = {};

    /** Internal pointer to connect public & private functions */
    var __this = this;

    /**
     * @summary  Gets the query paramters from the Url
     * @returns  urlArgs {object} or "undefined"
     */
    Mesonet.prototype._urlArgs = (function() {

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
    });

    /**
     * Returns the keys of a JSON stack
     * @private
     *
     * @param    JSON/Object    {object}
     * @returns  Object keys    {array}
     */
    Mesonet.prototype._getKeys = function(obj) {
        var keys = [];
        for (var i in obj) {
            keys.push(i);
        }
        return keys;
    };

    /**
     * Returns the URL arguments
     * @method
     * @memberof mesonet
     */
    Mesonet.prototype.windowArgs = function() {
        return this.urlArgs;
    };

    /**
     * Prints mesonet.response (API Results) to console
     */

    // TO BE DEPRECIATED!
    Mesonet.prototype.showResponse = function() {
        var __this = this;
        $.when(activeRequest).done(function() {
            console.log("Mesonet API response.  #nxmao");
            console.log("Feature is being depreciated, please use `printResponse` instead.  #i6w70");
            console.log(__this.response);
        });
        return 0;
    };

    // New 
    Mesonet.prototype.printResponse = function() {
        var __this = this;
        $.when(activeRequest).done(function() {
            console.log("Mesonet API response.  #nxmao");
            console.log(__this.response);
        });
        return 0;
    };

    /**
     * We use this to keep tabs on the async processes
     */
    Mesonet.prototype.async = function() {
        $.when(activeRequest).done(function() {
            // do nothing
        });
        return activeRequest;
    };

    /**
     * Set API token for global use in object
     * @param {string} token - API token
     */
    Mesonet.prototype.setApiToken = function(token) {
        this.config.fetch.api_token = token;
        return true;
    };

    /**
     * Sets the API service
     * @method
     * @memberof mesonet
     */
    Mesonet.prototype.setService = function(service) {
        try {
            this.config.fetch.service = service;
        } catch (err) {
            console.log("Failed to set API service.  #a2q48");
            return false;
        }
        return true;
    };

    /**
     * Sorts array and returns sorted unique values
     * @param {array}
     */
    Mesonet.prototype._sortUnique = function(arr) {
        if (arr.length === 0) return arr;
        arr = arr.sort(function(a, b) {
            return (a * 1) - (b * 1);
        });
        var ret = [arr[0]];
        for (var i = 1; i < arr.length; i++) {
            if (arr[i - 1] !== arr[i]) {
                ret.push(arr[i]);
            }
        }
        return ret;
    };
    /**
     * Epoch Date methods
     * @param {date | string | number}
     * @returns {number | date}
     */
    Mesonet.prototype.epochDate = function(_date) {

        /**    
         * Logic    
         * if UTC    
         *     if _date is Date object
         *     if _date is a string
         *     if _date is a Unix time
         * Not UTC
         *     if _date is Date object
         *     if _date is a string
         *     if _date is a Unix time
         */


        if (Object.prototype.toString.call(_date) === "[object Date]") {
            return Math.round(new Date(_date).getTime() / 1000.0);
        } else if (typeof _date === "number") {
            return new Date(_date * 1000);
        } else {
            return Math.round(new Date(_date).getTime() / 1000.0);
        }

    };

    /**
     * Convert API time format to Epoch/Unix time.  Whole day only!
     * @param {number | string} apiDate - API time format `YYYYMMDDHHMM`
     * @param {bool} time - Return HH:SS in unix time
     * @returns {number | bool} - unix date, bool if fail
     */
    Mesonet.prototype.apiDateToEpoch = function(apiDate, time) {
        var a = "";

        // Input checking. If fail then bail out.    
        if (typeof time === "undefined") {
            time = false;
        }

        if (typeof apiDate === "undefined") {
            return false;
        } else if (typeof apiDate === "number") {
            a = apiDate.toString();
        }

        var _d = new Date(0);

        _d.setUTCFullYear(Number(a.slice(0, 4)));
        _d.setUTCMonth(Number(a.slice(4, 6)) - 1);
        _d.setUTCDate(Number(a.slice(6, 8)));

        if (time) {
            _d.setUTCHours(Number(a.slice(8, 10)));
            _d.setUTCMinutes(Number(a.slice(10, 12)));
            _d.setUTCSeconds(0);
        }

        return this.epochDate(_d);
    };


    /**
     * Converts epoch date to API date.
     */
    Mesonet.prototype.epochToApi = function(epoch) {
        var _s = typeof epoch === "number" ?
            this.epochDate(epoch).toJSON() : Number(this.epochDate(epoch)).toJSON();

        return (_s.split(".")[0]).replace(/[:T-]/g, "").slice(0, 12);
    };


    /**
     * Returns the UTC Unix time from our odd-ball time format response
     *
     * `dateString` has the timezone format of `%s|%z|%Z` so we
     * need to break apart the values and then get the parts from it.
     *
     * @param {string} dateString
     * @returns {number}
     */
    Mesonet.prototype._parseTime = function(dateString) {
        var _p = dateString.split("|");

        var _h = [3];
        _h[0] = _p[1].slice(0, 1) === "-" ? -1 : 1;
        _h[1] = Number(_p[1].slice(1, 3)) * 3600;
        _h[2] = Number(_p[1].slice(3, 5)) * 60;

        var _date = _p === -1 ? null : Number(_p[0]) - _h[0] * (_h[1] + _h[2]);
        return _date;
    };
    /** 
     * Does the array contain?
     * @param {any} - What to look for
     * @param {array} - Array to look inside
     * @returns {bool} - Boolean
     */
    Mesonet.prototype._has = (function(item, arr) {
        if (typeof arr === "undefined") {
            return false;
        }
        var i = 0;
        var l = arr.length;
        for (i = 0; i < l; i++) {
            if (arr[i] === item) {
                return true;
            }
        }
        return false;
    });
    /**
     * Manages API calls and data processing
     */
    Mesonet.prototype.fetch = function(args) {

        // Check user arguments.  If needed get default values set by other functions.
        if (typeof args === "undefined") {
            args = {};
        }
        if (typeof args.diagnostic === "undefined") {
            args.diagnostic = false;
        }

        // Determine web service   
        if (
            typeof this.config.fetch.service === "undefined" &&
            typeof args.service === "undefined"
        ) {
            console.log("No Mesonet web service set. #uil4z");
            return false;
        } else {
            // Give priority to `args.service`, then default to 
            // the global option.This does NOT modify the global settings.
            if (typeof args.service === "undefined") {
                args.service = this.config.fetch.service;
            }
        }

        // Determine API parameters
        // NOTE: This will cause problems when moving to node.js.  Should consider
        // adding a "node_env" variable to bypass browser window interactions.
        var key;
        if (typeof args.api_args === "undefined") {
            var obj = this.urlArgs;
            args.api_args = {};
            for (key in obj) {
                args.api_args[key] = obj[key];
            }
        }

        // Convert strings to numbers
        var numberValues = ["start", "end", "network", "time_interval"];
        for (key in args.api_args) {
            if (this._has(key, numberValues)) {
                args.api_args[key] = Number(args.api_args[key]);
            }
        }

        // If no API token set, then bail.  We have to do this after the args
        // block above, because of the testing method.
        if (
            typeof this.config.fetch.api_token === "undefined" &&
            typeof args.api_args.token === "undefined"
        ) {
            console.log("No Mesonet API token set.  #6sgcf");
            return false;
        } else {
            // Give priority to the passed token, then default to 
            // the setApiToken location.This does NOT set the global token.
            if (typeof args.api_args.token === "undefined") {
                args.api_args.token = this.config.fetch.api_token;
            }
        }

        // Initialize the broker engine
        activeRequest = this._apiBrokerAsyncManager(args);
        $.when(activeRequest).done(function() { /* Hello Denzians! */ });
        return activeRequest;

    };

    /**
     * API async broker 
     * @returns {promise}
     */
    Mesonet.prototype._apiBrokerAsyncManager = function(args) {

        var deferred = $.Deferred();
        var __this = this;

        // If no arguments passed, then bail!
        if (typeof args === "undefined") {
            console.log("No arguments passed. #u6jpy");
            deferred.resolve();
            return deferred.promise();
        }

        if (args.diagnostic === true) {
            var t0; // Time start
            var t1; // Ajax call complete
            var t2; // Worker complete
        }

        // Process ids
        var p1, p2, p3;

        // Webservice arguments (will be passed)
        var ws = {
            diagnostic: args.diagnostic,
            web_service: args.service,
            api_args: args.api_args
        };

        // Do we have a time interval defined?    
        if (typeof args.time_interval !== "undefined") {
            ws.time_interval = Number(args.time_interval);
        }

        // Activate the ledger    
        // if (typeof args.ledger !== "undefined" && args.ledger) {
        //     ws.ledger = args.ledger;
        // }

        // Return the full API response    
        if (typeof args.data_complete !== "undefined" && args.data_complete) {
            ws.data_complete = args.data_complete;
        }

        // D3 compatability mode    
        if (typeof args.d3_compat !== "undefined" && args.d3_compat) {
            ws.d3_compat = args.d3_compat;
        }

        // !! For dev only
        // Should consider removal before production
        if (this.urlArgs.dev !== undefined) {
            ws.base_url = "//dev2.mesowest.net:" + this.urlArgs.dev + "/";
            console.log(ws.web_service + " -> Dev Port: " + this.urlArgs.dev + "  #uym79");
        } else {
            ws.base_url = "//api.mesowest.net/v2/";
        }

        // What service to use?
        if (args.service === "TimeSeries") {
            ws.web_service_url = "stations/timeseries?callback=?";
        } else if (args.service === "Latest") {
            ws.web_service_url = "stations/latest?callback=?";
        } else if (args.service === "Metadata") {
            ws.web_service_url = "stations/metadata?callback=?";
            this.config.fetch.qcTypes = false;
        } else if (args.service === "QcSegments") {
            ws.web_service_url = "qcsegments?callback=?";
        } else if (args.service === "Statistics") {
            ws.web_service_url = "stations/statistics?callback=?";
        } else {
            // TODO: Add error here!
            return false;
        }
        p1 = __apiBrokerWorker(ws);

        if (args.diagnostic === true) {
            console.log("Diagnostic: Webservice arguments.  #8bd2v");
            console.log(ws);
        }

        // Use QC Types?
        if (this.config.fetch.getQcMetadata) {
            p2 = __apiBrokerWorker({
                web_service: "QcTypes",
                base_url: ws.base_url,
                web_service_url: "qctypes?callback=?",
                api_args: args.api_args
            });
        } else {
            p2 = __dummyLoad();
        }

        // For now we will always get the variable names
        if (this.config.fetch.getVariableMetadata) {
            p3 = __apiBrokerWorker({
                web_service: "Variables",
                base_url: ws.base_url,
                web_service_url: "variables?callback=?",
                api_args: args.api_args
            });
        } else {
            p3 = __dummyLoad();
        }

        // Wait for all the async processes to complete
        $.when(p1, p2, p3).done(function() {
            deferred.resolve();
        });
        return deferred.promise();

        /** We just need the promise back */
        function __dummyLoad() {
            var deferred = $.Deferred();
            deferred.resolve();
            return deferred.promise();
        }


        /**
         * Fetches the M-API.
         * @returns {promise} async promise
         */
        function __apiBrokerWorker(args) {

            var deferred = $.Deferred();
            if (args.diagnostic === true) {
                t0 = performance.now();
            }

            // Attempt to access the Mesonet API
            try {
                $.ajax({
                    url: args.base_url + args.web_service_url,
                    type: 'GET',
                    dataType: 'JSON',
                    data: args.api_args,
                    beforeSend: function() {
                        if (args.diagnostic === true) {
                            console.log("Mesonet API request started.  #dextb");
                        }
                    },
                    complete: function(response) {
                        deferred.notify(this.url);

                        if (args.diagnostic === true) {
                            t1 = performance.now();
                            console.log("apiBrokerEngine.ajaxCall time: " + (t1 - t0) + " ms  #mbgyx");
                            console.log(this.url);
                        }

                        try {
                            response = response.responseJSON;
                        } catch (err) {
                            console.log("Failed to convert response to JSON.  #9ds8t");
                        }

                        // Do we even have a good response from the server?
                        if (response.SUMMARY.RESPONSE_CODE !== 1) {
                            console.log("Error code issued from Mesonet API. #vu0s5");
                            console.log(response.SUMMARY.RESPONSE_MESSAGE);
                            console.log(this.url);
                            return false;
                        } else {
                            // Route the post processing of the response
                            __haveResponse(args, response);
                        }

                        deferred.resolve();
                    },
                    fail: function() {
                        console.log("Fatal Ajax error. #5gigu");
                        console.log(this.url);
                        console.log(this.fail);
                        return deferred.promise();
                    }
                });
            } catch (err) {
                console.log("Failed to connect to Mesonet API. #gl2fx");
                console.log(this.url);
            }
            return deferred.promise();


            /** 
             * Process the response and deliver back to the namespace
             */
            function __haveResponse(args, obj) {

                if (args.diagnostic === true) {
                    console.log("Response parser arguments:  #2yib4");
                    console.log(args);
                }

                var _r = __this.response;
                var i, l, j, lj, sortedKeys, key, timeInterval;

                // Do we even have a good response from the server?
                if (obj.SUMMARY.RESPONSE_CODE !== 1) {
                    console.log("Error code issued from Mesonet API. #oggi1");
                    console.log(obj.SUMMARY.RESPONSE_MESSAGE);
                    return false;
                }

                if (typeof args.time_interval === "undefined") {
                    timeInterval = 86400;
                } else {
                    timeInterval = Number(args.time_interval);
                }

                /*
                 * The filtering logic here is:
                 *
                 * IF : QcTypes
                 * EIF: Variables
                 * EIF: QcSegments
                 * EIF: Metadata
                 * E  : (all the others)
                 */

                if (args.web_service === "QcTypes") {
                    /** Service: QcTypes */

                    // !!! _r.qc.metadata = obj.QCTYPES;
                    l = obj.QCTYPES.length;
                    for (i = 0; i < l; i++) {
                        _r.qc.metadata[Number(obj.QCTYPES[i].ID)] = obj.QCTYPES[i];
                    }

                } else if (args.web_service === "Variables") {
                    /** Service: Variables */

                    // Rank is an array of the sensor names in their order
                    // !!! _r.sensor.metadata = obj.VARIABLES;
                    _r.sensor.metadata.rank = [];
                    _r.sensor.metadata.meta = {};
                    _r.sensor.metadata.meta_vid = {};
                    l = obj.VARIABLES.length;
                    for (i = 0; i < l; i++) {
                        // key name: getKeys(obj.VARIABLES[i])
                        // object: obj.VARIABLES[i][getKeys(obj.VARIABLES[i])]
                        _r.sensor.metadata.rank[i] = __this._getKeys(obj.VARIABLES[i])[0];
                        _r.sensor
                            .metadata.meta[__this._getKeys(obj.VARIABLES[i])] =
                            obj.VARIABLES[i][__this._getKeys(obj.VARIABLES[i])];
                        _r.sensor.metadata
                            .meta_vid[obj.VARIABLES[i][__this._getKeys(obj.VARIABLES[i])].vid] =
                            obj.VARIABLES[i][__this._getKeys(obj.VARIABLES[i])];
                    }

                } else if (args.web_service === "QcSegments") {
                    /**
                     * Service: QcSegments
                     *
                     * We need to modify the response object to reflect the
                     * nature of this query. Due to the nature of this beast we
                     * have to do it item by item.
                     */
                    delete _r.sensor.units;
                    delete _r.qc.active;
                    delete _r.qc.flags;

                    //_r.station = [];                
                    _r.summary = obj.SUMMARY;

                    if (
                        (typeof args.diagnostic === "undefined" || !args.diagnostic) ||
                        (typeof args.data_complete === "undefined" || !args.data_complete)
                    ) {
                        //delete _r.station;
                    }

                    if (typeof args.ledger !== "undefined" && args.ledger) {
                        _r.qc.ledger = {
                            station: {},
                            summary: {}
                        };
                    }

                    if (typeof args.d3_compat !== "undefined" && args.d3_compat) {
                        _r.station = [];
                    } else {
                        args.d3_compat = false;
                        //delete _r.station;
                        _r.qc.events = {};
                        _r.qc.time_interval = timeInterval;
                    }

                    if (!args.d3_compat) {

                        /**
                         * Limit definitions in Epoch/Unix time (0:00z):
                         *      a: range start,  b: range end
                         *     aa: event start, bb: event end
                         *      o: this event
                         */

                        var a = __this.apiDateToEpoch(args.api_args.start, true);
                        var b = __this.apiDateToEpoch(args.api_args.end, true);

                        //var nIntervals = Math.ceil((b - a) / timeInterval);

                        var intervals = __linspace(
                            __this.apiDateToEpoch(args.api_args.start, true),
                            Math.ceil((b - a) / timeInterval),
                            timeInterval
                        );

                        _r.qc.time_hacks = intervals;

                        /* ---------------------------------------------------------
                         * TEST CODE! 
                         * High-jack some data for testing
                         */
                        // var bingo = 1;
                        // obj.STATION[bingo].QC[0].start = "2016-07-01T01:00:00Z";
                        // obj.STATION[bingo].QC[0].end = "2016-07-03T01:00:00Z";
                        // obj.STATION[bingo].QC[0].qc_flag = 9999;
                        /* -------------------------------------------------------- */

                        var sidx, eidx, didx, aa, bb, stationID, _o, k;

                        l = obj.STATION.length;
                        for (i = 0; i < l; i++) {
                            stationID = obj.STATION[i].STID;
                            _r.qc.events[stationID] = {};

                            // For statistics
                            if (typeof args.ledger !== "undefined" && args.ledger) {
                                _r.qc.ledger.station[stationID] = {
                                    A: {},
                                    B: {}
                                };
                            }

                            if (typeof obj.STATION[i].QC !== "undefined") {
                                lj = obj.STATION[i].QC.length;
                                for (j = 0; j < lj; j++) {

                                    // Evaluate to see if the date is w/in our limits, if
                                    // so then append/add the response.
                                    _o = obj.STATION[i].QC[j];
                                    aa = __this.epochDate(_o.start);
                                    bb = __this.epochDate(_o.end);

                                    sidx = Math.floor((aa - a) / timeInterval);
                                    eidx = Math.floor((bb - a) / timeInterval);
                                    didx = (eidx - sidx);
                                    if (didx === 0) {
                                        didx = 1;
                                    }

                                    // if (typeof args.ledger !== "undefined" && args.ledger) {
                                    //     __punchStats(_o);
                                    // }

                                    for (k = 0; k < didx; k++) {
                                        if (typeof _r.qc.events[stationID][intervals[sidx + k]] === "undefined") {
                                            _r.qc.events[stationID][intervals[sidx + k]] = [];
                                        }
                                        _r.qc.events[stationID][intervals[sidx + k]].push(_o);
                                    }
                                }
                            }
                        }
                    }

                    var tmp = [];
                    if (args.diagnostic || args.data_complete || args.d3_compat) {
                        l = obj.STATION.length;
                        for (i = 0; i < l; i++) {


                            // If in diagnostic mode, then pass along the raw QC stack
                            // for the user to inspect.  A) this consumes a decent
                            // amount of memory and B) DO NOT build any function that
                            // depends on this data object.
                            //console.log(args.diagnostic || args.data_complete || args.d3_compat);

                            _r.tableOfContents[obj.STATION[i].STID] = i;
                            _r.station[i] = obj.STATION[i];
                            _r.qc.segments = [];
                            _r.qc.segments[i] = obj.STATION[i].QC;


                            // Create the `sensor` and `qc` stacks.
                            if (typeof obj.STATION[i].QC !== "undefined") {
                                lj = obj.STATION[i].QC.length;
                                for (j = 0; j < lj; j++) {
                                    tmp.push(obj.STATION[i].QC[j].qc_flag);
                                }
                                _r.qc.stack[i] = __this._sortUnique(tmp);
                                _r.sensor.stack[i] = __this._getKeys(obj.STATION[i].SENSOR_VARIABLES);
                            } else {
                                _r.qc.stack[i] = [null];
                                _r.sensor.stack[i] = [null];
                            }
                        }
                    }

                } else if (args.web_service === "Metadata") {
                    /**
                     * Service: Metadata
                     *
                     * We need to modify the response object to reflect the
                     * nature of this query. Due to the nature of this beast we
                     * have to do it item by item.
                     */
                    delete _r.qc;
                    delete _r.sensor.units;

                    _r.metadata = [];
                    _r.metadata.status = {};
                    _r.metadata.mnetID = {};

                    l = obj.STATION.length;
                    for (i = 0; i < l; i++) {
                        _r.station[i] = obj.STATION[i];
                        _r.sensor.stack[i] = __this._getKeys(obj.STATION[i].SENSOR_VARIABLES);
                        _r.metadata.status[obj.STATION[i].STID] = obj.STATION[i].STATUS;
                        _r.metadata.mnetID[obj.STATION[i].STID] = obj.STATION[i].MNET_ID;
                        _r.tableOfContents[obj.STATION[i].STID] = i;
                    }

                } else if (
                    args.web_service === "TimeSeries" || args.web_service === "Latest"
                ) {
                    /**
                     * Services: TimeSeries, Latest
                     */
                    _r.summary = obj.SUMMARY;
                    _r.qc.active.push(false);
                    l = obj.STATION.length;
                    for (i = 0; i < l; i++) {

                        // Reverse the stack order so they display correctly
                        //
                        // Sometimes we have multiples of sensors in the same stack.
                        // i.e. `air_temp_set_1`, `air_temp_set_2` etc. We want to 
                        // sort them by their order.
                        // @TODO: Depending on the service call, the `_set_` 
                        //        signature might cause some trouble.

                        _r.sensor.stack[i] = [];
                        for (key in obj.STATION[i].SENSOR_VARIABLES) {
                            sortedKeys = Object.keys(obj.STATION[i].SENSOR_VARIABLES[key]).sort();
                            for (j = 0; j < sortedKeys.length; j++) {
                                _r.sensor.stack[i].push(sortedKeys[j]);
                            }
                        }

                        _r.qc.active[i] = obj.STATION[i].QC_FLAGGED;
                        _r.station[i] = obj.STATION[i];
                        _r.sensor.units[i] = obj.UNITS;
                        _r.tableOfContents[obj.STATION[i].STID] = i;

                        if (_r.qc.active[i]) {
                            _r.qc.stack[i] = __this._getKeys(obj.STATION[i].QC);
                            _r.qc.flags[i] = obj.STATION[i].QC;
                        }
                    }
                } else if (args.web_service === "Statistics") {
                    /**
                     * Services: Statistics
                     */
                    delete _r.qc;
                    delete _r.sensor.metadata;

                    _r.summary = obj.SUMMARY;
                    l = obj.STATION.length;
                    for (i = 0; i < l; i++) {

                        // Reverse the stack order so they display correctly
                        //
                        // Sometimes we have multiples of sensors in the same stack.
                        // i.e. `air_temp_set_1`, `air_temp_set_2` etc. We want to 
                        // sort them by their order.
                        // @TODO: Depending on the service call, the `_set_` 
                        //        signature might cause some trouble.

                        _r.sensor.stack[i] = [];
                        for (key in obj.STATION[i].SENSOR_VARIABLES) {
                            sortedKeys = Object.keys(obj.STATION[i].SENSOR_VARIABLES[key]).sort();
                            for (j = 0; j < sortedKeys.length; j++) {
                                _r.sensor.stack[i].push(sortedKeys[j]);
                            }
                        }

                        _r.station[i] = obj.STATION[i];
                        _r.sensor.units[i] = obj.UNITS;
                        _r.tableOfContents[obj.STATION[i].STID] = i;
                    }
                } else {
                    console.log("Unsupported Mesonet service. #34wjt");
                    return false;
                }

                if (args.diagnostic === true) {
                    t2 = performance.now();
                    console.log("apiBrokerEngine.haveResponse time: " + (t2 - t1) + " ms  #xk6zr");
                }


                function __punchStats(event) {
                    var __r = _r.qc.ledger;
                    var thisSensor = (event.sensor).replace(/\_qc\_+./, '');
                    var thisFlag = "F" + event.qc_flag;

                    // First `punch` the `Qc-by-flag` (A) branch
                    if (typeof __r.station[stationID].A[thisFlag] === "undefined") {
                        __r.station[stationID].A[thisFlag] = {
                            total: 0
                        };
                        __r.summary[thisFlag] = {
                            total: 0
                        };
                    }
                    if (typeof __r.station[stationID].A[thisFlag][thisSensor] === "undefined") {
                        __r.station[stationID].A[thisFlag][thisSensor] = 0;
                        __r.summary[thisFlag][thisSensor] = 0;
                    }
                    // Next `punch` the `Qc-by-variable` (B) branch
                    if (typeof __r.station[stationID].B[thisSensor] === "undefined") {
                        __r.station[stationID].B[thisSensor] = {
                            total: 0
                        };
                        __r.summary[thisSensor] = {
                            total: 0
                        };
                    }
                    if (typeof __r.station[stationID].B[thisSensor][thisFlag] === "undefined") {
                        __r.station[stationID].B[thisSensor][thisFlag] = 0;
                        __r.summary[thisSensor][thisFlag] = 0;
                    }

                    // Do the punching...                
                    __r.station[stationID].A[thisFlag][thisSensor] += 1;
                    __r.station[stationID].A[thisFlag].total += 1;
                    __r.summary[thisFlag][thisSensor] += 1;

                    __r.station[stationID].B[thisSensor][thisFlag] += 1;
                    __r.station[stationID].B[thisSensor].total += 1;
                    __r.summary[thisSensor][thisFlag] += 1;

                    __r.summary[thisFlag].total += 1;
                    __r.summary[thisSensor].total += 1;
                }

                /**
                 * Create a linear array
                 * 
                 * @param {number} start - starting integer
                 * @param {number} nvalues - how many values
                 * @param {number} interval - interval (optional)
                 */
                function __linspace(start, nvalues, interval) {
                    if (typeof interval === "undefined") {
                        interval = 0;
                    }
                    var i;
                    var r = [];
                    for (i = 0; i < nvalues; i++) {
                        r.push(start + (i * interval));
                    }
                    return r;
                }

            } // End __haveResponse
        } // End __apiBrokerWorker
    }; // End _apiBroker

    //@import "ui/tableApis.js"
    //@import "ui/tabularTableEmitter.js"

    return Mesonet;
}());
