/*!
 * user.js - Storage and Sync of User Settings
 * @author MesoWest/SynopticLabs (2016)
 * @version 0.0.2
 */
var User = (function () {
    "use strict";

    /** Constructor */
    function User(args) {
        this.cname = args.cookie_name;
        this.ttl = args.cookie_ttl;

        if (!this.checkCookie()) { this._setCookie(); }
        this.settings = this.getCookie() !== null ? this.getCookie() : defaultSettings;

        return;
    }

    // Version and build.  The build number is just an incriment from the last.  This is used
    // to force a "cookie update" on the client.
    User.prototype.VERSION = "0.3.2";
    User.prototype.BUILD = 4;

    // Default settings object
    var defaultSettings = {
        options: {
            temporary: {
                last_stid: ""
            },
            sensor_best_choice: true,
            time_utc: true,
            show_all_vars: false,
            units: {
                metric: true,
                alti: "hpa",
                height: "m",
                temp: "c",
                precip: "mm",
                pres: "hpa",
                speed: "mps"
            },
        },
        sensorsList: {
            date_time: true
        },
        authentication: {
            token: null
        },
        enableBetaFeatures: false,
    };

    /** Get beta features setting */
    User.prototype.useBetaFeatures = function () {
        return this.settings.options.enableBetaFeatures;
    };

    User.prototype.setBetaFeatures = function (b) {
        if (typeof b === "boolean") {
            this.settings.options.enableBetaFeatures = b;
            this._setCookie();
            return true;
        }
        else {
            return false;
        }
    };

    /** Returns the default white list of sensors */
    User.prototype.getWhiteList = function () {
        return defaultSettings.sensorsList;
    };

    /** Returns the Sensor Best Choice option */
    User.prototype.isSensorBestChoice = function () {
        return this.settings.options.sensor_best_choice;
    };

    User.prototype.setSensorBestChoice = function (b) {
        if (typeof b === "boolean") {
            this.settings.options.sensor_best_choice = b;
            this._setCookie();
            return true;
        }
        else {
            return false;
        }
    };

    /** Get the sensors the user wants displayed */
    User.prototype.getSensors = function () {
        return this.settings.sensorsList;
    };

    User.prototype.displaySensor = function (a) {
        // console.log(typeof this.settings.sensorsList[a] === "undefined" ? true : this.settings.sensorsList[a]);
        return typeof this.settings.sensorsList[a] === "undefined" ? null : this.settings.sensorsList[a];
    };

    /** Add a sensor to the display list */
    User.prototype.addSensor = function (a) {
        this.settings.sensorsList.date_time = true;
        this.settings.sensorsList[a] = true;
        this._setCookie();
        return;
    };

    /** Remove a sensor from the display list */
    User.prototype.removeSensor = function (a) {
        if (a === "date_time") { return; } // For safety reasons.
        this.settings.sensorsList[a] = false;
        this._setCookie();
        return;
    };

    /**
     * Remove a sensor from the display list
     * @param s {string} - sensor to modify
     * @param v {boolean} - value
     */
    User.prototype.setSensor = function (s, v) {
        if (s === "date_time") { return; } // For safety reasons.
        this.settings.sensorsList.date_time = true;

        this.settings.sensorsList[s] =
            typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : null;
        this._setCookie();
        return;
    };

    /** Set all sensors to false. I.e. force to not display. */
    User.prototype.removeAllSensors = function () {
        var _this = this;
        Object.getOwnPropertyNames(this.settings.sensorsList).map(function (d) {
            // _this.settings.sensorsList[d] = d === "date_time" ? true : false;
            _this.settings.sensorsList[d] = false;
        });
        this._setCookie();
        return;
    };

    User.prototype.resetSensorToWhiteList = function () {
        this.settings.sensorsList = this.getWhiteList();
        this._setCookie();
        return;
    };

    /** Returns an API friendly units string */
    User.prototype.getUnits = function (_u) {

        var ut = ["alti", "height", "temp", "precip", "pres", "speed"];
        var u = typeof _u === "undefined" ? ut : _u === -1 ? function () { return ut; } : [_u];

        // If the user targeted a specific sensor type...
        if (u.length === 1) { return this.settings.options.units[_u]; }
        if (_u === -1) { return ut; }

        // Else build an API friendly string
        var _this = this;
        return ((this._isMetric() ? "metric" : "english") + "," +
            u.map(function (i) {
                return _this.settings.options.units[i] !== null ?
                    i + "|" + _this.settings.options.units[i] : null;
            }).filter(function (n) { return n !== null; }).join()).replace(/,\s*$/g, "");
    };

    /** Does the user want metric or english units? */
    User.prototype._isMetric = function () {
        return this.settings.options.units.metric;
    };

    /** Sets the metric state */
    User.prototype.setMetric = function (a) {
        if (typeof a === "undefined" || typeof a !== "boolean") {
            this.settings.options.units.metric = this._isMetric() ? false : true;
        }
        else {
            this.settings.options.units.metric = a;
        }
        this._setCookie();
        return this._isMetric();
    };

    /** What timezone does the user want? */
    User.prototype._isUTC = function () {
        return this.settings.options.time_utc;
    };

    /**
     * Return API Token (if available)
     * @returns {string} - API Token
     */
    User.prototype.getToken = function () {
        return this.settings.authentication.token;
    };

    /**
     * @returns {boolean} - User wants to see all the variables
     */
    User.prototype.showAllVars = function () {
        return this.settings.options.show_all_vars;
    };

    /**
     * Set cookie parameter value.
     * @param {string} path - Ex. "options.temporary.stid"
     * @param {any} value - Value to append to path
     * @returns {boolean} - state
     */
    User.prototype.setValue = function (path, value) {
        var _p = path.split('.');
        var obj = this.settings;
        var i = 0;
        var l = _p.length - 1;

        for (i = 0; i < l; i++) {
            var _key = _p[i];
            if (_key in obj) {
                obj = obj[_key];
            }
            else {
                obj[_key] = {};
                obj = obj[_key];
            }
        }
        obj[_p[l]] = value;

        this._setCookie();
        return true;
    };

    /** If user does not have a cookie in place then set one */
    User.prototype._setCookie = function () {
        var d = new Date();
        d.setTime(d.getTime() + (this.ttl * 86400000));
        var expires = "expires=" + d.toUTCString();

        document.cookie =
            this.cname + "=" + JSON.stringify(this.settings) + ";" + this.expires + ";path=/";

        return;
    };

    /**
     * Returns the cookie as an object
     * @returns {object} - All user settings
     */
    User.prototype.getCookie = function () {
        var _n = this.cname + "=";
        var ca = document.cookie.split(";"); // Cookie attribute, array

        var i = 0;
        var l = ca.length;
        for (i = 0; i < l; i++) {
            var c = ca[i];

            var j = 0;
            var maxJ = 100;
            while (c.charAt(0) === " ") {
                c = c.substring(1);
                j++;
                if (j > maxJ) { break; }
            }

            try {
                if (c.indexOf(_n) === 0) {
                    // If we have a cookie and some settings then return
                    return JSON.parse(c.substring(_n.length, c.length));
                }
            }
            catch (err) {
                return null;
            }
        }
        // There's no cookie to return
        return null;
    };

    /**
     * Check to see if we have a valid cookie 
     * @returns {boolean}
     */
    User.prototype.checkCookie = function () {
        return this.getCookie(this.cname) !== null ? true : false;
    };

    /**
     * Delete our cookie
     * @param b {boolean} - Optional, if true then executes.
     */
    User.prototype.deleteCookie = function (b) {
        if (typeof b === "undefined" || (typeof b === "boolean" && b)) {
            document.cookie = this.cname + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
        }
        return;
    };

    return User;
}());