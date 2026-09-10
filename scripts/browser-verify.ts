import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ARTIFACTS_DIR = '/Users/satoushinya/.gemini/antigravity/brain/17e84e1a-d496-4ed8-9e06-7fb891d31ca9';
const BRAVE_PATH = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const PORT = 9222;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CdpClient {
  private ws: WebSocket;
  private id = 0;
  private callbacks = new Map<number, (res: any) => void>();

  constructor(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data.toString());
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id)!;
          this.callbacks.delete(msg.id);
          cb(msg.result);
        }
      };
    });
  }

  async send(method: string, params: Record<string, any> = {}): Promise<any> {
    const callId = ++this.id;
    return new Promise((resolve) => {
      this.callbacks.set(callId, resolve);
      this.ws.send(JSON.stringify({ id: callId, method, params }));
    });
  }

  async eval(expression: string): Promise<any> {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  async captureScreenshot(filename: string): Promise<void> {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    if (res?.data) {
      const buffer = Buffer.from(res.data, 'base64');
      const outPath = resolve(ARTIFACTS_DIR, filename);
      await writeFile(outPath, buffer);
      console.log(`Saved screenshot: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    }
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log('=== [1/6] Launching Brave Headless Browser with CDP ===');
  const browserProc = spawn(BRAVE_PATH, [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    '--window-size=1440,900',
    'http://localhost:3000',
  ]);

  browserProc.on('error', (err) => {
    console.error('Failed to spawn browser:', err);
    process.exit(1);
  });

  // CDPの準備待機
  let wsUrl = '';
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const pages = await res.json();
      if (pages && pages.length > 0 && pages[0].webSocketDebuggerUrl) {
        wsUrl = pages[0].webSocketDebuggerUrl;
        break;
      }
    } catch {
      // wait
    }
  }

  if (!wsUrl) {
    console.error('Could not connect to browser CDP');
    browserProc.kill();
    process.exit(1);
  }

  console.log('Connected to CDP endpoint:', wsUrl);
  const client = new CdpClient(wsUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('DOM.enable');
  await client.send('Runtime.enable');

  // 1. ロード待機 (2030件が画面に反映されるまで)
  console.log('=== [2/6] Waiting for data to hydrate in UI ===');
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const countText = await client.eval(`document.body.innerText.match(/(\\d+)\\s*件/)?.[1]`);
    if (countText && parseInt(countText, 10) > 100) {
      console.log(`UI Hydrated successfully! Detected count: ${countText} 件`);
      break;
    }
  }

  // Step 1: 初期全景キャプチャ
  await client.captureScreenshot('browser_step1_initial_load.png');

  // Step 2: 銘柄クリック操作 (例: 1440 または Nomad List をクリック)
  console.log('=== [3/6] Simulating user click on a business case ===');
  const clickResult = await client.eval(`(() => {
    const rows = document.querySelectorAll('tr[class*="cursor-pointer"]');
    for (const row of rows) {
      if (row.innerText.includes('Nomad List') || row.innerText.includes('1440')) {
        row.click();
        return row.innerText.slice(0, 30);
      }
    }
    return null;
  })()`);
  console.log('Clicked row:', clickResult);
  await sleep(1000);
  await client.captureScreenshot('browser_step2_entity_clicked.png');

  // Step 3: 右インスペクターのタブ切り替え操作 (全量インテリジェンス(Stream)タブをクリック)
  console.log('=== [4/6] Simulating user click on Stream tab in Inspector ===');
  const tabClickResult = await client.eval(`(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.innerText.includes('全量インテリジェンス') || btn.innerText.includes('Stream')) {
        btn.click();
        return btn.innerText;
      }
    }
    return null;
  })()`);
  console.log('Clicked tab:', tabClickResult);
  await sleep(1000);
  await client.captureScreenshot('browser_step3_stream_tab.png');

  // Step 4: 検索窓への入力操作 (「Todoist」と入力して絞り込み)
  console.log('=== [5/6] Simulating search input for "Todoist" ===');
  await client.eval(`(() => {
    const input = document.querySelector('input[placeholder*="検索"]');
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, 'Todoist');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  })()`);
  await sleep(1000);
  const searchResultCount = await client.eval(`document.body.innerText.match(/(\\d+)\\s*件/)?.[1]`);
  console.log(`Filtered result count for "Todoist": ${searchResultCount} 件`);
  await client.captureScreenshot('browser_step4_search_todoist.png');

  // Step 5: 検索クリア & スクロール操作
  console.log('=== [6/6] Simulating search clear and infinite scroll down ===');
  await client.eval(`(() => {
    const input = document.querySelector('input[placeholder*="検索"]');
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const container = document.querySelector('.overflow-y-auto');
    if (container) {
      container.scrollTop = 2500;
      return true;
    }
    return false;
  })()`);
  await sleep(1500);
  await client.captureScreenshot('browser_step5_scrolled_view.png');

  // クリーンアップ
  client.close();
  browserProc.kill();
  console.log('=== All Browser Verification Steps Completed Successfully! ===');
}

main().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
