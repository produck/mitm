import { IncomingMessage, ServerResponse, OutgoingMessage } from "http";

declare interface sslOptions{
	key: String,
	cert: String,
	timeout: Number
}

class Strategy{
	constructor(InterceptorOptions: Object);
}

declare class MitmServer{
	constructor(strategy: Strategy)
}


export = { MitmServer, Strategy };