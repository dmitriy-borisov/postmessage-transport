import { describe, vi, it as _it, expect } from 'vitest';
import { PostMessageTransport } from '../src/lib';
import { MyTransportMethods } from './lib.typings';

describe('Browser Emitter', () => {
  const postMessage = vi.spyOn(globalThis, 'postMessage');
  const mockAddEventListener = vi.spyOn(globalThis, 'addEventListener');

  const it = _it.extend<{ transport: PostMessageTransport<MyTransportMethods>, targetTransport: PostMessageTransport<MyTransportMethods> }>({
    transport: async ({ }, use) => {
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

  it('Should have valid serviceName', ({ transport }) => {
    expect(transport.serviceName).toBe('my-service-1');
  });

  it('Should throw error when target is missing', () => {
    const transport = new PostMessageTransport<MyTransportMethods>('my-service-1', {
      isBrowser: true,
    });
    expect(() => transport.emit('test', true)).toThrow();
  });

  it('Should call postMessage when emitting event', ({ transport }) => {
    transport.emit('test', true);
    expect(postMessage).toHaveBeenCalledWith({
      serviceName: 'my-service-1',
      message: 'test',
      data: true,
      type: 0
    }, '*');
  });

  it('Should add message event listener on initialization', () => {
    expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('Should receive one-way message', async ({ transport, targetTransport }) => {
    const callback = vi.fn();
    targetTransport.on('test', callback);
    transport.emit('test', true);
    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalledWith(true);
    });
  });

  it('Should handle request/response flow', async ({ transport, targetTransport }) => {
    const callback = vi.fn();
    targetTransport.addHandler('requestData', callback);
    transport.request('requestData', { data: 'test' }).catch(() => { });
    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  it('Should resolve awaited request', async ({ transport, targetTransport }) => {
    const callback = vi.fn(async () => ({ ok: true }));
    targetTransport.addHandler('requestData', callback);
    const res = await transport.request('requestData', { data: 'test' });
    expect(res).toEqual({ ok: true });
  });

  it('Should remove event listener', async ({ transport, targetTransport }) => {
    const callback = vi.fn();
    targetTransport.on('test', callback);
    targetTransport.off('test', callback);
    transport.emit('test', true);

    // Wait a bit to ensure it didn't fire
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(callback).not.toHaveBeenCalled();
  });

  it('Should handle once listener', async ({ transport, targetTransport }) => {
    const callback = vi.fn();
    targetTransport.once('test', callback);

    transport.emit('test', true);
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1));

    transport.emit('test', true);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('Should remove request handler', async ({ transport, targetTransport }) => {
    const callback = vi.fn();
    targetTransport.addHandler('requestData', callback);
    targetTransport.removeHandler('requestData', callback);

    // The request should timeout because there is no handler
    await expect(transport.request('requestData', { data: 'test' }, { timeout: 100 })).rejects.toThrow('Request timeout');
    expect(callback).not.toHaveBeenCalled();
  });

  it('Should handle once request handler', async ({ transport, targetTransport }) => {
    const callback = vi.fn(async () => ({ ok: true }));
    targetTransport.addOnceHandler('requestData', callback);

    await transport.request('requestData', { data: 'test' });
    expect(callback).toHaveBeenCalledTimes(1);

    // Second request should timeout
    await expect(transport.request('requestData', { data: 'test' }, { timeout: 100 })).rejects.toThrow('Request timeout');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('Should timeout request', async ({ transport }) => {
    await expect(transport.request('requestData', { data: 'test' }, { timeout: 50 })).rejects.toThrow('Request timeout');
  });

  it('Should abort request', async ({ transport }) => {
    const controller = new AbortController();
    const promise = transport.request('requestData', { data: 'test' }, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toThrow('Request aborted');
  });

  it('Should handle rejection from handler', async ({ transport, targetTransport }) => {
    targetTransport.addHandler('requestData', () => {
      throw new Error('Something went wrong');
    });

    await expect(transport.request('requestData', { data: 'test' })).rejects.toThrow('Something went wrong');
  });

  it('Should ignore messages from other services', async ({ transport, targetTransport }) => {
    const callback = vi.fn();
    targetTransport.on('test', callback);

    // Create a transport with a different service name
    const otherTransport = new PostMessageTransport<MyTransportMethods>('other-service', {
      target: globalThis,
      isBrowser: true,
    });

    otherTransport.emit('test', true);

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(callback).not.toHaveBeenCalled();

    otherTransport.destroy();
  });

  it('Should check baseListeners count', async ({ transport, targetTransport }) => {
    const callback = vi.fn();
    targetTransport.on('test', callback);
    expect((targetTransport as any).baseListeners['test']).toHaveLength(1);

    targetTransport.off('test', callback);
    expect((targetTransport as any).baseListeners['test']).toHaveLength(0);

    targetTransport.once('test', callback);
    expect((targetTransport as any).baseListeners['test']).toHaveLength(1);

    transport.emit('test', true);
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
    expect((targetTransport as any).baseListeners['test']).toHaveLength(0);
  });

  it('Should check awaitedListeners count', async ({ transport, targetTransport }) => {
    const callback = vi.fn(async () => ({ ok: true }));

    targetTransport.addHandler('requestData', callback);
    expect((targetTransport as any).awaitedListeners['requestData']).toHaveLength(1);

    targetTransport.removeHandler('requestData', callback);
    expect((targetTransport as any).awaitedListeners['requestData']).toHaveLength(0);

    targetTransport.addOnceHandler('requestData', callback);
    expect((targetTransport as any).awaitedListeners['requestData']).toHaveLength(1);

    await transport.request('requestData', { data: 'test' });
    expect(callback).toHaveBeenCalledTimes(1);
    expect((targetTransport as any).awaitedListeners['requestData']).toHaveLength(0);
  });

  it('Should check awaiters count', async ({ transport, targetTransport }) => {
    const callback = vi.fn(async () => ({ ok: true }));
    targetTransport.addHandler('requestData', callback);

    expect((transport as any).awaiters.size).toBe(0);

    const promise = transport.request('requestData', { data: 'test' });
    expect((transport as any).awaiters.size).toBe(1);

    await promise;
    expect((transport as any).awaiters.size).toBe(0);

    // Timeout case
    targetTransport.removeHandler('requestData', callback);
    await expect(transport.request('requestData', { data: 'test' }, { timeout: 10 })).rejects.toThrow();
    expect((transport as any).awaiters.size).toBe(0);

    // Abort case
    const controller = new AbortController();
    const abortPromise = transport.request('requestData', { data: 'test' }, { signal: controller.signal });
    expect((transport as any).awaiters.size).toBe(1);
    controller.abort();
    await expect(abortPromise).rejects.toThrow();
    expect((transport as any).awaiters.size).toBe(0);
  });
});
