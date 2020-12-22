const Context = require('./context');
const meta = require('../../../package.json');

const CONTENT_LENGTH_REGEXP = /content-length/i;
const DEFAULT_REQUEST_TIMEOUT = 2 * 60 * 1000;

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

/**
 * @param {import('http').IncomingMessage} clientRequest
 * @param {*} shadow
 */
function Raw(clientRequest, shadow) {
	return {
		request: {
			url: new URL(clientRequest.url, shadow.origin),
			method: clientRequest.method,
			headers: clientRequest.headers,
			payload: {
				body: clientRequest,
				changed: false
			},
			timeout: DEFAULT_REQUEST_TIMEOUT
		},
		response: {
			statusCode: 200,
			statusMessage: undefined,
			headers: {
				'Content-Type': 'text/plain;charset=utf-8',
				'X-Mitm-Proxy-Server': `Mitm@${meta.version}`
			},
			payload: {
				body: 'Mitm Default Response. You may set `context.response.body`.',
				changed: false
			}
		}
	};
}

module.exports = function createRequestHandlerFactory(requestInterceptor, responseInterceptor, onError) {
	return function RequestHandlerFactory(shadow) {
		return async function RequestHandler(clientRequest, clientResponse) {
			const raw = Raw(clientRequest, shadow);
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

				proxyRequest.on('timeout', () => {
					proxyRequest.abort();
					onError('timeout', 'Request timeout & aborted.');
				});

				proxyRequest.on('error', e => {
					onError('proxy::snd', `<${shadow.origin}> - ${e.message}`)
				});

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