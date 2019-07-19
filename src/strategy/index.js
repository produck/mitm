const HandlerFactory = {
	Request: require('./handler/request'),
	Upgrade: require('./handler/upgrade')
};

module.exports = function createStrategy(options, onError) {
	const { sslConnect, websocket, request, response } = options;

	return {
		sslConnectInterceptor: sslConnect,
		RequestHandler: HandlerFactory.Request(request, response, onError),
		UpgradeHandler: HandlerFactory.Upgrade(websocket, onError)
	}
}