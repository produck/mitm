const fs = require('fs');
const mitm = require('./index');

const rootCA = {
	key: fs.readFileSync('/home/dameneko/node-mitmproxy/node-mitmproxy.ca.key.pem', 'utf-8'),
	cert: fs.readFileSync('/home/dameneko/node-mitmproxy/node-mitmproxy.ca.crt', 'utf-8')
};

const strategy = mitm.Strategy.create({
	sslConnect: () => true
});

const mitmServer = new mitm.Server(strategy, {
	ssl: {
		key: rootCA.key,
		cert: rootCA.cert
	}
});
mitmServer.listen(6789);