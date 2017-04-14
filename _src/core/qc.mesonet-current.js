/*!
 * MesoWest/SynopticLabs Quality Control Segments Expansion for MesonetJS
 * Provides QC Segments support to the MesonetJS library.
 * 
 * Requires MesonetJS (https://github.com/mesowx/MesonetJS)
 * 
 * For current build & bug reporting
 * https://github.com/mesowx/MesonetQC
 * 
 * Version 1.5.0
 *  
 * (C) 2016 Mesowest/Synoptic Labs.  All rights reserved.
 */

/**
 * Qc Codes lookup table
 * @returns {object} with QC Id's and API Query names
 */
Mesonet.prototype.qcLookupTable = function () {
    "use strict";

    var a = this.response.qc.metadata;
    var response = {};
    var i = 0;
    var l = a.length;

    for (var key in a) {
        response[key] = a[key].SHORTNAME;
    }

    return response;
};


/**
 * Qc Codes lookup table FULL NAMES
 * @returns {object} with QC Id's and API Query names
 */
Mesonet.prototype.qcLookupTableFullName = function () {
    "use strict";

    var a = this.response.qc.metadata;
    var response = {};
    var i = 0;
    var l = a.length;

    for (var key in a) {
        response[key] = a[key].NAME;
    }
    return response;
};


/**
 * Qc Codes lookup table VENDOR ID (SOURCE_ID)
 * @returns {object} with QC Id's and API Query names
 */
Mesonet.prototype.qcLookupVendorIDLN = function () {
    "use strict";

    var a = this.response.qc.metadata;
    var response = {};
    var i = 0;
    var l = a.length;

    for (i = 0; i < l; i++) {
        if (a[i].SOURCE_ID === 1) {
            response[a[i].ID] = "MesoWest/SynopticLabs";
        }
        else if (a[i].SOURCE_ID === 2) {
            response[a[i].ID] = "MADIS";
        }
        else {
            response[a[i].ID] = "Unknown!";
        }
    }

    return response;
};


/**
 * Returns ID number of above
 * @param {number} SOURCE_ID (vendor)
 */
Mesonet.prototype.qcLookupVendorID = function (id) {
    "use strict";

    var a = this.response.qc.metadata;
    var response = {};

    if (typeof id !== "undefined") {
        if (typeof a[id].SOURCE_ID === "undefined") {
            return 0;
        }
        else {
            return Number(a[id].SOURCE_ID);
        }
    }
    else {
        var i = 0;
        var l = a.length;
        for (i = 0; i < l; i++) {
            response[a[i].ID] = Number(a[i].SOURCE_ID);
        }
        return response;
    }
};


/**
 * Variables lookup table FULL NAMES
 * @returns {object}
 */
Mesonet.prototype.variableLookupTable = function () {
    "use strict";

    var a = this.response.sensor.metadata.meta;
    var response = {};
    var i = 0;
    var l = a.length;
    // for (i = 0; i < l; i++) {
    //     for (var key in a[i]) {
    //         response[key] = a[i][key].long_name;
    //     }
    // }
    for (var key in a) {
        response[key] = a[key].long_name;
    }

    return response;
};


/**
 * Creates a n-by-m array (matrix)
 * @param rows {integer} - Number of rows
 * @param cols {integer} - Number of columns
 * @param defaultValue {any} - Default value of array
 * @return {array}
 */
Mesonet.prototype._createMatrix = function (rows, cols, defaultValue) {
    "use strict";

    var arr = [];
    var i, j = 0;
    for (i = 0; i < rows; i++) {
        arr.push([]);
        arr[i].push(new Array(cols));
        for (j = 0; j < cols; j++) {
            arr[i][j] = defaultValue;
        }
    }
    return arr;
};


// /**
//  * Determine if the date is a leap year
//  * @param year {integer} full year to evaluate
//  * @return {bool}
//  */
// Date.prototype.isLeapYear = function (year) {
//     if ((year & 3) !== 0) {
//         return false;
//     }
//     return ((year % 100) !== 0 || (year % 400) === 0);
// };


// /**
//  * Determine the day of year (DOY)
//  * @param mode {string} - UTC | undefined
//  * @return {integer} - day of year
//  */
// Date.prototype._getDoy = function (mode) {
//     "use strict";

//     var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

//     var mn, dn;
//     if (mode === "UTC") {
//         mn = this.getUTCMonth();
//         dn = this.getUTCDate();
//     }
//     else {
//         mn = this.getMonth();
//         dn = this.getDate();
//     }

//     var dayOfYear = dayCount[mn] + dn;
//     if (mn > 1 && this.isLeapYear()) {
//         dayOfYear++;
//     }

//     return dayOfYear;
// };


/**
 * Converts day of the year to a Date() object
 * @param {number} day of year (1-365), with support for floats
 * @param {integer} year (optional) 2 or 4 digit year representation.
 *        Defaults to current year.
 * @return {Date} - Date() object
 */
Mesonet.prototype.doyToDate = function (year, doy) {
    "use strict";

    if (typeof year === "undefined") {
        year = (new Date()).getFullYear();
    }

    var dayMilliSec = 1000 * 60 * 60 * 24;
    var yStart = new Date('1/1/' + year + ' 0:0:0');

    //Adjust for the timezone
    yStart = yStart.getTime() - yStart.getTimezoneOffset() * 60 * 1000;
    var r = new Date(yStart + ((doy - 1) * dayMilliSec));

    return r;
};


/**
 * Shifts API date. Also good for going from time stamp to API time
 */
Mesonet.prototype.apiDate = function (_date) {
    "use strict";

    if (typeof _date === "undefined") {
        return 0;
    }

    _date.setDate(_date.getDate());
    var a, b, c, r;
    a = _date.getUTCFullYear().toString();
    if (_date.getUTCMonth() + 1 < 10) {
        b = "0" + (_date.getUTCMonth() + 1).toString();
    }
    else {
        b = (_date.getUTCMonth() + 1).toString();
    }

    if (_date.getUTCDate() < 10) {
        c = "0" + _date.getUTCDate().toString();
    }
    else {
        c = _date.getUTCDate().toString();
    }

    //console.log("a: " + a + " b: " + b + " c: " + c);

    r = a + b + c;

    if (r < 197001010000) {
        r = r * 10000;
    }

    return r;
};

/**
 * Common data things
 */
Mesonet.prototype._lookup = function () {
    "use strict";

    var response = {
        month: {
            short: [
                "Jan", "Feb", "Mar", "Apr",
                "May", "Jun", "Jul", "Aug",
                "Sep", "Oct", "Nov", "Dec"
            ],
            long: [
                "January", "February", "March", "April",
                "May", "June", "July", "August",
                "September", "October", "November", "December"
            ]
        }
    };
    return response;
};

/**
 * Modifies the URL string in the browser (aka redirects) 
 * @param {object} obj
 */
Mesonet.prototype._correctURL = function (obj) {
    "use strict";

    var url = window.location.href;
    var separator, newParam;
    for (var key in obj) {
        separator = (url.indexOf("?") === -1) ? "?" : "&";
        newParam = separator + key + "=" + obj[key];
        url = url + newParam;
    }
    window.location.href = url;
};


/**
 * Is leap year?
 * @param {number} year - Year to test
 */
Mesonet.prototype._isLeapYear = function (year) {
    "use strict";

    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
};


/**
 * Creates an HTML element and appends to DOM tree
 * @param {object} args
 * * @returns {element | false}
 */
Mesonet.prototype._createDOMElement = function (args) {
    "use strict";

    if (typeof args.element === "undefined") {
        // Bail out!
        return false;
    }
    if (typeof args.attribute === "undefined") {
        args.attribute = {};
    }

    // Create and append element
    var el = document.createElement(args.element);

    // Set options
    if (typeof args.attribute === "object") {
        for (var key in args.attribute) {

            if (key !== "parent") {
                el.setAttribute(key, args.attribute[key]);
            }
        }
    }

    // Deal with "inner" things
    if (typeof args.inner !== "undefined") {
        if (!Array.isArray(args.inner)) {
            args.inner = [args.inner];
        }

        var i = 0;
        var l = args.inner.length;
        for (i = 0; i < l; i++) {
            if (args.inner[i].tagName) {
                el.appendChild(args.inner[i]);
            }
            else {
                el.appendChild(document.createTextNode(args.inner[i]));
            }
        }
    }

    // If we have a parent element, then append to it.
    if (typeof args.attribute.parent !== "undefined") {
        try {
            document.getElementById(args.attribute.parent).appendChild(el);
        }
        catch (err) {
            console.log("Can not connect to object's parent. #6wp3k");
            console.log(err);
        }
    }

    return el;
};


/**
 * Slides the API date (+/-) n displayPeriods.
 * !! Recommend moving to MesonetJS.
 */
Mesonet.prototype.slideApiDate = function (_date, _offset) {
    "use strict";

    _date.setDate(_date.getDate() + _offset);
    var a, b, c;
    a = _date.getUTCFullYear().toString();
    if (_date.getUTCMonth() + 1 < 10) {
        b = "0" + (_date.getUTCMonth() + 1).toString();
    }
    else {
        b = (_date.getUTCMonth() + 1).toString();
    }

    if (_date.getUTCDate() < 10) {
        c = "0" + _date.getUTCDate().toString();
    }
    else {
        c = _date.getUTCDate().toString();
    }
    return a + b + c;
};


/**
 * Creates an HTML table for STID based on network and month
 * @param {object} args - arguments
 */
Mesonet.prototype.makeNetworkTimeDisplay = function (args) {
    "use strict";

    var __this = this;

    // If no `args` then bail!
    if (typeof args === "undefined") {
        return false;
    }

    if (typeof args.filter !== "undefined") {
        if (typeof args.filter.flag === "undefined") {
            args.filter.flag = [];
        }
        if (typeof args.filter.sensor === "undefined") {
            args.filter.sensor = [];
        }
    }
    else {
        args.filter = { flag: [], sensor: [] };
    }

    var timeInterval = this.response.qc.time_interval;
    var year = args.options.year;
    var displayPeriods = this.response.qc.time_hacks;

    // Initialize table                
    // If we have a table element in the DOM, we need to kill it.
    if (typeof document.getElementById(args.options.table_id) !== "undefined") {
        try {
            document.getElementById(args.options.container_id).innerHTML = "";
        } catch (err) {
            // All is good.
        }
    }

    var table = document.createElement("TABLE");
    table.setAttribute("id", args.options.table_id);
    table.setAttribute("class", args.options.table_class);
    table.appendChild(document.createElement("THEAD"));
    table.appendChild(document.createElement("TBODY"));

    var i, li, j, lj, k, lk;
    var station, thisRow, thisCell, thisProvider, thisFlag, thisSensor;
    lj = displayPeriods.length;
    i = 0;
    for (station in this.response.tableOfContents) {

        thisRow = table
            .getElementsByTagName("tbody")[0]
            .appendChild(document.createElement("TR"));

        thisCell = document.createElement("TD");
        thisCell.setAttribute("id", station + "-" + displayPeriods[j]);
        thisCell.appendChild(document.createTextNode(station));
        thisRow.appendChild(thisCell);

        for (j = 0; j < lj; j++) {
            thisCell = document.createElement("TD");
            thisCell.setAttribute("id", station + "-" + displayPeriods[j]);

            // Use a try statement for speed. We could do error checking, but
            // that takes extra cycles. We KNOW that most of these attempts
            // will fail.
            try {
                lk = this.response.qc.events[station][displayPeriods[j]].length;
                for (k = 0; k < lk; k++) {

                    // Do we have a value that should be filtered out?
                    thisFlag = this.response.qc.events[station][displayPeriods[j]][k].qc_flag;
                    thisSensor = this.response.qc.events[station][displayPeriods[j]][k].sensor;
                    thisSensor = thisSensor.replace(/\_qc\_+./, '');
                    thisProvider = this.qcLookupVendorID(thisFlag);

                    if (
                        (typeof args.filter !== "undefined") &&
                        (
                            (!this._has(thisFlag, args.filter.flag)) &&
                            (!this._has(thisSensor, args.filter.sensor))
                        )
                    ) {
                        // The lookup function does return `0` if the source is 
                        // unknown but we will just let that roll into a user error 
                        // below, so maybe if something is added to the QC 
                        // providers we will see the error and know to update this 
                        // block of code.
                        if (thisProvider === 1) {
                            thisCell.className += " " + args.options.mwActiveClass;
                        }
                        else if (thisProvider === 2) {
                            thisCell.className += " " + args.options.madisActiveClass;
                        }
                        else {
                            console.log("Unrecongized QC source. #svlt7");
                        }
                    }
                }

                // Initialize tooltips.
                thisCell.setAttribute("data-container", "body");
                thisCell.setAttribute("data-popover", "true");
                thisCell.setAttribute("data-tooltip", "true");
            }
            catch (err) {
                // I guess the data has no QC with it :)
            }
            thisRow.appendChild(thisCell);
        }
        i++;
    }
    document.getElementById(args.options.container_id).appendChild(table);

    // Create the table header
    document.getElementById(args.options.table_id).appendChild(document.createElement("THEAD"));
    thisRow = table.getElementsByTagName("thead")[0].appendChild(document.createElement("TR"));

    var a, b, c;
    li = displayPeriods.length;
    for (i = 0; i < li + 1; i++) {
        if (i > 0) {
            a = (this.epochDate(displayPeriods[i - 1])).toUTCString();

            // This will be the problem child.
            var s = "";
            if (timeInterval !== 86400) {
                s = a.slice(5, 11) + "\n" + a.slice(17, 22);
            }
            else {
                s = a.slice(8, 11) + " " + a.slice(5, 7);
            }

            thisCell = document.createElement("TH");
            thisCell.appendChild(document.createTextNode(s));
            thisRow.appendChild(thisCell);
        }
        else {
            thisCell = document.createElement("TH");
            thisCell.appendChild(document.createTextNode(""));
            thisRow.appendChild(thisCell);
        }
    }

    // /**
    //  * Is leap year?
    //  * 
    //  * @param {number} year
    //  * @returns
    //  */
    // function __isLeapYear(year) {
    //     return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
    // }

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

    // /** Does the array contain? */
    // function __has(item, arr) {
    //     var i = 0;
    //     var l = arr.length;
    //     for (i = 0; i < l; i++) {
    //         if (arr[i] === item) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }
};


/**
 * Creates an 365 day HTML table where displayPeriods with QC flags are highlighted
 * @requires jQuery, BootstrapJS(v3) - If you don't want to deal with this then
 *           you need to remove the shit about the tooltips and links.
 * @param args {object}
 */
Mesonet.prototype.makeSingleYearDisplay = function (args) {
    "use strict";

    // If no `args` then bail!
    if (typeof args === "undefined") {
        return false;
    }

    if (typeof args.filter !== "undefined") {
        if (typeof args.filter.flag === "undefined") {
            args.filter.flag = [];
        }
        if (typeof args.filter.sensor === "undefined") {
            args.filter.sensor = [];
        }
    }
    else {
        args.filter = { flag: [], sensor: [] };
    }

    // Set pointers
    var __this = this;
    var __rs = this.response.qc.events;

    if (args.diagnostic) {
        console.log("Diagnostic Message:  #r2wj4");
        console.log(args);
        console.log(__rs);
    }

    var monthNames = [
        "January", "February", "March", "April",
        "May", "June", "July", "August",
        "September", "October", "November", "December"
    ];

    // Initialize table                
    // If we have a table element in the DOM, we need to kill it.
    if (typeof document.getElementById(args.options.table_id) !== "undefined") {
        try {
            document.getElementById(args.options.container_id).innerHTML = "";
        }
        catch (err) {
            // All is good.
        }
    }

    var year = Number(args.options.year);
    var station = args.options.stid;
    var calendarMap = __dayOfYearMatrix(year);

    var table = document.createElement("TABLE");
    table.setAttribute("id", args.options.table_id);
    table.setAttribute("class", args.options.table_class);
    table.appendChild(document.createElement("THEAD"));
    table.appendChild(document.createElement("TBODY"));

    var i, li, j, lj, k, lk;
    var thisRow, thisCell, thisProvider, thisFlag, thisSensor, thisEpoch;
    for (i = 0; i < 13; i++) {
        var r, c, ct, s;
        if (i === 0) {
            // Make a header for our lowly table
            thisRow = table.getElementsByTagName("thead")[0]
                .appendChild(document.createElement("TR"));

            for (j = 0; j < 32; j++) {
                thisCell = document.createElement("TH");
                if (i === 0 && calendarMap[i][j] !== null) {
                    thisCell.appendChild(document.createTextNode(calendarMap[i][j]));
                }
                thisRow.appendChild(thisCell);
            }

        }
        else {

            thisRow = table.getElementsByTagName("tbody")[0].appendChild(document.createElement("TR"));

            for (j = 0; j < 32; j++) {
                thisCell = document.createElement("TD");

                // Set the ID
                if (j > 0) {
                    thisEpoch = this.epochDate(this.doyToDate(year, calendarMap[i][j]));
                    thisCell.setAttribute("id", station + "-" + thisEpoch);

                    // Use a `try` statement for speed. We could do error checking, but
                    // that takes extra cycles. We KNOW that most of these attempts
                    // will fail.
                    try {
                        lk = this.response.qc.events[station][thisEpoch].length;
                        for (k = 0; k < lk; k++) {

                            // Do we have a value that should be filtered out?
                            thisFlag = this.response.qc.events[station][thisEpoch][k].qc_flag;
                            thisSensor = this.response.qc.events[station][thisEpoch][k].sensor;
                            thisSensor = thisSensor.replace(/\_qc\_+./, '');
                            thisProvider = this.qcLookupVendorID(thisFlag);

                            if (
                                (typeof args.filter !== "undefined") &&
                                (
                                    (!this._has(thisFlag, args.filter.flag)) &&
                                    (!this._has(thisSensor, args.filter.sensor))
                                )
                            ) {
                                // The lookup function does return `0` if the source is 
                                // unknown but we will just let that roll into a user error 
                                // below, so maybe if something is added to the QC 
                                // providers we will see the error and know to update this 
                                // block of code.
                                if (thisProvider === 1) {
                                    if (!thisCell.className.includes(args.options.mwActiveClass)) {
                                        thisCell.className += " " + args.options.mwActiveClass;
                                    }
                                }
                                else if (thisProvider === 2) {
                                    if (!thisCell.className.includes(args.options.madisActiveClass)) {
                                        thisCell.className += " " + args.options.madisActiveClass;
                                    }
                                }
                                else {
                                    console.log("Unrecongized QC source. #jh1qe");
                                }
                            }
                        }

                        // Initialize tooltips.
                        thisCell.setAttribute("data-container", "body");
                        thisCell.setAttribute("data-toggle", "tooltip");
                    }
                    catch (err) {
                        // I guess the data has no QC with it :)
                    }
                }

                if (j === 0) {
                    thisCell.appendChild(document.createTextNode(monthNames[i - 1]));
                }
                else {
                    // !!! This is where we build the text for the table
                    if (calendarMap[i][j] === null) {
                        thisCell.setAttribute("class", args.options.table_null_class);
                    }
                    else if (typeof args.options.show_doy && args.options.show_doy) {
                        thisCell.appendChild(document.createTextNode(calendarMap[i][j]));
                        thisCell.className += " day-of-year-text";
                    }

                    if (thisEpoch >= this.epochDate(new Date())) {
                        // @todo: make this work for just today!
                        thisCell.className += " " + args.options.table_null_class;
                    }
                }
                thisRow.appendChild(thisCell);
            }
        }
    }
    document.getElementById(args.options.container_id).appendChild(table);

    return true;

    /* --------------------------------------------------------------------- */

    /**
     * Prepares n-by-m array for makeCalendarYearTable()
     * @return {array} - a 13-by-32 array with displayPeriods of years and months
     */
    function __dayOfYearMatrix(year) {

        var displayPeriodsPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (__isLeapYear(year)) { displayPeriodsPerMonth[1] = 29; }
        var r = __this._createMatrix(13, 32, null);
        var dayOfYear = 1;

        var i, j = 0;
        for (i = 0; i < 13; i++) {
            if (i === 0) {
                r[0][0] = null;
                for (j = 1; j < 32; j++) {
                    r[0][j] = j;
                }
            }
            else {
                r[i][0] = i;
                for (j = 1; j < displayPeriodsPerMonth[i - 1] + 1; j++) {
                    r[i][j] = dayOfYear++;
                }
            }
        }

        return r;
    }

    /* Check to see if leap year */
    function __isLeapYear(year) {
        return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
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
};