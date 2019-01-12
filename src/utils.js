exports.isGzipEncoding = function isGzipEncoding(response) {
	if (!response.headers['content-encoding']) {
		return false;
	}
	
	return response.headers['content-encoding'].indexOf('gzip') !== -1;
};
