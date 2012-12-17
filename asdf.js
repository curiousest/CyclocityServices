// npm install mongodb
var mongodb = require('mongodb');
var url = require('url');
var log = console.log;
 
var connectionUri = url.parse(process.env.MONGOHQURL);
var dbName = connectionUri.pathname.replace(/^\//, '');
var db = mongodb.Db;

db.connect(process.env.MONGOHQURL, function(error, client) {
	if (error) throw error;
	
	client.collection("bikeme", function(error, collection){
		collection.insert({
			_id: 12,
			name: 'notdough'
		});
	});
});