const http = require('http');
const https = require('https');
const tls = require('tls');
const EventEmitter = require('events');
const platform = require('os').platform();
const path = require('path');

exports.Store = function (options) {
	const store = {};
	const { strategy, socket, certificate } = options;
	const Server = {
		http() {
			return http.createServer();
		},
		async https(hostname) {
			const certKeyPair = await certificate.fetch(hostname);

			return https.createServer({
				key: certKeyPair.privateKey,
				cert: certKeyPair.certificate,
				SNICallback(_hostname, cb) {
					cb(null, tls.createSecureContext({
						key: certKeyPair.privateKey,
						cert: certKeyPair.certificate
					}));
				}
			})
		}
	};

	function Shadow(protocol, hostname, port) {
		const socketStorePath = path.resolve(socket.path, socket.getName(protocol, hostname, port));
		const agent = { http, https }[protocol];
		const socketPath = platform === 'win32'
			? path.join('\\\\?\\pipe', socketStorePath)
			: socketStorePath;

		const shadow = Object.assign(new EventEmitter(), {
			address: null,
			origin: `${protocol}://${hostname}:${port}`,
			request({ url, method, headers, timeout }) {
				return agent.request(url, { method, headers, timeout });
			}
		});

		Promise.resolve(Server[protocol](hostname)).then(server => {
			server.on('upgrade', strategy.UpgradeHandler(shadow));
			server.on('request', strategy.RequestHandler(shadow));
			server.listen(socketPath);

			shadow.address = server.address();
			shadow.emit('ready');
		});

		return shadow;
	}

	return {
		fetch(protocol, hostname, port) {
			const shadowName = `${protocol}://${hostname}:${port}`;
			const existed = store[shadowName];

			if (existed) {
				return existed;
			}

			return store[shadowName] = Shadow(protocol, hostname, port);
		}
	}
}