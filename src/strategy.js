module.exports = class Strategy {
	constructor({
		sslConnect = Strategy.DEFAULT_SSL_CONNECT,
		request = Strategy.DEFAULT_REQUEST,
		response = Strategy.DEFAULT_RESPONSE
	}) {
		this.interceptor = { sslConnect, request, response };

		this.config = {};
	}

	config(options) {
		this.config = options;
	}

	static DEFAULT_SSL_CONNECT() {
		return false;
	}

	static DEFAULT_REQUEST() {
		return;
	}

	static DEFAULT_RESPONSE() {
		return;
	}

	static create(interceptorOptions) {
		return new this(interceptorOptions);
	}
};