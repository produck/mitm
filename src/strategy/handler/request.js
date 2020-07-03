const Context = require('./context');

const CONTENT_LENGTH_REGEXP = /content-length/i;

function deleteContentLength(headers) {
	Object.keys(headers).forEach(key => {
		if (CONTENT_LENGTH_REGEXP.test(key)) {
			delete headers[key];
		}
	});
}

function sendPayload(origin, target) {
	if (origin.readable && origin.pipe && typeof origin.pipe === 'function') {
		origin.pipe(target);
	} else {
		target.end(origin);
	}
}

module.exports = function createRequestHandlerFactory(requestInterceptor, responseInterceptor, onError) {
	return function RequestHandlerFactory(shadow) {
		return async function RequestHandler(clientRequest, clientResponse) {
			const raw = Context.Raw(clientRequest, shadow);
			const contextInterface = Context.Interface(raw);

			function respond() {
				if (raw.response.payload.changed) {
					deleteContentLength(raw.response.headers);
				}

				clientResponse.statusCode = raw.response.statusCode;
				clientResponse.statusMessage = raw.response.statusMessage;

				Object.keys(raw.response.headers).forEach(key => {
					clientResponse.setHeader(key, raw.response.headers[key]);
				});

				sendPayload(raw.response.payload.body, clientResponse);
			}

			await requestInterceptor(contextInterface, respond, function forward() {
				if (raw.request.payload.changed) {
					deleteContentLength(raw.request.headers);
				}

				const proxyRequest = shadow.request(raw.request);

				proxyRequest.once('aborted', () => clientRequest.abort());
				clientRequest.once('aborted', () => proxyRequest.abort());

				proxyRequest.on('timeout', e => onError('timeout', e.message));
				proxyRequest.on('error', e => onError('error', e.message));

				proxyRequest.once('response', async proxyResponse => {
					const { statusCode, statusMessage, headers } = proxyResponse;

					raw.response.statusCode = statusCode;
					raw.response.statusMessage = statusMessage;
					raw.response.headers = headers;
					raw.response.payload.body = proxyResponse;

					await responseInterceptor(contextInterface, respond);
				});

				sendPayload(raw.request.payload.body, proxyRequest);
			});
		}
	}
}