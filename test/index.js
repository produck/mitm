const http = require('http');
// const https = require('https');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const request = require('request');

const mitm = require('..');
const html = fs.readFileSync(path.resolve(__dirname, './test.html'));

const testServer = http.createServer((req, res) => {
	res.end(html);
}).listen();



describe('emptyStrategy', function() {
	let mitmServer = null;
	
	this.beforeAll(function () {
		const strategy = mitm.Strategy.create({});

		mitmServer = new mitm.Server(strategy);
		mitmServer.listen(6666);
	});

	this.afterAll(function () {
		mitmServer.close();
		testServer.close();
	});

	it('get', function (done) {
		request(
			`http://localhost:${testServer.address().port}`,
			{ proxy: 'http://localhost:6666' },
			(error, response, body) => {
				assert.equal(body, html);
				done();
			}
		);
	});
});
