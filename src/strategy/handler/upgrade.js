const http = require('http');
const https = require('https');

const DEFAULT_REQUEST_TIMEOUT = 2 * 60 * 1000;

module.exports = function createUpgradeHandlerFactory() {
	return function upgradeHandlerFactory(shadow) {
		return function upgradeHandler(clientRequest, socket, head) {
			const target = new URL(clientRequest.url, shadow.origin);

			const proxyRequest = (shadow.isTls ? https : http).request({
				method: clientRequest.method,
				protocol: target.protocol,
				host: target.hostname,
				port: target.port,
				path: target.pathname + target.search,
				headers: clientRequest.headers,
				timeout: DEFAULT_REQUEST_TIMEOUT,
			});

			proxyRequest.on('error', (e) => {
				console.error(e);
			});

			proxyRequest.on('response', proxyResponse => {
				// if upgrade event isn't going to happen, close the socket
				if (!proxyResponse.upgrade) {
					socket.end();
				}
			});

			proxyRequest.on('upgrade', (proxyResponse, proxySocket, proxyHead) => {
				proxySocket.on('error', (error) => {
					console.error(error);
				});

				socket.on('error', function () {
					proxySocket.end();
				});

				proxySocket.setTimeout(0);
				proxySocket.setNoDelay(true);

				proxySocket.setKeepAlive(true, 0);

				if (proxyHead && proxyHead.length) proxySocket.unshift(proxyHead);

				socket.write(Object.keys(proxyResponse.headers).reduce(function (head, key) {
					const value = proxyResponse.headers[key];

					if (Array.isArray(value)) {
						value.forEach(value => head.push(`${key}: ${value}`));
					} else {
						head.push(`${key}: ${value}`);
					}

					return head;
				}, ['HTTP/1.1 101 Switching Protocols']).join('\r\n') + '\r\n\r\n');

				proxySocket.pipe(socket).pipe(proxySocket);

			});
			proxyRequest.end();
		};
	}
}