import http from 'node:http';
import net from 'node:net';

const TARGET_PORT = 3000;
const PROXY_PORT = 3001;

const server = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${TARGET_PORT}`,
      'x-forwarded-for': req.socket.remoteAddress,
      'x-forwarded-proto': 'http',
      'x-forwarded-port': `${PROXY_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy 3001 -> 3000 Error]:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`502 Bad Gateway: Could not connect to Next.js on port ${TARGET_PORT}`);
    }
  });

  req.pipe(proxyReq, { end: true });
});

server.on('upgrade', (req, socket, head) => {
  const targetSocket = net.connect(TARGET_PORT, '127.0.0.1', () => {
    targetSocket.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
      Object.entries(req.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n'
    );
    if (head && head.length > 0) targetSocket.write(head);
    socket.pipe(targetSocket);
    targetSocket.pipe(socket);
  });

  targetSocket.on('error', (err) => {
    console.error(`[Proxy 3001 Upgrade Error]:`, err.message);
    socket.destroy();
  });
  socket.on('error', () => {
    targetSocket.destroy();
  });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`✓ Proxy listening on http://localhost:${PROXY_PORT} -> http://127.0.0.1:${TARGET_PORT}`);
});
