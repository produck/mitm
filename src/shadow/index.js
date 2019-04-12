const http = require('http');
const https = require('https');
const tls = require('tls');

class Shadow {
	constructor(hostname, port, mitmServer) {
		this.hostname = hostname;
		this.port = port;
		this.mitmServer = mitmServer;
	}
}

exports.http = class HttpShadow extends Shadow {
	constructor(hostname, port, mitmServer) {
		super(hostname, port, mitmServer);

		const server = this.$server = http.createServer();

		const { strategy } = mitmServer;

		server.on('upgrade', strategy.UpgradeHandler({ protocol: 'http:', hostname, port }));
		server.listen();

		this.address = server.address();
	}

	close() {
		this.$server.close();
	}
};

exports.https = class HttpsShadow extends Shadow {
	constructor(hostname, port, mitmServer, certKeyPair) {
		super(hostname, port, mitmServer);

		const server = this.$server = https.createServer({
			key: certKeyPair.privateKey,
			cert: certKeyPair.certificate,
			SNICallback(hostname, cb) {
				const certKeyPair = mitmServer.certificateStore.fetch(hostname);

				cb(null, tls.createSecureContext({
					key: certKeyPair.privateKey,
					cert: certKeyPair.certificate
				}));
			}
		});

		const { strategy } = mitmServer;

		server.on('upgrade', strategy.UpgradeHandler({ protocol: 'https:', hostname, port }));
		server.on('request', strategy.RequestHandler({ protocol: 'https:', hostname, port }));
		server.listen();

		this.address = server.address();
	}

	close() {
		this.$server.close();
	}
};