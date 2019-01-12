const LRU = require('lru-cache');
const iconv = require('iconv-lite');

const cache = new LRU({
	maxAge: 3600000,
	max: 1000000000,
	length(n) {
		return n.length;
	}
});

const HTML_REG = /html/;
const CHARSET_REG = /charset\s*=\s*([\w\d-]+)/i;
const HEAD_REG = /(<head[\s\d\w="\\\/-]*>)/i;
const INJECTION = '<script type="text/javascript">console.log(1234)</script>';

function rewriteHtmlData(data) {
	const rewrited = data.replace(HEAD_REG, '$1' + INJECTION);
	
	return rewrited;
};

module.exports = {
	requestIncoming({ req, res }) {
		if (req.method === 'GET' && cache.has(req.url)) {
			res.end(cache.get(req.url));

			return false;
		}
		
		return true;
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

		//TODO inject here
		const newBody = rewriteHtmlData(decoded);

		const resolved = iconv.encode(newBody, charset);

		if (req.method === 'GET') {
			cache.set(req.url, resolved);
		}

		return resolved;
	}
};