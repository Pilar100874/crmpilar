// Automação: liga/desliga/pulso/status dos blocos do painel (Shelly).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { adminClient, autenticar } from "../_shared/portaria/auth.ts";
import { shellyLigar, shellyPulso, shellyStatus, estadoDoCanal } from "../_shared/portaria/shelly.ts";
import { executarViaColetor } from "../_shared/portaria/coletor.ts";

const BodySchema = z.object({
  acao: z.enum(["ligar", "desligar", "pulso", "status"]),
  device_id: z.string().uuid(),
  canal: z.number().int().min(0).max(8).optional(),
});

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };
const responder = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: JSON_HEADERS });

/** Endereços que só existem na rede local do cliente. */
function ehEnderecoLocal(ip?: string | null, endpoint?: string | null): boolean {
  let host = (ip ?? "").trim();
  if (!host && endpoint) {
    try { host = new URL(endpoint).hostname; } catch { host = endpoint.replace(/^\w+:\/\//, "").split("/")[0].split(":")[0]; }
  }
  if (!host) return false;
  host = host.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return true;
  const p = host.split(".").map((n) => Number(n));
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n))) return false;
  if (p[0] === 10 || p[0] === 127) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 169 && p[1] === 254) return true;
  return false;
}

function mensagemAmigavel(msg?: string | null, ip?: string | null): string {
  const m = msg ?? "";
  if (/EHOSTUNREACH|ETIMEDOUT|ECONNREFUSED|timed out|abort/i.test(m)) {
    return `O equipamento${ip ? ` (${ip})` : ""} não respondeu na rede. Verifique se ele está ligado e conectado.`;
  }
  return m || "Não foi possível concluir o comando.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responder(405, { error: "Método não permitido" });

  const ctx = await autenticar(req);
  if (!ctx) return responder(401, { error: "Não autenticado" });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return responder(400, { error: "Dados inválidos" });
  const { acao, device_id } = parsed.data;

  const admin = adminClient();
  const { data: device } = await admin.from("port_devices").select("*").eq("id", device_id).maybeSingle();
  if (!device) return responder(200, { ok: false, error: "Dispositivo não encontrado." });
  if (device.habilitado === false) return responder(200, { ok: false, error: "Dispositivo desabilitado." });

  const canal = parsed.data.canal ?? device.canal_rele ?? 0;
  const { data: cred } = await admin
    .from("port_device_credentials")
    .select("usuario, senha, token")
    .eq("device_id", device_id)
    .maybeSingle();

  const local = device.via_coletor || ehEnderecoLocal(device.ip, device.endpoint);

  let ok = false;
  let mensagem: string | undefined;
  let dados: unknown;

  if (local) {
    const comando = acao === "pulso" ? "abrir" : acao === "status" ? "status" : acao;
    const r = await executarViaColetor(admin, {
      device_id,
      comando,
      parametros: { canal },
      solicitado_por: ctx.userId,
    });
    ok = r.ok; mensagem = r.mensagem; dados = r.dados;
  } else if (acao === "pulso") {
    const r = await shellyPulso({ ...device, canal_rele: canal } as never, cred ?? {});
    ok = r.ok; mensagem = r.mensagem; dados = r.detalhes;
  } else if (acao === "status") {
    const r = await shellyStatus(device as never, cred ?? {});
    ok = r.ok; mensagem = r.mensagem; dados = r.detalhes;
  } else {
    const r = await shellyLigar(device as never, cred ?? {}, canal, acao === "ligar");
    ok = r.ok; mensagem = r.mensagem; dados = r.detalhes;
  }

  await admin
    .from("port_devices")
    .update({ status: ok ? "online" : "erro", ultima_comunicacao: new Date().toISOString() })
    .eq("id", device_id);

  const ligado = ok ? estadoDoCanal(dados, canal) : null;

  return responder(200, {
    ok,
    error: ok ? undefined : mensagemAmigavel(mensagem, device.ip),
    mensagem: mensagem ?? null,
    ligado: acao === "ligar" ? true : acao === "desligar" ? false : ligado,
  });
});
