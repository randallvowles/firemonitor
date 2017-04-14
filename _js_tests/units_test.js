
var T = require("./units.js");



console.log("getAll: " + (T.getAll().Celsius === "Celsius"));

var sensor = "Kelvin";
var sensor_details = {
    convention: {
        si: true,
        metric: true,
        english: false
    },
    precision: 1,
    html: "K",
    text: "Kelvin",
    unit: "K"
};

console.log("get:            " + (T.get(sensor) === sensor_details));
console.log("get.html:       " + (T.get(sensor).html === sensor_details.html));
console.log("get.precision:  " + (T.get(sensor).precision === sensor_details.precision));
console.log("get.convention: " + (T.get(sensor).convention.si === sensor_details.convention.si));
console.log("get.textLabel:  " + (T.get(sensor).textLabel === sensor_details.text));

console.log("");




