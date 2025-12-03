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

export type PromisedMessage<M extends PostMessageTransportMap, K extends keyof M> = BaseMessage<M, K> & {
  requestId: string;
};

export type Message<M extends PostMessageTransportMap, K extends keyof M> = BaseMessage<M, K> | PromisedMessage<M, K>;

export type Listener<T> = (data: T, resolve?: (value: T | PromiseLike<T>) => void, reject?: (reason?: any) => void) => void;

export type Awaiter<T, E> = [Listener<T>, Listener<E>];

export interface Target {
  postMessage(message: any, ...args: any[]): void;
}
