import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock-app.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "0000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:0000000000:web:0000000000",
};

// クライアント側 Firebase アプリシングルトン
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
