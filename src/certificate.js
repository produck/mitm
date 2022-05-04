const EventEmitter = require('events');
const net = require('net');
const forge = require('node-forge');

const RSA_KEY_SIZE = 2048;

const defaultAttrs = [
	{ name: 'countryName', value: 'CN' },
	{ name: 'organizationName', value: 'hhh' },
	{ shortName: 'ST', value: 'SH' },
	{ shortName: 'OU', value: 'hhh' }
];

function getExtensionSAN(hostname = '') {
	if (net.isIP(hostname)) {
		return {
			name: 'subjectAltName',
			altNames: [{ type: 7, ip: hostname }]
		};
	} else {
		return {
			name: 'subjectAltName',
			altNames: [{ type: 2, value: hostname }]
		};
	}
}

const THIS_YEAR = new Date().getFullYear();

function getDateOffsetYear(length) {
	return new Date(String(THIS_YEAR + length));
}

function generateCertsForHostname(hostname, rootCA) {
	const keys = forge.pki.rsa.generateKeyPair(RSA_KEY_SIZE);
	const cert = forge.pki.createCertificate();

	cert.publicKey = keys.publicKey;
	cert.serialNumber = Math.random().toString(16).substr(2, 8);

	cert.validity.notBefore = getDateOffsetYear(-1);
	cert.validity.notAfter = getDateOffsetYear(1);

	const caCert = forge.pki.certificateFromPem(rootCA.cert);
	const caKey = forge.pki.privateKeyFromPem(rootCA.key);

	// issuer from CA
	cert.setIssuer(caCert.subject.attributes);

	// sign cn
	const attrs = defaultAttrs.concat([
		{ name: 'commonName', value: hostname }
	]);

	const extensions = [
		{ name: 'basicConstraints', cA: false },
		getExtensionSAN(hostname)
	];

	cert.setSubject(attrs);
	cert.setExtensions(extensions);
	cert.sign(caKey, forge.md.sha256.create());

	return {
		privateKey: forge.pki.privateKeyToPem(keys.privateKey),
		publicKey: forge.pki.publicKeyToPem(keys.publicKey),
		certificate: forge.pki.certificateToPem(cert)
	};
}

module.exports = class CertificateStore extends EventEmitter {
	constructor(options) {
		super();

		this.ca = { cert: options.cert, key: options.key };
		this.store = options.store;
	}

	async fetch(hostname) {
		const existed = await this.store.get(hostname);

		if (existed) {
			return existed;
		} else {
			const newCertKeyPair = generateCertsForHostname(hostname, this.ca);

			this.emit('signed', { hostname, newCertKeyPair });
			await this.store.set(hostname, newCertKeyPair);

			return await this.store.get(hostname);
		}
	}
}