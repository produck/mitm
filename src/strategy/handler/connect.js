const net = require('net');
const errorListener = require('./util/error');

const BODY = 'HTTP/1.1 200 Connection Established\r\nProxy-agent: node-mitmproxy\r\n\r\n';
const LOCAL_IP = '127.0.0.1';

function connect(socket, head, hostname, port) {
	const proxySocket = net.connect(port, hostname);

	proxySocket.on('error', errorListener);
	proxySocket.once('connect', () => {
		socket.write(BODY);
		proxySocket.write(head);
		proxySocket.pipe(socket);
		socket.pipe(proxySocket);
	});
}

module.exports = function createConnectHandlerFactory(sslConnectInterceptor) {
	return function ConnectHandlerFactory(shadowRegistry) {
		return function connectHandler(clientRequest, socket, head) {
			const [hostname, port] = clientRequest.url.split(':');

			if (sslConnectInterceptor(clientRequest, socket, head)) {
				const shadowAddress = shadowRegistry.fetch(hostname, port).address();

				connect(socket, head, LOCAL_IP, shadowAddress.port);
			} else {
				connect(socket, head, hostname, port);
			}

			socket.on('error', errorListener);
		}

	}
};