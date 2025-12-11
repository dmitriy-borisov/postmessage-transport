export type PostMessageTransportMap = Record<any, any>;

/**
 * Options for the PostMessageTransport.
 */
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

/**
 * Options for the request.
 */
export interface RequestOptions {
  /**
   * Timeout in milliseconds for requests.
   */
  timeout?: number;
  /**
   * Abort signal for requests.
   */
  signal?: AbortSignal;
}

export enum MessageType {
  DEFAULT = 0,
  REQUEST = 1,
  RESPONSE = 2,
  REJECT = 3,
}

export interface BaseMessage<M extends PostMessageTransportMap, K extends keyof M> {
  serviceName: string;
  message: K;
  data: M[K];
  type: MessageType;
}

export type PromiseRequestMessage<M extends PostMessageTransportMap, K extends keyof AwaitedMessagesTransportMap<M>> = BaseMessage<M, K> & {
  requestId: string;
  type: MessageType.REQUEST;
  data: M[K]['request'];
};

export type PromiseResponseMessage<M extends PostMessageTransportMap, K extends keyof AwaitedMessagesTransportMap<M>> = BaseMessage<M, K> & {
  requestId: string;
  type: MessageType.RESPONSE;
  data: M[K]['response'];
};

export type PromiseRejectMessage<M extends PostMessageTransportMap, K extends keyof AwaitedMessagesTransportMap<M>> = BaseMessage<M, K> & {
  requestId: string;
  type: MessageType.REJECT;
  data: M[K]['error'];
};

export type Message<M extends PostMessageTransportMap, K extends keyof M> = K extends keyof AwaitedMessagesTransportMap<M> ? PromiseRequestMessage<M, K> | PromiseResponseMessage<M, K> | PromiseRejectMessage<M, K> : BaseMessage<M, K>;

export type BaseListener<T> = (data: T) => void;

export type AwaitedListener<T extends AwaitedMessage<any, any, any>> = (data: T['request'], resolve: (value: T['response']) => void, reject: (reason: T['error']) => void) => void;

export type Listener<T> = BaseListener<T>;

export type Awaiter<T, E> = [(data: T) => void, (reason: E) => void, AbortController];

export interface Target {
  postMessage(message: any, ...args: any[]): void;
}

// ---------------------------------------
// Utility types
//
export type AwaitedMessage<REQ, RES, E = string> = {
  __type: 'awaitedMessage';
  request: REQ;
  response: RES;
  error: E;
};

export type AwaitedMessagesTransportMap<M extends PostMessageTransportMap> = {
  [P in keyof M as M[P] extends AwaitedMessage<any, any, any> ? P : never]: M[P];
}

export type OnlyBaseMessagesTransportMap<M extends PostMessageTransportMap> = {
  [P in keyof M as M[P] extends AwaitedMessage<any, any, any> ? never : P]: M[P];
}
