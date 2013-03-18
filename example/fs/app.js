var aks = require('../');

var fsKeyDatabase = new aks.drivers.Fs('keys'); // the fs driver is for demonstration only

var server = new aks.Server(fsKeyDatabase, {
	trustProxy: true
});

server.listen(process.env.PORT || 1337);
console.log('Authoritative Key Server listening on port ' + (process.env.PORT || 1337));