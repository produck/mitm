const Handler = require('./handler');

module.exports = class Strategy {
	constructor(interceptorOptions) {
		const { sslConnect, request, response } = interceptorOptions;

		this.ConnectHandler = Handler.Connect(sslConnect);
		this.RequestHandler = Handler.Request(request, response);
		this.UpgradeHandler = Handler.Upgrade();

		this.config = {};
	}

	config(options) {
		this.config = options;
	}

	static DEFAULT_SSL_CONNECT() {
		return false;
	}

	static DEFAULT_REQUEST(ctx, forward) {
		forward();
	}

	static DEFAULT_RESPONSE(ctx, respond) {
		respond();
	}

	static create({
		sslConnect = this.DEFAULT_SSL_CONNECT,
		request = this.DEFAULT_REQUEST,
		response = this.DEFAULT_RESPONSE
	}) {

		return new this({ sslConnect, request, response });
	}
};