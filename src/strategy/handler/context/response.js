const utils = require('../utils');
const _ = require('lodash');

exports.Interface = function ContextResponseInterface(responseRaw) {
	return {
		get statusCode() {
			return responseRaw.statusCode;
		},
		set statusCode(any) {
			if (_.isNumber(any)) {
				return responseRaw.statusCode = any;
			}
			
			throw new Error('Status code MUST be a number.');
		},
		get statusMessage() {
			return responseRaw.statusMessage;
		},
		set statusMessage(any) {
			if (_.isString(any)) {
				return responseRaw.statusMessage = any;
			}
			
			throw new Error('Status message MUST be a string.');
		},
		get headers() {
			return responseRaw.headers;
		},
		set headers(any) {
			if (_.isPlainObject(any)) {
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
				utils.isReadable(any) ? any : Buffer.from(any);
		}
	};
};