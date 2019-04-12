const http = require('http');
const https = require('https');

const DEFAULT_REQUEST_TIMEOUT = 2 * 60 * 1000;

function mergeRequestOptions(clientRequest, connectTarget) {
	const url = new URL(connectTarget ?
		`https://${connectTarget.hostname}:${connectTarget.port}${clientRequest.url}` :
		clientRequest.url);

	return {
		method: clientRequest.method,
		protocol: url.protocol,
		host: url.hostname,
		port: url.port,
		path: url.pathname + url.search,
		headers: clientRequest.headers,
		timeout: DEFAULT_REQUEST_TIMEOUT,
	}
}

class Context {
	constructor(clientRequest, clientResponse, responseInterceptor, connectTarget) {
		this.$clientRequest = clientRequest;
		this.$clientResponse = clientResponse;
		this.$responseInterceptor = responseInterceptor;

		const $request = {
			body: clientRequest,
			bodyChanged: false
		};

		const $response = this.$response =  {
			body: null,
			bodyChanged: false
		};

		this.request = {
			options: mergeRequestOptions(clientRequest, connectTarget),
			get body() {
				return $request.body;
			},
			set body(newBody) {
				$request.bodyChanged = true;// timing of delete header['content-length'], when expect a wrong length or a given length
				$request.body = newBody;
			},
			get bodyChanged() {
				return $request.bodyChanged;
			}
		};

		this.response = {
			statusCode: null,
			statusMessage: null,
			headers: null,
			get body() {
				return $response.body;
			},
			set body(newBody) {
				$response.bodyChanged = true;// timing of delete header['content-length'], when expect a wrong length or a given length
				$response.body = newBody;
			},
			get bodyChanged() {
				return $response.bodyChanged;
			}
		};

		this.schema = this.request.options.protocol === 'https:' ? https : http;
	}

	forward() {
		if (this.request.bodyChanged) {
			delete this.request.options.headers['content-length'];
		}

		const proxyRequest = this.schema.request(this.request.options);

		proxyRequest.on('timeout', () => { });
		proxyRequest.on('error', error => { });
		proxyRequest.on('aborted', () => this.$clientRequest.abort());
		this.$clientRequest.on('aborted', () => proxyRequest.abort());

		proxyRequest.on('response', async proxyResponse => {
			this.response.statusCode = proxyResponse.statusCode;
			this.response.statusMessage = proxyResponse.statusMessage;
			this.response.headers = proxyResponse.headers;
			this.$response.body = proxyResponse;

			await this.$responseInterceptor(this);
		});

		if (this.request.body.readable) {
			this.request.body.pipe(proxyRequest);
		} else {
			proxyRequest.end(this.request.body);
		}
	}

	respond() {
		this.$clientResponse.statusCode = this.response.statusCode;
		this.$clientResponse.statusMessage = this.response.statusMessage;

		if (this.response.bodyChanged) {
			delete this.response.headers['content-length'];
		}

		Object.keys(this.response.headers).forEach(key => {
			this.$clientResponse.setHeader(key, this.response.headers[key]);
		});

		if (this.response.body.readable) {
			this.response.body.pipe(this.$clientResponse);
		} else {
			this.$clientResponse.end(this.response.body);
		}
	}
}

module.exports = function createRequestHandlerFactory(requestInterceptor, responseInterceptor) {
	return function RequestHandlerFactory(target) {
		return async function RequestHandler(clientRequest, clientResponse) {
			await requestInterceptor(new Context(clientRequest, clientResponse, responseInterceptor, target));
		}
	}
}