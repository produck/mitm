const HandlerFactory = {
	Request: require('./handler/request'),
	Upgrade: require('./handler/upgrade')
};

module.exports = class Strategy {
	constructor(interceptorOptions) {
		const { sslConnect, websocket, request, response } = interceptorOptions;

		this.sslConnectInterceptor = sslConnect;

		this.RequestHandler = HandlerFactory.Request(request, response);
		this.UpgradeHandler = HandlerFactory.Upgrade(websocket);
	}

	static isStrategy(any) {
		return any instanceof this;
	}

	static DEFAULT_SSL_CONNECT() {
		return false;
	}

	static DEFAULT_WEBSOCKET(clientSocket, proxySocket) {
		clientSocket.pipe(proxySocket);
		proxySocket.pipe(clientSocket);
	}

	static DEFAULT_REQUEST(context, respond, forward) {
		forward();
	}

	static DEFAULT_RESPONSE(context, respond) {
		respond();
	}

	static create({
		sslConnect = this.DEFAULT_SSL_CONNECT,
		websocket = this.DEFAULT_WEBSOCKET,
		request = this.DEFAULT_REQUEST,
		response = this.DEFAULT_RESPONSE
	}) {
		return new this({ sslConnect, websocket, request, response });
	}
};