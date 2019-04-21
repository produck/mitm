const RequestContext = require('./request');
const ResponseContext = require('./response');

const DEFAULT_REQUEST_TIMEOUT = 2 * 60 * 1000;

module.exports = class Context {
	constructor(clientRequest, shadow) {
		this.raw = {
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
		}

		this.$request = new RequestContext(this);
		this.$response = new ResponseContext(this);
	}

	get request() {
		return this.$request;
	}

	get response() {
		return this.$response;
	}
}