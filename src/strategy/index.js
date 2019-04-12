const HandlerFactory = {//TODO: websocket
	Request: require('./handler/request'),
	Upgrade: require('./handler/upgrade')
};

module.exports = class Strategy {
	constructor(interceptorOptions) {
		const { sslConnect, request, response } = interceptorOptions;

		this.sslConnectInterceptor = sslConnect;
		
		this.RequestHandler = HandlerFactory.Request(request, response);
		this.UpgradeHandler = HandlerFactory.Upgrade();

		this.config = {};
	}

	config(options) {
		this.config = options;
	}

	static isStrategy(any) {
		return any instanceof this;
	}

	static DEFAULT_SSL_CONNECT() {
		return false;
	}

	static DEFAULT_REQUEST(context) {
		context.forward();
	}

	static DEFAULT_RESPONSE(context) {
		context.respond();
	}

	static create({
		sslConnect = this.DEFAULT_SSL_CONNECT,
		request = this.DEFAULT_REQUEST,
		response = this.DEFAULT_RESPONSE
	}) {
		return new this({ sslConnect, request, response });
	}
};