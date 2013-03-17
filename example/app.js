var aks = require('../');

var fsKeyDatabase = new aks.drivers.Fs('keys'); // the fs driver is for demonstration only

var server = new aks.Server(fsKeyDatabase, {
	trustProxy: true
});

server.listen(process.env.PORT || 11371);