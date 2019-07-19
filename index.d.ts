import { isStrategy } from "./src/strategy";

declare namespace mitm {
	declare class MitmServer {
		/**
		 * Create mitm server instance
		 * 
		 * @param options 
		 */

		constructor(options: any);
	}

	/**
	 * Create mitm server.
	 * The options should include strategy, socket ,certificateStore and ssl.
	 * Otherwise, the mitm server will be creaeted and throw the exception.
	 * 
	 * @param options 
	 */

	declare function createServer(options: {
		strategy?: object,
		socket?: {
			path: string,
			getName(protocol: string, hostname: string, port: number): string
		},
		certificate?: CertificateStore,
		onError(type: string, message: string): any;
	}): MitmServer;
}

export = mitm;