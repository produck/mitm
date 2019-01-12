
const iconv = require('iconv-lite');
const getRawBody = require('raw-body');

const HTML_REG = /html/;
const CHARSET_REG = /charset\s*=\s*([\w\d-]+)/i;

let abc = 0;

module.exports = {
	requestIncoming({ req, res }) {
	},
	requestOutgoing({ reqBody, proxyReq, req, res}) {
		
	},
	responseIncoming({ proxyRes, reqBody, proxyReq, req, res }) {
		const conentType = proxyRes.headers['content-type'];

		return !HTML_REG.test(conentType);
	},
	responseOutgoing({ resBody, proxyRes, reqBody, proxyReq, req, res }) {
		const conentType = proxyRes.headers['content-type'];
		const matched = conentType.match(CHARSET_REG);
		const exactCharset = matched && matched[1];
		const charset = exactCharset ? exactCharset : 'gbk';

		const decoded = iconv.decode(resBody, charset);
		const newBody = decoded;

		console.log(abc++)

		return iconv.encode(newBody, charset);
	}
};