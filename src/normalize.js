const fs = require('fs');
const path = require('path');

module.exports = function normalize(options) {
	const finalOptions = defaultOptionsFactory();

	if (options) {
		const { strategy, certificate, socket, onError } = options;

		if (strategy) {
			const {
				sslConnect = finalOptions.strategy.sslConnect,
				websocket = finalOptions.strategy.websocket,
				request = finalOptions.strategy.request,
				response = finalOptions.strategy.response
			} = strategy;

			if (!isFunction(sslConnect)) {
				throw new Error('`sslConnect` is not a function');
			}

			if (!isFunction(websocket)) {
				throw new Error('`webSocket` is not a function');
			}

			if (!isFunction(request)) {
				throw new Error('`request` is not a function');
			}

			if (!isFunction(response)) {
				throw new Error('`response` is not a function');
			}

			finalOptions.strategy.sslConnect = sslConnect;
			finalOptions.strategy.websocket = websocket;
			finalOptions.strategy.request = request;
			finalOptions.strategy.response = response;
		}

		if (certificate) {
			const {
				cert = finalOptions.certificate.cert,
				key = finalOptions.certificate.key,
				store
			} = certificate;

			if (!cert || !key) {
				throw new Error('root certificate properties could not be empty.');
			}

			if (!store || !store.get || !store.set) {
				throw new Error('self-made certificate storage not be provided.');
			}

			if (!isFunction(store.get) || !isFunction(store.set)) {
				throw new Error('certificate storage method `get` or `set` is not a function.');
			}

			finalOptions.certificate.cert = cert;
			finalOptions.certificate.key = key;
			finalOptions.certificate.store = store;
		}

		if (socket) {
			const {
				path = finalOptions.socket.path,
				getName = finalOptions.socket.getName
			} = socket;

			if (!path) {
				throw new Error('socket path must not be empty.');
			}

			if (!isFunction(getName)) {
				throw new Error('`getName` is not a function');
			}

			finalOptions.socket.path = path;
			finalOptions.socket.getName = getName;
		}

		if (onError && isFunction(onError)) {
			finalOptions.onError = onError;
		}
	}

	try {
		fs.accessSync(finalOptions.socket.path, fs.constants.R_OK && fs.constants.W_OK);
	} catch (error) {
		if (error.code === 'ENOENT') {
			try {
				fs.mkdirSync(finalOptions.socket.path, { recursive: true });
			} catch (error) {
				throw new Error('create `socketFile.path` failed.');
			}
		} else {
			throw new Error('`socketFile.path` MUST can read and write.');
		}
	}

	fs.readdirSync(finalOptions.socket.path).forEach(file => {
		const filePath = path.join(finalOptions.socket.path, file);

		fs.statSync(filePath).isDirectory() ? null : fs.unlinkSync(filePath);
	});

	return finalOptions;
}

function defaultOptionsFactory() {
	const defaultCertificateStore = {};

	return {
		strategy: {
			sslConnect() {
				return false;
			},
			websocket(clientSocket, proxySocket) {
				clientSocket.pipe(proxySocket);
				proxySocket.pipe(clientSocket);
			},
			request(_context, _respond, forward) {
				forward();
			},
			response(_context, respond) {
				respond();
			}
		},
		socket: {
			path: path.resolve('.pipe'),
			getName(protocol, hostname, port) {
				return `${protocol}-${hostname}-${port}`;
			}
		},
		certificate: {
			cert: null,
			key: null,
			store: {
				get(hostname) {
					return defaultCertificateStore[hostname];
				},
				set(hostname, certKeyPair) {
					defaultCertificateStore[hostname] = certKeyPair;
				}
			}
		},
		onError(type, message) {
			console.log(type, message);
		}
	}
}

function isFunction(any) {
	return typeof any === 'function';
}