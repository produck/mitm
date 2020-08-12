const stream = require('stream');
const http = require('http');

const DEFAULT_REQUEST_TIMEOUT = 2 * 60 * 1000;

function isValidMethod(type) {
	return http.METHODS.indexOf(type) !== -1;
}

function isReadable(object) {
	return object instanceof stream.Stream ||
		typeof object.pipe === 'function' &&
		typeof object.readable === 'boolean';
}

function contextRequest(requestRaw) {
	return {
		get method() {
			return requestRaw.method;
		},

		set method(any) {
			if (typeof any !== 'string') {
				throw new Error('`request.method` MUST be a string.');
			}

			if (!isValidMethod(any)) {
				throw new Error('Invalid method string.');
			}

			requestRaw.method = any.toUpperCase();
		},

		get url() {
			return requestRaw.url;
		},

		set url(any) {
			requestRaw.url = new URL(any);
		},

		get headers() {
			return requestRaw.headers;
		},

		set headers(any) {
			if (typeof any === 'object') {
				requestRaw.headers = any;
			}

			throw new Error('`headers` MUST be a plainObject.');
		},

		get body() {
			return requestRaw.payload.body;
		},

		set body(any) {
			requestRaw.payload.changed = true;
			requestRaw.payload.body = isReadable(any) ? any : Buffer.from(any);
		},

		get timeout() {
			return requestRaw.timeout;
		},

		set timeout(any) {
			if (typeof any === 'number') {
				requestRaw.timeout = Number(any);
			}

			throw new Error('`request.timeout` MUST be a number.')
		}
	}
}

function contextResponse(responseRaw) {
	return {
		get statusCode() {
			return responseRaw.statusCode;
		},

		set statusCode(any) {
			if (typeof any !== 'number') {
				throw new TypeError('Status code MUST be a number.');
			}

			responseRaw.statusCode = any;
		},

		get statusMessage() {
			return responseRaw.statusMessage;
		},

		set statusMessage(any) {
			if (typeof any !== 'string') {
				throw new TypeError('Status message MUST be a string.');
			}

			responseRaw.statusMessage = any;
		},

		get headers() {
			return responseRaw.headers;
		},

		set headers(any) {
			if (typeof any !== 'object') {
				throw new TypeError('`headers` MUST be a plainObject.');
			}

			responseRaw.headers = any;
		},

		get body() {
			return responseRaw.payload.body;
		},

		set body(any) {
			responseRaw.payload.changed = true;
			responseRaw.payload.body = isReadable(any) ? any : Buffer.from(any);
		}
	}
}

exports.Interface = function ContextInterface(raw) {
	return {
		request: contextRequest(raw.request),
		response: contextResponse(raw.response),
	};
};

exports.Raw = function Raw(clientRequest, shadow) {
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
			headers: null,
			payload: {
				body: null,
				changed: false
			}
		}
	};
};