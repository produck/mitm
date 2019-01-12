const MitmHandler = require('../');

const HTML_REG = /html/;
const CHARSET_REG = /charset\s*=\s*([\w\d-]+)/i;

const mitm = MitmHandler({
	requestIncoming: {
		trace(req, res) {

		}
	},
	requestOutgoing: {

	},
	responseIncoming: {
		trace(proxyRes, req, res) {
			const contentType = proxyRes.headers["content-type"];
		
			return HTML_REG.test(contentType);
		},
		handler(proxyRes, req, res) {
		}
	},
	responseOutgoing: {

	}
});

mitm.listen(8080);