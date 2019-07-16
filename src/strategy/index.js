const HandlerFactory = {
	Request: require('./handler/request'),
	Upgrade: require('./handler/upgrade')
};

exports.createStrategy = function createStrategy(interceptorOptions) {
	const { sslConnect, websocket, request, response } = interceptorOptions;

	return {
		sslConnectInterceptor: sslConnect,
		RequestHandler: HandlerFactory.Request(request, response),
		UpgradeHandler: HandlerFactory.Upgrade(websocket)
	}
}