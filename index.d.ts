import { isStrategy } from "./src/strategy";
import net from 'net';
import stream from 'stream';

declare namespace mitm {

	declare class MitmServer extends net.Server {
		/**
		 * Create mitm server instance
		 *
		 * @param options
		 */

		constructor(options: any);
	}

	/**
	 * Mitmserver class just be used for `instanceof`
	 *
	 * Bad Example,
	 * ```js
	 * const mitm = require('@lemonce3/mitm');
	 *
	 * new mitm.Server(); // Illegal construction.
	 * ```
	 *
	 * `instanceof` example,
	 * ```js
	 * const mitm = require('@lemonce3/mitm');
	 * const server = new mitm.createServer();
	 *
	 * console.log(server instanceof mitm.Server); // true
	 * ```
	 */
	export const Server: typeof MitmServer;

	namespace ContextInterface {
		interface Request {
			/**
			 * A string specifying the HTTP request method
			 *
			 * - Getter: get the original HTTP method from client request
			 * - Setter: set a new valid method
			 */
			method: string,

			/**
			 * - Getter: get the original target url
			 * - Setter: set a new url
			 */
			url: string | URL,

			/**
			 * An object containing request headers
			 *
			 * - Getter: get original request headers kv in object type.
			 * - Setter: replace to a new headers
			 */
			headers: Object,

			/**
			 * - Getter: get original request payload body.
			 * - Setter: replace to a new payload body(string, buffer, stream accepted)
			 */
			body: Buffer | string | stream.Readable,

			/**
			 * A number specifying the socket timeout in milliseconds.
			 * This will set the timeout **before** the socket is connected.
			 *
			 * - Getter: get the proxy connect timeout
			 * - Setter: replace to another number(unsigned int) millisecond.
			 *
			 * https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_http_request_options_callback
			 *
			 * default value is 120000(2 min)
			 */
			timeout: number
		}

		interface Response {
			/**
			 * This property controls the status code that will be sent to the client
			 * when the headers get flushed.
			 *
			 * https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_message_statuscode
			 *
			 * - Getter: get response status code. Default: from proxy response.
			 * - Setter: replace to a specified status code.
			 */
			statusCode: number,

			/**
			 * This property controls the status message that will be sent to the
			 * client when the headers get flushed. If this is left as undefined
			 * then the standard message for the status code will be used.
			 *
			 * https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_response_statusmessage
			 *
			 * - Getter: get response status message. Default: from proxy response.
			 * - Setter: replace to a specified status message string.
			 *
			 * default is `undefined`
			 */
			statusMessage: string,

			/**
			 * An object containing request headers
			 *
			 * - Getter: get response headers kv in object type.
			 * - Setter: replace to a new headers
			 */
			headers: Object,

			/**
			 * - Getter: get response payload body. Default: proxy ``http.ServerResponse``.
			 * - Setter: replace to a new payload body(string, buffer, stream accepted)
			 */
			body: Buffer | string | stream.Readable
		}
	}

	/**
	 * something
	 */
	interface ContextInterface {
		/**
		 * request namespace
		 */
		request: ContextInterface.Request,

		/**
		 * response namespace
		 */
		response: ContextInterface.Response
	}

	type respond = () => void;
	type forward = () => void;

	namespace options {
		interface strategy {
			/**
			 * According to socket and trunk to decide whether to
			 * proxy & hijacked secure connection.
			 *
			 * return,
			 *   - true: With valid certificate options,
			 *     the HTTPS request will be hijacked.
			 *
			 *   - false: The https request will passthrough.
			 *
			 * default handler, passthrough all https request,
			 * ```js
			 * const mitm = require('@lemonce3/mitm');
			 *
			 * mitm.createServer({
			 *   strategy: {
			 *     sslConnect() {
			 *       return false;
			 *     }
			 *   }
			 * });
			 * ```
			 *
			 * @param socket the socket on CONNECT
			 * @param chunk request message data
			 */
			sslConnect?(
				socket?: net.Socket,
				chunk?: Buffer
			) : boolean,

			/**
			 * When a request coming from client,
			 * to do something to context then respond() or forward().
			 * Proxy connection can be hijacked here.
			 *
			 * @param context A proxy object used to access request & default response
			 * @param respond Building response and echo client immediately
			 * @param forward Building request then reqest to target host
			 */
			request?(
				context: mitm.ContextInterface,
				respond: respond,
				forward: forward
			) : void,

			/**
			 * When a response coming after forward() from target,
			 * to do something to context then respond().
			 * Proxy response can be hijacked here.
			 *
			 * @param context A proxy object used to access request & forward response
			 * @param respond Updating response and echo client
			 */
			response?(
				context: mitm.ContextInterface,
				respond: respond
			) : void,

			/**
			 * When a pair of ws socket has been established,
			 * to do something about these 2 socket.
			 *
			 * Default is piping each other
			 *
			 * @param clientSocket
			 * @param proxySocket
			 */
			websocket?(
				clientSocket: net.Socket,
				proxySocket: net.Socket
			) : void
		}

		interface socket {
			/**
			 * All socket files where to store
			 */
			path: string,

			/**
			 * How to generate socket file name.
			 * The final pathname is `${path}${getName()}`
			 *
			 * @param protocol
			 * @param hostname
			 * @param port
			 */
			getName(protocol: string, hostname: string, port: number): string
		}
	}

	interface options {
		/**
		 * Use to set handler when
		 *
		 *   - ssl connection establishing
		 *   - request incomming
		 *   - response incomming
		 *   - websocket establishing
		 *
		 * to do something.
		 */
		strategy?: options.strategy,

		/**
		 * Options about socket filename & storage in FS.
		 */
		socket?: options.socket,

		/**
		 * Options about root ca & server certificate store.
		 *
		 * It will be not sslSupported if there is no
		 * valid certificate options provided.
		 */
		certificate?: CertificateStore,

		/**
		 * Completely asynchronous processing for error.
		 * It will not affect any communication process.
		 *
		 * @param type error type
		 * @param message error message
		 */
		onError?(type: string, message: string): any;
	}

	/**
	 * Create mitm server.
	 * The options should include strategy, socket ,certificateStore and ssl.
	 * Otherwise, the mitm server will be creaeted and throw the exception.
	 *
	 * @param options
	 */
	declare function createServer(options: options): MitmServer;
}

export = mitm;