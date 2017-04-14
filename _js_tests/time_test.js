
/**
 * Returns the UTC Unix time from our odd-ball time format response
 *
 * `dateString` has the timezone format of `%s|%z|%Z` so we
 * need to break apart the values and then get the parts from it.
 *
 * @param {string} dateString
 * @returns {number}
 */
_parseTime = function (dateString, local) {
    /**
     * We expect the response to look like:
     *     `1451580960|-0800|PST`
     * The first segment is the _local unix time_ not the UTC unix time. This
     * is a by product of the Mesonet API.  The following is the UTC offset
     * which we will convert to milliseconds and simple add to the local unix
     * time.
     */
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
/**
 * Epoch Date methods
 * @param {date | string | number}
 * @returns {number | date}
 */
epochDate = function (_date) {

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


parseTime = function (t, local) {
    // needs to accept either a number (unix time, utc) or an api string

    // Determine the `local` time option    
    local = typeof local === "undefined" || typeof local !== "boolean" ? false : local;

    var _tz = local ? t.split("|")[2] : "UTC";
    var _tzo = local ? t.split("|")[1].slice(0, 3) + ":" + t.split("|")[1].slice(3, 5) : "+00:00";

    // Create a Date object
    _t = new Date(_parseTime(t, local) * 1000).toISOString();
    _tISO = local ? _t.split("Z")[0] + _tzo : _t;

    // 012345678901234567892123
    // 2015-12-31T16:56:00.000Z

    // ISO 8601 format
    // 2016-12-31T14:02:00+00:00

    return {
        iso8601: _tISO,
        year: Number(_tISO.slice(0, 4)),
        month: Number(_tISO.slice(5, 7)),
        day: Number(_tISO.slice(8, 10)),
        hour: Number(_tISO.slice(11, 13)),
        min: Number(_tISO.slice(14, 16)),
        sec: Number(_tISO.slice(17, 19)),
        msec: Number(_tISO.slice(20, 23)),
        tzone: _tz,
        tzo: _tzo
    };
}



// --- Test Cases ---
// 
// http://dev2.mesowest.net/tomato/tabtable.html?stid=ksfo&start=201601010000&end=201601012359
// http://mesowest.utah.edu/cgi-bin/droman/meso_base_dyn.cgi?product=&past=1&stn=KSFO&unit=1&time=GMT&day1=2&month1=01&year1=2016&hour1=0
// http://api.mesowest.net/v2/stations/timeseries?token=yo&stid=ksfo&start=201601010000&end=201601012359
//
// API response:
var t0 = "1451580960|-0800|PST"; // i[0]
var t1 = "1451663760|-0800|PST"; // i[n]

var t = t0;
console.log("\n");
console.log("Should be 0:56 UTC and 16:56 Local (PST)");
// console.log("Start time: " + t);
// console.log("Time Stamp: " + new Date(_parseTime(t, true) * 1000).toISOString()); // local time
// console.log("Time Stamp: " + new Date(_parseTime(t, false) * 1000).toISOString()); // false time
// console.log("JS Date() : " +  epochDate(epochDate(new Date(_parseTime(t, true) * 1000)))); // default to local

// The "local" time should be 16:56 PST!
// what if we take just the "local" unix time?
// so this works, sorta
// console.log("Time Stamp: " + new Date(1451580960 * 1000).toISOString()); // Unix time

console.log(time(t0, true));

