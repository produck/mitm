const mitm = require('../');
const Strategy = require('../src/strategy')
const rootCA = require('./test-cert.json');
const path = require('path');

const strategy = new Strategy({
	sslConnect() {
		return true;
	},
	websocket(clientSocket, proxySocket) {
		clientSocket.pipe(proxySocket);
		proxySocket.pipe(clientSocket);
	},
	request(context, respond, forward) {
		forward();
		// context.response.body = 'ok';
		// context.response.headers = {};
		// context.response.statusCode = 200;
		// context.response.statusMessage = 'fuck';
		// respond()
	},
	response(context, respond) {
		respond();
	}
});

const server = mitm.createServer({
	strategy,
	ssl: {
		cert: rootCA.cert,
		key: rootCA.key
	},
	socket: {
		path: path.resolve(__dirname, './socketStore'),
		getName(protocol, hostname, port) {
			return `${protocol}-${hostname}-${port}`;
		}
	}
});

server.listen(8090);