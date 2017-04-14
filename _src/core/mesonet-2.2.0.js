/*!
 * MesonetJS - a MesonetAPI  JavaScript SDK
 * @author MesoWest/SynopticLabs
 * @version 2.0.0
 */
var MesonetAPI = (function () {

    'use strict';
    var _this = this;

    /**
     * Constructor
     * @constructor
     * @param {object} args - Expects "token", "service"
     */
    function MesonetAPI(args) {

        this.version = '2.0.0';
        this.testMode = typeof args.testMode === "undefined" ? false : args.testMode;

        this.store = {
            status: -9,
            telemetry: [],
            info: {}
        };

        this.state = {
            loadOnDemand: false,
            loadOnDemandHaveMetadata: false,
            activeRequest: {},
            http: {
                apiToken: '',
                devServer: false,
                devServerPort: 8089,
                service: '',
                windowURL: '',
                getVariables: false
            }
        };

        this.state.http.apiToken = typeof args.token === 'undefined' ? false : args.token;
        this.state.http.service = typeof args.service === 'undefined' ? false : args.service;
        // this.state.loadOnDemand = typeof args.loadOnDemand === 'undefined' ? false : args.loadOnDemand;


        this.state.http.apiArgs = this.parseApiArgs();
        this.state.api = {
            serviceURLs: {
                TimeSeries: 'stations/timeseries?callback=?',
                Latest: 'stations/latest?callback=?',
                Metadata: 'stations/metadata?callback=?',
                QcSegments: 'qcsegments?callback=?',
                Statistics: 'stations/statistics?callback=?',
                Variables: 'variables?callback=?',
                QCTypes: 'qctypes?callback=?'
            }
        };
    }

    /** Let's you force parts of the environment */
    MesonetAPI.prototype._setEviroment = function (obj) {
        this.state.http.windowURL = typeof obj.windowURL === "undefined" ? "" : obj.windowURL;
    };

    /** We use this to keep tabs on the async processes */
    MesonetAPI.prototype.ready = function () {
        $.when(this.state.activeRequest).done();
        return this.state.activeRequest;
    };

    /** Interface for parsing the API arguments from the window's URL */
    MesonetAPI.prototype.parseApiArgs = function () {
        // For unit testing we have to mock the window environment.
        if (this.testMode) { return {}; }
        this.state.http.windowURL = window.location.search;
        return this._parseURL(window.location.search);
    };

    /** Parses the URL string */
    MesonetAPI.prototype._parseURL = function (urlString) {
        var result = {};

        if (urlString.substring(1).split('=') === 1) {
            return result;
        }
        else {
            urlString.substring(1).split('&').map(function (k, i) {
                // Grab the values and add a key
                var pair = k.split('=');
                if (typeof result[pair[0]] === 'undefined') {
                    result[pair[0]] = decodeURIComponent(pair[1]);
                }
            });
            return result;
        }
    };

    /** Set/update token */
    MesonetAPI.prototype.setToken = function (token) {
        this.state.http.apiToken = token;
    };


    /**
     * Enable/Disable dev server mode
     * @param {boolean} bool
     * @param {number} port - optional
     */
    MesonetAPI.prototype.setDevServer = function (bool, port) {
        this.state.http.devServer = bool;
        this.state.http.devServerPort = typeof port === "undefined" ? 8089 : port;
    };

    /**
     * Returns if dev server is being used.
     * @returns {boolean}
     */
    MesonetAPI.prototype.isDevServer = function () {
        return this.state.http.devServer;
    };

    /**
     * Set the API service to use.
     * @param {string} apiService - MesonetAPI API service
     */
    MesonetAPI.prototype.setService = function (apiService) {
        this.state.apiService = apiService;
    };

    /**
     * Let's you lazy load
     */
    MesonetAPI.prototype.loadOnDemand = function (truthy, args) {
        var _truthy = typeof truthy === 'undefined' ? true : truthy;
        this.state.loadOnDemand = _truthy;
        if (truthy) {
            this.store.lastFetch = {
                info: {}
            };
            var props = this._mergeObject(this.state.http, args);
            props.service = 'Metadata';
            this.fetch(props);
            $.when(this.ready()).done();
        }
    };

    MesonetAPI.prototype.sendTelemetry = function (text) {
        this.store.telemetry.push(text);
    };

    MesonetAPI.prototype.getTelemetry = function () {
        return this.store.telemetry;
    };

    MesonetAPI.prototype.fetchQCTypes = function (bool) {
        this.state.http.getQCTypes = bool;
    };

    MesonetAPI.prototype.fetchVariables = function (bool) {
        this.state.http.getVariables = bool;
    };

    MesonetAPI.prototype._mergeObject = function (base, top) {
        var merged = {};
        var key;
        for (key in base) { merged[key] = base[key]; }
        for (key in top) { merged[key] = top[key]; }
        return merged;
    };

    /**
     * Epoch Date methods
     * @param {date | string | number}
     * @returns {number | date}
     */
    MesonetAPI.prototype.epochDate = function (_date) {
        if (Object.prototype.toString.call(_date) === '[object Date]') {
            // Is a `Date` object ==> return UNIX time
            return Math.round(new Date(_date).getTime() / 1000.0);
        }
        else if (typeof _date === 'number') {
            // If we're given a number to work with, we convert it to a Date object
            return new Date(_date * 1000);
        }
        else {
            // If we are given a ISO 8601 formatted date, then return UNIX time.
            return Math.round(new Date(_date).getTime() / 1000.0);
        }
    };

    /**
     * Convert API time format to Epoch/Unix time.  Whole day only!
     * @param {number | string} apiDate - API time format `YYYYMMDDHHMM`
     * @returns {number | bool} - unix date, false if fail
     * @example // returns 1483315140
     * M.apiDateToEpoch(201701012359)
     * @example
     */
    MesonetAPI.prototype.apiDateToEpoch = function (apiDate) {
        var a = '';

        apiDate = Number(apiDate);

        if (typeof apiDate === 'undefined') {
            return false;
        }
        else if (typeof apiDate === 'number') {
            a = apiDate.toString();
        }

        var _d = new Date(0);

        _d.setUTCFullYear(Number(a.slice(0, 4)));
        _d.setUTCMonth(Number(a.slice(4, 6)) - 1);
        _d.setUTCDate(Number(a.slice(6, 8)));

        _d.setUTCHours(Number(a.slice(8, 10)));
        _d.setUTCMinutes(Number(a.slice(10, 12)));
        _d.setUTCSeconds(0);

        return this.epochDate(_d);
    };

    /**
     * Converts epoch date to API date.
     * @param {number} epoch - Epoch time in seconds.
     */
    MesonetAPI.prototype.epochToApi = function (epoch) {
        var _s = typeof epoch === 'number'
            ? this.epochDate(epoch).toJSON()
            : Number(this.epochDate(epoch)).toJSON();

        return (_s.split('.')[0]).replace(/[:T-]/g, '').slice(0, 12);
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
    MesonetAPI.prototype._parseAPITime = function (dateString, local) {
        //  We expect the response to look like:
        //     `1451580960|-0800|PST`
        //  The first segment is the _local unix time_ not the UTC unix time. This
        //  is a by product of the MesonetAPI API.  The following is the UTC offset
        //  which we will convert to milliseconds and simple add to the local unix
        //  time.
        var _p = dateString.split("|");

        var _h = [3];
        _h[0] = _p[1].slice(0, 1) === "-" ? -1 : 1;
        _h[1] = Number(_p[1].slice(1, 3)) * 3600;
        _h[2] = Number(_p[1].slice(3, 5)) * 60;

        var _date = null;
        if (typeof local === "undefined" || !local) {
            _date = _p === -1 ? null : Number(_p[0]) - _h[0] * (_h[1] + _h[2]);
        }
        else {
            _date = _p === -1 ? null : Number(_p[0]);
        }

        return _date;
    };


    MesonetAPI.prototype.parseAPITime = function (t, local) {
        // needs to accept either a number (unix time, utc) or an api string

        var _t;
        var _unixTime = 0;
        if (typeof t === "number") {
            _t = new Date(t * 1000).toISOString();
            _unixTime = t;
        }
        else {
            // Determine the `local` time option
            local = typeof local === "undefined" || typeof local !== "boolean" ? false : local;

            var _tz = local ? t.split("|")[2] : "UTC";
            var _tzo = local
                ? t.split("|")[1].slice(0, 3) + ":" + t.split("|")[1].slice(3, 5)
                : "+00:00";

            // Create a Date object
            _unixTime = this._parseAPITime(t, local);
            _t = new Date(_unixTime * 1000).toISOString();
        }
        
        var _tISO = local ? _t.split("Z")[0] + _tzo : _t;

        var _m = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        // 012345678901234567892123
        // 2015-12-31T16:56:00.000Z

        // ISO 8601 format
        // 2016-12-31T14:02:00+00:00
        return {
            epoch: _unixTime,
            iso8601: _tISO,
            year: _pad(Number(_tISO.slice(0, 4)), 4),
            month: _pad(Number(_tISO.slice(5, 7)), 2),
            monthName: _m[Number(_tISO.slice(5, 7)) - 1],
            day: _pad(Number(_tISO.slice(8, 10)), 2),
            hour: _pad(Number(_tISO.slice(11, 13)), 2),
            min: _pad(Number(_tISO.slice(14, 16)), 2),
            sec: _pad(Number(_tISO.slice(17, 19)), 2),
            msec: _pad(Number(_tISO.slice(20, 23)), 3),
            tzone: _tz,
            tzo: _tzo
        };

        // http://stackoverflow.com/a/10073788/4835631
        function _pad(n, width, c) {
            c = typeof c === "undefined" ? "0" : c;
            n = n.toString();
            return n.length >= width ? n : new Array(width - n.length + 1).join(c) + n;
        }
    };


    /** Interface for `_fetchHandler` which does all the real work */
    MesonetAPI.prototype.fetch = function (args, callback) {
        // Go and get it.
        var _this = this;
        this.state.activeRequest = this._fetchHandler(args);
        $.when(this.state.activeRequest).done(function () {
            // Update the state of our metadata cache
            if (_this.state.loadOnDemand && !_this.state.loadOnDemandHaveMetadata) {
                _this.state.loadOnDemandHaveMetadata = true;
            }
            if (typeof callback === "function") {
                callback();
            }
        });
        return this.state.activeRequest;
    };

    /**
     * API async broker 
     * @returns {promise}
     */
    MesonetAPI.prototype._fetchHandler = function (args) {

        var deferred = $.Deferred();
        var _this = this;
        var props = {};

        // If no arguments passed, then take what's in the state variable
        if (typeof args === 'undefined') {
            props = this.state.http; // might need a deep copy here?
        }
        else {
            props = this._mergeObject(this.state.http, args);
        }

        props.apiArgs.token = this.state.http.apiToken;

        // !! For dev only
        // Should consider removal before production
        var baseURL = 'http://api.mesowest.net/v2/';
        if (props.devServer) {
            baseURL = 'http://dev2.mesowest.net:' + this.state.http.devServerPort + '/';
            console.warn('Using dev server');
        }

        // Process ids
        var p1, p2, p3;
        p1 = this._httpGet({
            baseURL: baseURL,
            service: this.state.api.serviceURLs[props.service],
            arguments: props.apiArgs
        });

        if (props.getVariables) {
            p2 = this._httpGet({
                baseURL: baseURL,
                service: this.state.api.serviceURLs.Variables,
                arguments: { token: props.apiArgs.token }
            });
        }
        else {
            p2 = _dummyLoad();
        }

        if (props.getQCTypes) {
            p3 = this._httpGet({
                baseURL: baseURL,
                service: this.state.api.serviceURLs.QCTypes,
                arguments: { token: props.apiArgs.token }
            });
        }
        else {
            p3 = _dummyLoad();
        }



        // Wait for all the async processes to complete
        $.when(p1, p2, p3).done(function () {
            deferred.resolve();
        });
        return deferred.promise();

        // We just need the promise back
        function _dummyLoad() {
            var deferred = $.Deferred();
            deferred.resolve();
            return deferred.promise();
        }
    };


    // Fetches the MesonetAPI webservices
    MesonetAPI.prototype._httpGet = function (args) {

        var _this = this;
        var deferred = $.Deferred();

        // Attempt to access the MesonetAPI API
        try {
            $.ajax({
                url: args.baseURL + args.service,
                type: 'GET',
                dataType: 'JSON',
                data: args.arguments,
                // beforeSend: function() {},
                complete: function (response) {
                    deferred.notify(this.url);

                    try {
                        response = response.responseJSON;
                    }
                    catch (err) {
                        _this.sendTelemetry('Failed to convert response to JSON.');
                    }

                    // Do we even have a good response from the server?
                    if (response.SUMMARY.RESPONSE_CODE !== 1) {
                        _this.sendTelemetry(response.SUMMARY.RESPONSE_MESSAGE);
                        _this.sendTelemetry(this.url);
                    }
                    _this._haveResponse(args, response);

                    deferred.resolve();
                },
                fail: function () {
                    _this.sendTelemetry('Fatal Ajax error.');
                    return deferred.promise();
                }
            });
        }
        catch (err) {
            _this.sendTelemetry('Failed to connect to MesonetAPI API.');
        }
        return deferred.promise();

    };

    // Process the response and deliver back to the namespace
    MesonetAPI.prototype._haveResponse = function (args, obj) {

        // Check the API reponse code
        this.store.status = this.store.status === 1 || this.store.status === -9
            ? obj.SUMMARY.RESPONSE_CODE
            : this.store.status;

        if (this.store.status !== 1) { return; }

        // What kind of mode are we in?
        var _store = this.state.loadOnDemand && this.state.loadOnDemandHaveMetadata
            ? this.store.lastFetch
            : this.store;

        var a = {};
        var b = {};

        // Unravel the API response.
        if (args.service === this.state.api.serviceURLs.Variables) {
            // If requested the VARIABLES service, then all we need to do is parse it.
            obj.VARIABLES.map(function (k, i) {
                var key = Object.keys(k)[0];
                a[Number(k[key].vid)] = {
                    shortName: key,
                    longName: k[key].long_name
                };
                b[key] = {
                    vid: Number(k[key].vid),
                    longName: k[key].long_name
                };
            });

            _store.sensors = {};
            _store.sensors.sensorByVid = a;
            _store.sensors.sensorByName = b;
            return;
        }

        if (args.service === this.state.api.serviceURLs.QCTypes) {
            // If QCTypes
            obj.QCTYPES.map(function (k, i) {
                a[Number(k.ID)] = {
                    shortName: k.SHORTNAME,
                    longName: k.NAME,
                    sourceId: Number(k.SOURCE_ID)
                };
            });
            _store.qcTypes = a;
            return;
        }

        if (args.service === this.state.api.serviceURLs.QcSegments) {
            _store.qcShortName = obj.QC_SHORTNAMES;
            _store.qcLongName = obj.QC_NAMES;
            _store.qcSource = obj.QC_SOURCENAMES;
        }

        // First, populate with things we don't need to change.
        _store.info.nItems = obj.SUMMARY.NUMBER_OF_OBJECTS;
        _store.info.responseMessage = obj.SUMMARY.RESPONSE_MESSAGE;
        _store.station = obj.STATION;
        _store.units = obj.UNITS;

        // Now things that need to be generated.
        _store.tableOfContents = this._generateTOC(obj);
        _store.tableOfContentsIndex = this._generateTOCIndex(obj);

        if (typeof obj.UIMODE !== 'undefined') { _store.ui = this._parseUiMode(obj); }
    };

    MesonetAPI.prototype._generateTOC = function (obj) {
        var toc = {};
        obj.STATION.map(function (k, i) {
            toc[obj.STATION[i].STID] = i;
        });
        return toc;
    };

    MesonetAPI.prototype._generateTOCIndex = function (obj) {
        var toc = [];
        obj.STATION.map(function (k, i) {
            toc.push(obj.STATION[i].STID);
        });
        return toc;
    };

    MesonetAPI.prototype._parseUiMode = function (obj) {
        var result = {};

        result = obj.UIMODE;
        result.toc = {};
        result.build = {
            _o: [], // Order {string}
            _d: [], // Default {boolean}
            _n: [], // MesonetAPI API Name {string}
        };

        // Generate local TOC
        result.sensors.map(function (k, i) { result.toc[result.sensors[i].apiname] = i; });

        // Re-map the ui helper
        result.sensors.map(function (sensor, i) {
            obj.STATION.map(function (thisStation, idx) {
                var thisSensor = thisStation.SENSOR_VARIABLES[result.sensors[i].apiname];
                if (typeof thisSensor !== 'undefined') {
                    Object.keys(thisSensor).sort().map(function (k, ii) {
                        if (typeof thisStation.OBSERVATIONS[k] !== "undefined") {
                            result.build._o.push(k);
                            result.build._d.push(!result.sensors[i].default || ii > 0 ? false : true);
                            result.build._n.push(result.sensors[i].apiname);
                        }
                    });
                }
            });
        });

        return result;
    };

    return MesonetAPI;
}());
