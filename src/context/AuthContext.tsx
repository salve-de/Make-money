"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPro: boolean;
  token: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isPro: false,
  token: null,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  refreshUserStatus: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const refreshUserStatus = async () => {
    if (!auth.currentUser) {
      setIsPro(false);
      setToken(null);
      return;
    }
    try {
      const idToken = await auth.currentUser.getIdToken();
      setToken(idToken);
      // バックエンドからPRO会員ステータス取得（DB接続時）
      const res = await fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsPro(Boolean(data.isPro));
      }
    } catch (err) {
      console.warn("User status sync error:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await refreshUserStatus();
      } else {
        setIsPro(false);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setIsPro(false);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isPro,
        token,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshUserStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
