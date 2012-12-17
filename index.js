var async = require("async");
var bikedb = require("./lib/bikedb");
var bikeservices = require("./lib/bikeservices");


bikedb.saveCityStatus("Dublin", function(err, response){
console.log(response);
});

