# postmessage-transport

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/dmitriy-borisov/postmessage-transport/test.yml)
[![npm](https://img.shields.io/npm/v/postmessage-transport)](https://www.npmjs.com/package/postmessage-transport)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Typed transport for PostMessage protocol. Also it supports the async/await between targets.

## 📖 Table of Contents

- [Motivation](#motivation)
- [Install](#install)
- [Usage](#usage)
- [Error Handling](#error-handling)
- [Options](#options)
- [API](#api)

<a name="motivation"></a>
## ❓ Motivation

The `postMessage` API is a powerful tool for communication between windows, iframes, and workers. However, it has some limitations:

- **Untyped messages**: You can send any data, which can lead to runtime errors.
- **No request/response pattern**: `postMessage` is "fire and forget". You can't easily wait for a response.
- **No synchronization**: You can't easily check if the target is ready to receive messages.

`postmessage-transport` solves these problems by providing:

- **Strict typing**: Define your message map and get full TypeScript support.
- **Async/Await support**: Send a request and await the response just like a regular HTTP request.
- **Reliability**: Built-in error handling and timeout support.

<a name="install"></a>
## 📦 Install

```bash
# Using NPM
npm i postmessage-transport

# Using Yarn
yarn add postmessage-transport

# Using pnpm
pnpm add postmessage-transport
```

<a name="usage"></a>
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
transport.addHandler('requestData', async (data) => {
  console.log(data); // { data: 'test' }
  return { ok: true };
  // or throw new Error('Some error') to reject
});
```

<a name="error-handling"></a>
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

<a name="options"></a>
## ⚙️ Options

```ts
export interface PostMessageTransportOptions<M extends PostMessageTransportMap, K extends keyof M> {
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

export interface PostMessageTransportRequestOptions {
  /**
   * Timeout in milliseconds for requests.
   */
  timeout?: number;
  /**
   * Abort signal for requests.
   */
  signal?: AbortSignal;
}
```

<a name="api"></a>
## 📚 API

### `PostMessageTransport`

#### Constructor

```ts
constructor(serviceName: string, options?: PostMessageTransportOptions)
```

Creates a new transport instance.

- `serviceName`: Unique name for the service. Messages with other service names will be ignored.
- `options`: Transport options.

#### Sending Messages

| Method | Description |
| --- | --- |
| `emit(message, data)` | Sends a one-way message to the target. |
| `request(message, data, options?)` | Sends a request to the target and waits for a response. |

#### Listening for Messages

| Method | Description |
| --- | --- |
| `on(message, callback)` | Listens for a one-way message. |
| `once(message, callback)` | Listens for a one-way message once. |
| `off(message, callback)` | Removes a listener for a one-way message. |
| `addHandler(message, callback)` | Registers a handler for a request. |
| `addOnceHandler(message, callback)` | Registers a handler for a request once. |
| `removeHandler(message, callback)` | Removes a handler for a request. |

#### Other

| Method | Description |
| --- | --- |
| `setTarget(target)` | Sets the target for postMessage. Useful if the target is not available during initialization. |
| `destroy()` | Removes all listeners and clears all pending requests. |

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/dmitriy-borisov/postmessage-transport/issues). You can also take a look at the [contributing guide](CONTRIBUTING.md).

