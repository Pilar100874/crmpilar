const TV_TOKEN_PARAM = "tv_token";

export function getTvDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(TV_TOKEN_PARAM) || null;
}

export function getUrlEstabelecimentoId(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("estabelecimento_id") || params.get("estabelecimentoId") || null;
}

export async function callTvDeviceFunction<T>(functionName: string, token: string): Promise<T> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "x-device-token": token,
      "Content-Type": "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Erro ${response.status}`);
  return payload as T;
}