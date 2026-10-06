// 手元確認用の中継: 画像（/api/media*）だけ本番から取り、残りは手元の画面へ流す。使い方: node media-proxy.mjs <受ける番号> <手元の画面の番号>
import http from 'node:http';
import net from 'node:net';
const [listenPort, localPort] = process.argv.slice(2).map(Number);
const PROD = 'https://make-money-app.sato-business-0117.workers.dev';
const LOCAL = `http://localhost:${localPort}`;
http.createServer(async (req, res) => {
  const base = req.url.startsWith('/api/media') ? PROD : LOCAL;
  try {
    const chunks = []; for await (const c of req) chunks.push(c);
    const headers = { ...req.headers }; delete headers.host; delete headers['accept-encoding'];
    const r = await fetch(base + req.url, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined, redirect: 'manual' });
    const h = {}; r.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) h[k] = v; });
    res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.writeHead(502); res.end(String(e)); }
}).on('upgrade', (req, sock, head) => {
  // 開発画面の自動更新（WebSocket）は手元へそのまま通す
  const up = net.connect(localPort, 'localhost', () => {
    up.write(`${req.method} ${req.url} HTTP/1.1\r\n` + Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n');
    if (head?.length) up.write(head);
    sock.pipe(up).pipe(sock);
  });
  up.on('error', () => sock.destroy()); sock.on('error', () => up.destroy());
}).listen(listenPort, () => console.log(`中継 ${listenPort} → ${localPort}`));
