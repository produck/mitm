const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const Strategy = require('./strategy');
const CertificateStore = require('./certificate');
const ShadowStore = require('./shadow/store');

const BODY = 'HTTP/1.1 200 Connection Established\r\nProxy-agent: node-mitmproxy\r\n\r\n';
const ORIGIN_REG = /origin:/i;
const platform = require('os').platform();

class MitmServer extends EventEmitter {
	constructor(strategy, options) {
		super();

		const { server, certificateStore, socketFile } = options;
		const isSecure = Boolean(options.ssl);
		const shadowStore = new ShadowStore(this/* ,options.shadow.length */);

		this.options = options;
		this.strategy = strategy;

		this.server = server;
		this.certificateStore = certificateStore;
		this.socketFile = socketFile;

		server.on('connect', async (clientRequest, socket, head) => {
			const [hostname, port] = clientRequest.url.split(':');

			socket.write(BODY);

			socket.once('data', async header => {
				let proxySocket = null;

				if (ORIGIN_REG.test(header.toString())) {
					const address = shadowStore.fetch('http:', hostname, port).address;
					proxySocket = net.connect(address.port, address.hostname);//
				} else {
					if (await strategy.sslConnectInterceptor(clientRequest, socket, head) && isSecure) {
						const address = shadowStore.fetch('https:', hostname, port).address;

						proxySocket = net.connect(address);
					} else {
						proxySocket = net.connect(port, hostname);
					}
				}

				proxySocket.on('error', options.log);
				socket.pipe(proxySocket);
				proxySocket.pipe(socket);
				proxySocket.write(header);
			});

			socket.on('error', options.log);
		});

		server.on('upgrade', strategy.UpgradeHandler());
		server.on('request', strategy.RequestHandler());
		server.on('close', () => shadowStore.destory());
	}

	static create(strategy, options) {
		if (!Strategy.isStrategy(strategy)) {
			throw new Error('A strategy instant MUST be provided.');
		}

		if (!(options.server instanceof http.Server)) {
			throw new Error('`options.server` MUST be a http.Server.');
		}

		if (options.ssl) {
			if (!options.certificateStore) {
				options.certificateStore = new CertificateStore(options.ssl.cert, options.ssl.key);
			} else if (!CertificateStore.isCertificateStore(options.certificateStore)) {
				throw new Error('`options.certificateStore` MUST be a CertificateStore.')
			}
		}

		if (options.log) {
			if (!(options.log instanceof Function)) {
				throw new Error('`options.log` MUST be a Function.');
			}
		} else {
			options.log = () => { };
		}

		if (!options.socketFile) {
			options.socketFile = this.DEFAULT_SOCKET_FILE;
		}

		try {
			fs.accessSync(options.socketFile.storePath, fs.constants.R_OK && fs.constants.W_OK);
		} catch (error) {
			if (error.code === 'ENOENT') {
				try {
					fs.mkdirSync(options.socketFile.storePath, { recursive: true });
				} catch (error) {
					console.log(error);
					throw new Error('create `socketStore.path` failed.');
				}
			} else {
				console.log(error)
				throw new Error('`socketStore.path` MUST can read and write.');
			}
		}

		fs.readdirSync(options.socketFile.storePath).forEach(file => {
			const filePath = path.join(options.socketFile.storePath, file);
			fs.statSync(filePath).isDirectory() ? null : fs.unlinkSync(filePath);
		});

		return new this(strategy, options);
	}
}

MitmServer.DEFAULT_SOCKET_FILE = {
	storePath: path.resolve('socket'),
	getSocketPath(protocol, hostname, port) {
		const socketName = `${protocol}-${hostname}-${port}`;
		const socketPath = path.resolve(this.storePath, socketName);

		return platform === 'win32' ? path.join('\\\\?\\pipe', socketPath) : socketPath;
	}
}

module.exports = MitmServer;