import { Socket } from "net";
import { isStrategy } from "./src/strategy";

declare namespace mitm {
	/**
	 * The set of interceptor mehtod.
	 * It includes the interceptor of sslConnection, request, response and upgrade.
	 */
	declare class Strategy {
		constructor(interceptorOptions: {
			sslConnect: boolean, 
			websocket?: (clientSocket: Socket, proxySocket: Socket) => {} 
			request?: (context, respond, forward) => {}, 
			response?: (context, respond) => {}
		});

		isStrategy(any: any): boolean;
	}
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
	
	declare class CertificateStore{
		/**
		 * create a certificate for shadow
		 * 
		 * @param caCert 
		 * @param caKey 
		 * @param initData 
		 */
		constructor(caCert: string, caKey: string, initData: {});

		/**
		 * Fetch a shadow for the provided hostname
		 * If the shadow is existed, it will returns the founded.
		 * Otherwise, according to the hostname, the shadow will be created.
		 */
		fetch(hostname: string): () => {};

		/**
		 * 
		 * @param any 
		 */
		isCertificateStore(any: any): boolean;
	}
}

export = mitm;