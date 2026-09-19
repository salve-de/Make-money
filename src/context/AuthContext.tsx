"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, requireFirebaseAuth } from "@/lib/firebase/client";

type UserRole = "member" | "admin";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPro: boolean;
  role: UserRole | null;
  token: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserStatus: () => Promise<void>;
  refreshAuthToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isPro: false,
  role: null,
  token: null,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  refreshUserStatus: async () => {},
  refreshAuthToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [isPro, setIsPro] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const statusRequest = useRef(0);

  const refreshAuthToken = async (): Promise<string | null> => {
    const account = auth?.currentUser;
    if (!account) {
      setToken(null);
      return null;
    }
    try {
      const idToken = await account.getIdToken(true);
      if (auth?.currentUser?.uid !== account.uid) return null;
      setToken(idToken);
      return idToken;
    } catch (err) {
      if (auth?.currentUser?.uid === account.uid) setToken(null);
      console.warn("Auth token refresh error:", err);
      return null;
    }
  };

  const refreshUserStatus = async () => {
    const requestId = ++statusRequest.current;
    const account = auth?.currentUser;
    setIsPro(false);
    setRole(null);
    setToken(null);
    if (!account) return;
    try {
      const idToken = await account.getIdToken();
      if (requestId !== statusRequest.current || auth?.currentUser?.uid !== account.uid) return;
      setToken(idToken);
      const res = await fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data: unknown = await res.json();
        if (requestId === statusRequest.current && auth?.currentUser?.uid === account.uid && data && typeof data === "object") {
          const record = data as Record<string, unknown>;
          setIsPro(record.uid === account.uid && record.isPro === true);
          setRole(record.uid === account.uid && (record.role === "member" || record.role === "admin") ? record.role : null);
        }
      }
    } catch (err) {
      if (requestId === statusRequest.current) {
        setIsPro(false);
        setRole(null);
        setToken(null);
      }
      console.warn("User status sync error:", err);
    }
  };

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await refreshUserStatus();
      } else {
        ++statusRequest.current;
        setIsPro(false);
        setRole(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(requireFirebaseAuth(), provider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(requireFirebaseAuth(), email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(requireFirebaseAuth(), email, pass);
  };

  const signOut = async () => {
    if (auth) await firebaseSignOut(auth);
    setIsPro(false);
    setRole(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isPro,
        role,
        token,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshUserStatus,
        refreshAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
