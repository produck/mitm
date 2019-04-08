const https = require('https');
const tls = require('tls');
const lruCache = require('lru-cache');

const DEFAULT_LENGTH = 100;

module.exports = class ShadowStore {
	constructor(mitmServer, length = DEFAULT_LENGTH) {
		this.mitmServer = mitmServer;
		this.cache = new lruCache({
			max: length,
			dispose(_, shadow) {
				shadow.close();
			}
		});
	}

	fetch(hostname, port) {
		const serverName = `${hostname}:${port}`;
		const existedServer = this.cache.get(serverName);
		
		if (existedServer) {
			return existedServer;
		}
		
		const certificateStore = this.mitmServer.certificateStore;
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

		const strategy = this.mitmServer.strategy;

		server.on('upgrade', strategy.UpgradeHandler({ hostname, port }));
		server.on('request', strategy.RequestHandler({ hostname, port }));
		server.listen();

		this.cache.set(serverName, server);

		return server;
	}

	destory() {
		this.cache.reset();
	}
}