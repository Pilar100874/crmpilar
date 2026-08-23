// Gestão de credenciais e teste de dispositivos da portaria (somente gestores).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { adminClient, autenticar } from "../_shared/portaria/auth.ts";
import { shellyStatus, shellyPulso } from "../_shared/portaria/shelly.ts";
import { ControlIDService } from "../_shared/portaria/controlid.ts";
import { executarViaColetor } from "../_shared/portaria/coletor.ts";

const BodySchema = z.object({
  acao: z.enum(["salvar_credenciais", "testar", "status", "pulso_teste"]),
  device_id: z.string().uuid(),
  usuario: z.string().max(200).optional(),
  senha: z.string().max(300).optional(),
  token: z.string().max(500).optional(),
});

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };
const responder = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: JSON_HEADERS });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responder(405, { error: "Método não permitido" });

  const ctx = await autenticar(req);
  if (!ctx) return responder(401, { error: "Não autenticado" });
  if (!ctx.isGestor) return responder(403, { error: "Somente administradores da portaria." });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return responder(400, { error: parsed.error.flatten().fieldErrors });
  const { acao, device_id, usuario, senha, token } = parsed.data;

  const admin = adminClient();
  const { data: device } = await admin.from("port_devices").select("*").eq("id", device_id).maybeSingle();
  if (!device) return responder(404, { error: "Dispositivo não encontrado." });

  if (acao === "salvar_credenciais") {
    const atual = await admin
      .from("port_device_credentials")
      .select("usuario, senha, token")
      .eq("device_id", device_id)
      .maybeSingle();
    const payload = {
      device_id,
      usuario: usuario ?? atual.data?.usuario ?? null,
      senha: senha ?? atual.data?.senha ?? null,
      token: token ?? atual.data?.token ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("port_device_credentials").upsert(payload);
    if (error) return responder(500, { error: "Não foi possível salvar as credenciais." });
    return responder(200, { ok: true });
  }

  const { data: cred } = await admin
    .from("port_device_credentials")
    .select("usuario, senha, token")
    .eq("device_id", device_id)
    .maybeSingle();

  let ok = false;
  let mensagem: string | undefined;
  let dados: unknown;

  if (device.via_coletor) {
    const r = await executarViaColetor(admin, {
      device_id,
      comando: acao === "pulso_teste" ? "abrir" : "status",
      parametros: { canal: device.canal_rele ?? 0, porta: 1 },
      solicitado_por: ctx.userId,
    });
    ok = r.ok; mensagem = r.mensagem; dados = r.dados;
  } else if (device.tipo === "idface") {
    const servico = new ControlIDService(device as never, cred ?? {});
    const r = acao === "pulso_teste" ? await servico.openDoor(1) : await servico.getDeviceStatus();
    ok = r.ok; mensagem = r.mensagem; dados = r.dados;
  } else {
    const r = acao === "pulso_teste"
      ? await shellyPulso(device as never, cred ?? {})
      : await shellyStatus(device as never, cred ?? {});
    ok = r.ok; mensagem = r.mensagem; dados = r.detalhes;
  }

  await admin
    .from("port_devices")
    .update({ status: ok ? "online" : "erro", ultima_comunicacao: new Date().toISOString() })
    .eq("id", device_id);

  await admin.from("port_access_events").insert({
    tipo: "teste_dispositivo",
    auth_user_id: ctx.userId,
    device_id,
    resultado: ok ? "sucesso" : "erro",
    origem: "admin",
    mensagem: mensagem ?? null,
  });

  return responder(ok ? 200 : 502, { ok, mensagem: mensagem ?? null, dados });
});
