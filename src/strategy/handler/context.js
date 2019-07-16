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

			return requestRaw.method = any.toUpperCase();
		},
		
		get url() {
			return requestRaw.url;
		},

		set url(any) {
			return requestRaw.url = new URL(any);
		},

		get headers() {
			return requestRaw.headers;
		},

		set headers(any) {
			if (typeof any === 'object') {
				return requestRaw.headers = any;
			}

			throw new Error('`headers` MUST be a plainObject.');
		},

		get body() {
			return requestRaw.payload.body;
		},

		set body(any) {
			requestRaw.payload.changed = true;

			return requestRaw.payload.body = 
				isReadable(any) ? any : Buffer.from(any);
		},

		get timeout() {
			return requestRaw.timeout;
		},

		set timeout(any) {
			if (typeof any === 'number') {
				return requestRaw.timeout = Number(any);
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
			if(typeof any === 'number') {
				return responseRaw.statusCode = any;
			}
		},
		
		get statusMessage() {
			return responseRaw.statusMessage;
		},

		set statusMessage(any) {
			if (typeof any === 'string') {
				return responseRaw.statusMessage = any;
			}
			
			throw new Error('Status message MUST be a string.');
		},

		get headers() {
			return responseRaw.headers;
		},

		set headers(any) {
			if (typeof any === 'object') {
				return responseRaw.headers = any;
			}

			throw new Error('`headers` MUST be a plainObject.');
		},

		get body() {
			return responseRaw.payload.body;
		},

		set body(any) {
			responseRaw.payload.changed = true;

			return responseRaw.payload.body = 
				isReadable(any) ? any : Buffer.from(any);
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