///////////////////////////////////
// Generic Driver Implementation //
///////////////////////////////////

/**
 * Initalize a new Driver Object
 */
function Driver() {
	var kdb = this;
	
	return this;
}


/**
 * Find a single key from the email uid
 * @param  {String}   email Email uid to retrieve a key for
 * @param  {Function} callback Function to evaluate with the results of the find
 */
Driver.prototype.findOne = function(email, callback) {
	
};



 /**
 * Find all the keys for this server
 * @param  {String}   domain Optional domain in which to search for keys
 * @param  {Function} callback Function to evaluate with the results of the find
 */
Driver.prototype.find = function(domain, callback) {

};


/**
 * Add a key to the database
 * @param {String}   email Email to associate with the key
 * @param {String}   keytext ASCII-armored keytext including headers
 * @param {Function} callback Function to evaluate with an error or the added key on success
 */
Driver.prototype.add = function(email, keytext, callback) {

};


/**
 * Export the Driver object
 */

module.exports = Driver;