Authoritative Key Server
========================
`aks` is an implementation of an Authoritative PGP Key Server, using HAKP, as defined in the [HTTP Authoritative Keyserver Protocol](#http-authoritative-keyserver-protocol).
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

It takes as a parameter a database driver that implements the methods described in [Key Database Drivers](#key-database-drivers). It ships with a MongoDB driver (on top of Mongoose) as well as a Filesystem driver, meant only for local dev use, not as a production server.

```javascript
var aks = require('aks');

var mongoUrl = 'mongodb://' + db.user + ':' + db.pass + '@' + db.host + ':' + db.port + '/' + db.name;

var mongoKeyDatabase = new aks.drivers.Mongo(mongoUrl, 'keys'); // the storage mechanism for the keys is divorced from serving the keys themselves.

var server = new aks.Server(mongoKeyDatabase);

server.listen(); // defaults to the typical HKP Port of 11371
```

Once the Key Server is listening on a port, it will respond to requests formed in accordance with the [Public API](#public-api).


#### Server Options

The optional second parameter when starting the AKS server is an object of options. The possible properties for the options object are:
* `trustProxy` - If set to a truthy value, this tells AKS to trust a proxy which handles SSL connections by respecting the `X-Forwarded-Proto` header. [See the Express documentation of `trust proxy`](http://expressjs.com/api.html#app-settings) for more information. Defaults to false.
* `useIndex` - If set to a false-y value, this tells AKS to ignore requests for multiple users, as outlined in [Spam Concerns](#spam-concerns). Defaults to true.
* `baseUri` - If set, this should a string, beginning and ending with a forward slash, that defines the base uri at which the key server listens for requests. This is to facillitate the key server co-existing with other services on a single server. Defaults to `/`.

HTTP Authoritative Keyserver Protocol
-------------

The public API for this Authoritative Key Server is available over HTTP and HTTPS. It uses a protocol known as AKP (HTTP Authoritative Keyserver Procotol). [The IETF draft of this HTTP Keyserver Protocol](http://tools.ietf.org/html/draft-shaw-openpgp-hkp-00) is the basis for much of the API, and it was itself based on earlier implementations of Keyservers, such as [Marc Horowitz's Public Key Server](http://www.mit.edu/afs/net.mit.edu/project/pks/thesis/paper/thesis.html). 

Although the above draft was never approved, HKP is the de facto standard for keyservers. HAKP is based on HKP, but uses a substantially different API, as its use case is very different.

HAKP places an emphasis on REST principles, and the usage of a Keyserver as an Authoritative Key Server. As such, it does not implement all of the same methods as HKP, and the methods it does implement are done so in a substantially different way. HAKP should be considered incompatible with HKP.

However, due to the many benefits of HKP, including the use of existing technologies such as [SKS](https://bitbucket.org/skskeyserver/sks-keyserver/wiki/Home), the protocol is designed such that a server may use both HAKP and HKP, similar to the way in which a Domain Name Server and an Authoritative Domain Name server may be the same server.

### SRV Records

A Keyserver is designated as "Authoritative" for a domain, by adding a Service Record (SRV) to the DNS records for the domain. This means that all users of that domain that have PGP Keys will have the official version (up-to-date, valid, etc) located on the designated Authoritative Keyserver.

The symbolic name for the Authoritative Keyserver is `hakp`, and the underlying protocol is `tcp`.

An SRV Record might appear as follows:
```
_hakp._tcp.example.com 86400 IN SRV 0 5 80 keys.example.com.
```

Since Authoritative Keyservers are available over HTTP or HTTPS, the most common ports will be 80 and  443. However, the traditional HKP port of 11371 is also a likely choice.

If the Keyserver acts as both a HKP Keyserver as well as a HAKP Keyserver, both services should be designated within the DNS records.

### Public API

#### Retrieving all the users on a keyserver

HKP defined the index of the keys as all of the individual `keyid`'s. While technically true, for use as an authoritative supplier of keys for users it is more helpful to have an index of users with keys, regardless of whether or not some of those users (again defined by unique email addresses) have the same key.

HAKP uses this more practical definition of an index, which is retrieved by sending a `GET` request to `/users/`. The response is a JSON object, which has two properties: `version` and `keys`. `version` defines the version of the HAKP protocol in use, in our case it is always `1`. `keys` are an array of key objects, corresponding to all the unique users who have keys on this server. Each key object has a single property defined, `path`, which defines the relative path (not the absolute path) to the user's Public Key Block.

```
GET http://keys.example.com/users/
```
could return
```
{
	"version": 1,
	"keys": [
		{
			"path": "example.com/alice"
		},
		{
			"path": "example.com/bob"
		}
	]
}
```

HKP defined a variable, `mr` to designate whether a response should be machine-readable or human-readable. Since encryption is generally something better undertaken by machines than humans, HAKP assumes all request to be machine-readable, but the responses are in formats (like JSON) that are also easily read by humans.

Each `key` can optionally contain additional properties describing the key, including the `keyid`, algorithm, etc., but the protocol only requires the `path` property.

#### Retrieving all the users for a domain on a keyserver

As might be expected from the `path`s returned from index, it is possible to retrieve all the users for a particular domain by using the domain as a the endpoint. The JSON object returned is the same as for the index route, but the paths do not include the domain as they are relative to the current endpoint.

```
GET http://keys.example.com/users/example.com/
```
could return
```
{
	"version": 1,
	"keys": [
		{
			"path": "alice"
		},
		{
			"path": "bob"
		}
	]
}
```

#### Retrieving a user's public key

HKP relied on string searching to find the key id for a particular user, and then `GET`ing that key id to retrieve the Public Key Block. HAKP, by contrast does not support string searching, and instead returns the Public Key Block for a user (as defined by a unique email address) when sending a `GET` request to `/users/:domain/:user`. For example:
```
GET http://keys.example.com/users/example.com/alice
```
could return
```
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: GnuPG v1.0.1 (GNU/Linux)
Comment: For info see http://www.gnupg.org
	
mQGiBDkHP3URBACkWGsYh43pkXU9wj/X1G67K8/DSrl85r7dNtHNfLL/ewil10k2
q8saWJn26QZPsDVqdUJMOdHfJ6kQTAt9NzQbgcVrxLYNfgeBsvkHF/POtnYcZRgL
tZ6syBBWs8JB4xt5V09iJSGAMPUQE8Jpdn2aRXPApdoDw179LM8Rq6r+gwCg5ZZa
pGNlkgFu24WM5wC1zg4QTbMD/3MJCSxfL99Ek5HXcB3yhj+o0LmIrGAVBgoWdrRd
BIGjQQFhV1NSwC8YhN/4nGHWpaTxgEtnb4CI1wI/G3DK9olYMyRJinkGJ6XYfP3b
cCQmqATDF5ugIAmdditnw7deXqn/eavaMxRXJM/RQSgJJyVpbAO2OqKe6L6Inb5H
kjcZA/9obTm499dDMRQ/CNR92fA5pr0zriy/ziLUow+cqI59nt+bEb9nY1mfmUN6
SW0jCH+pIQH5lerV+EookyOyq3ocUdjeRYF/d2jl9xmeSyL2H3tDvnuE6vgqFU/N
sdvby4B2Iku7S/h06W6GPQAe+pzdyX9vS+Pnf8osu7W3j60WprQkUGF1bCBHYWxs
YWdoZXIgPHBhdWxnYWxsQHJlZGhhdC5jb20+iFYEExECABYFAjkHP3UECwoEAwMV
AwIDFgIBAheAAAoJEJECmvGCPSWpMjQAoNF2zvRgdR/8or9pBhu95zeSnkb7AKCm
/uXVS0a5KoN7J61/1vEwx11poLkBQdQ5Bz+MEAQA8ztcWRJjW8cHCgLaE402jyqQ
37gDT/n4VS66nU+YItzDFScVmgMuFRzhibLblfO9TpZzxEbSF3T6p9hLLnHCQ1bD
HRsKfh0eJYMMqB3+HyUpNeqCMEEd9AnWD9P4rQtO7Pes38sV0lX0OSvsTyMG9wEB
vSNZk+Rl+phA55r1s8cAAwUEAJjqazvk0bgFrw1OPG9m7fEeDlvPSV6HSA0fvz4w
c7ckfpuxg/URQNf3TJA00Acprk8Gg8J2CtebAyR/sP5IsrK5l1luGdk+l0M85FpT
/cen2OdJtToAF/6fGnIkeCeP1O5aWTbDgdAUHBRykpdWU3GJ7NS6923fVg5khQWg
uwrAiEYEGBECAAYFAjkHP4wACgkQkQKa8YI9JamliwCfXox/HjlorMKnQRJkeBcZ
iLyPH1QAoI33Ft/0HBqLtqdtP4vWYQRbibjW
=BMEc
-----END PGP PUBLIC KEY BLOCK-----
```

### Spam Concerns

There are (legitimate) concerns that exposing all the users on a keyserver with a simple `GET` request, or all the users of a particular domain can lead to users who are published in this way to be targeted by spammers. Some Public Key Servers, such as the PGP Global Directory have attempted to combat this behavior by requiring users to solve a CAPTCHA before they are granted access to the API. However, since the philosophy of HAKP is that machines, not humans, should be handling encryption, a CAPTCHA is decidely the wrong mechanism.

HAKP makes requests for all the users of a keyserver easier, but fundamentally presents the same opportunity for spammers. To combat this, individual implementations can choose to not make the Index methods accessible. The only method that is _required_ for HAKP is [retrieving the public key for a single user](#retrieving-a-users-public-key). In AKS's implementation, the option `useIndex` can be set to false to disable these methods. In addition, implemenations may choose to use rate limits, API keys, or other methods to attempt to stop spammers from accessing the keyserver.

### Multiple Users for a Single Key

Multiple unique email addresses can be associated with a single PGP key. HKP approached the key as the fundamental unit, and listed all of the users for which the key was applicable. Since there are very few applications for which it would be useful to know all the users of a particular key, instead of the key for a particular user, HAKP takes a fundamentally different approach.

However, one of the instances in which it would be useful to know all the users for a single key would be communicating with a large group that all shared a single PGP key. This scenario is one in which the members of the group corresponded about the shared group key ahead of time, and as a result, a Keyserver is not a necessity.

If this scenario (or others like it) do turn out to be an important use for HAKP Keyservers, the protocol can be expanded, perhaps through a `/groups` endpoint.

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
	The find method should take the `domain` as an optional first parameter. If supplied, it should call back with an array of keys corresponding to users of the `domain`. If `domain` is admitted, it should call back with an array of keys for all users on the keyserver. The `key` objects in the array should have the same properties defined as for the `findOne` method with the exception of `keytext`.

* `add`  
	The `add` method should store a key object when supplied with an email address as the first parameter and the Public Key Block as the second parameter. While this method is not currently used by the Public API, it will likely be implemented in the near future.

A [generic driver](drivers/generic.js) is included with this distribution as a starting point for future database drivers.
