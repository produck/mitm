const LRU = require('lru-cache');
const iconv = require('iconv-lite');
const utils = require('../src/utils');
const pako = require('pako');

const cache = new LRU({
	maxAge: 3600000,
	max: 1000000000,
	length(n) {
		return n.length;
	}
});

const HTML_REG = /html/;
const CHARSET_REG = /charset\s*=\s*([\w\d-]+)/i;
const HEAD_REG = /(<head[\s\d\w="\\/-]*>)/i;
const INJECTION = '<script type="text/javascript">console.log(1234)</script>';

function rewriteHtmlData(data) {
	const rewrited = data.replace(HEAD_REG, '$1' + INJECTION);
	
	return rewrited;
}

module.exports = {
	requestIncoming({ req, res }) {
		return true;
	},
	requestOutgoing({ reqBody, proxyReq, req, res}) {
		
	},
	responseIncoming({ proxyRes, reqBody, proxyReq, req, res }) {
		const conentType = proxyRes.headers['content-type'];

		return !HTML_REG.test(conentType);
	},
	responseOutgoing({ resBody, proxyRes, reqBody, proxyReq, req, res }) {
		res.removeHeader('content-encoding');
		res.removeHeader('content-length');
		res.flushHeaders();
		
		const isGzip = utils.isGzipEncoding(proxyRes);

		if (isGzip) {
			resBody = Buffer.from(pako.ungzip(resBody).buffer);
		}

		const conentType = proxyRes.headers['content-type'];
		const matched = conentType.match(CHARSET_REG);
		
		let exactCharset = matched && matched[1];

		if (!exactCharset) {
			const headMatched = resBody.toString().match(CHARSET_REG);

			exactCharset = headMatched && headMatched[1];
		}

		const charset = exactCharset ? exactCharset : 'gbk';
		const decoded = iconv.decode(resBody, charset);

		const newBody = rewriteHtmlData(decoded);

		const resolved = iconv.encode(newBody, charset);

		return Buffer.from(resolved.buffer);
	}
};