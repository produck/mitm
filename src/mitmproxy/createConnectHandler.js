'use strict';

const net = require('net');
const url = require('url');
const colors = require('colors');

const localIP = '127.0.0.1';
// create connectHandler function
module.exports = function createConnectHandler(sslConnectInterceptor, fakeServerCenter) {

	// return
	return function connectHandler(req, cltSocket, head) {

		const srvUrl = url.parse(`https://${req.url}`);

		if (typeof sslConnectInterceptor === 'function' && sslConnectInterceptor.call(null, req, cltSocket, head)) {
			fakeServerCenter.getServerPromise(srvUrl.hostname, srvUrl.port).then((serverObj) => {
				connect(req, cltSocket, head, localIP, serverObj.port);
			}, (e) => {
				console.error(e);
			});
		} else {
			connect(req, cltSocket, head, srvUrl.hostname, srvUrl.port);
		}
	};

};

function connect(req, cltSocket, head, hostname, port) {
	// tunneling https
	const proxySocket = net.connect(port, hostname, () => {

		try {
			cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
				'Proxy-agent: node-mitmproxy\r\n' +
				'\r\n');
		} catch (e) {
			console.log(e);
		}

		cltSocket.on('error', e => console.log(e));
		proxySocket.write(head);
		proxySocket.pipe(cltSocket);
		cltSocket.pipe(proxySocket);
	});
	proxySocket.on('error', (e) => {
		console.log(colors.red(e));
	});
	return proxySocket;
}
