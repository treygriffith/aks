/**
 * Module Dependencies
 */

var utils = require('./utils');
var express = require('express');

/**
 * HTTP error definitions - Code and Text
 */
var httpErrors = {
	unsupported: {
		code: 501,
		text: "Not Implemented"
	},
	error: {
		code: 500,
		text: "Internal Server Error"
	},
	notFound: {
		code: 404,
		text: "Not Found"
	},
	badRequest: {
		code: 400,
		text: "Bad Request"
	}
};

function httpError(error, res) {
	var http = httpErrors[error];
	if(!http) {
		console.log("unknown error "+error);
		http = httpErrors.error;
	}
	res.status(http.code);
	res.end(http.text);
}


/**
 * Initalize the Key Server
 * @param {Object} db Database driver that implements methods as described in './drivers/generic'
 * @param {Object} options Options for the AKS instance
 */
function AKS(db, options) {
	var useIndex = options.useIndex || true,
		trustProxy = options.trustProxy || false,
		baseUri = options.baseUri || '/',
		uri = baseUri + 'users';

	var version = this.version = 2;

	this.db = db;
	this.app = express();

	if(trustProxy) {
		this.app.enable('trust proxy');
	}

	this.app.get(uri + '/', function(req, res) {

		if(!useIndex) {

			// Index of all keys is unsupported
			httpError('unsupported', res);
			return;

		}

		// retrieve all the available usernames with associated references to keys
		db.find(function(err, keys) {

			if(err) {
				console.log(err);
				httpError('error', res);
				return;
			}

			if(!keys) {
				httpError('notFound', res);
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

	this.app.get(uri + '/:domain/', function(req, res) {

		var domain = req.params.domain;

		if(!useIndex) {

			// Index of all keys is unsupported
			httpError('unsupported', res);
			return;

		}

		// retrieve all users for this domain with associated references to keys
		db.find(domain, function(err, keys) {

			if(err) {
				console.log(err);
				httpError('error', res);
				return;
			}

			if(!keys) {
				httpError('notFound', res);
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
			httpError('badRequest', res);
			return;
		}

		// retrieve the key associated with this email address
		db.findOne(email, function(err, key) {

			if(err) {
				console.log(err);
				httpError('error', res);
				return;
			}

			if(!key || (key && !key.keytext)) {
				httpError('notFound', res);
				return;
			}

			res.setHeader('Content-Type', 'application/pgp-keys'); // as described in RFC-3156 (http://tools.ietf.org/html/rfc3156)
			res.status(200);
			res.end(key.keytext);

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