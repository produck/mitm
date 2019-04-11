const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const axios = require('axios-https-proxy-fix');

const mitm = require('..');
const html = fs.readFileSync(path.resolve(__dirname, './test.html'));
const rootCA = require('./test-cert.json');

const testServer = http.createServer((req, res) => {
	res.end(html);
});

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

describe('strategy', function () {
	let mitmServer = null;

	this.beforeAll(function () {
		testServer.listen();
		const strategy = mitm.Strategy.create({
			sslConnect: () => true
		});

		mitmServer = http.createServer();
		
		mitm.Server.create(strategy, {
			ssl: {
				key: rootCA.key,
				cert: rootCA.cert
			},
			server: mitmServer
		});

		mitmServer.listen(2344);
	});

	this.afterAll(function () {
		mitmServer.close();
		testServer.close();
	});

	it('gethttp', async function () {
		const url = 'http://cms-bucket.ws.126.net/2019/03/21/05c55219e96b4c60931ad9613cefee96.jpeg?imageView&thumbnail=185y116&quality=85';
		const responseA = await axios.get(url, {
			proxy: {
				host: 'localhost',
				port: 2344
			},
			responseType: 'arraybuffer'
		});

		const responseB = await axios.get(url, {
			responseType: 'arraybuffer'
		});
		assert.deepEqual(responseA.data, responseB.data);
	})

	it('gethttps', async function () {
		const url = 'https://www.baidu.com';
		// const url = 'https://ebank.eximbank.gov.cn/eweb/';
		const responseA = await axios.get(url, {
			proxy: {
				host: 'localhost',
				port: 2344
			},
			responseType: 'arraybuffer',
			// httpAgent,
			// httpsAgent
		});
		const responseB = await axios.get(url, {
			responseType: 'arraybuffer'
		});
		assert.deepEqual(responseA.data, responseB.data);
	});
});