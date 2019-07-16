const mitm = require('..');
const normalize = require('../src/normalize');
const rootCA = require('./test-cert.json');
const path = require('path');
const assert = require('assert');
const { Stream } = require('stream');
const axios = require('axios');
const Http = require('http');
const url = require('url');
const WebSocket = require('ws');
const HttpProxyAgent = require('http-proxy-agent');

const CertificateStore = require('../src/certificate');
const shadow = require('../src/shadow');
const Strategy = require('../src/strategy');
const utils = require('../src/strategy/handler/utils');
const Context = require('../src/strategy/handler/context');

describe('Mitm::', () => {
	const certificateStore = {};

	const options = {
		strategyOptions: {
			sslConnect() {
				return true;
			},
			websocket(clientSocket, proxySocket) {
				clientSocket.pipe(proxySocket);
				proxySocket.pipe(clientSocket);
			},
			request(context, respond, forward) {
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

	const hostname = '127.0.0.1';

	before(function createWebSocketServer() {
		const wss = new WebSocket.Server({ port: 8080 });

		wss.on('connection', (socket) => {
			socket.on('message', (msg) => {
				console.log('Server:', msg);
				socket.send('world');
			});

			socket.on('error', function (err) {
				console.log(err);
			});
		})
	})

	describe('#normalize', () => {
		it('should get a normalized parameter correctly', () => {
			const normalizedOptions = normalize({
				socket: {
					path: path.resolve(__dirname, '/socketStore')
				}
			});
			assert(normalizedOptions);
		})
	})

	describe('#certificate', () => {
		it('should fetch a certificate key pair by hostname correctly', async () => {
			const certificate = new CertificateStore(finalOptions.certificate);
			assert(await certificate.fetch(hostname));
		})
	})

	describe('#shadow', () => {
		it('should fetch a shadow for the connections use http correctly', async () => {
			const httpShadow = shadow.Store({
				strategy: Strategy.createStrategy(finalOptions.strategyOptions),
				socket: finalOptions.socket,
				onError: finalOptions.onError,
				certificate: new CertificateStore(finalOptions.certificate)
			}).fetch('http:', 'http://coolaf.com/tool/chattest', '');
			assert(httpShadow);
			assert.deepEqual(httpShadow.protocol, 'http:');
		})
		it('should fetch a shadow for the connections use https correctly', async () => {
			const httpsShadow = shadow.Store({
				strategy: Strategy.createStrategy(finalOptions.strategyOptions),
				socket: finalOptions.socket,
				onError: finalOptions.onError,
				certificate: new CertificateStore(finalOptions.certificate)
			}).fetch('https:', 'www.npmjs.com', '');
			assert(httpsShadow);
			assert.deepEqual(httpsShadow.protocol, 'https:')
		})
	})

	describe('#strategy', () => {
		it('should return a strategy', () => {
			const strategy = Strategy.createStrategy(finalOptions.strategyOptions);

			assert(strategy);
		})

		describe('##context', () => {
			it('###Raw', async () => {
				const httpShadow = shadow.Store({
					strategy: Strategy.createStrategy(finalOptions.strategyOptions),
					socket: finalOptions.socket,
					onError: finalOptions.onError,
					certificate: new CertificateStore(finalOptions.certificate)
				}).fetch('https:', 'www.bilibili.com', '')
				assert(Context.Raw(Http.request('http://www.baidu.com', {
					headers: {
						'Content-Type': 'text/xml',
					},
				}), httpShadow));
			})

			it('###Interface', async () => {
				const httpShadow = shadow.Store({
					strategy: Strategy.createStrategy(finalOptions.strategyOptions),
					socket: finalOptions.socket,
					onError: finalOptions.onError,
					certificate: new CertificateStore(finalOptions.certificate)
				}).fetch('http:', 'coolaf.com/tool/chattest', '')
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

		describe('##utils', () => {
			it('###isReadable()', () => {
				assert(utils.isReadable(new Stream()));
				assert.deepEqual(utils.isReadable('ok'), false);
			})

			it('###isValidMethod()', () => {
				assert(utils.isValidMethod('get'));
				assert(utils.isValidMethod('post'));
				assert(utils.isValidMethod('options'));
				assert.deepEqual(utils.isValidMethod('abc'), false);
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

	it('#proxy for ws', () => {
		const wsMitm = mitm.createServer(finalOptions);
		wsMitm.listen(9000);

		const proxy = url.parse('http://127.0.0.1:9000')
		const agent = new HttpProxyAgent(proxy);

		const ws = new WebSocket('ws://127.0.0.1:8080', { agent });

		
		ws.onopen = () => {
			ws.send('hello');
			ws.close();
		}

		ws.onmessage = (msg) => {
			console.log('Received Message: ' + msg.data);
		};

		ws.onclose = () => {
			console.log('stop');
		}
	})
})