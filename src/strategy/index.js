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
};