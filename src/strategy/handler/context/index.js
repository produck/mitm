const ContextRequest = require('./request');
const ContextResponse = require('./response');
const http = require('http');
const https = require('https');

const DEFAULT_REQUEST_TIMEOUT = 2 * 60 * 1000;

exports.Interface = function ContextInterface(raw) {
	return {
		request: ContextRequest.Interface(raw.request),
		response: ContextResponse.Interface(raw.response),
	};
};

function Options(requestRaw) {
	const { url } = requestRaw;

	// if (requestRaw.method === 'OPTIONS') {
	// 	debugger;
	// }

	return {
		protocol: url.protocol,
		host: url.host,
		port: url.port,
		path: url.pathname + url.search,
		headers: requestRaw.headers,
		timeout: requestRaw.timeout
	};
}

exports.ForwardRequest = function request(raw) {
	return (raw.request.url.protocol === 'http:' ? http : https).request(Options(raw.request));
};

exports.Raw = function Raw(clientRequest, shadow) {
	return {
		request: {
			url: new URL(clientRequest.url, shadow && shadow.origin),
			method: clientRequest.method,
			headers: clientRequest.headers,
			payload: {
				body: clientRequest,
				changed: false
			},
			timeout: DEFAULT_REQUEST_TIMEOUT
		},
		response: {
			statusCode: null,
			statusMessage: null,
			headers: null,
			payload: {
				body: null,
				changed: false
			}
		}
	};
};