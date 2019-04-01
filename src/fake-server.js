const https = require('https');
const lruCache = require('lru-cache');

const registry = new lruCache({
	max: 100,
	dispose(serverName, fakeServer) {
		fakeServer.close();
	}
});

exports.fetch = function fetchFakeServer(host, port) {
	const serverName = `${host}:${port}`;
	const existedServer = registry.get(serverName);

	if (existedServer) {
		return existedServer;
	}
	
	const server = https.createServer({
		key: '',
		cert: ''
	})
	
	registry.set(serverName, server);

	return server;
};