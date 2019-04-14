const http = require('http');
const https = require('https');
const Context = require('./context');

const CONTENT_LENGTH_REGEXP = /content-length/i;

function deleteContentLength(headers) {
	Object.keys(headers).forEach(key => {
		if (CONTENT_LENGTH_REGEXP.test(key)) {
			delete headers[key];
		}
	});
}

module.exports = function createRequestHandlerFactory(requestInterceptor, responseInterceptor) {
	return function RequestHandlerFactory(shadow) {
		return async function RequestHandler(clientRequest, clientResponse) {
			const context = new Context(clientRequest, shadow);

			function respond() {
				context.sendResponse(clientResponse);
			}

			await requestInterceptor(context, respond, function forward() {
				if (context.requestBodyReplaced) {
					deleteContentLength(context.request.options.headers);
				}

				const schemaInterface = shadow && shadow.isTls ? https : http;
				const proxyRequest = schemaInterface.request(context.request.options);

				proxyRequest.on('aborted', () => clientRequest.abort());
				clientRequest.on('aborted', () => proxyRequest.abort());

				proxyRequest.on('timeout', () => { });
				proxyRequest.on('error', error => { });
				proxyRequest.on('response', async proxyResponse => {
					const { statusCode, statusMessage, headers } = proxyResponse;

					context.setResponse({ statusCode, statusMessage, headers, body: proxyResponse });
					await responseInterceptor(context, respond);

					if (context.responseBodyReplaced) {
						deleteContentLength(context.response.headers);
					}
				});

				context.sendRequest(proxyRequest);
			});
		}
	}
}