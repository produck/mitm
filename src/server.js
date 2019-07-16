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
		if (shadow.address) {
			const socket = net.connect(shadow.address);
			socket.on('error', e => {
				reject(e)
			});

			resolve(socket);
		}

		shadow.on('ready', () => {
			const socket = net.connect(shadow.address);
			socket.on('error', e => {
				reject(e)
			});

			resolve(socket);
		})
	})

}

function send(origin, target, header) {
	origin.pipe(target);
	target.pipe(origin);

	target.write(header);
}

class MitmServer extends net.Server {
	constructor(options) {
		super();

		if (!(this instanceof MitmServer)) {
			return new MitmServer();
		}
		const { strategyOptions, socket, certificate, onError } = normalize(options);


		const sslSupported = Boolean(certificate.key && certificate.cert);

		const strategy = Strategy.createStrategy(strategyOptions);

		const shadowStore = shadow.Store({
			strategy, socket, onError,
			certificate: new CertificateStore(certificate),
		});



		this.on('connection', socket => {
			socket.on('error', (e) => {
				onError();
				this.emit('error:connection', e)
			}).once('data', async chunk => {
				const [method, url] = chunk.toString().split(EOL)[0].split(' ');

				if (method === 'CONNECT') {
					socket.write(BODY);

					socket.once('data', async chunk => {
						let proxySocket = null;
						const [hostname, port] = url.split(':');

						if (isPlainText(chunk.toString())) {
							proxySocket = await connectShadow(shadowStore.fetch('http:', hostname, port));
						} else if (sslSupported && await strategy.sslConnectInterceptor(socket, chunk)) {
							proxySocket = await connectShadow(shadowStore.fetch('https:', hostname, port));
						} else {
							proxySocket = net.connect(port, hostname);
						}

						send(socket, proxySocket, chunk);
					});
				} else {
					const { hostname, port } = new URL(url);
					const proxySocket = await connectShadow(shadowStore.fetch('http:', hostname, port));
					send(socket, proxySocket, chunk);
				}
			});
		});
	}
}

exports.MitmServer = MitmServer;

exports.createServer = function createServer(options) {
	const normalizedOptions = normalize(options);

	return new MitmServer(normalizedOptions);
}