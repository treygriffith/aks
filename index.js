/**
 * Module Dependencies
 */

var utils = require('./utils');
var express = require('express');


/**
 * Initalize the Key Server
 * @param {Object} db Database driver that implements methods as described in './drivers/generic'
 * @param {Object} options Options for the AKS instance
 */
function AKS(db, options) {
	var useIndex = options.useIndex || false,
		trustProxy = options.trustProxy || false,
		baseUri = options.baseUri || '/',
		uri = baseUri + 'keys';

	var version = this.version = 2;

	this.db = db;
	this.app = express();

	if(trustProxy) {
		this.app.enable('trust proxy');
	}

	this.app.get(uri + '/', function(req, res) {

		if(!useIndex) {

			// Index of all keys is unsupported
			res.status(501);
			res.send();
			return;

		}

		// retrieve all the available usernames with associated references to keys
		db.find(function(err, keys) {

			if(err) {
				res.status(500);
				res.send(err);
				return;
			}

			var displayKeys = {
				version: version,
				keys: []
			};

			keys.forEach(function(key) {
				displayKeys.keys.push({
					path: key.domain + '/' + key.user
				});
			});

			res.status(200);
			res.json(displayKeys);

		});

	});

	this.app.get(uri + '/:domain', function(req, res) {

		var domain = req.params.domain;

		if(!useIndex) {

			// Index of all keys is unsupported
			res.status(501);
			res.send();
			return;

		}

		// retrieve all users for this domain with associated references to keys
		db.find(domain, function(err, keys) {

			if(err) {
				res.status(500);
				res.send(err);
				return;
			}

			var displayKeys = {
				version: version,
				keys: []
			};

			keys.forEach(function(key) {
				displayKeys.keys.push({
					path: key.user
				});
			});

			res.status(200);
			res.json(displayKeys);

		});

	});

	this.app.get(uri + '/:domain/:user', function(req, res) {

		var email = req.params.user + '@' + req.params.domain;

		if(!utils.isValidEmail(email)) {
			res.status(400);
			res.send();
			return;
		}

		// retrieve the key associated with this email address
		db.findOne(email, function(err, key) {

			if(err) {
				res.status(500);
				res.send(err);
				return;
			}

			if(!key || (key && !key.keytext)) {
				res.status(404);
				res.send();
				return;
			}

			res.status(200);
			res.send(key.keytext);

		});

	});

	this.app.listen(process.env.PORT || 3000);

	return this;
}

AKS.prototype.listen = function(port, args) {
	if(typeof port === 'number') {
		args = Array.prototype.slice.call(arguments, 1);
	} else {
		port = 11371;
		args = Array.prototype.slice.call(arguments);
	}
	
	args.unshift(port);

	this.app.listen.apply(this.app, args);
};

/**
 * Export the Authoritative Key Server
 */

exports.Server = AKS;


/**
 * Export the standard database drivers
 */

exports.drivers = require('./drivers');