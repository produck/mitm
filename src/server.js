const http = require('http');
const lruCache = require('lru-cache');

const DEFAULT_LENGTH = 100;

class ShadowRegistry {
	constructor(length = DEFAULT_LENGTH) {
		this.cache = new lruCache({
			max: length,
			dispose(_, shadow) {
				shadow.close();
			}
		});
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
		})
		
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
			new ShadowRegistry(/* options.shadow.length */);

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