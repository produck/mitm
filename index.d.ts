import { Socket } from "net";
import { isStrategy } from "./src/strategy";

declare namespace mitm {
	declare class MitmServer{
		/**
		 * Create mitm server instance
		 * 
		 * @param options 
		 */
		constructor(options: any);

		getSocketPath(protocol: string, hostname: string, port: number) : string;
		
	}
	/**
	 * Create mitm server.
	 * The options should include strategy, socket ,certificateStore and ssl.
	 * Otherwise, the mitm server will be creaeted and throw the exception.
	 * 
	 * @param options 
	 */
	declare function createServer(options: {
		strategy: Strategy,
		socket: { 
			path: string, 
			getName(protocol: string, hostname: string, port: number): string
		},
		certificateStore?: CertificateStore,
		ssl?: { cert: string, key: string }
		}): MitmServer;
	
}

export = mitm;