import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnsecuredJWT } from 'jose';
import { resolveAuthEmulatorHost } from './emulator';
import { resolveLocalStripeHost } from '../stripe';

vi.mock('@/lib/runtime/cloudflare', () => ({
  getCloudflareRuntimeEnv: vi.fn(async () => ({ FIREBASE_PROJECT_ID: 'make-money-salve-prod' })),
  getRuntimeEnvValue: vi.fn(async () => undefined),
}));

const ok = { nodeEnv: 'development', host: '127.0.0.1:9139', projectId: 'demo-make-money' };

describe('resolveAuthEmulatorHost（ローカル専用の切替）', () => {
  it('開発中・localhost・demo- プロジェクトがそろったときだけ有効', () => {
    expect(resolveAuthEmulatorHost(ok)).toBe('127.0.0.1:9139');
    expect(resolveAuthEmulatorHost({ ...ok, host: 'localhost:9099' })).toBe('localhost:9099');
  });

  it('本番ビルドでは必ず無効', () => {
    expect(resolveAuthEmulatorHost({ ...ok, nodeEnv: 'production' })).toBeNull();
  });

  it('Cloudflare Workers の中では必ず無効', () => {
    expect(resolveAuthEmulatorHost({ ...ok, userAgent: 'Cloudflare-Workers' })).toBeNull();
  });

  it('localhost 以外の宛先・ポート無し・demo- 以外のプロジェクトは無効', () => {
    expect(resolveAuthEmulatorHost({ ...ok, host: 'emulator.example.com:9139' })).toBeNull();
    expect(resolveAuthEmulatorHost({ ...ok, host: '10.0.0.5:9139' })).toBeNull();
    expect(resolveAuthEmulatorHost({ ...ok, host: '127.0.0.1' })).toBeNull();
    expect(resolveAuthEmulatorHost({ ...ok, host: '127.0.0.1:99999' })).toBeNull();
    expect(resolveAuthEmulatorHost({ ...ok, projectId: 'make-money-salve-prod' })).toBeNull();
    expect(resolveAuthEmulatorHost({ ...ok, host: undefined })).toBeNull();
  });
});

describe('resolveLocalStripeHost（決済の偽装サーバーへの切替）', () => {
  const stripeOk = { nodeEnv: 'development', host: '127.0.0.1:12111', secret: 'sk_test_local_mock' };
  it('開発中・localhost・テスト用の鍵のときだけ有効', () => {
    expect(resolveLocalStripeHost(stripeOk)).toEqual({ host: '127.0.0.1', port: 12111 });
  });
  it('本番・Workers・本番用の鍵・外部の宛先では無効', () => {
    expect(resolveLocalStripeHost({ ...stripeOk, nodeEnv: 'production' })).toBeNull();
    expect(resolveLocalStripeHost({ ...stripeOk, userAgent: 'Cloudflare-Workers' })).toBeNull();
    expect(resolveLocalStripeHost({ ...stripeOk, secret: 'sk_live_x' })).toBeNull();
    expect(resolveLocalStripeHost({ ...stripeOk, host: 'api.stripe.com:443' })).toBeNull();
  });
});

describe('verifyFirebaseIdToken とエミュレーターの署名なしトークン', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  const unsigned = (projectId: string, sub = 'emu-user-1') => new UnsecuredJWT({ email: 'w1@example.test' })
    .setSubject(sub).setIssuer(`https://securetoken.google.com/${projectId}`).setAudience(projectId)
    .setIssuedAt().setExpirationTime('1h').encode();

  async function load(env: Record<string, string>) {
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'demo-make-money');
    vi.stubEnv('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9139');
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    return (await import('./server')).verifyFirebaseIdToken;
  }

  it('開発中は demo- プロジェクトの署名なしトークンを受け付ける', async () => {
    const verify = await load({ NODE_ENV: 'development' });
    await expect(verify(unsigned('demo-make-money'))).resolves.toMatchObject({ uid: 'emu-user-1', email: 'w1@example.test' });
  });

  it('別プロジェクトの署名なしトークンは拒む', async () => {
    const verify = await load({ NODE_ENV: 'development' });
    await expect(verify(unsigned('demo-other'))).resolves.toBeNull();
  });

  it('本番では署名なしトークンを受け付けない', async () => {
    const verify = await load({ NODE_ENV: 'production' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(verify(unsigned('demo-make-money'))).resolves.toBeNull();
  });
});
