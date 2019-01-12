const httpProxy = require('http-proxy');
const http = require('http');
const debug = require('debug')('mitm');
const pako = require('pako');
const utils = require('./src/utils');

module.exports = function MitmHandler({
	requestIncoming,
	requestOutgoing,
	responseIncoming,
	responseOutgoing
} = {}, options = {}) {
	const proxy = httpProxy.createProxyServer(options);
	
	proxy.on('error', error => debug(error.message));


	proxy.on('proxyRes', async (proxyRes, req, res) => {
		const { context } = res;
		context.proxyRes = proxyRes;
		proxyRes.on('error', error => debug(error.message));

		/**
		 * ResponseIncoming
		 */
		if (responseIncoming && responseIncoming(context)) {
			return;
		}

		/**
		 * ResponseOutgoing
		 */
		if (responseOutgoing) {
			res.write = () => {};
			context.resBody = Buffer.from([]);
			
			proxyRes.on('data', data => {
				context.resBody = Buffer.concat([context.resBody, data])
			});

			proxyRes.on('end', async () => {
				res.removeHeader('content-encoding');
				const isGzip = utils.isGzipEncoding(proxyRes);
				const _end = res.end;
				res.end = () => {};

				if (isGzip) {
					context.resBody = pako.ungzip(context.resBody);
				}
				
				let resBody = await responseOutgoing(context);
				
				_end.call(res, resBody);
			});
		}
	});
	
	proxy.on('proxyReq', async (proxyReq, req, res) => {
		/**
		 * RequestOutgoing
		 */
		const { context } = res;
		context.proxyReq = proxyReq;

		if (requestOutgoing) {
			req.write = () => {};
			context.reqBody = Buffer.from([]);
			
			req.on('data', data => {
				context.reqBody = Buffer.concat([context.reqBody, data])
			});

			req.on('end', async () => {
				const _end = proxyReq.end;
				
				proxyReq.end = () => {};
				_end.call(proxyReq, await requestOutgoing(context));
			});
		}
	});
	
	return http.createServer(async (req, res) => {
		/**
		 * RequestIncoming
		 */
		const context = res.context = { req, res };
		
		if (requestIncoming) {
			requestIncoming(context);
		}

		if (!res.finished) {
			proxy.web(req, res, { target: new URL(req.url).origin });
		}
	});
};