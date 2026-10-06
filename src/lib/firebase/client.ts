import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { currentUserAgent, resolveAuthEmulatorHost } from './emulator';

// NEXT_PUBLIC values must be present when building the browser bundle.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};
export const firebaseAuthConfigured = [firebaseConfig.apiKey, firebaseConfig.authDomain, firebaseConfig.projectId, firebaseConfig.appId]
  .every((value) => typeof value === 'string' && value.trim().length > 0 && !/^(mock-|your[-_])/i.test(value));

// Public pages can render without Firebase. Do not create a fake project/client.
export const app: FirebaseApp | null = firebaseAuthConfigured
  ? getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  : null;
export const auth: Auth | null = app ? getAuth(app) : null;

// ローカル開発専用。本番ビルド・demo- 以外のプロジェクト・localhost 以外の宛先では必ず無効（./emulator.ts）。
export const authEmulatorHost = resolveAuthEmulatorHost({
  nodeEnv: process.env.NODE_ENV,
  host: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
  projectId: firebaseConfig.projectId,
  userAgent: currentUserAgent(),
});
if (auth && authEmulatorHost && !(auth as Auth & { emulatorConfig?: unknown }).emulatorConfig) {
  connectAuthEmulator(auth, `http://${authEmulatorHost}`, { disableWarnings: true });
}
export function requireFirebaseAuth(): Auth {
  if (!auth) throw new Error('この環境ではログイン設定が未完了です。現在はログイン・新規登録を利用できません。');
  return auth;
}
