import { type Message, type PromiseRequestMessage, type PromiseResponseMessage, type PromiseRejectMessage, MessageType } from './typings';

export function getRandomId() {
  return Math.random().toString(36).slice(2);
}

export function isPromiseRequestMessage(message: Message<any, any>): message is PromiseRequestMessage<any, any> {
  return 'requestId' in message && message.type === MessageType.REQUEST;
}

export function isPromiseResponseMessage(message: Message<any, any>): message is PromiseResponseMessage<any, any> {
  return 'requestId' in message && message.type === MessageType.RESPONSE;
}

export function isPromiseRejectMessage(message: Message<any, any>): message is PromiseRejectMessage<any, any> {
  return 'requestId' in message && message.type === MessageType.REJECT;
}

export function isPromisedMessage(
  message: Message<any, any>
): message is PromiseRequestMessage<any, any> | PromiseResponseMessage<any, any> | PromiseRejectMessage<any, any> {
  return isPromiseRequestMessage(message) || isPromiseResponseMessage(message) || isPromiseRejectMessage(message);
}
