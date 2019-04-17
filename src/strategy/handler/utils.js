const stream = require('stream');
const objectTag = '[object Object]';
const undefinedTag = '[object Undefined]';
const nullTag = '[object Null]';
const symToStringTag = Symbol.toStringTag;

function overArg(func, transform) {
	return function(arg) {
		return func(transform(arg));
	};
}

const getPrototype = overArg(Object.getPrototypeOf, Object);

function getRawTag(value) {
	const isOwn = hasOwnProperty.call(value, symToStringTag),
			tag = value[symToStringTag];

	let unmasked = false;

	try {
		value[symToStringTag] = undefined;
		unmasked = true;
	} catch (e) {}

	const result = Object.prototype.toString.call(value);
	if (unmasked) {
		if (isOwn) {
			value[symToStringTag] = tag;
		} else {
			delete value[symToStringTag];
		}
	}
	return result;
}

function baseGetTag(value) {
	if (value == null) {
		return value === undefined ? undefinedTag : nullTag;
	}
	return (symToStringTag in Object(value))
		? getRawTag(value)
		: Object.prototype.toString.call(value);
}

function isObjectLike(value) {
	return value != null && typeof value == 'object';
}


exports.isPlainObject = function isPlainObject(value) {
	if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
		return false;
	}
	const proto = getPrototype(value);
	if (proto === null) {
		return true;
	}
	const Ctor = Object.prototype.hasOwnProperty.call(proto, 'constructor') && proto.constructor;
	return typeof Ctor === 'function' && Ctor instanceof Ctor &&
		Function.prototype.toString.call(Ctor) == Function.prototype.toString.call(Object);
}

function isStream(object) {
	return object instanceof stream.Stream;
}

exports.isReadable = function isReadable(object) {
	return isStream(object) && typeof object.pipe === 'function' && typeof object.readable === 'boolean';
}