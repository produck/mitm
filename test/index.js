const mitm = require('../index');

const server = mitm.createServer({
	strategy: {
		sslConnect() {

		},
		request(context, respond, forward) {
			respond
			context.request.ti
		},
		response(context, respond) {

		},
		websocket(client, proxy) {
			client
		}
	},
	certificate: {

	},
	socket: {
		path: '',
		getName() {

		}
	},
	onError() {

	}
});

mitm.Server
