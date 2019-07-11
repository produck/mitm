const mitm = require('../');
const rootCA = require('./test-cert.json');
const path = require('path');

// const strategy = new Strategy({
// 	sslConnect() {
// 		return true;
// 	},
// 	websocket(clientSocket, proxySocket) {
// 		clientSocket.pipe(proxySocket);
// 		proxySocket.pipe(clientSocket);
// 	},
// 	request(context, respond, forward) {
// 		forward();
// 		// context.response.body = 'ok';
// 		// context.response.headers = {};
// 		// context.response.statusCode = 200;
// 		// context.response.statusMessage = 'fuck';
// 		// respond()
// 	},
// 	response(context, respond) {
// 		respond();
// 	}
// });
const cache = {};

const server = mitm.createServer({
	strategyOptions: {
		request(context, respond, forward) {
			context.response.body = 'ok';
			context.response.headers = {};
			context.response.statusCode = 200;
			context.response.statusMessage = 'test';
			respond();
		}
	},
	certificate: {
		cert: rootCA.cert,
		key: rootCA.key,
		store: {
			get(id) {
				return cache[id];
			},
			set(id, value) {
				return cache[id] = value;
			}
		}
	},
	socket: {
		path: path.resolve(__dirname, './socketStore'),
		getName(protocol, hostname, port) {
			return `${protocol}-${hostname}-${port}`;
		}
	}
});

server.listen(8090);