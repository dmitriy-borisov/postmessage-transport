import type {
  Listener,
  Message,
  PostMessageTransportOptions,
  PostMessageTransportMap,
  Awaiter,
  Target,
  AwaitedMessagesTransportMap,
  OnlyBaseMessagesTransportMap,
  BaseListener,
  AwaitedListener,
  PostMessageTransportRequestOptions,
  MessageEvent,
  DataType,
} from './typings';
import { MessageType } from './typings';
import { isPromisedMessage, getRandomId } from './utils';

const DEFAULT_OPTIONS: PostMessageTransportOptions<any, any> = {
  isBrowser: typeof window !== 'undefined',
  targetOrigin: '*',
};

export class PostMessageTransport<M extends PostMessageTransportMap> {
  private target: Target | null = null;

  private baseListeners: Partial<Record<keyof M, BaseListener<any>[]>> = {};

  private awaitedListeners: Partial<Record<keyof AwaitedMessagesTransportMap<M>, AwaitedListener<any>[]>> = {};

  private awaiters: Map<string, Awaiter<any, any>> = new Map();

  private timeoutIds: Set<ReturnType<typeof setTimeout>> = new Set();

  options: PostMessageTransportOptions<M, any> = DEFAULT_OPTIONS;

  constructor(
    public serviceName: string,
    options: Partial<PostMessageTransportOptions<M, any>> = {}
  ) {
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    if (this.options.target) {
      this.setTarget(this.options.target);
    }

    if (this.options.isBrowser) {
      globalThis.addEventListener('message', this.handleMessage);
    }
  }

  public handleMessage = (e: MessageEvent<DataType<M, typeof this.options.encoder>>) => {
    try {
      const decoded: Message<M, keyof M> = this.options.decoder?.(e.data) ?? e.data;
      this.handleDecodedMessage(decoded);
    } catch {
      // If we can't decode the message, we just ignore it
    }
  };

  private handleDecodedMessage = (decoded: Message<M, keyof M>) => {
    if (decoded.serviceName !== this.serviceName) {
      return;
    }

    this.baseListeners[decoded.message]?.forEach(callback => callback(decoded.data));
    if (!isPromisedMessage(decoded)) {
      return;
    }

    const { requestId, data, type, message } = decoded;
    const [resolve, reject] = this.awaiters.get(requestId) ?? [];

    switch (type) {
      case MessageType.RESPONSE:
        resolve?.(data);
        break;

      case MessageType.REJECT:
        reject?.(data);
        break;

      case MessageType.REQUEST:
        this.awaitedListeners[message]?.forEach(async callback => {
          try {
            const res = await callback(data);
            this.postMessage(message, res, MessageType.RESPONSE, requestId);
          } catch (error) {
            this.postMessage(message, error instanceof Error ? error.message : JSON.stringify(error), MessageType.REJECT, requestId);
          }
        });
        break;

      default:
        break;
    }
  };

  setTarget<T extends Target>(target: T) {
    this.target = target;
  }

  private postMessage<T extends keyof OnlyBaseMessagesTransportMap<M>>(message: T, data: M[T], type: MessageType): void;

  private postMessage<T extends keyof AwaitedMessagesTransportMap<M>>(
    message: T,
    data: AwaitedMessagesTransportMap<M>[T]['request'],
    type: MessageType.REQUEST,
    requestId: string
  ): void;

  private postMessage<T extends keyof AwaitedMessagesTransportMap<M>>(
    message: T,
    data: M[T]['response'],
    type: MessageType.RESPONSE,
    requestId: string
  ): void;

  private postMessage<T extends keyof AwaitedMessagesTransportMap<M>>(
    message: T,
    data: M[T]['error'],
    type: MessageType.REJECT,
    requestId: string
  ): void;

  private postMessage<T extends keyof M>(message: T, data: any, type: MessageType, requestId?: string): void {
    if (!this.target) {
      throw new Error('Target is not set. You should call setTarget method before using this transport');
    }

    const messageData = {
      serviceName: this.serviceName,
      message,
      data,
      type,
      requestId,
    } as Message<M, T>;

    const encodedMessage = this.options.encoder?.(messageData) ?? messageData;
    this.target.postMessage(encodedMessage, this.options.targetOrigin);
  }

  destroy() {
    if (this.options.isBrowser) {
      globalThis.removeEventListener('message', this.handleMessage);
    }

    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds.clear();
    this.awaiters.forEach(([, , abortController]) => abortController.abort());
    this.awaiters.clear();
    this.baseListeners = {};
    this.awaitedListeners = {};
  }

  emit<T extends keyof OnlyBaseMessagesTransportMap<M>>(message: T, data: M[T]) {
    this.postMessage(message, data, MessageType.DEFAULT);
  }

  addHandler<T extends keyof AwaitedMessagesTransportMap<M>>(message: T, callback: AwaitedListener<M[T]>) {
    if (!this.awaitedListeners[message]) {
      this.awaitedListeners[message] = [];
    }

    this.awaitedListeners[message]?.push(callback);
  }

  removeHandler<T extends keyof AwaitedMessagesTransportMap<M>>(message: T, callback: AwaitedListener<M[T]>) {
    if (this.awaitedListeners[message]) {
      this.awaitedListeners[message] = this.awaitedListeners[message].filter(cb => cb !== callback);
    }
  }

  addOnceHandler<T extends keyof AwaitedMessagesTransportMap<M>>(message: T, callback: AwaitedListener<M[T]>) {
    if (!this.awaitedListeners[message]) {
      this.awaitedListeners[message] = [];
    }

    const handler: AwaitedListener<M[T]> = async data => {
      callback(data);
      this.removeHandler(message, handler);
    };
    this.awaitedListeners[message]?.push(handler);
  }

  on<T extends keyof OnlyBaseMessagesTransportMap<M>>(message: T, callback: Listener<M[T]>) {
    if (!this.baseListeners[message]) {
      this.baseListeners[message] = [];
    }

    this.baseListeners[message]?.push(callback);
  }

  off<T extends keyof OnlyBaseMessagesTransportMap<M>>(message: T, callback: Listener<M[T]>) {
    if (this.baseListeners[message]) {
      this.baseListeners[message] = this.baseListeners[message].filter(cb => cb !== callback);
    }
  }

  once<T extends keyof OnlyBaseMessagesTransportMap<M>>(message: T, callback: Listener<M[T]>) {
    const handler = (data: M[T]) => {
      callback(data);
      this.off(message, handler);
    };
    this.on(message, handler);
  }

  request<T extends keyof AwaitedMessagesTransportMap<M>>(
    message: T,
    data: M[T]['request'],
    { signal, timeout = this.options.timeout }: PostMessageTransportRequestOptions = {}
  ): Promise<M[T]['response']> {
    const abortController = new AbortController();
    return new Promise((resolve, reject) => {
      const id = getRandomId();
      const timeoutId =
        typeof timeout === 'number'
          ? setTimeout(() => {
              this.awaiters.delete(id);
              reject(new Error('Request timeout'));
            }, timeout)
          : null;

      if (timeoutId) {
        this.timeoutIds.add(timeoutId);
      }

      const resolver = (data: unknown) => {
        this.awaiters.delete(id);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(data);
      };

      const rejector = (data: unknown) => {
        this.awaiters.delete(id);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(data);
      };

      [abortController.signal, signal].forEach(signal =>
        signal?.addEventListener('abort', () => {
          rejector(new Error('Request aborted'));
        })
      );

      this.awaiters.set(id, [resolver, rejector, abortController]);
      this.postMessage(message, data, MessageType.REQUEST, id);
    });
  }
}
