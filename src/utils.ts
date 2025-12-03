import type { Message, PromisedMessage } from './typings';

export function getRandomId() {
  return Math.random().toString(36).slice(2);
}

export function isPromisedMessage(message: Message<any, any>): message is PromisedMessage<any, any> {
  return 'requestId' in message;
}
