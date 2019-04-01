const fs = require('fs');

const registry = {};

exports.fetch = function fetchCA(host) {
	const existedCA = registry[host];

	if (existedCA) {
		return existedCA;
	}
	
	const CA = createCA(host);
	
	registry.set(host, CA);

	return CA;
};