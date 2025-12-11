import { describe, vi, it as _it, expect, beforeEach } from 'vitest';
import { PostMessageTransport } from '../src/lib';
import { MyTransportMethods } from './lib.typings';
import { wait } from './utils';

// Mock globalThis


describe('Browser Emitter', () => {
  const postMessage = vi.spyOn(globalThis, 'postMessage');
  const mockAddEventListener = vi.spyOn(globalThis, 'addEventListener');

  const it = _it.extend<{ transport: PostMessageTransport<MyTransportMethods>, targetTransport: PostMessageTransport<MyTransportMethods> }>({
    transport: async ({ }, use) => {
      console.log('create transport');
      const transport = new PostMessageTransport<MyTransportMethods>('my-service-1', {
        target: globalThis,
        isBrowser: true,
      });
      await use(transport);
      transport.destroy();
    },
    targetTransport: async ({ }, use) => {
      const transport = new PostMessageTransport<MyTransportMethods>('my-service-1', {
        target: globalThis,
        isBrowser: true,
      });
      await use(transport);
      transport.destroy();
    }
  });

  it('Should has valid serviceName', ({ transport }) => {
    expect(transport.serviceName).toBe('my-service-1');
  });

  it('Should throw error if target is not set', () => {
    const transport = new PostMessageTransport<MyTransportMethods>('my-service-1', {
      isBrowser: true,
    });
    expect(() => transport.emit('test', true)).toThrow();
  });

  it('Should call postMessage', ({ transport }) => {
    transport.emit('test', true);
    expect(postMessage).toHaveBeenCalledWith({
      serviceName: 'my-service-1',
      message: 'test',
      data: true,
      type: 0
    }, '*');
  });

  it('Should add event listener', () => {
    expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('Should receive message', async ({ transport, targetTransport }) => {
    const callback = vi.fn();
    targetTransport.on('test', callback);
    transport.emit('test', true);
    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalledWith(true);
    });
  });

  it('Should receive awaited message', async ({ transport, targetTransport }) => {
    const callback = vi.fn();
    targetTransport.addHandler('requestData', callback);
    transport.request('requestData', { data: 'test' });
    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalledWith({ data: 'test' }, expect.any(Function), expect.any(Function));
    });
  });

  it('Should receive resolved awaited message', async ({ transport, targetTransport }) => {
    const callback = vi.fn((_, resolve) => resolve({ ok: true }));
    targetTransport.addHandler('requestData', callback);
    const res = await transport.request('requestData', { data: 'test' });
    expect(res).toEqual({ ok: true });
  });
});
