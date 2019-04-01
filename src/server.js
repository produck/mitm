const http = require('http');
const createRequestHandler = require('./create-request-handler');
const createConnectHandler = require('./create-connect-handler');

const LOCAL_IP = '127.0.0.1';

module.exports = class MitmServer {
	constructor(strategy) {
		const server = this.server = http.createServer();
		const requestHandler = createRequestHandler(strategy.interceptor);
		const connectHandler = createConnectHandler(strategy.interceptor.sslConnect);

		server.on('request', (clientRequest, clientResponse) => {
			requestHandler(clientRequest, clientResponse);
		});

		server.on('connect', (clientRequest, socket, head) => {
			connectHandler(clientRequest, socket, head);
		});

		server.on('upgrade', (clientRequest, socket, head) => {
			
		})
	}

	listen(port) {
		
	}

	config() {

	}
}