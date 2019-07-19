const DEFAULT_REQUEST_TIMEOUT = 2 * 60 * 1000;

module.exports = function createUpgradeHandlerFactory(websocketInterceptor) {
	return function upgradeHandlerFactory(shadow, onError) {
		return function upgradeHandler(clientRequest, clientSocket, head) {
			const target = new URL(clientRequest.url, shadow.origin);

			const proxyRequest = shadow.request({
				url: target,
				method: clientRequest.method,
				headers: clientRequest.headers,
				timeout: DEFAULT_REQUEST_TIMEOUT,
			});

			proxyRequest.on('error', (e) => {
				onError(e, e.message);
			});

			proxyRequest.on('response', proxyResponse => {
				// if upgrade event isn't going to happen, close the socket
				if (!proxyResponse.upgrade) {
					clientSocket.end();
				}
			});

			proxyRequest.on('upgrade', (proxyResponse, proxySocket, proxyHead) => {
				proxySocket.on('error', e => {
					onError('upgrade', e.message);
				});

				clientSocket.on('error', e => {
					proxySocket.end();
					onError('upgrade', e.message);
				});

				proxySocket.setTimeout(0);
				proxySocket.setNoDelay(true);

				proxySocket.setKeepAlive(true, 0);

				if (proxyHead && proxyHead.length) proxySocket.unshift(proxyHead);

				clientSocket.write(Object.keys(proxyResponse.headers).reduce(function (head, key) {
					const value = proxyResponse.headers[key];

					if (Array.isArray(value)) {
						value.forEach(value => head.push(`${key}: ${value}`));
					} else {
						head.push(`${key}: ${value}`);
					}

					return head;
				}, ['HTTP/1.1 101 Switching Protocols']).join('\r\n') + '\r\n\r\n');

				websocketInterceptor(clientSocket, proxySocket);
			});

			proxyRequest.end();
		};
	}
}