const http = require('http');
// const https = require('https');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const request = require('request');

const { MitmServer, Strategy } = require('..');
const html = fs.readFileSync(path.resolve(__dirname, './test.html'));

const testServer = http.createServer((req, res) => {
	res.end(html);
}).listen();

const strategy = Strategy.create({});

const mitm = new MitmServer(strategy);

mitm.server.listen(6666);

describe('emptyStrategy', done => {
	it('get', done => {
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
