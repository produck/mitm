const http = require('http');
const https = require('https');
const tls = require('tls');
const lruCache = require('lru-cache');
const CertificateStore = require('./certificate/store');

const DEFAULT_LENGTH = 100;

class ShadowStore {
	constructor(mitmServer, length = DEFAULT_LENGTH) {
		this.mitmServer = mitmServer;
		this.cache = new lruCache({
			max: length,
			dispose(_, shadow) {
				shadow.close();
			}
		});
	}

	get strategy() {
		return this.mitmServer.strategy;
	}

	fetch(hostname, port) {
		const { certificateStore } = this.mitmServer;
		const serverName = `${hostname}:${port}`;
		const existedServer = this.cache.get(serverName);

		if (existedServer) {
			return existedServer;
		}

		const certKeyPair = certificateStore.fetch(hostname);
		const server = https.createServer({
			key: certKeyPair.privateKey,
			cert: certKeyPair.certificate,
			SNICallback(hostname, cb) {
				const certKeyPair = certificateStore.fetch(hostname);

				cb(null, tls.createSecureContext({
					key: certKeyPair.privateKey,
					cert: certKeyPair.certificate
				}));
			}
		});

		server.on('upgrade', this.strategy.handler.upgrade);
		server.on('request', this.strategy.RequestHandler({ hostname, port }));
		server.listen();

		this.cache.set(serverName, server);

		return server;
	}

	destory() {
		this.cache.reset();
	}
}

module.exports = class MitmServer {
	constructor(strategy, options) {
		const server = this.server = http.createServer();
		const shadowStore = this.shadowStore =
			new ShadowStore(this/* ,options.shadow.length */);

		this.certificateStore = new CertificateStore(options.ssl.cert, options.ssl.key);
		this.strategy = strategy;

		server.on('connect', strategy.ConnectHandler(shadowStore));
		server.on('upgrade', strategy.handler.upgrade);
		server.on('request', strategy.RequestHandler());
	}

	listen(port) {
		this.server.listen(port);
	}

	close() {
		this.server.close();
		this.shadowStore.destory();
	}
}