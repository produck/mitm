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

function send(origin, target) {
	if (origin.readable && origin.pipe && origin.pipe instanceof Function) {
		origin.pipe(target);
	} else {
		target.end(origin);
	}
}

module.exports = function createRequestHandlerFactory(requestInterceptor, responseInterceptor) {
	return function RequestHandlerFactory(shadow) {
		return async function RequestHandler(clientRequest, clientResponse) {
			const context = new Context(clientRequest, shadow);

			function respond() {
				if (context.responseBodyReplaced) {
					deleteContentLength(context.response.headers);
				}
				
				clientResponse.statusCode = context.response.statusCode;
				clientResponse.statusMessage = context.response.statusMessage;
		
				Object.keys(context.response.headers).forEach(key => {
					clientResponse.setHeader(key, context.response.headers[key]);
				});

				send(context.response.body, clientResponse);
			}

			await requestInterceptor(context, respond, function forward() {
				if (context.requestBodyReplaced) {
					deleteContentLength(context.request.headers);
				}

				const schemaInterface = context.request.isTls ? https : http;
				const proxyRequest = schemaInterface.request(context.request.options);

				proxyRequest.on('aborted', () => clientRequest.abort());
				clientRequest.on('aborted', () => proxyRequest.abort());

				proxyRequest.on('timeout', () => { });
				proxyRequest.on('error', error => { });
				proxyRequest.on('response', async proxyResponse => {
					const { statusCode, statusMessage, headers } = proxyResponse;

					context.response.$fillEmptyContext({ statusCode, statusMessage, headers, body: proxyResponse });
					await responseInterceptor(context, respond);
				});

				send(context.request.body, proxyRequest);
			});
		}
	}
}