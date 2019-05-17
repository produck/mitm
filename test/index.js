const path = require('path');
const assert = require('assert');
const axios = require('axios-https-proxy-fix');

const mitm = require('..');
const rootCA = require('./test-cert.json');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

describe('strategy', function () {
	let mitmServer = null;

	this.beforeAll(function () {
		const strategy = mitm.Strategy.create({
			sslConnect: () => true,
			request(context, respond, forward) {
				context.response.body = 'ok';
				context.response.headers = {};
				context.response.statusCode = 200;
				respond();
			}
		});

		mitmServer = mitm.createServer({
			strategy,
			socket: {
				path: path.resolve(__dirname, './socketStore'),
				getName(protocol, hostname, port) {
					return `${protocol}-${hostname}-${port}`;
				}
			},
			ssl: {
				key: rootCA.key,
				cert: rootCA.cert
			}
		});

		mitmServer.listen(2344);
	});

	this.afterAll(function () {
		mitmServer.close();
	});

	it('gethttp', async function () {
		const url = 'http://www.oid-info.com/get/1.3.6.1.4.1.4203';
		const responseA = await axios.get(url, {
			proxy: {
				host: 'localhost',
				port: 2344
			},
			responseType: 'text'
		});

		const responseB = await axios.get(url, {
			responseType: 'text'
		});
		assert.deepEqual(responseA.data, 'ok');
	})

	it('gethttps', async function () {
		const url = 'https://www.baidu.com';
		// const url = 'https://ebank.eximbank.gov.cn/eweb/';
		const responseA = await axios.get(url, {
			proxy: {
				host: 'localhost',
				port: 2344
			},
			responseType: 'text',
			// httpAgent,
			// httpsAgent
		});
		const responseB = await axios.get(url, {
			responseType: 'text'
		});
		assert.deepEqual(responseA.data, 'ok');
	});
});