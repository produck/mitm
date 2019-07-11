const http = require('http');
const https = require('https');
const tls = require('tls');
const store = {};

module.exports = function (mitmServer) {

	class Shadow {
		constructor(hostname, port, shadowServer, isSecure) {
			this.hostname = hostname;
			this.port = port;
			this.$server = shadowServer;
			this.address = null;
			this.isSecure = isSecure;
			this.socketPath = isSecure ? mitmServer.getSocketPath('https:', hostname, port) : mitmServer.getSocketPath('http:', hostname, port);

			this.$server.on('upgrade', mitmServer.strategy.UpgradeHandler(this, mitmServer));
			this.$server.on('request', mitmServer.strategy.RequestHandler(this, mitmServer));
			this.init();
		}

		get origin() {
			return `${this.isSecure ? 'https' : 'http'}://${this.hostname}:${this.port}`;
		}

		init() {
			this.$server.listen(this.socketPath);
			this.address = this.$server.address();
		}

		close() {
			this.$server.close();
		}
	}

	return {
		async fetch(protocol, hostname, port) {
			const shadowName = `${protocol}//${hostname}:${port}`;
			const existed = store[shadowName];

			if (existed) {
				return existed;
			}

			const certKeyPair = await mitmServer.certificate.fetch(hostname);

			let shadow = null;

			if (protocol === 'https') {
				shadow = new Shadow(hostname, port, https.createServer({
					key: certKeyPair.privateKey,
					cert: certKeyPair.certificate,
					SNICallback(hostname, cb) {
						const certKeyPair = mitmServer.certificate.store.fetch(hostname);

						cb(null, tls.createSecureContext({
							key: certKeyPair.privateKey,
							cert: certKeyPair.certificate
						}));
					}
				}), true);
			} else {
				shadow = new Shadow(hostname, port, http.createServer(), false);
			}

			store[shadowName] = shadow;

			return shadow;
		}
	}
}