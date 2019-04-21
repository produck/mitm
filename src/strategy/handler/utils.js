const stream = require('stream');
const methods = require('methods');
const _ = require('lodash');

exports.isReadable = function isReadable(object) {
	return object instanceof stream.Stream ||
		typeof object.pipe === 'function' &&
		typeof object.readable === 'boolean';
};

exports.isValidMethod = function isValidMethod(type) {
	return methods.indexOf(type.toLowerCase()) !== -1;
};