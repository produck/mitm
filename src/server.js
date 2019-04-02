const http = require('http');
const https = require('https');
const lruCache = require('lru-cache');

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

	fetch(host, port) {
		const serverName = `${host}:${port}`;
		const existedServer = this.cache.get(serverName);
	
		if (existedServer) {
			return existedServer;
		}
		
		const server = https.createServer({
			key: '',
			cert: ''
		});

		server.on('upgrade', this.strategy.handler.upgrade);
		server.on('request', this.strategy.handler.request);
		
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

		this.strategy = strategy;

		server.on('connect', strategy.ConnectHandler(shadowStore));
		server.on('upgrade', strategy.handler.upgrade);
		server.on('request', strategy.handler.request);

	}

	listen(port) {
		this.server.listen(port);
	}

	close() {
		this.server.close();
		this.shadowStore.destory();
	}
}