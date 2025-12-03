import { Listener, Message, MessageType, Options, PostMessageTransportMap, Awaiter, Target } from './typings';
import { isPromisedMessage, getRandomId } from './utils';

const DEFAULT_OPTIONS: Options<any, any> = {
  isBrowser: typeof window !== 'undefined',
  targetOrigin: '*',
};

export class PostMessageTransport<M extends PostMessageTransportMap> {
  private target: Target | null = null;

  private listeners: Partial<Record<keyof M, Listener<any>[]>> = {};

  private awaiters: Map<string, Awaiter<any, any>> = new Map();

  options: Options<M, any> = DEFAULT_OPTIONS;

  constructor(
    public serviceName: string,
    options: Partial<Options<M, any>> = {}
  ) {
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    if (this.options.target) {
      this.target = this.options.target;
    }

    if (this.options.isBrowser) {
      globalThis.addEventListener('message', this.messageListener);
    }
  }

  private createMessageResolver<M extends PostMessageTransportMap, K extends keyof M>(message: K, requestId: string) {
    return {
      resolver: (data: M[K]) => this.postMessage(message, data, MessageType.RESPONSE, requestId),
      rejector: (data: M[K]) => this.postMessage(message, data, MessageType.REJECT, requestId),
    };
  }

  public messageListener = (e: MessageEvent<Message<M, any>>) => {
    try {
      const decoded: Message<M, any> = this.options.decoder?.(e.data) ?? e.data;
      this.messageListenerHandler(decoded);
    } catch {
      // If we can't decode the message, we just ignore it
    }
  }

  private messageListenerHandler = (decoded: Message<M, any>) => {
    if (decoded.serviceName !== this.serviceName) {
      return;
    }

    if (!isPromisedMessage(decoded)) {
      const { message, data } = decoded;
      this.listeners[message]?.forEach(callback => callback(data));
      return;
    }

    const { requestId, data, type, message } = decoded;
    const [resolve, reject] = this.awaiters.get(requestId) ?? [];

    switch (type) {
      case MessageType.RESPONSE:
        resolve?.(data);
        this.awaiters.delete(requestId);
        break;

      case MessageType.REJECT:
        reject?.(data);
        this.awaiters.delete(requestId);
        break;

      case MessageType.REQUEST:
        const { resolver, rejector } = this.createMessageResolver(message, requestId);
        this.listeners[message]?.forEach(callback => callback(data, resolver, rejector));
        break;

      default:
        break;
    }
  };

  setTarget(target: Target) {
    this.target = target;
  }

  private postMessage<T extends keyof M>(message: T, data: M[T], type: MessageType, requestId?: string) {
    if (!this.target) {
      throw new Error('Target is not set. You should call setTarget method before using this transport');
    }

    const messageData = {
      serviceName: this.serviceName,
      message,
      data,
      type,
      requestId,
    };
    const encodedMessage = this.options.encoder?.(messageData) ?? messageData;
    this.target.postMessage(encodedMessage, this.options.targetOrigin);
  }

  destroy() {
    if (this.options.isBrowser) {
      globalThis.removeEventListener('message', this.messageListener);
    }
  }

  emit<T extends keyof M>(message: T, data: M[T]) {
    this.postMessage(message, data, MessageType.DEFAULT);
  }

  on<T extends keyof M>(message: T, callback: Listener<M[T]>) {
    if (!this.listeners[message]) {
      this.listeners[message] = [];
    }

    this.listeners[message]?.push(callback);
  }

  off<T extends keyof M>(message: T, callback: Listener<M[T]>) {
    this.listeners[message]?.filter(cb => cb !== callback);
  }

  once<T extends keyof M>(message: T, callback: Listener<M[T]>) {
    const handler = (data: M[T]) => {
      callback(data);
      this.off(message, handler);
    };
    this.on(message, handler);
  }

  request<T extends keyof M>(message: T, data: M[T]) {
    return new Promise((resolve, reject) => {
      const id = getRandomId();
      this.awaiters.set(id, [resolve, reject]);
      this.postMessage(message, data, MessageType.REQUEST, id);
    });
  }
}
