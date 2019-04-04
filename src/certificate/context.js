const net = require('net');
const forge = require('node-forge');

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

module.exports = function generateCertsForHostname(hostname, rootCA) {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
	cert.serialNumber = Math.random().toString(16).substr(2, 8);

  cert.validity.notBefore = getDateOffsetYear(-1);
  cert.validity.notAfter= getDateOffsetYear(19);
	
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