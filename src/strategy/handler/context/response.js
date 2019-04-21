const utils = require('../utils');
const _ = require('lodash');

module.exports = class ResponseContext {
	constructor(context) {
		this.$context = context;
	}

	get statusCode() {
		return this.$context.raw.response.statusCode;
	}

	set statusCode(any) {
		if (!_.isNumber(any)) {
			throw new Error('Status code MUST be a number.');
		}

		return this.$context.raw.response.statusCode = any;
	}

	get statusMessage() {
		return this.$context.raw.response.statusMessage;
	}

	set statusMessage(any) {
		if (!_.isString(any)) {
			throw new Error('Status message MUST be a string.');
		}

		return this.$context.raw.response.statusMessage = any;
	}

	get headers() {
		return this.$context.raw.response.headers;
	}

	set headers(any) {
		if (_.isPlainObject(any)) {
			this.$context.raw.response.headers = any;
		} else {
			throw new Error('`headers` MUST be a plainObject.')
		}
	}

	get body() {
		return this.$context.raw.response.payload.body;
	}

	set body(any) {
		this.$context.raw.response.payload.changed = true;

		return this.$context.raw.response.payload.body =
			utils.isReadable(any) ? any : Buffer.from(any);
	}
}