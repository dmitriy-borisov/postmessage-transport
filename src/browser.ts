import { PostMessageTransport } from './lib';

(target => {
  Object.defineProperty(target, 'PostMessageTransport', {
    value: PostMessageTransport,
    writable: false,
    configurable: false,
    enumerable: false,
  });
})(globalThis || window);
