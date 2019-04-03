const http = require('http');
const getReadableData = require('./util/get-readable-data');

function mergeRequestOptions(clientRequest, httpsTarget) {
	const url = new URL(httpsTarget ?
		`https://${httpsTarget.hostname}:${httpsTarget.port}` :
		clientRequest.url);

	return {
		method: clientRequest.method,
		protocal: url.protocol,
		host: url.hostname,
		port: url.port,
		path: url.path,
		headers: clientRequest.headers
	}
}

module.exports = function createRequestHandler(requestInterceptor, responseInterceptor) {
	return function (target) {
		return async function RequestHandler(clientRequest, clientResponse) {
			const ctx = {
				clientRequest,
				clientResponse,
				requestBody: null,
				proxyRequest: null,
				proxyResponse: null,
				responseBody: null,
				options: {
					request: mergeRequestOptions(clientRequest, target),
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
}