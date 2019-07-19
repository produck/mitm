# Mitm

Mitm is a fully configurable proxy base on Node.js, which can handle HTTP, HTTPS, WS or WSS request correctly.

## Feature

* work as HTTP, HTTPS, WS or WSS proxy
* when working as https or wss proxy, Mitm could intercept https requests for any domain without complaint by browser (If you trusted its root CA)

## Installing
mitm is available via [npm](https://www.npmjs.com/):

```bash
$ npm install @lemonce/mitm
```

## Get Started

Create a mitm instance by functions. Basic usage with default options. For Example. 

```js
const mitm = require('@lemonce/mitm');
const mitmServer = mitm.createServer();
```


## API Referrence

### Options

Instantiates Mitm Server using the supplied options. This section will discuss each of the options.

| Name | Type | Description |
| -- | -- | -- |  
| strategyOptions | Object | Strategy options. |
| socket | Object | Socket options. |
| certificate | Object | Root cerificate and its storage method. |
| onError | Function | Handle the Mitm error.  |

#### parameters for strategyOptions

According to your needs, you can set up interception strategy. Using the following parameters.

| Name | Type | Description |
| -- | -- | -- |
| sslConnect | Function | SSL supported. The default value is false. |
| websocket | Function | WebSocket supported. The default value is supported. |
| request | Function | Request options. The default method is forward. |
| response | Function | Response options. The default method is respond. |


#### parameters for socket

| Name | Type | Description |
| -- | -- | -- |
| path | String | Socket path. |
| getName | Function | Return a socket store path. |

#### parameters for certificate

When you need to intercept the HTTPS request, the root certifiacate information and the self-made certificate storage method should be provided. Using the following parameters.

| Name | Type | Description |
| -- | -- | -- |
| cert | String | Root certificate's cert. |
| key | String | Root certificate's RAS private key.  |
| store | Function | Certificate storage methods.  |

## Using

### Intercepting HTTP requests

With the following options, the mitm server will intercept HTTP requests, the response page will display 'hello, world' and status message will show 'test'. 

```js
const mitm = require('@lemonce/mitm');

const options = {
	strategyOptions: {
		request(context, respond, forward) {
			context.response.body = 'hello, world';
			context.response.headers = {};
			context.response.statusCode = 200;
			context.response.statusMessage = 'test';
			respond();
		},
		response(context, respond) {
			respond();
		}
	},
	socket: {
		path: path.resolve('__dirname', './socketStore'),
		getName(protocol, hostname, port) {
			return `${protocol}-${hostname}-${port}`;
		}
	},
	onError(type, message) {
		console.log('error type', type);
		console.log('error message', message);
	}
}

const mitmServer = mitm.createServer(options);
mitmServer.listen(9000);

```

### Intercept HTTPS requests

With the following options, the mitm server will intercept HTTPS requests.

```js
const mitm = require('@lemonce/mitm');
const rootCA = {
	key: '',
	cert: ''
}
const options = {
	sslConnect() {
		return true;
	},
	strategyOptions: {
		request(context, respond, forward) {
			context.response.body = 'hello, world';
			context.response.headers = {};
			context.response.statusCode = 200;
			context.response.statusMessage = 'test';
			respond();
		},
		response(context, respond) {
			respond();
		}
	},
	socket: {
		path: path.resolve('__dirname', './socketStore'),
		getName(protocol, hostname, port) {
			return `${protocol}-${hostname}-${port}`;
		}
	},
	certicate: {
		cert: rootCA.cert,
		key: rootCA.key,
		store: {
			get(hostname) {
				return certificateStore[hostname];
			},
			set(hostname, certKeyPair) {
				return certicateStore[hostname] = certKeyPair;
			}
		}
	},
	onError(type, message) {
		console.log('error type', type);
		console.log('error message', message);
	}
}

const mitmServer = mitm.createServer(options);
mitmServer.listen(9000);
```


### Intercept WS/WSS requests

```js
const mitm = require('@lemonce/mitm');
const certicateStore = {};
const rootCA = {
	key: '',
	cert: ''
}

const options = {
	strategyOptions: {
		sslConnect() {
			return true;
		},
		websocket(clientSocket, proxySocket) {
			clientSocket.pipe(proxySocket);
			proxySocket.pipe(clientSocket);
		},
		request(context, respond, forward) {
			context.response.body = 'hello, world';
			context.response.headers = {};
			context.response.statusCode = 200;
			context.response.statusMessage = 'test';
			respond();
		},
		response(context, respond) {
			respond();
		}
	},
	socket: {
		path: path.resolve('__dirname', './socketStore'),
		getName(protocol, hostname, port) {
			return `${protocol}-${hostname}-${port}`;
		}
	},
	certicate: {
		cert: rootCA.cert,
		key: rootCA.key,
		store: {
			get(hostname) {
				return certificateStore[hostname];
			},
			set(hostname, certKeyPair) {
				return certicateStore[hostname] = certKeyPair;
			}
		}
	},
	onError(type, message) {
		console.log('error type', type);
		console.log('error message', message);
	}
}
const mitmServer = mitm.createServer(options);
mitmServer.listen(9000);

```

## About

Thanks to [node-mitmproxy](https://www.npmjs.com/package/node-mitmproxy) for the inspiration for this project. Due to the node-mitmproxy was stopped, we developed the Mitm base on it for our requirement.

## License
MIT License

Copyright (c) 2019 lc3

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

