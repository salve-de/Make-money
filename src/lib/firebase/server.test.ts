import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCloudflareRuntimeEnv: vi.fn(),
  getRuntimeEnvValue: vi.fn(),
  jwtVerify: vi.fn(),
}));

vi.mock('@/lib/runtime/cloudflare', () => ({
  getCloudflareRuntimeEnv: mocks.getCloudflareRuntimeEnv,
  getRuntimeEnvValue: mocks.getRuntimeEnvValue,
}));

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => ({})),
  jwtVerify: mocks.jwtVerify,
}));

import { verifyFirebaseIdToken } from './server';

describe('verifyFirebaseIdToken', () => {
  beforeEach(() => {
    mocks.getRuntimeEnvValue.mockReset();
    mocks.getCloudflareRuntimeEnv.mockReset();
    mocks.jwtVerify.mockReset();
    mocks.getRuntimeEnvValue.mockImplementation(async (name: string) => (
      name === 'FIREBASE_PROJECT_ID' ? 'make-money-salve-prod' : undefined
    ));
    mocks.getCloudflareRuntimeEnv.mockResolvedValue({ FIREBASE_PROJECT_ID: 'make-money-salve-prod' });
    mocks.jwtVerify.mockResolvedValue({
      payload: {
        sub: 'firebase-user-1',
        email: 'user@example.invalid',
        name: 'Test User',
      },
    });
  });

  it('uses the Worker project binding and returns verified claims', async () => {
    await expect(verifyFirebaseIdToken('signed-token')).resolves.toMatchObject({
      uid: 'firebase-user-1',
      email: 'user@example.invalid',
      name: 'Test User',
    });
    expect(mocks.jwtVerify).toHaveBeenCalledWith('signed-token', expect.anything(), expect.objectContaining({
      audience: 'make-money-salve-prod',
      issuer: 'https://securetoken.google.com/make-money-salve-prod',
    }));
  });

  it('falls back to the public project value for explicit Node runs', async () => {
    mocks.getCloudflareRuntimeEnv.mockResolvedValue(null);
    vi.stubEnv('NODE_ENV', 'test');
    mocks.getRuntimeEnvValue.mockImplementation(async (name: string) => (
      name === 'NEXT_PUBLIC_FIREBASE_PROJECT_ID' ? 'make-money-salve-prod' : undefined
    ));
    await expect(verifyFirebaseIdToken('signed-token')).resolves.toMatchObject({ uid: 'firebase-user-1' });
    expect(mocks.getRuntimeEnvValue).toHaveBeenCalledWith('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  });

  it('does not use a public build value as an authentication authority in production', async () => {
    mocks.getCloudflareRuntimeEnv.mockResolvedValue(null);
    vi.stubEnv('NODE_ENV', 'production');
    mocks.getRuntimeEnvValue.mockImplementation(async (name: string) => (
      name === 'NEXT_PUBLIC_FIREBASE_PROJECT_ID' ? 'make-money-salve-prod' : undefined
    ));
    await expect(verifyFirebaseIdToken('signed-token')).resolves.toBeNull();
    expect(mocks.jwtVerify).not.toHaveBeenCalled();
  });

  it('fails closed when no project is configured', async () => {
    mocks.getCloudflareRuntimeEnv.mockResolvedValue({});
    mocks.getRuntimeEnvValue.mockResolvedValue(undefined);
    await expect(verifyFirebaseIdToken('signed-token')).resolves.toBeNull();
    expect(mocks.jwtVerify).not.toHaveBeenCalled();
  });

  it('fails closed when the token cannot be verified', async () => {
    mocks.jwtVerify.mockRejectedValue(new Error('invalid token'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(verifyFirebaseIdToken('bad-token')).resolves.toBeNull();
    errorSpy.mockRestore();
  });

  it('fails closed in a Worker when the project binding is missing', async () => {
    mocks.getCloudflareRuntimeEnv.mockResolvedValue({});
    mocks.getRuntimeEnvValue.mockImplementation(async (name: string) => (
      name === 'NEXT_PUBLIC_FIREBASE_PROJECT_ID' ? 'make-money-salve-prod' : undefined
    ));
    await expect(verifyFirebaseIdToken('signed-token')).resolves.toBeNull();
    expect(mocks.jwtVerify).not.toHaveBeenCalled();
  });

  it('fails closed when the verified subject is not a bounded string', async () => {
    mocks.jwtVerify.mockResolvedValue({ payload: { sub: 42 } });
    await expect(verifyFirebaseIdToken('signed-token')).resolves.toBeNull();
  });
});
