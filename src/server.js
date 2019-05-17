const net = require('net');
const fs = require('fs');
const path = require('path');
const platform = require('os').platform();

const Strategy = require('./strategy');
const ShadowStore = require('./shadow/store');
const CertificateStore = require('./certificate');

const EOL = '\r\n';
const BODY = 'HTTP/1.1 200 Connection Established\r\nProxy-agent: node-mitmproxy\r\n\r\n';
const ORIGIN_REG = /origin:/i;

function isPlainText(message) {
	return ORIGIN_REG.test(message);
}

function connectShadow(shadowStore, protocol, hostname, port) {
	const address = shadowStore.fetch(protocol, hostname, port).address;
	
	return net.connect(address).on('error', (e) => {
		console.log(e);
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

		if (!(this instanceof MitmServer)) {
			return new MitmServer();
		}

		const { strategy, socket, certificateStore, ssl } = options;

		this.strategy = strategy;
		this.socket = socket;
		this.certificateStore = certificateStore;

		const isSecure = Boolean(ssl);
		const shadowStore = new ShadowStore(this);

		this.on('connection', socket => {
			socket.on('error', (e) => {
				console.log(e);
			}).once('data', chunk => {
				const [method, url] = chunk.toString().split(EOL)[0].split(' ');
				
				if (method === 'CONNECT') {
					socket.write(BODY);

					socket.once('data', async chunk => {
						let proxySocket = null;
						const [hostname, port] = url.split(':');

						if (isPlainText(chunk.toString())) {
							proxySocket = connectShadow(shadowStore, 'http:', hostname, port);
						} else if (await strategy.sslConnectInterceptor(socket, chunk) && isSecure) {
							proxySocket = connectShadow(shadowStore, 'https:', hostname, port);
						} else {
							proxySocket = net.connect(port, hostname);
						}

						send(socket, proxySocket, chunk);
					});
				} else {
					const {hostname, port} = new URL(url);
					const proxySocket = connectShadow(shadowStore, 'http:', hostname, port);

					send(socket, proxySocket, chunk);
				}
			});
		}).on('error', (e) => {
			console.log(e);
		}).on('close', () => shadowStore.destory());
	}

	getSocketPath(protocol, hostname, port) {
		const socketPath = path.resolve(this.socket.path, this.socket.getName(protocol, hostname, port));

		return platform === 'win32' ? path.join('\\\\?\\pipe', socketPath) : socketPath;
	}
}

exports.MitmServer = MitmServer;

exports.createServer =  function createServer(options) {
	const { strategy, socket, certificateStore, ssl} = options;

	if (!Strategy.isStrategy(strategy)) {
		throw new Error('A strategy instant MUST be provided.');
	}

	if (!socket) {
		throw new Error('socket MUST be provided.');
	}

	if (typeof socket.path !== 'string' || typeof socket.getName !== 'function') {
		throw new Error('socket.path MUST be a string and socket.getName MUST be a function.');
	}

	if (ssl) {
		if (!certificateStore) {
			options.certificateStore = new CertificateStore(ssl.cert, ssl.key);
		} else if (!CertificateStore.isCertificateStore(certificateStore)) {
			throw new Error('`certificateStore` MUST be a CertificateStore.');
		}
	}

	try {
		fs.accessSync(socket.path, fs.constants.R_OK && fs.constants.W_OK);
	} catch (error) {
		if (error.code === 'ENOENT') {
			try {
				fs.mkdirSync(socket.path, { recursive: true });
			} catch (error) {
				throw new Error('create `socketFile.path` failed.');
			}
		} else {
			throw new Error('`socketFile.path` MUST can read and write.');
		}
	}

	fs.readdirSync(socket.path).forEach(file => {
		const filePath = path.join(socket.path, file);

		fs.statSync(filePath).isDirectory() ? null : fs.unlinkSync(filePath);
	});

	return new MitmServer(options);
}