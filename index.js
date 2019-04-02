global.config = {
	ssl: null
};

exports.Server = require('./src/server');
exports.Strategy = require('./src/strategy');

const DEFAULT_SSL_TIMEOUT = 1000;

exports.setSSLOptions = function ({
	key,
	cert,
	path,
	timeout = DEFAULT_SSL_TIMEOUT,
}) {
	global.config.ssl.key = key;
	global.config.ssl.cert = cert;
	global.config.ssl.path = path;
	global.config.ssl.timeout = timeout;
};