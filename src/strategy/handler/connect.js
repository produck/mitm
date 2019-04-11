const net = require('net');

const BODY = 'HTTP/1.1 200 Connection Established\r\nProxy-agent: node-mitmproxy\r\n\r\n';
const LOCAL_IP = '127.0.0.1';
const ORIGIN_REG = /origin:/i;

module.exports = function createConnectHandlerFactory(sslConnectInterceptor) {
	return function ConnectHandlerFactory(mitmServer) {
		return async function connectHandler(clientRequest, socket, head) {
			const [hostname, port] = clientRequest.url.split(':');
			
			socket.write(BODY);

			socket.once('data', async chunk => {
				let proxySocket = null;

				if (ORIGIN_REG.test(chunk.toString())) {
					proxySocket = net.connect(port, hostname);//TODO: man in the socket
				} else {
					if (await sslConnectInterceptor(clientRequest, socket, head) && mitmServer.isSecure) {
						const shadowAddress = mitmServer.shadowStore.fetch(hostname, port).address();

						proxySocket = net.connect(shadowAddress.port, LOCAL_IP);
					} else {
						proxySocket = net.connect(port, hostname);
					}
				}

				proxySocket.on('error', mitmServer.options.log);
				socket.pipe(proxySocket);
				proxySocket.pipe(socket);
				proxySocket.write(chunk);
			});

			socket.on('error', mitmServer.options.log);
		}

	}
};