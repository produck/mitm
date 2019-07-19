const net = require('net');
const Strategy = require('./strategy');
const shadow = require('./shadow');
const CertificateStore = require('./certificate');

const EOL = '\r\n';
const BODY = 'HTTP/1.1 200 Connection Established\r\nProxy-agent: node-mitmproxy\r\n\r\n';
const ORIGIN_REG = /origin:/i;

const normalize = require('./normalize');

function isPlainText(message) {
	return ORIGIN_REG.test(message);
}

function connectShadow(shadow) {
	return new Promise((resolve, reject) => {
		function connector() {
			const socket = net.connect(shadow.address);

			resolve(socket);
			socket.on('error', e => {
				reject(e);
			});
		}

		if (shadow.address) {
			connector()
		} else {
			shadow.on('ready', connector);
		}
	});
}

function send(origin, target, header) {
	origin.pipe(target);
	target.pipe(origin);
	target.write(header);
}

class MitmServer extends net.Server {
	constructor(options) {
		super();

		const { onError } = options;
		const sslSupported = Boolean(options.certificate.key && options.certificate.cert);
		const strategy = Strategy(options.strategy, onError);
		const shadowStore = shadow.Store({
			strategy,
			socket: options.socket,
			certificate: new CertificateStore(options.certificate),
		});

		this.on('connection', socket => {
			socket.on('error', (e) => {
				onError('connection', e.message);
			}).once('data', async chunk => {
				const [method, url] = chunk.toString().split(EOL)[0].split(' ');

				if (method === 'CONNECT') {
					socket.write(BODY);
					socket.once('data', async chunk => {
						let proxySocket = null;
						const [hostname, port] = url.split(':');

						if (isPlainText(chunk.toString())) {
							proxySocket = await connectShadow(shadowStore.fetch('http', hostname, port));
						} else if (sslSupported && await strategy.sslConnectInterceptor(socket, chunk)) {
							proxySocket = await connectShadow(shadowStore.fetch('https', hostname, port));
						} else {
							proxySocket = net.connect(port, hostname);
						}

						send(socket, proxySocket, chunk);
					});
				} else {
					const { hostname, port } = new URL(url);
					const proxySocket = await connectShadow(shadowStore.fetch('http', hostname, port));

					send(socket, proxySocket, chunk);
				}
			});
		});
	}
}

exports.MitmServer = new Proxy(MitmServer, {
	construct() {
		throw new Error('Illegal construction.');
	}
});

exports.createServer = function createServer(options) {
	const normalizedOptions = normalize(options);

	return new MitmServer(normalizedOptions);
}