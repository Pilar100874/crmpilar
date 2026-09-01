import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({
  unidade_id: z.string().uuid().nullable().optional(),
  titulo: z.string().min(1).max(120).optional(),
  corpo: z.string().min(1).max(300).optional(),
  tipo: z.enum(["campainha", "sip"]).optional(),
  rota: z.string().max(200).optional(),
  origem: z.string().max(120).optional(),
});

type ServiceAccount = { client_email: string; private_key: string; project_id: string };

function base64url(bytes: Uint8Array | string) {
  const raw = typeof bytes === "string" ? bytes : String.fromCharCode(...bytes);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemParaArrayBuffer(pem: string) {
  const limpo = pem.replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(limpo);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/** Troca a chave da conta de serviço por um access token do FCM (HTTP v1). */
async function obterAccessToken(sa: ServiceAccount) {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: agora,
    exp: agora + 3600,
  }));
  const chave = await crypto.subtle.importKey(
    "pkcs8",
    pemParaArrayBuffer(sa.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", chave, new TextEncoder().encode(`${cabecalho}.${payload}`)),
  );
  const jwt = `${cabecalho}.${payload}.${base64url(assinatura)}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description ?? "Falha ao autenticar no serviço de notificações.");
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json(400, { error: parsed.error.flatten().fieldErrors });
    const { unidade_id = null, titulo, corpo, tipo = "campainha", rota, origem } = parsed.data;
    const ehSip = tipo === "sip";
    const canal = ehSip ? "ramal_sip" : "interfone";
    const rotaFinal = rota ?? (ehSip ? "/app/ramal" : "/app/interfone");
    const tituloFinal = titulo ?? (ehSip ? "Chamada no ramal SIP" : "Campainha do interfone");
    const corpoFinal = corpo ??
      (ehSip
        ? `Ligação recebida${origem ? ` de ${origem}` : ""}. Toque para atender.`
        : "Alguém está na portaria. Toque para atender.");

    const bruto = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (!bruto) return json(200, { ok: false, mensagem: "Notificações no celular ainda não configuradas." });
    const sa = JSON.parse(bruto) as ServiceAccount;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let q = admin.from("port_push_tokens").select("token, unidade_id").eq("ativo", true);
    if (unidade_id) q = q.or(`unidade_id.eq.${unidade_id},unidade_id.is.null`);
    const { data: tokens } = await q;
    if (!tokens?.length) return json(200, { ok: true, enviados: 0, mensagem: "Nenhum celular registrado." });

    const accessToken = await obterAccessToken(sa);
    let enviados = 0;
    const invalidos: string[] = [];

    for (const t of tokens) {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token: t.token,
            notification: { title: tituloFinal, body: corpoFinal },
            data: { rota: rotaFinal, tipo, origem: origem ?? "" },
            android: { priority: "HIGH", notification: { channel_id: canal, sound: "default" } },
            apns: { payload: { aps: { sound: "default", "content-available": 1 } } },
          },
        }),
      });
      if (r.ok) enviados++;
      else if (r.status === 404 || r.status === 400) invalidos.push(t.token);
    }

    if (invalidos.length) {
      await admin.from("port_push_tokens").update({ ativo: false }).in("token", invalidos);
    }

    return json(200, { ok: true, enviados, removidos: invalidos.length });
  } catch (e) {
    return json(200, { ok: false, mensagem: (e as Error).message });
  }
});
