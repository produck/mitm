const http = require('http');
// const https = require('https');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const axios = require('axios-https-proxy-fix');

const mitm = require('..');
const html = fs.readFileSync(path.resolve(__dirname, './test.html'));
const rootCA = {
	key: fs.readFileSync('/home/dameneko/node-mitmproxy/node-mitmproxy.ca.key.pem', 'utf-8'),
	cert: fs.readFileSync('/home/dameneko/node-mitmproxy/node-mitmproxy.ca.crt', 'utf-8')
};


const testServer = http.createServer((req, res) => {
	res.end(html);
});

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
// before(() => {
// })




// describe('emptyStrategy', function() {
// 	let mitmServer = null;

// 	this.beforeAll(function () {
// 		testServer.listen();
// 		const strategy = mitm.Strategy.create({});

// 		mitmServer = new mitm.Server(strategy, {
// 			ssl: {
// 				key: rootCA.key,
// 				cert: rootCA.cert
// 			}
// 		});
// 		mitmServer.listen(6666);
// 	});

// 	this.afterAll(function () {
// 		mitmServer.close();
// 		testServer.close();
// 	});

// 	it('gethttp', function (done) {
// 		request(
// 			`http://localhost:${testServer.address().port}`,
// 			{ proxy: 'http://localhost:6666' },
// 			(error, response, body) => {
// 				assert.equal(body, html);
// 				done();
// 			}
// 		);
// 	});

// 	it('gethttps', function (done) {
// 		request(
// 			`https://www.baidu.com`,
// 			{ proxy: 'http://localhost:6666' },
// 			(error, response, body) => {
// 				done();
// 			}
// 		);
// 	});
// });

describe('strategy', function () {
	let mitmServer = null;

	this.beforeAll(function () {
		testServer.listen();
		const strategy = mitm.Strategy.create({
			sslConnect: () => true
		});

		mitmServer = new mitm.Server(strategy, {
			ssl: {
				key: rootCA.key,
				cert: rootCA.cert
			}
		});
		mitmServer.listen(6789);
	});

	this.afterAll(function () {
		mitmServer.close();
		testServer.close();
	});

	it('gethttp', async function () {
		try {
			const responseA = await axios.get(`http://www.ruanyifeng.com`, {
				proxy: {
					host: 'localhost',
					port: 6789
				}
			});

			const responseB = await axios.get(`http://www.ruanyifeng.com`);
			assert.equal(responseA.data, responseB.data);
		} catch (error) {
			console.log(error)
		}

		
	})

	it('gethttps', async function () {
		try {
			const responseA = await axios.get('https://www.baidu.com', {
				proxy: {
					host: 'localhost',
					port: 6789
				}
			});
			const responseB = await axios.get('https://www.baidu.com');
			assert.equal(responseA.data, responseB.data);
		} catch (error) {
			console.log(error)
		}

	});
});