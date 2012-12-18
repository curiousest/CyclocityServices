var async = require("async");
var bikedb = require("./lib/bikedb");
var bikeservices = require("./lib/bikeservices");


bikedb.getStationStatus("Dublin", "21", 1355758384, function(err, response){
	console.log(response);
});