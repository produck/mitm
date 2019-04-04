const http = require('http');
const https = require('https');
const getReadableData = require('./util/get-readable-data');

const DEFAULT_REQUEST_TIMEOUT = 2 * 60 * 1000;

function mergeRequestOptions(clientRequest, httpsTarget) {
	const url = new URL(httpsTarget ?
		`https://${httpsTarget.hostname}:${httpsTarget.port}${clientRequest.url}` :
		clientRequest.url);

	return {
		method: clientRequest.method,
		protocal: url.protocol,
		host: url.hostname,
		port: url.port,
		path: url.pathname + url.search,
		headers: clientRequest.headers,
		timeout: DEFAULT_REQUEST_TIMEOUT,
	}
}

module.exports = function createRequestHandlerFactory(requestInterceptor, responseInterceptor) {
	return function RequestHandlerFactory(httpsTarget) {
		return async function RequestHandler(clientRequest, clientResponse) {
			const ctx = {
				clientRequest,
				clientResponse,
				requestBody: null,
				proxyRequest: null,
				proxyResponse: null,
				responseBody: null,
				options: {
					request: mergeRequestOptions(clientRequest, httpsTarget),
					response: {}
				}
			};

			await requestInterceptor(ctx);

			if (!clientRequest.readableFlowing && ctx.requestBody === null) {
				ctx.requestBody = await getReadableData(clientRequest);
			}
			
			const proxyRequest = ctx.proxyRequest = (ctx.options.request.protocal === 'https:' ? https : http).request(ctx.options.request);

			proxyRequest.on('response', async proxyResponse => {
				delete proxyResponse.headers['content-length'];
				
				ctx.proxyResponse = proxyResponse;
				ctx.options.response.statusCode = proxyResponse.statusCode;
				ctx.options.response.statusMessage = proxyResponse.statusMessage;
				ctx.options.response.headers = proxyResponse.headers;
				ctx.options.response.headers['connection'] = 'close';

				await responseInterceptor(ctx);

				if (!proxyResponse.readableFlowing && ctx.responseBody === null) {
					ctx.responseBody = await getReadableData(proxyResponse);
				}

				clientResponse.statusCode = ctx.options.response.statusCode;
				clientResponse.statusMessage = ctx.options.response.statusMessage;
				Object.keys(ctx.options.response.headers).forEach(key => clientResponse.setHeader(key, ctx.options.response.headers[key]));
				clientResponse.end(ctx.responseBody);
			});

			proxyRequest.on('timeout', () => {});
			proxyRequest.on('error', error => {});
			proxyRequest.on('aborted', () => clientRequest.abort());
			clientRequest.on('aborted', () => proxyRequest.abort());

			proxyRequest.end(ctx.requestBody);
		}
	}
}