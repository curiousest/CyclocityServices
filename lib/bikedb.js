var http = require("http");
var async = require("async");
var xml2js = require("xml2js");
var xmlParser = new xml2js.Parser();
var mongodb = require('mongodb');
var url = require('url');
 

var CITYURLS = {
	"Dublin" : {
		"host": "www.dublinbikes.ie", 
		"path": "/service/stationdetails/dublin/", 
		"stationCount": 44
	}
};
var DBURL = 'mongodb://dmhindson:B31j1ng@alex.mongohq.com:10064/dough';
var DBCOLLECTION = 'stationStatus';

function stationStatus(city, station, callback){
	var cityURL = CITYURLS[city];
	var response = '';
	if (!CITYURLS) callback("city not found", null);
	
	var req = http.request({
		host: cityURL.host,
		path: cityURL.path + station
	}, function (res) {
		res.on('data', function(chunk){
			response += chunk.toString();
		});
		res.on('end', function (chunk) {
			xmlParser.parseString(response, function(err, result){
				var stationData = {
					'available': result.station.available[0],
					'free': result.station.free[0],
					'total': result.station.total[0],
					'ticket': result.station.ticket[0],
					'open': result.station.open[0],
					'updated': result.station.updated[0],
					'connected': result.station.connected[0],
					'station': station,
					'city': city
				};
				
				//round down the station time to the nearest 5min to put in the id field (to nearest 300)
				var roundedDownTime = (Math.floor(parseInt(stationData.updated) / 300) * 300).toString();
				stationData._id = stationData.city + '-' + stationData.station + '-' + roundedDownTime;

				callback(null, stationData);
			});
		});
	});
	req.end();
}

function writeStationStatus(station, callback){
	mongodb.Db.connect(DBURL, function(error, client) {
		if (error) throw error;
		
		client.collection(DBCOLLECTION, function(error, collection){
			collection.insert(station);
		});
	});
}

function saveCityStatus(city, callback){
	var cityURL = CITYURLS[city];
	if (!cityURL) callback ("city not found", null);
	
	var response = {"availableTotal": 0, "freeTotal": 0, "totalTotal": 0, "ticketTotal": 0, "openTotal": 0, "updatedAverage":0, "connectedTotal": 0};
	
	mongodb.Db.connect(DBURL, function(error, client) {
		if (error) throw error;
		
		client.collection(DBCOLLECTION, function(error, collection){
	
			var q = async.queue(function(task, callback) {
				stationStatus(task.city, task.station.toString(), function(err, result){
					response.availableTotal += parseInt(result.available);
					response.freeTotal += parseInt(result.free);
					response.totalTotal += parseInt(result.total);
					response.ticketTotal += parseInt(result.ticket);
					response.openTotal += parseInt(result.open);
					response.updatedAverage += parseInt(result.updated);
					response.connectedTotal += parseInt(result.connected);
					collection.insert(result);
					callback();
				});
			}, 20);
			
			q.drain = function() {
				response.updatedAverage = response.updatedAverage / parseInt(cityURL.stationCount);
				response.stationCount = parseInt(cityURL.stationCount);
				
				//round down the station time to the nearest 5min to put in the id field (to nearest 300)
				var roundedDownTime = (Math.floor(parseInt(response.updatedAverage.toString().substring(0,10)) / 300) * 300).toString();
				response._id = city + '-' + roundedDownTime;
				collection.insert(response);
				callback(null, null);
			}
			
			for (var i = 1; i < parseInt(cityURL['stationCount']); i++){
				q.push({city: city, station: i}, function (err){
				});
			}
		});
	});
}

function displayCityStatus(city, callback){
	var response = {"availableTotal": 0, "freeTotal": 0, "totalTotal": 0, "ticketTotal": 0, "openTotal": 0, "updatedAverage":0, "connectedTotal": 0};
	var cityURL = CITYURLS[city];
	if (!cityURL) callback ("city not found", null);
	
	var q = async.queue(function(task, callback) {
		stationStatus(task.city, task.station.toString(), function(err, result){
			console.log(result);
			response.availableTotal += parseInt(result.available);
			response.freeTotal += parseInt(result.free);
			response.totalTotal += parseInt(result.total);
			response.ticketTotal += parseInt(result.ticket);
			response.openTotal += parseInt(result.open);
			response.updatedAverage += parseInt(result.updated);
			response.connectedTotal += parseInt(result.connected);
			callback();
		});
	}, 20);
	
	q.drain = function() {
		response["updatedAverage"] = response["updatedAverage"] / parseInt(cityURL['stationCount']);
		response["stationCount"] = parseInt(cityURL['stationCount']);
		callback(null, response);
	}
	
	for (var i = 1; i < parseInt(cityURL['stationCount']); i++){
			q.push({city: city, station: i}, function (err){
		});
	}
}

function listStations(city, callback){
	var cityURL = CITYURLS[city];
	if (!cityURL) callback ("city not found", null);
	var response = '';
	
	var req = http.request({
		host: cityURL.host,
		path: '/service/carto'
	}, function (res) {
		res.on('data', function(chunk){
			response += chunk.toString();
		});
		res.on('end', function (chunk) {
			xmlParser.parseString(response, function(err, result){
				callback(null, result);
			});
		});
	});
	req.end();
}
exports.displayCityStatus = displayCityStatus;
exports.saveCityStatus = saveCityStatus;
exports.stationStatus = stationStatus;
exports.listStations = listStations;