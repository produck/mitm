const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const createCertKeyPair = require('./context');

function getSHA1(content) {
	const hash = crypto.createHash('sha1');

	hash.update(content);

	return hash.digest('hex');
}

module.exports = class CertificateStore {
	constructor(caCert, caKey) {
		this.cache = {};
		this.ca = { cert: caCert, key: caKey };
		this.hash = getSHA1(caCert);
		this.path = path.resolve('cert', this.hash);

		this.init();
	}

	fetch(hostname) {
		const existed = this.cache[hostname];

		if (existed) {
			return existed;
		} else {
			const newCertKeyPair = createCertKeyPair(hostname, this.ca);

			fs.writeFile(path.join(this.path, `${hostname}.json`), JSON.stringify(newCertKeyPair), error => console.log(error));

			return this.cache[hostname] = newCertKeyPair;
		}
	}

	init() {//async
		fs.mkdirSync(this.path, { recursive: true });
		fs.readdirSync(this.path).forEach(filename => {
			this.cache[filename] = require(path.join(this.path, filename));
		});
	}
}