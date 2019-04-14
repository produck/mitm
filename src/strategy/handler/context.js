const DEFAULT_REQUEST_TIMEOUT = 2 * 60 * 1000;

module.exports = class Context {
	constructor(clientRequest, shadow) {
		const target = new URL(clientRequest.url, shadow && shadow.origin);

		this.requestBodyReplaced = false;
		this.responseBodyReplaced = false;

		this.request = {
			options: {
				method: clientRequest.method,
				protocol: target.protocol,
				host: target.hostname,
				port: target.port,
				path: target.pathname + target.search,
				headers: clientRequest.headers,
				timeout: DEFAULT_REQUEST_TIMEOUT,
			},
			body: clientRequest
		};

		this.response = {
			statusCode: null,
			statusMessage: null,
			headers: null,
			body: null
		};
	}

	get requestBody() {
		return this.request.body;
	}

	set requestBody(newBody) {
		this.requestBodyReplaced = true;
		return this.request.body = newBody;
	}

	sendRequest(proxyRequest) {
		if (this.request.body.readable) {
			this.request.body.pipe(proxyRequest);
		} else {
			proxyRequest.end(this.request.body);
		}
	}

	sendResponse(clientResponse) {
		clientResponse.statusCode = this.response.statusCode;
		clientResponse.statusMessage = this.response.statusMessage;

		Object.keys(this.response.headers).forEach(key => {
			clientResponse.setHeader(key, this.response.headers[key]);
		});

		if (this.response.body.readable) {
			this.response.body.pipe(clientResponse);
		} else {
			clientResponse.end(this.response.body);
		}
	}

	get responseBody() {
		return this.response.body;
	}

	set responseBody(newBody) {
		this.responseBodyReplaced = true;
		return this.response.body = newBody;
	}

	setResponse({
		statusCode = this.response.statusCode,
		statusMessage = this.response.statusMessage,
		headers = this.response.headers,
		body = this.response.body
	} = this.response) {
		this.response = { statusCode, statusMessage, headers, body };
	}
}