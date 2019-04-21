const utils = require('../utils');
const _ = require('lodash');

module.exports = class RequestContext {
	constructor(context) {
		this.$context = context;
	}

	get method() {
		return this.$context.raw.request.method;
	}

	set method(any) {
		if (!_.isString(any)) {
			throw new Error('`request.method` MUST be a string.');
		}

		if (!utils.isValidMethod(any)) {
			throw new Error('Invalid method string.');
		}

		this.$context.raw.request.method = any.toUpperCase();
	}

	get url() {
		return this.$context.raw.request.url;
	}

	set url(any) {
		this.$context.raw.request.url = new URL(any);
	}

	get headers() {
		return this.$context.raw.request.headers;
	}

	set headers(any) {
		if (_.isPlainObject(any)) {
			this.$context.raw.request.headers = any;
		} else {
			throw new Error('`headers` MUST be a plainObject.')
		}
	}

	get body() {
		return this.$context.raw.request.payload.body;
	}

	set body(any) {
		this.$context.raw.request.payload.changed = true;

		return this.$context.raw.request.payload.body =
			utils.isReadable(any) ? any : Buffer.from(any);
	}

	get timeout() {
		return this.$context.$request.options.timeout;
	}

	set timeout(any) {
		this.$context.$request.options.timeout = Number(any);
	}
}
