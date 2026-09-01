// Endpoint do Coletor Pilar (agente instalado na rede local do cliente).
// Autenticação por chave do coletor (tabela port_coletores), nunca por JWT de usuário.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { adminClient } from "../_shared/portaria/auth.ts";

const BodySchema = z.object({
  token: z.string().min(10).max(200).nullish(),
  device_key: z.string().min(8).max(120).nullish(),
  hostname: z.string().max(120).nullish(),
  unidade_nome: z.string().max(160).nullish(),
  acao: z.enum(["handshake", "jobs", "resultado", "provisionar", "campainha"]),
  // O Coletor pode enviar null nestes campos (instalação nova / sem dados ainda).
  versao: z.string().max(40).nullish(),
  ip_local: z.string().max(60).nullish(),
  unidade_id: z.string().uuid().nullish(),
  job_id: z.string().uuid().nullish(),
  ok: z.boolean().nullish(),
  mensagem: z.string().max(500).nullish(),
  dados: z.unknown().optional(),
  limite: z.number().int().min(1).max(20).nullish(),
  device_id_evento: z.string().uuid().nullish(),


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
  const deviceKey = (req.headers.get("x-coletor-device") || body.device_key || "").trim();
  if (!token && !deviceKey) return responder(401, { error: "Coletor não identificado." });

  const admin = adminClient();

  // Auto-registro: o Coletor instalado se identifica pela chave do equipamento
  // (gerada localmente) e recebe/renova seu registro — sem digitar nada.
  let coletor: { id: string; ativo: boolean; token?: string } | null = null;
  if (token) {
    const { data } = await admin
      .from("port_coletores")
      .select("id, ativo, token")
      .eq("token", token)
      .maybeSingle();
    coletor = data as typeof coletor;
  }
  if (!coletor && deviceKey) {
    const { data } = await admin
      .from("port_coletores")
      .select("id, ativo, token")
      .eq("device_key", deviceKey)
      .maybeSingle();
    coletor = data as typeof coletor;
    if (!coletor) {
      const nome = body.hostname?.trim()
        || `Coletor ${body.unidade_nome?.trim() || deviceKey.slice(0, 8)}`;
      const { data: novo, error: erroNovo } = await admin
        .from("port_coletores")
        .insert({
          nome,
          device_key: deviceKey,
          unidade_id: body.unidade_id ?? null,
          ativo: true,
          versao: body.versao ?? null,
          ip_local: body.ip_local ?? null,
        })
        .select("id, ativo, token")
        .maybeSingle();
      if (erroNovo || !novo) return responder(500, { error: "Não foi possível registrar o coletor." });
      coletor = novo as typeof coletor;
    } else if (body.unidade_id) {
      await admin.from("port_coletores").update({ unidade_id: body.unidade_id }).eq("id", coletor.id);
    }
  }
  if (!coletor) return responder(401, { error: "Chave do coletor inválida." });
  if (!coletor.ativo) return responder(401, { error: "Coletor desativado." });

  if (body.acao === "provisionar") {
    await admin
      .from("port_coletores")
      .update({
        ultima_comunicacao: new Date().toISOString(),
        versao: body.versao ?? undefined,
        ip_local: body.ip_local ?? undefined,
        unidade_id: body.unidade_id ?? undefined,
      })
      .eq("id", coletor.id);
    return responder(200, { ok: true, coletor_id: coletor.id, token: coletor.token });
  }

  await admin
    .from("port_coletores")
    .update({
      ultima_comunicacao: new Date().toISOString(),
      versao: body.versao ?? undefined,
      ip_local: body.ip_local ?? undefined,
    })
    .eq("id", coletor.id);

  const unidadeId = body.unidade_id ?? null;

  // Toque de campainha detectado na rede local pelo Coletor.
  if (body.acao === "campainha") {
    await admin.from("port_campainha_eventos").insert({
      unidade_id: unidadeId,
      device_id: body.device_id_evento ?? null,
      origem: "idface",
    });
    return responder(200, { ok: true });
  }

  if (body.acao === "handshake") {
    let devQ = admin
      .from("port_devices")
      .select("id, nome, tipo, ip, porta, endpoint, canal_rele, pulso_ms, config, via_coletor, habilitado, unidade_id")
      .eq("via_coletor", true)
      .eq("habilitado", true);
    // Cada Coletor atende somente a unidade em que está instalado.
    if (unidadeId) devQ = devQ.or(`unidade_id.eq.${unidadeId},unidade_id.is.null`);
    const { data: dispositivos } = await devQ;
    return responder(200, { ok: true, coletor_id: coletor.id, dispositivos: dispositivos ?? [] });
  }

  if (body.acao === "jobs") {
    const limite = body.limite ?? 5;

    // Restringe os jobs aos dispositivos da unidade do Coletor
    let idsDaUnidade: string[] | null = null;
    if (unidadeId) {
      const { data: devs } = await admin
        .from("port_devices")
        .select("id")
        .or(`unidade_id.eq.${unidadeId},unidade_id.is.null`);
      idsDaUnidade = (devs ?? []).map((d) => d.id as string);
      if (idsDaUnidade.length === 0) return responder(200, { ok: true, jobs: [] });
    }

    let jobQ = admin
      .from("port_device_jobs")
      .select("id, device_id, access_point_id, comando, parametros")
      .eq("status", "pendente");
    if (idsDaUnidade) jobQ = jobQ.in("device_id", idsDaUnidade);
    const { data: pendentes } = await jobQ
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
