import { corsHeaders, json, serviceClient, sha256Hex, signDeviceJwt } from "../_shared/tv-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { codigo, token } = await req.json();
    if (!codigo || !token) return json({ error: "codigo e token obrigatórios" }, 400);

    const sb = serviceClient();
    const { data: device, error } = await sb
      .from("tv_devices")
      .select("id, estabelecimento_id, token_hash, bloqueado")
      .eq("codigo", String(codigo).toUpperCase())
      .maybeSingle();

    if (error || !device) return json({ error: "dispositivo não encontrado" }, 404);
    if (device.bloqueado) return json({ error: "dispositivo bloqueado" }, 403);

    const hash = await sha256Hex(String(token));
    if (hash !== device.token_hash) return json({ error: "token inválido" }, 401);

    const jwt = await signDeviceJwt(device.id, device.estabelecimento_id);
    await sb.from("tv_devices").update({
      ultima_comunicacao: new Date().toISOString(),
      emparelhado_em: new Date().toISOString(),
      status: "online",
    }).eq("id", device.id);

    return json({
      device_id: device.id,
      estabelecimento_id: device.estabelecimento_id,
      session_jwt: jwt,
      expires_in: 60 * 60 * 24 * 7,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
