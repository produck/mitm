const mitm = require('..');
const rootCA = require('./test-cert.json');
const path = require('path');
const assert = require('assert');
const axios = require('axios');
const Http = require('http');

const normalize = require('../src/normalize');
const Certificate = require('../src/certificate');
const shadow = require('../src/shadow');
const Strategy = require('../src/strategy');
const Context = require('../src/strategy/handler/context');

describe('Mitm::', () => {
	const certificateStore = {};

	const options = {
		strategy: {
			sslConnect() {
				return true;
			},
			websocket(clientSocket, proxySocket) {
				clientSocket.pipe(proxySocket);
				proxySocket.pipe(clientSocket);
			},
			request(context, respond) {
				context.response.body = 'hello, world!';
				context.response.headers = {};
				context.response.statusCode = 200;
				context.response.statusMessage = 'test';

				respond();
			},
			response(context, respond) {
				respond();
			}
		},
		socket: {
			path: path.resolve(__dirname, '/socketStore'),
			getName(protocol, hostname, port) {
				return `${protocol}-${hostname}-${port}`;
			}
		},
		certificate: {
			cert: rootCA.cert,
			key: rootCA.key,
			store: {
				get(hostname) {
					return certificateStore[hostname];
				},
				set(hostname, value) {
					return certificateStore[hostname] = value;
				}
			}
		}
	};

	const finalOptions = normalize(options);
	const mitmServer = mitm.createServer(finalOptions);

	mitmServer.listen(8090);

	it('##create a mitm instance', () => {
		const mitmServer = mitm.createServer();

		assert(mitmServer instanceof mitm.Server);
	})

	describe('#normalize', () => {
		it('should get a normalized parameter correctly', () => {
			const normalizedOptions = normalize({
				socket: {
					path: path.resolve(__dirname, '/socketStore'),
					getName(protocol, hostname, port) {
						return `${protocol}-${hostname}-${port}`;
					}
				}
			});

			assert(normalizedOptions);
		})
	})

	describe('#certificate', () => {
		it('should fetch a certificate key pair by hostname correctly', async () => {
			const certificate = new Certificate(finalOptions.certificate);

			assert(await certificate.fetch('127.0.0.1'));
		})
	})

	describe('#shadow', () => {
		it('should fetch a shadow for the connections use http correctly', async () => {
			const httpShadow = shadow.Store({
				strategy: Strategy(finalOptions.strategy, finalOptions.onError),
				socket: finalOptions.socket,
				onError: finalOptions.onError,
				certificate: new Certificate(finalOptions.certificate)
			}).fetch('http', 'http://coolaf.com/tool/chattest', '');

			assert(httpShadow);
			assert.deepEqual(httpShadow.origin, 'http://http://coolaf.com/tool/chattest:');

			httpShadow.on('ready', () => {
				assert.deepEqual(httpShadow.address, '\\\\?\\pipe\\C:\\socketStore\\http-http:\\coolaf.com\\tool\\chattest-');
			})

		})

		it('should fetch a shadow for the connections use https correctly', async () => {
			const httpsShadow = shadow.Store({
				strategy: Strategy(finalOptions.strategy, finalOptions.onError),
				socket: finalOptions.socket,
				onError: finalOptions.onError,
				certificate: new Certificate(finalOptions.certificate)
			}).fetch('https', 'www.npmjs.com', '');

			assert(httpsShadow);
			assert.deepEqual(httpsShadow.origin, 'https://www.npmjs.com:');

			httpsShadow.on('ready', () => {
				assert.deepEqual(httpsShadow.address, '\\\\?\\pipe\\C:\\socketStore\\https-www.npmjs.com-');
			})
		})
	})

	describe('#strategy', () => {
		it('should return a strategy', () => {
			const strategy = Strategy(finalOptions.strategy, finalOptions.onError);

			assert(strategy);
		})

		describe('##context', () => {
			it('###Raw', async () => {
				const httpShadow = shadow.Store({
					strategy: Strategy(finalOptions.strategy, finalOptions.onError),
					socket: finalOptions.socket,
					onError: finalOptions.onError,
					certificate: new Certificate(finalOptions.certificate)
				}).fetch('https', 'www.bilibili.com', '')
				assert(Context.Raw(Http.request('http://www.baidu.com', {
					headers: {
						'Content-Type': 'text/xml',
					},
				}), httpShadow));
			})

			it('###Interface', async () => {
				const httpShadow = shadow.Store({
					strategy: Strategy(finalOptions.strategy, finalOptions.onError),
					socket: finalOptions.socket,
					onError: finalOptions.onError,
					certificate: new Certificate(finalOptions.certificate)
				}).fetch('http', 'coolaf.com/tool/chattest', '')
				const raw = Context.Raw(Http.request('http://coolaf.com/tool/chattest', {
					headers: {
						'Content-Type': 'text/xml',
					},
				}), httpShadow);

				const contextInterface = Context.Interface(raw);

				assert(contextInterface.request);
				assert(contextInterface.response);
			})
		})
	})

	it('##proxy for http', async () => {
		const url = 'http://www.oid-info.com/get/1.3.6.1.4.1.4203';
		const responseA = await axios.get(url, {
			proxy: {
				host: 'localhost',
				port: 8090
			},
			responseType: 'text'
		});

		const responseB = await axios.get(url, {
			responseType: 'text'
		});

		assert.deepEqual(responseA.data, 'hello, world!');
	})

	it('##proxy for https', async () => {
		const url = 'https://www.bilibili.com/';
		const responseA = await axios.get(url, {
			proxy: {
				host: 'localhost',
				port: 8090
			},
			responseType: 'text',
		});

		assert.deepEqual(responseA.data, 'hello, world!');
	})
})