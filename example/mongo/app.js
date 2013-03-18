var aks = require('../');

var db = require('./config/db');

var mongoUrl = 'mongodb://' + db.user + ':' + db.pass + '@' + db.host + ':' + db.port + '/' + db.name;

var mongoKeyDatabase = new aks.drivers.Mongo(mongoUrl, 'keys'); // the fs driver is for demonstration only

var server = new aks.Server(mongoKeyDatabase, {
	trustProxy: true
});

server.listen(process.env.PORT || 1337);
console.log('Authoritative Key Server listening on port ' + (process.env.PORT || 1337));