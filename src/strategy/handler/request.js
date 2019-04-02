const http = require('http');
const https = require('https');
const errorHandler = require('./util/error');
const getReadableData = require('./util/get-readable-data');
const getRequestOptions = require('./util/get-request-options');

module.exports = function createRequestHandler(requestInterceptor, responseInterceptor) {
	return async function RequestHandler(clientRequest, clientResponse) {
		const ctx = {
			clientRequest,
			clientResponse,
			requestBody: null,
			proxyRequest: null,
			proxyResponse: null,
			responseBody: null,
			status: null,
			options: {
				request: getRequestOptions(clientRequest),
				response: {}
			}
		};

		await requestInterceptor(ctx);

		if (!clientRequest.readableFlowing && ctx.requestBody === null) {
			ctx.requestBody = await getReadableData(clientRequest);
		}
		
		const proxyRequest = ctx.proxyRequest = http.request(ctx.options.request);

		await new Promise((resolve, reject) => {
			proxyRequest.on('response', async proxyResponse => {
				ctx.proxyResponse = proxyResponse;
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

			clientRequest.on('aborted', () => proxyRequest.abort())

			proxyRequest.end(ctx.requestBody);
		});

		clientResponse.end(ctx.responseBody);
	}
}