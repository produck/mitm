const EventEmitter = require('events');
const http = require('http');
const CertificateStore = require('./certificate/store');
const ShadowStore = require('./shadow');

const DEV_CERT = require('./dev-cert');

module.exports = class MitmServer extends EventEmitter {
	constructor(strategy, options) {
		super();

		if (!options) {
			options = {};
		}

		if (!options.ssl) {
			options.ssl = DEV_CERT;
		}

		const server = this.server = http.createServer();
		const shadowStore = this.shadowStore =
			new ShadowStore(this/* ,options.shadow.length */);

		this.certificateStore = new CertificateStore(options.ssl.cert, options.ssl.key);
		this.strategy = strategy;

		server.keepAliveTimeout = 0;

		server.on('connect', strategy.ConnectHandler(shadowStore));
		server.on('upgrade', strategy.UpgradeHandler());
		server.on('request', strategy.RequestHandler());
	}

	listen(port) {
		this.server.listen(port);
		this.emit('listening', this);
	}

	close() {
		this.server.close();
		this.shadowStore.destory();
	}
}