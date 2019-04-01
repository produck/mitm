const url = require('url');

module.exports = function getRequestOptions(request) {
	const { protocol, hostname, port, path } = url.parse(request.url);
	
	return {
		method: request.method,
		protocol,
		hostname,
		port,
		path,
		headers: request.headers
	};
}