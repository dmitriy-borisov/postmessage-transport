import { describe, vi, it as _it, expect, Mock } from 'vitest';
import { PostMessageTransport } from '../src/lib';
import { MyTransportMethods } from './lib.typings';

// Mock globalThis


describe('Browser Emitter', () => {
  const postMessage = vi.fn();
  vi.stubGlobal('addEventListener', vi.fn());
  vi.stubGlobal('removeEventListener', vi.fn());
  vi.stubGlobal('postMessage', postMessage);

  const it = _it.extend<{ transport: PostMessageTransport<MyTransportMethods> }>({
    transport: async ({ }, use) => {
      const transport = new PostMessageTransport<MyTransportMethods>('my-service-1', {
        isBrowser: true,
      });
      use(transport);
    }
  });

  it('Should has valid serviceName', ({ transport }) => {
    expect(transport.serviceName).toBe('my-service-1');
  });

  it('Should throw error if target is not set', ({ transport }) => {
    expect(() => transport.emit('test', true)).toThrow();
  });

  it('Should call postMessage', ({ transport }) => {
    transport.setTarget(globalThis);
    transport.emit('test', true);
    expect(postMessage).toHaveBeenCalledWith({
      serviceName: 'my-service-1',
      message: 'test',
      data: true,
      type: 0
    }, '*');
  });

  it('Should receive message', ({ transport }) => {
    const mockAddEventListener = vi.spyOn(globalThis, 'addEventListener');
    transport.setTarget(globalThis);
    transport.on('test', () => { });
    transport.emit('test', true);

    expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('Should call encoded message to base64', () => {
    const transport = new PostMessageTransport<MyTransportMethods>('my-service-1', {
      target: globalThis,
      encoder: (data) => Buffer.from(JSON.stringify(data)).toString('base64'),
      decoder: (data) => JSON.parse(Buffer.from(data, 'base64').toString()),
    });
    transport.emit('test', true);
    expect(postMessage).toHaveBeenCalledWith('eyJzZXJ2aWNlTmFtZSI6Im15LXNlcnZpY2UtMSIsIm1lc3NhZ2UiOiJ0ZXN0IiwiZGF0YSI6dHJ1ZSwidHlwZSI6MH0=', '*');
  });
});