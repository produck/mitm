const http = require('http');
const https = require('https');
const tls = require('tls');
const EventEmitter = require('events');
const platform = require('os').platform();
const path = require('path');

exports.Store = function (options) {
	const store = {};

	const { strategy, socket, certificate, onError } = options;

	function Shadow(hostname, port, protocol, shadowServer) {
		const socketPath = getSocketPath(protocol, hostname, port);
		const eventEmitter = Object.create(EventEmitter.prototype);

		const result = Object.assign(eventEmitter, {
			hostname, port, socketPath, protocol, address: null,
			origin() {
				return `${protocol === 'http:' ? 'http' : 'https'}://${this.hostname}:${this.port}`;
			},
			request(requestOptions) {
				return (protocol === 'http:' ? http : https).request(requestOptions.url, {
					method: requestOptions.method,
					headers: requestOptions.headers,
					timeout: requestOptions.timeout
				});
			}
		});

		Promise.resolve(shadowServer()).then(server => {
			server.on('upgrade', strategy.UpgradeHandler(result, onError));
			server.on('request', strategy.RequestHandler(result, onError));
			server.listen(socketPath);

			result.address = server.address();
			result.emit('ready');
		});


		return result;
	}

	function getSocketPath(protocol, hostname, port) {
		const socketPath = path.resolve(socket.path, socket.getName(protocol, hostname, port));

		return platform === 'win32' ? path.join('\\\\?\\pipe', socketPath) : socketPath;
	}


	return {
		fetch(protocol, hostname, port) {
			const shadowName = `${protocol}//${hostname}:${port}`;
			const existed = store[shadowName];

			if (existed) {
				return existed;
			}

			return store[shadowName] = {
				https() {

					return Shadow(hostname, port, protocol, async function () {
						const certKeyPair = await certificate.fetch(hostname);

						return https.createServer({
							key: certKeyPair.privateKey,
							cert: certKeyPair.certificate,
							SNICallback(hostname, cb) {
								cb(null, tls.createSecureContext({
									key: certKeyPair.privateKey,
									cert: certKeyPair.certificate
								}));
							}
						})
					});
				},
				http() {
					return Shadow(hostname, port, protocol, function () {
						return http.createServer();
					});
				}
			}[protocol.replace(/:$/, '')]();
		}
	}
}