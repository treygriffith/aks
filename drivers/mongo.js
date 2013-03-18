/**
 * Module Dependencies
 */

var mongoose = require('mongoose');
var mongooseTypes = require('mongoose-types');
mongooseTypes.loadTypes(mongoose, 'email');


/**
 * Initalize a new MongoKDb (MongoDB Key Database)
 */
function MongoKDb(url, collectionName) {

	this.mongoose = mongoose.connect(url);
	
	var key = mongoose.Schema({
		uid: {type:mongoose.SchemaTypes.Email, index: {unique:true}},
		domain: {type: String, index: 1},
		user: {type: String, index: 1},
		keytext: String
	});

	this.model = this.collection = mongoose.model(collectionName, key);
	
	return this;
}


/**
 * Find a single key from the email uid
 * @param  {String}   email Email uid to retrieve a key for
 * @param  {Function} callback Function to evaluate with the results of the find
 */
MongoKDb.prototype.findOne = function(email, callback) {

	this.collection.findOne({uid:email}, callback);

};



 /**
 * Find all the keys for this server
 * @param  {String}   domain Optional domain in which to search for keys
 * @param  {Function} callback Function to evaluate with the results of the find
 */
MongoKDb.prototype.find = function(domain, callback) {

	var query = {};

	if(!callback) {
		callback = domain;
		domain = null;
	}

	if(domain) {
		query.domain = domain;
	}

	this.collection.find(query, callback);

};


/**
 * Add a key to the database
 * @param {String}   email Email to associate with the key
 * @param {String}   keytext ASCII-armored keytext including headers
 * @param {Function} callback Function to evaluate with an error or the key on success
 */
MongoKDb.prototype.add = function(email, keytext, callback) {
	var parts = email.split('@'),
		user = parts[0],
		domain = parts[1],
		Model = this.model;

	this.collection.findOne({uid:email}, function(err, key) {

		if(err) {
			callback(err);
			return;
		}

		if(!key) {
			key = new Model({
				uid:email,
				domain:domain,
				user:user
			});
		}

		key.keytext = keytext;

		key.save(function(err, key) {
			if(err) {
				callback(err);
				return;
			}
			callback(null, {
				uid: key.email,
				user: user,
				domain: domain,
				keytext: key.keytext
			});
		});

	});

};


/**
 * Export the MongoKDb object
 */

module.exports = MongoKDb;