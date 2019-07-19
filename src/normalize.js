const fs = require('fs');
const path = require('path');

module.exports = function normalize(options) {
	const defaultOptions = defaultOptionsFactory();

	Object.keys(options).forEach(item => {
		if (item === 'strategyOptions') {
			const { 
				sslConnect = defaultOptions.strategyOptions.sslConnect, 
				websocket = defaultOptions.strategyOptions.websocket, 
				request = defaultOptions.strategyOptions.request, 
				response = defaultOptions.strategyOptions.response 
			} = options[item];

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

			defaultOptions.strategyOptions.sslConnect = sslConnect;
			defaultOptions.strategyOptions.websocket = websocket;
			defaultOptions.strategyOptions.request = request;
			defaultOptions.strategyOptions.response = response;
		}

		if (item === 'certificate') {
			const { 
				cert = defaultOptions.certificate.cert, 
				key = defaultOptions.certificate.key, 
				store 
			} = options[item];

			if (!cert || !key) {
				throw new Error('root certificate properties could not be empty.');
			}

			if (!store || !store.get || !store.set) {
				throw new Error('self-made certificate storage not be provided.');
			}

			if (!isFunction(store.get) || !isFunction(store.set)) {
				throw new Error('certificate storage method `get` or `set` is not a function.');
			}

			defaultOptions.certificate.cert = cert;
			defaultOptions.certificate.key = key;
			defaultOptions.certificate.store = store;
		}

		if (item === 'socket') {
			const {
				path = defaultOptions.socket.path,
				getName = defaultOptions.socket.getName
			} = options[item];

			if (!path) {
				throw new Error('socket path must not be empty.');
			}

			if (!isFunction(getName)) {
				throw new Error('`getName` is not a function');
			}

			defaultOptions.socket.path = path;
			defaultOptions.socket.getName = getName;
		}

		if (item === 'onError') {
			const onError = options[item];

			if (!isFunction(onError)) {
				throw new Error('`onError` is not a function.');
			}

			defaultOptions.onError = onError;
		}

	})

	try {
		fs.accessSync(defaultOptions.socket.path, fs.constants.R_OK && fs.constants.W_OK);
	} catch (error) {
		if (error.code === 'ENOENT') {
			try {
				fs.mkdirSync(defaultOptions.socket.path, { recursive: true });
			} catch (error) {
				throw new Error('create `socketFile.path` failed.');
			}
		} else {
			throw new Error('`socketFile.path` MUST can read and write.');
		}
	}

	fs.readdirSync(defaultOptions.socket.path).forEach(file => {
		const filePath = path.join(defaultOptions.socket.path, file);

		fs.statSync(filePath).isDirectory() ? null : fs.unlinkSync(filePath);
	});

	return defaultOptions;
}

function defaultOptionsFactory() {
	return {
		strategyOptions: {
			sslConnect() {
				return false;
			},
			websocket(clientSocket, proxySocket) {
				clientSocket.pipe(proxySocket);
				proxySocket.pipe(clientSocket);
			},
			request(context, respond, forward) {
				forward();
			},
			response(context, respond) {
				respond();
			}
		},
		socket: {
			path: null,
			getName(protocol, hostname, port) {
				return `${protocol}-${hostname}-${port}`;
			}
		},
		certificate: {
			cert: null,
			key: null,
			store: {
				get(any) { return null; },
				set(hostname, certKeyPair) { return null; }
			}
		},
		onError() { return true; }
	}
}

function isFunction(any) {
	return typeof any === 'function';
} 