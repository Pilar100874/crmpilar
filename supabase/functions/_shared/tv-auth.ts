// Shared helpers para APIs de TV Signage
import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SECRET = Deno.env.get("TV_DEVICE_JWT_SECRET") || "insecure-fallback";

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function hmacSha256(data: string, secret = SECRET): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64u(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signDeviceJwt(deviceId: string, estabelecimentoId: string, ttlSeconds = 60 * 60 * 24 * 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: deviceId, est: estabelecimentoId, iat: now, exp: now + ttlSeconds };
  const data = `${b64u(header)}.${b64u(payload)}`;
  const sig = await hmacSha256(data);
  return `${data}.${sig}`;
}

export async function verifyDeviceJwt(token: string): Promise<{ deviceId: string; estabelecimentoId: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = await hmacSha256(`${h}.${p}`);
  if (expected !== s) return null;
  try {
    const payload = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { deviceId: payload.sub, estabelecimentoId: payload.est };
  } catch {
    return null;
  }
}

export async function authenticateDevice(req: Request) {
  const token = req.headers.get("x-device-token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return await verifyDeviceJwt(token);
}
