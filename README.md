Authoritative Key Server
========================
`aks` is an implementation of an Authoritative PGP Key Server, using HAKP, as defined in the [HTTP Authoritative Keyserver Protocol](https://github.com/treygriffith/aks/wiki/Protocol).
It is intended to be a demonstration of a working Authoritative Key Server using updated REST principles.

Installation
------------

Through [NPM](http://www.npmjs.org)
```bash
$ npm install aks
```

or using Git
```bash
$ git clone git://github.com/treygriffith/aks	.git node_modules/aks/
```

Usage
-----

`aks` can be run as a stand-alone web server or as an additional web server inside of a Node application. To create it, simply create an instance of `aks` and instruct it to listen on the proper port.

It takes as a parameter a database driver that implements the methods described in [Key Database Drivers](#key-database-drivers). It ships with a MongoDB driver (on top of Mongoose) as well as a Filesystem driver, meant only for local development use, not as a production server.

```javascript
var aks = require('aks');

var mongoUrl = 'mongodb://' + db.user + ':' + db.pass + '@' + db.host + ':' + db.port + '/' + db.name;

var mongoKeyDatabase = new aks.drivers.Mongo(mongoUrl, 'keys'); // the storage mechanism for the keys is divorced from serving the keys themselves.

var server = new aks.Server(mongoKeyDatabase);

server.listen(); // defaults to the typical HKP Port of 11371
```

Once the Key Server is listening on a port, it will respond to requests formed in accordance with the [Public API](https://github.com/treygriffith/aks/wiki/Protocol#public-api).


#### Server Options

The optional second parameter when starting the AKS server is an object of options. The possible properties for the options object are:
* `trustProxy` - If set to a truthy value, this tells AKS to trust a proxy which handles SSL connections by respecting the `X-Forwarded-Proto` header. [See the Express documentation of `trust proxy`](http://expressjs.com/api.html#app-settings) for more information. Defaults to false.
* `useIndex` - If set to a false-y value, this tells AKS to ignore requests for multiple users, as outlined in [Spam Concerns](https://github.com/treygriffith/aks/wiki/Protocol#spam-concerns). Defaults to true.
* `baseUri` - If set, this should a string, beginning and ending with a forward slash, that defines the base uri at which the key server listens for requests. This is to facillitate the key server co-existing with other services on a single server. Defaults to `/`.


Key Database Drivers
--------------------

AKS is implemented such that it is agnostic to how keys are stored/retrieved and interacts with any storage mechanism through a driver that implements the methods required by AKS.

Two database drivers are included with this distribution:  
1. A [filesystem driver](drivers/fs.js) intended as a local demonstration of an AKS, and  
2. A [Mongo driver](drivers/mongo.js) intended as a basic MongodDB interface for an Authoritative Key Server.

Compliant Key Database Drivers implement the following methods:
* `findOne`  
	The `findOne` method calls back with a single `key` object when supplied with a valid email address as the first parameter. The key object should have at least the following properties defined:
	* `keytext` - The Public Key Block
	* `uid` - The email address which uniquely identifies this key
	* `user` - Portion of the email address prior to the `@`
	* `domain` - The domain of the user (portion of the email address after the `@`)

* `find`  
	The find method should take the `domain` as an optional first parameter. If supplied, it should call back with an array of keys corresponding to users of the specified `domain`. If `domain` is omitted, it should call back with an array of keys for all users on the keyserver. Each `key` object in the array should have at least the following properties defined:
	* `uid` - The email address which uniquely identifies this key
	* `user` - Portion of the email address prior to the `@`
	* `domain` - The domain of the user (portion of the email address after the `@`)

* `add`  
	The `add` method should store a key object when supplied with an email address as the first parameter and the Public Key Block as the second parameter. This method is currently not implemented in the Public API, but is necessary for adding additional users to the key server.

A [generic driver](drivers/generic.js) is included with this distribution as a starting point for future database drivers.
