const http = require('http');
const https = require('https');

const DEFAULT_REQUEST_TIMEOUT = 2 * 60 * 1000;

function mergeRequestOptions(clientRequest, target) {
	const url = new URL(target ?
		`${target.protocol}//${target.hostname}:${target.port}${clientRequest.url}` :
		clientRequest.url);

	return {
		method: clientRequest.method,
		protocol: url.protocol,
		host: url.hostname,
		port: url.port,
		path: url.pathname + url.search,
		headers: clientRequest.headers,
		timeout: DEFAULT_REQUEST_TIMEOUT,
	}
}

module.exports = function createUpgradeHandlerFactory() {
	return function upgradeHandlerFactory(target) {
		return function upgradeHandler(clientRequest, socket, head) {
			const requestOptions = mergeRequestOptions(clientRequest, target);

			const isHTTPS = requestOptions.protocol === 'https:';
			const proxyRequest = (isHTTPS ? https : http).request(requestOptions);

			proxyRequest.on('error', (e) => {
				console.error(e);
			});

			proxyRequest.on('response', proxyResponse => {
				// if upgrade event isn't going to happen, close the socket
				if (!proxyResponse.upgrade) {
					socket.end();
				}
			});

			proxyRequest.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
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

				socket.write(
					Object.keys(proxyRes.headers).reduce(function (head, key) {
						var value = proxyRes.headers[key];

						if (!Array.isArray(value)) {
							head.push(key + ': ' + value);
							return head;
						}

						for (var i = 0; i < value.length; i++) {
							head.push(key + ': ' + value[i]);
						}
						return head;
					}, ['HTTP/1.1 101 Switching Protocols'])
						.join('\r\n') + '\r\n\r\n'
				);

				proxySocket.pipe(socket).pipe(proxySocket);

			});
			proxyRequest.end();
		};
	}
}