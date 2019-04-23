const utils = require('../utils');
const _ = require('lodash');

exports.Interface = function ContextRequestInterface(requestRaw) {
	return {
		get method() {
			return requestRaw.method;
		},
		set method(any) {
			if (!_.isString(any)) {
				throw new Error('`request.method` MUST be a string.');
			}
	
			if (!utils.isValidMethod(any)) {
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
			if (_.isPlainObject(any)) {
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
				utils.isReadable(any) ? any : Buffer.from(any);
		},
		get timeout() {
			return requestRaw.timeout;
		},
		set timeout(any) {
			if (_.isNumber(any)) {
				return requestRaw.timeout = Number(any);
			}

			throw new Error('`request.timeout` MUST be a number.');
		}
	};
};