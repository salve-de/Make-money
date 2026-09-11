import { expect, it } from 'vitest';
import { readJsonBody, readTextBody, RequestBodyTooLargeError } from './input';

it('bounds chunked request bodies without trusting Content-Length', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"value":"1234"}'));
      controller.close();
    },
  });
  const request = new Request('http://localhost', { method: 'POST', body, duplex: 'half' } as RequestInit & { duplex: 'half' });
  await expect(readJsonBody(request, 8)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
});

it('parses a bounded JSON body after reading all chunks', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ value: 'ok' }),
    headers: { 'content-type': 'application/json' },
  });
  await expect(readJsonBody(request, 1024)).resolves.toEqual({ value: 'ok' });
});

it('uses the same byte bound for signed text payloads', async () => {
  const request = new Request('http://localhost', { method: 'POST', body: 'signed payload' });
  await expect(readTextBody(request, 1024)).resolves.toBe('signed payload');
});
