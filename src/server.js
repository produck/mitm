const net = require('net');
const path = require('path');
const platform = require('os').platform();

const Strategy = require('./strategy');
const ShadowStore = require('./shadow');
const CertificateStore = require('./certificate');

const EOL = '\r\n';
const BODY = 'HTTP/1.1 200 Connection Established\r\nProxy-agent: node-mitmproxy\r\n\r\n';
const ORIGIN_REG = /origin:/i;

const normalize = require('./normalize');

function isPlainText(message) {
	return ORIGIN_REG.test(message);
}

function connectShadow(address) {
	return net.connect(address).on('error', e => {
		console.log(e);
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
		const { strategyOptions, socket, certificate } = normalize(options);

		this.strategy = new Strategy(strategyOptions);
		this.socket = socket;
		this.certificate = new CertificateStore(certificate.cert, certificate.key, certificate.store);

		const isSecure = Boolean(certificate.key);

		this.on('connection', socket => {
			socket.on('error', (e) => {
				this.emit('error:connection', e)
			}).once('data',async chunk => {
				const [method, url] = chunk.toString().split(EOL)[0].split(' ');
				
				if (method === 'CONNECT') {
					socket.write(BODY);

					socket.once('data', async chunk => {
						let proxySocket = null;
						const [hostname, port] = url.split(':');

						if (isPlainText(chunk.toString())) {
							
							proxySocket = connectShadow(await ShadowStore(this).fetch('http:', hostname, port).address);
						} else if (await this.strategy.sslConnectInterceptor(socket, chunk) && isSecure) {
							proxySocket = connectShadow(await ShadowStore(this).fetch('https:', hostname, port).address);
						} else {
							proxySocket = net.connect(port, hostname);
						}

						send(socket, proxySocket, chunk);
					});
				} else {
					const {hostname, port} = new URL(url);
					const { address } = await ShadowStore(this).fetch('http:', hostname, port);
					const proxySocket = connectShadow(address);

					send(socket, proxySocket, chunk);
				}
			});
		});
	}

	getSocketPath(protocol, hostname, port) {
		const socketPath = path.resolve(this.socket.path, this.socket.getName(protocol, hostname, port));

		return platform === 'win32' ? path.join('\\\\?\\pipe', socketPath) : socketPath;
	}
}

exports.MitmServer = MitmServer;

exports.createServer =  function createServer(options) {
	const normalizedOptions = normalize(options);

	return new MitmServer(normalizedOptions);
}