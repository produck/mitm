const fs = require('fs');
const path = require('path');

module.exports = function normalize(options) {
	const defaultOptions = defaultOptionsFactory();

	Object.keys(options).forEach(item => {
		if (item === 'strategyOptions') {
			defaultOptions.strategyOptions = Object.assign(defaultOptions.strategyOptions, options[item]);
		}

		if (item === 'certificate') {
			defaultOptions.certificate = Object.assign(defaultOptions.certificate, options[item]);
		}

		if (item === 'socket') {
			defaultOptions.socket = Object.assign(defaultOptions.socket, options[item]);
		}

		if (item === 'onError') {
			defaultOptions.onError = Object.assign(defaultOptions.onError, options[item]);
		}

	})

	validateOptions(defaultOptions);

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

const validateRule = {
	strategyOptions: {
		sslConnect: isFunction,
		webSocket: isFunction,
		request: isFunction,
		response: isFunction
	},
	socket(any) {
		if (!any.path || !any.getName) {
			return false;
		}

		return isFunction(any.getName);
	},
	certificate(any) {
		if (!any.store.get || !any.store.set) {
			return false;
		}

		return isFunction(any.store.get) || isFunction(any.store.set);
	},
	onError: isFunction 
};

function validateOptions(options) {
	const nodePath = [];

	function validate(ruleNode, optionsNode) {
		Object.keys(ruleNode).forEach(item => {
			nodePath.push(item);

			const ruleValidator = ruleNode[item];
			const optionsValue = optionsNode[item];

			if (typeof ruleValidator === 'object') {

				validate(ruleValidator, optionsValue);
			} else if (!ruleValidator(optionsValue)) {
				throw new Error(`Bad value at options.${nodePath.join('.')}`);
			}

			nodePath.pop();
		});
	}

	validate(validateRule, options);

	return true;
}

function defaultOptionsFactory() {
	return {
		strategyOptions: {
			sslConnect() {
				return false;
			},
			webSocket(clientSocket, proxySocket) {
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
				get(any) { },
				set(hostname, certKeyPair) { }
			}
		},
		onError() { }
	}
}

function isFunction(any) {
	return typeof any === 'function';
} 