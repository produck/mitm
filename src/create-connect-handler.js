const net = require('net');
const url = require('url');
const fakeServerStore = require('./fake-server');

const body = 'HTTP/1.1 200 Connection Established\r\nProxy-agent: node-mitmproxy\r\n\r\n';
const localIP = '127.0.0.1';

function connect(clientRequest, socket, head, hostname, port) {
	const proxySocket = net.connect(port, hostname);

	proxySocket.on('error', error => console.log(error));
	proxySocket.once('connect', () => {
		try {
			socket.write(body);
		} catch (e) {
			console.log(e);
		}

		socket.on('error', error => console.log(error));
		proxySocket.write(head);
		proxySocket.pipe(socket);
		socket.pipe(proxySocket);
	});
}

module.exports = function createConnectHandler(sslConnect) {
	return function connectHandler(clientRequest, socket, head) {
		const { hostname, port } = url.parse(clientRequest.url);

		if (sslConnect(clientRequest, socket, head)) {
			const fakeServer = fakeServerStore.fetch(hostname, port);
			connect(clientRequest, socket, head, localIP, fakeServer.port);
		} else {
			connect(clientRequest, socket, head, hostname, port);
		}
	}
};