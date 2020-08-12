'use strict';

const mitm = require('../');
const path = require('path');
const rootCA = require('./test-cert.json');

const certificateStore = {};

const options = {
	strategy: {
		sslConnect() {
			return true;
		},
		websocket(clientSocket, proxySocket) {
			clientSocket.pipe(proxySocket);
			proxySocket.pipe(clientSocket);
		},
		// request(context, respond) {
		// 	context.response.body = 'hello, world!';
		// 	context.response.headers = {};
		// 	context.response.statusCode = 200;
		// 	context.response.statusMessage = 'test';

		// 	respond();
		// },
		// response(context, respond) {
		// 	respond();
		// }
	},
	socket: {
		path: path.resolve(__dirname, '/socketStore'),
		getName(protocol, hostname, port) {
			return `${protocol}-${hostname}-${port}`;
		}
	},
	certificate: {
		cert: rootCA.cert,
		key: rootCA.key,
		store: {
			get(hostname) {
				return certificateStore[hostname];
			},
			set(hostname, value) {
				return certificateStore[hostname] = value;
			}
		}
	}
};

const mitmServer = mitm.createServer(options);

mitmServer.listen(8090);
