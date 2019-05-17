const Shadow = require('.');

module.exports = class ShadowStore {
	constructor(mitmServer) {
		this.mitmServer = mitmServer;
		this.cache = {};
	}

	fetch(protocol, hostname, port) {
		const shadowName = `${protocol}//${hostname}:${port}`;
		const existed = this.cache[shadowName];

		if (existed) {
			return existed;
		}

		const certificateStore = this.mitmServer.certificateStore;
		const certKeyPair = certificateStore.fetch(hostname);

		let shadow = null;

		if (protocol === 'https:') {
			shadow = new Shadow.https(hostname, port, this.mitmServer, certKeyPair);
		} else {
			shadow = new Shadow.http(hostname, port, this.mitmServer);
		}

		this.cache[shadowName] = shadow;

		return shadow;
	}

	destory() {
		this.cache = {};
	}
}