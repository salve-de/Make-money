import { createRemoteJWKSet, jwtVerify } from "jose";

// Google Firebase Auth 公開JWKSエンドポイント
const FIREBASE_JWKS_URL = new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
);
const jwks = createRemoteJWKSet(FIREBASE_JWKS_URL);

export interface VerifiedFirebaseToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  claims: Record<string, unknown>;
}

/**
 * Cloudflare Workers / Edge / Node.js 完全互換の Firebase ID トークン検証関数
 * @param idToken クライアントから送信された Authorization: Bearer <idToken>
 * @returns 検証済みユーザー情報
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedFirebaseToken | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || !idToken) return null;

  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (!payload.sub) return null;

    return {
      uid: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
      claims: payload,
    };
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    return null;
  }
}
