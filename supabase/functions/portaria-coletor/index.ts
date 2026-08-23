// Endpoint do Coletor Pilar (agente instalado na rede local do cliente).
// Autenticação por chave do coletor (tabela port_coletores), nunca por JWT de usuário.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { adminClient } from "../_shared/portaria/auth.ts";

const BodySchema = z.object({
  token: z.string().min(10).max(200).optional(),
  acao: z.enum(["handshake", "jobs", "resultado"]),
  versao: z.string().max(40).optional(),
  ip_local: z.string().max(60).optional(),
  job_id: z.string().uuid().optional(),
  ok: z.boolean().optional(),
  mensagem: z.string().max(500).optional(),
  dados: z.unknown().optional(),
  limite: z.number().int().min(1).max(20).optional(),
});

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };
const responder = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: JSON_HEADERS });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responder(405, { error: "Método não permitido" });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return responder(400, { error: parsed.error.flatten().fieldErrors });
  const body = parsed.data;

  const token = (req.headers.get("x-coletor-token") || body.token || "").trim();
  if (!token) return responder(401, { error: "Chave do coletor ausente." });

  const admin = adminClient();
  const { data: coletor } = await admin
    .from("port_coletores")
    .select("id, ativo")
    .eq("token", token)
    .maybeSingle();
  if (!coletor || !coletor.ativo) return responder(401, { error: "Chave do coletor inválida." });

  await admin
    .from("port_coletores")
    .update({
      ultima_comunicacao: new Date().toISOString(),
      versao: body.versao ?? undefined,
      ip_local: body.ip_local ?? undefined,
    })
    .eq("id", coletor.id);

  if (body.acao === "handshake") {
    const { data: dispositivos } = await admin
      .from("port_devices")
      .select("id, nome, tipo, ip, porta, endpoint, canal_rele, pulso_ms, config, via_coletor, habilitado")
      .eq("via_coletor", true)
      .eq("habilitado", true);
    return responder(200, { ok: true, coletor_id: coletor.id, dispositivos: dispositivos ?? [] });
  }

  if (body.acao === "jobs") {
    const limite = body.limite ?? 5;
    const { data: pendentes } = await admin
      .from("port_device_jobs")
      .select("id, device_id, access_point_id, comando, parametros")
      .eq("status", "pendente")
      .order("created_at", { ascending: true })
      .limit(limite);

    const jobs: unknown[] = [];
    for (const job of pendentes ?? []) {
      // Reivindica o job (evita dois coletores executarem o mesmo comando)
      const { data: claimed } = await admin
        .from("port_device_jobs")
        .update({ status: "executando", coletor_id: coletor.id })
        .eq("id", job.id)
        .eq("status", "pendente")
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      const { data: device } = await admin
        .from("port_devices")
        .select("id, nome, tipo, ip, porta, endpoint, canal_rele, pulso_ms, config")
        .eq("id", job.device_id as string)
        .maybeSingle();
      const { data: cred } = await admin
        .from("port_device_credentials")
        .select("usuario, senha, token")
        .eq("device_id", job.device_id as string)
        .maybeSingle();
      jobs.push({ ...job, device, credenciais: cred ?? {} });
    }
    return responder(200, { ok: true, jobs });
  }

  // acao === "resultado"
  if (!body.job_id) return responder(400, { error: "job_id obrigatório." });
  const sucesso = body.ok === true;
  const { data: job } = await admin
    .from("port_device_jobs")
    .update({
      status: sucesso ? "concluido" : "erro",
      resultado: sucesso ? { mensagem: body.mensagem ?? "Executado pelo Coletor.", dados: body.dados ?? null } : null,
      erro: sucesso ? null : (body.mensagem || "Falha ao executar na rede local."),
      executado_em: new Date().toISOString(),
      coletor_id: coletor.id,
    })
    .eq("id", body.job_id)
    .select("device_id")
    .maybeSingle();

  if (job?.device_id) {
    await admin
      .from("port_devices")
      .update({ status: sucesso ? "online" : "erro", ultima_comunicacao: new Date().toISOString() })
      .eq("id", job.device_id as string);
  }
  return responder(200, { ok: true });
});
