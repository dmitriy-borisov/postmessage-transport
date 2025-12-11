# postmessage-transport

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/dmitriy-borisov/postmessage-transport/test.yml)
[![npm](https://img.shields.io/npm/v/postmessage-transport)](https://www.npmjs.com/package/postmessage-transport)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Typed transport for PostMessage protocol. Also it supports the async/await between targets.

## 📖 Table of Contents

- [Motivation](#-motivation)
- [Install](#-install)
- [Usage](#-usage)
- [Error Handling](#-error-handling)
- [Options](#-options)
- [API](#-api)

## ❓ Motivation

The `postMessage` API is a powerful tool for communication between windows, iframes, and workers. However, it has some limitations:

- **Untyped messages**: You can send any data, which can lead to runtime errors.
- **No request/response pattern**: `postMessage` is "fire and forget". You can't easily wait for a response.
- **No synchronization**: You can't easily check if the target is ready to receive messages.

`postmessage-transport` solves these problems by providing:

- **Strict typing**: Define your message map and get full TypeScript support.
- **Async/Await support**: Send a request and await the response just like a regular HTTP request.
- **Reliability**: Built-in error handling and timeout support.

## 📦 Install

```bash
# Using NPM
npm i postmessage-transport

# Using Yarn
yarn add postmessage-transport

# Using pnpm
pnpm add postmessage-transport
```

## 🚀 Usage

### Define your types

```ts
import { AwaitedMessage, PostMessageTransport } from 'postmessage-transport';

export interface MyTransportMethods {
  // Simple message
  test: boolean;
  // Request/Response message
  requestData: AwaitedMessage<{ data: string }, { ok: boolean }>;
}
```

### Create transport

```ts
const transport = new PostMessageTransport<MyTransportMethods>('my-service-1', {
  target: window.parent, // or iframe.contentWindow
  isBrowser: true,
});
```

### Send messages

```ts
// Send simple message
transport.emit('test', true);

// Send request and await response
const response = await transport.request('requestData', { data: 'test' });
console.log(response); // { ok: true }
```

### Listen messages

```ts
// Listen simple message
transport.on('test', (data) => {
  console.log(data); // true
});

// Listen request and send response
transport.addHandler('requestData', (data, resolve, reject) => {
  console.log(data); // { data: 'test' }
  resolve({ ok: true });
});
```

```

## ⚠️ Error Handling

### Timeout

You can specify a timeout for requests. If the response is not received within the timeout, the promise will be rejected.

```ts
try {
  await transport.request('requestData', { data: 'test' }, { timeout: 1000 });
} catch (error) {
  console.error(error.message); // "Request timeout"
}
```

### Abort

You can cancel a request using `AbortController`.

```ts
const controller = new AbortController();
const promise = transport.request('requestData', { data: 'test' }, { signal: controller.signal });

controller.abort();

try {
  await promise;
} catch (error) {
  console.error(error.message); // "Request aborted"
}
```

## ⚙️ Options

```ts
export interface Options<M extends PostMessageTransportMap, K extends keyof M> {
  /**
   * Whether the transport is running in a browser environment.
   * If true, it will automatically set up message listeners on the window.
   */
  isBrowser?: boolean;
  /**
   * Target for postMessage.
   */
  target?: Target;
  /**
   * The target origin for postMessage.
   * Specify '*' for no restriction, or a specific origin (e.g., 'https://example.com') for security.
   */
  targetOrigin: string;
  /**
   * Optional custom decoder for incoming messages.
   */
  decoder?: (data: any) => Message<M, K>;
  /**
   * Optional custom encoder for outgoing messages.
   */
  encoder?: (data: Message<M, K>) => any;
  /**
   * Timeout in milliseconds for requests.
   */
  timeout?: number;
}
```

## 📚 API

### `PostMessageTransport`

#### `constructor(serviceName: string, options?: Options)`

Creates a new transport instance.

- `serviceName`: Unique name for the service. Messages with other service names will be ignored.
- `options`: Transport options.

#### `emit(message: string, data: any)`

Sends a one-way message to the target.

#### `on(message: string, callback: (data: any) => void)`

Listens for a one-way message.

#### `off(message: string, callback: (data: any) => void)`

Removes a listener for a one-way message.

#### `once(message: string, callback: (data: any) => void)`

Listens for a one-way message once.

#### `request(message: string, data: any, options?: RequestOptions)`

Sends a request to the target and waits for a response.

- `options.timeout`: Timeout in milliseconds.
- `options.signal`: AbortSignal to cancel the request.

#### `addHandler(message: string, callback: (data: any, resolve: Function, reject: Function) => void)`

Registers a handler for a request.

#### `removeHandler(message: string, callback: Function)`

Removes a handler for a request.

#### `addOnceHandler(message: string, callback: Function)`

Registers a handler for a request once.

#### `setTarget(target: Target)`

Sets the target for postMessage. Useful if the target is not available during initialization.

#### `destroy()`

Removes all listeners and clears all pending requests.
