const http = require('http');
const https = require('https');
const getReadableData = require('./util/get-readable-data');

function mergeRequestOptions(clientRequest, httpsTarget) {
	const url = new URL(httpsTarget ?
		`https://${httpsTarget.hostname}:${httpsTarget.port}${clientRequest.url}` :
		clientRequest.url);

	return {
		method: clientRequest.method,
		protocal: url.protocol,
		host: url.hostname,
		port: url.port,
		path: url.pathname,
		headers: clientRequest.headers
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

			const proxyRequest = ctx.proxyRequest = (httpsTarget ? https : http).request(ctx.options.request);

			await new Promise((resolve, reject) => {
				proxyRequest.on('response', async proxyResponse => {
					ctx.proxyResponse = proxyResponse;
					ctx.options.response.statusCode = proxyResponse.statusCode;
					ctx.options.response.statusMessage = proxyResponse.statusMessage;
					ctx.options.response.headers = proxyResponse.headers;

					await responseInterceptor(ctx);

					if (!proxyResponse.readableFlowing && ctx.responseBody === null) {
						ctx.responseBody = await getReadableData(proxyResponse);
					}

					resolve();
				});

				proxyRequest.on('timeout', () => reject('timeout'));
				proxyRequest.on('error', error => reject(error));
				proxyRequest.on('aborted', () => {
					reject('server aborted request');
					clientRequest.abort();
				});

				clientRequest.on('aborted', () => proxyRequest.abort());

				proxyRequest.end(ctx.requestBody);
			});

			clientResponse.statusCode = ctx.options.response.statusCode;
			clientResponse.statusMessage = ctx.options.response.statusMessage;
			Object.keys(ctx.options.response.headers).forEach(key => clientResponse.setHeader(key, ctx.options.response.headers[key]));
			clientResponse.end(ctx.responseBody);
		}
	}
}