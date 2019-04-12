const Shadow = require('.');
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

	fetch(protocol, hostname, port) {
		const shadowName = `${protocol}//${hostname}:${port}`;
		const existed = this.cache.get(shadowName);

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

		this.cache.set(shadowName, shadow);

		return shadow;
	}

	destory() {
		this.cache.reset();
	}
}