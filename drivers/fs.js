/**
 * Module Dependencies
 */

var Filequeue = require('filequeue');
var fq = new Filequeue();
var path = require('path');


/**
 * Intialiaze a new FsKDb (Filesystem Key Database)
 * @param {String} baseDir Base Directory in which keys are stored
 */
function FsKDb(baseDir) {

	this.baseDir = baseDir;

	return this;
}

/**
 * Find a single key from the email uid
 * @param  {String}   email Email uid to retrieve a key for
 * @param  {Function} callback Function to evaluate with the results of the find
 */
FsKDb.prototype.findOne = function(email, callback) {
	var parts = email.split('@'),
		domain = parts[1],
		user = parts[0],
		keyPath = path.resolve(this.baseDir, domain, user);

	fq.exists(keyPath, function(exists) {

		if(!exists) {
			callback(); // no key found
			return;
		}

		fq.readFile(keyPath, 'utf8', function(err, keytext) {

			if(err) {
				callback(err);
				return;
			}

			if(!keytext || (keytext && !keytext.length)) {
				callback(); // file exists but it is empty
				return;
			}

			callback(null, {
				uid:email,
				user: user,
				domain: domain,
				keytext: keytext
			});

		});
	});
};

/**
 * Find all the keys for this server
 * @param  {String} domain Optional domain in which to search for keys
 * @param  {Function} callback Function to evaluate with the results of the find
 */
FsKDb.prototype.find = function(domain, callback) {
	if(!callback) {
		callback = domain;
		domain = null;
	}

	var baseDir = this.baseDir,
		keys = [];

	var getUsers = function(domain, callback) {
		// get all the users for the domain
		fq.readdir(path.resolve(baseDir, domain), function(err, users) {

			if(err) {
				callback(err);
				return;
			}

			users.forEach(function(user) {

				// add to the array with the email as the uid
				keys.push({
					uid: user + '@' + domain,
					user: user,
					domain: domain
				});

			});

			callback(null, keys.sort()); // sort the keys prior to returning them

		});
	};

	if(domain) {
		fq.exists(path.resolve(baseDir, domain), function(exists) {

			if(!exists) {
				// no users for this domain
				callback();
				return;
			}

			// get only users for the defined domain
			getUsers(domain, callback);

		});
		return;
	}

	// get all the domains stored in the directory
	fq.readdir(path.resolve(baseDir), function(err, domains) {

		if(err) {
			callback(err);
			return;
		}

		if(!domains || (domains && !domains.length)) {
			callback(null, keys);
			return;
		}

		var count = 0;

		domains.forEach(function(domain) {

			getUsers(domain, function(err, keys) {

				if(err) {
					callback(err);
					return;
				}

				if(++count === domains.length) { // the last domain has been fetched
					callback(null, keys);
				}

			});

		});

	});
};

/**
 * Add a key to the database
 * @param {String}   email Email to associate with the key
 * @param {String}   keytext ASCII-armored keytext including headers
 * @param {Function} callback Function to evaluate with an error or the added key on success
 */
FsKDb.prototype.add = function(email, keytext, callback) {
	var parts = email.split('@'),
		domain = parts[1],
		user = parts[0],
		domainPath = path.resolve(this.baseDir, domain),
		keyPath = path.resolve(this.baseDir, domain, user);

	var createKey = function(cb) {

		fq.writeFile(keyPath, keytext, 'utf8', function(err) {

			if(err) {
				cb(err);
				return;
			}

			cb(null, {
				uid:email,
				user:user,
				domain:domain,
				keytext:keytext
			});

		});

	};

	fq.exists(domainPath, function(exists) {

		if(!exists) {
			fq.mkdir(domainPath, function(err) {

				if(err) {
					callback(err);
					return;
				}

				createKey(callback);

			});

			return;
		}

		createKey(callback);

	});

};

/**
 * Export the FsKDb object
 */

module.exports = FsKDb;