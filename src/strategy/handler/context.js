const { isReadable, isPlainObject } = require('./utils');

const DEFAULT_REQUEST_TIMEOUT = 2 * 60 * 1000;

class RequestContext {
	constructor(context) {
		this.$context = context;
	}

	get method() {
		return this.$context.$request.options.method;
	}

	set method(any) {
		this.$context.$request.options.method = String(any).toUpperCase();
	}

	get url() {
		return this.$context.$request.options.url;
	}

	set url(any) {
		if (any instanceof URL) {
			this.$context.$request.options.url = any;
			return any;
		}

		try {
			this.$context.$request.options.url = new URL(any);
		} catch (error) {
			throw error;
		}
	}

	get protocol() {
		return this.url.protocol;
	}

	set protocol(any) {
		if (typeof any !== 'string') {
			throw new Error('`protocol` MUST be a STRING.');
		}

		if (any !== 'http:' && any !== 'https:') {
			throw new Error('`protocol` MUST be `http:` or `https:`.');
		}

		this.url.protocol = any;
	}

	get host() {
		return this.url.host;
	}

	set host(any) {
		this.url.host = any;
	}

	get port() {
		return this.url.port;
	}

	set port(any) {
		this.url.port = any;
	}

	get path() {
		return this.url.pathname + this.search;
	}

	get pathname() {
		return this.url.pathname;
	}

	set pathname(any) {
		this.url.pathname = any;
	}

	get search() {
		return this.url.search;
	}

	set search(any) {
		this.url.search = any;
	}

	get headers() {
		return this.$context.$request.options.headers;
	}

	set headers(any) {
		if (isPlainObject(any)) {
			this.$context.$request.options.headers = any;
		} else {
			throw new Error('`headers` MUST be a plainObject.')
		}
	}

	get body() {
		return this.$context.$request.body;
	}

	set body(any) {
		this.$context.$requestBodyReplaced = true;

		if (isReadable(any)) {
			this.$context.$request.body = any;
			return any;
		}

		try {
			this.$context.$request.body = Buffer.from(any);
		} catch (error) {
			throw error;
		}
	}

	get timeout() {
		return this.$context.$request.options.timeout;
	}

	set timeout(any) {
		this.$context.$request.options.timeout = Number(any);
	}

	get options() {
		return {
			method: this.method,
			url: this.url,
			protocol: this.protocol,
			host: this.host,
			port: this.port,
			path: this.path,
			headers: this.headers,
			timeout: this.timeout
		}
	}

	get isTls() {
		return this.protocol === 'https:';
	}
}

class ResponseContext {
	constructor(context) {
		this.$context = context;
	}

	get statusCode() {
		return this.$context.$response.statusCode;
	}

	set statusCode(any) {
		this.$context.$response.statusCode = Number(any);
	}

	get statusMessage() {
		return this.$context.$response.statusMessage;
	}

	set statusMessage(any) {
		this.$context.$response.statusMessage = String(any);
	}

	get headers() {
		return this.$context.$response.headers;
	}

	set headers(any) {
		if (isPlainObject(any)) {
			this.$context.$response.headers = any;
		} else {
			throw new Error('`headers` MUST be a plainObject.')
		}
	}

	get body() {
		return this.$context.$response.body;
	}

	set body(any) {
		this.$context.responseBodyReplaced = true;

		if (isReadable(any)) {
			this.$context.$response.body = any;
			return;
		}

		try {
			this.$context.$response.body = Buffer.from(any);
		} catch (error) {
			throw error;
		}
	}

	$fillEmptyContext({ statusCode, statusMessage, headers, body }) {
		this.statusCode = statusCode;
		this.statusMessage = statusMessage;
		this.headers = headers;
		this.body = body;
	}
}

module.exports = class Context {
	constructor(clientRequest, shadow) {
		const target = new URL(clientRequest.url, shadow && shadow.origin);

		this.requestBodyReplaced = false;
		this.responseBodyReplaced = false;

		this.$request = {
			options: {
				method: clientRequest.method,
				url: target,
				headers: clientRequest.headers,
				timeout: DEFAULT_REQUEST_TIMEOUT,
			},
			body: clientRequest
		};

		this.$response = {
			statusCode: null,
			statusMessage: null,
			headers: null,
			body: null
		};

		this.request = new RequestContext(this);
		this.response = new ResponseContext(this);
	}
}