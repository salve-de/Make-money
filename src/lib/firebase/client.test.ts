import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ initializeApp: vi.fn(() => ({ name: 'configured-app' })), getApps: vi.fn(() => []), getApp: vi.fn(), getAuth: vi.fn(() => ({ currentUser: null })) }));
vi.mock('firebase/app', () => sdk);
vi.mock('firebase/auth', () => sdk);
const keys = ['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'];
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); for (const key of keys) vi.stubEnv(key, ''); });
afterEach(() => vi.unstubAllEnvs());
it('keeps public pages usable without creating a fake authentication project', async () => {
  const client = await import('./client');
  expect(client.auth).toBeNull(); expect(client.app).toBeNull();
  expect(sdk.initializeApp).not.toHaveBeenCalled(); expect(sdk.getAuth).not.toHaveBeenCalled();
  expect(() => client.requireFirebaseAuth()).toThrow('ログイン設定が未完了');
});
it('requires all four browser authentication configuration values', async () => {
  for (const key of keys.slice(0, 3)) vi.stubEnv(key, 'configured');
  expect((await import('./client')).auth).toBeNull();
});
it('initializes the configured project without inventing storage or messaging settings', async () => {
  for (const key of keys) vi.stubEnv(key, 'configured');
  const client = await import('./client');
  expect(client.requireFirebaseAuth()).toEqual({ currentUser: null });
  expect(sdk.initializeApp).toHaveBeenCalledOnce(); expect(sdk.getAuth).toHaveBeenCalledOnce();
});
it('rejects old mock configuration instead of presenting a broken login', async () => {
  for (const key of keys) vi.stubEnv(key, 'mock-project');
  expect((await import('./client')).auth).toBeNull();
});
