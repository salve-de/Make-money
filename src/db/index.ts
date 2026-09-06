import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon PostgreSQL Serverless クライアント
// Cloudflare Workers / Edge / Node.js 全環境で完全互換
const connectionString = process.env.DATABASE_URL || "";

// DATABASE_URLが未設定の場合の安全な初期化
const sql = connectionString ? neon(connectionString) : null;

export const db = sql ? drizzle(sql, { schema }) : null;

export * from "./schema";
