import { createRemoteJWKSet, jwtVerify } from "jose";
import { getCloudflareRuntimeEnv, getRuntimeEnvValue } from "@/lib/runtime/cloudflare";

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
  // A live Worker context is authoritative. Never fall back to a public
  // build-time value when the Worker binding is missing, or tokens from a
  // different Firebase project could be accepted after a deployment mistake.
  const runtimeEnv = await getCloudflareRuntimeEnv();
  const runtimeProjectId = runtimeEnv && typeof runtimeEnv.FIREBASE_PROJECT_ID === 'string'
    ? runtimeEnv.FIREBASE_PROJECT_ID.trim()
    : undefined;
  // A public build value is only a development convenience. In production
  // Node/Worker execution, an unavailable runtime context must not silently
  // turn a public Firebase setting into an authentication authority.
  const privateProjectId = await getRuntimeEnvValue("FIREBASE_PROJECT_ID");
  const publicProjectId = process.env.NODE_ENV === 'production'
    ? undefined
    : await getRuntimeEnvValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const projectId = runtimeEnv ? runtimeProjectId : privateProjectId || publicProjectId;
  if (!projectId || !idToken || idToken.length > 16_384) return null;

  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) return null;

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
