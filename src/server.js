const http = require('http');
const EventEmitter = require('events');
const Strategy = require('./strategy');
const CertificateStore = require('./certificate');
const ShadowStore = require('./shadow');

module.exports = class MitmServer extends EventEmitter {
	constructor(strategy, options) {
		super();

		const { server, certificateStore } = options;

		this.options = options;
		this.server = server;
		this.shadowStore = new ShadowStore(this/* ,options.shadow.length */);

		this.certificateStore = certificateStore;
		this.strategy = strategy;

		server.keepAliveTimeout = 0;

		server.on('connect', strategy.ConnectHandler(this));
		server.on('upgrade', strategy.UpgradeHandler());
		server.on('request', strategy.RequestHandler());
		server.on('close', () => this.shadowStore.destory());
	}

	get isSecure() {
		return Boolean(this.options.ssl);
	}

	static create(strategy, options) {
		if (!Strategy.isStrategy(strategy)) {
			throw new Error('A strategy instant MUST be provided.');
		}

		if (!(options.server instanceof http.Server)) {
			throw new Error('`options.server` MUST be a http.Server.');
		}

		if (options.ssl) {
			if (!options.certificateStore) {
				options.certificateStore = new CertificateStore(options.ssl.cert, options.ssl.key);
			} else if (!CertificateStore.isCertificateStore(options.certificateStore)) {
				throw new Error('`options.certificateStore` MUST be a CertificateStore.')
			}
		}

		if (options.log) {
			if (!(options.log instanceof Function)) {
				throw new Error('`options.log MUST be a Function`');
			}
		} else {
			options.log = () => {};
		}

		return new this(strategy, options);
	}
}