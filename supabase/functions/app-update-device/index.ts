import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  acao: z.enum(["poll", "ack"]),
  app: z.enum(["sms", "hub"]),
  versao_app: z.string().max(40).optional(),
  command_id: z.string().uuid().optional(),
  status: z.enum(["recebido", "instalando", "concluido", "erro"]).optional(),
  mensagem: z.string().max(1000).optional(),
});

const resposta = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const partes = (valor: string) => valor.split(".").map((p) => Number.parseInt(p.replace(/\D/g, ""), 10) || 0);
const versaoMaiorOuIgual = (atual: string, alvo: string) => {
  const a = partes(atual);
  const b = partes(alvo);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return resposta({ error: "Método não permitido" }, 405);

  const token = req.headers.get("x-device-token")?.trim();
  if (!token) return resposta({ error: "Token do aparelho ausente" }, 401);

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return resposta({ error: parsed.error.flatten().fieldErrors }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false } },
  );
  const { data: device } = await admin.from("sms_devices")
    .select("id, estabelecimento_id, ativo")
    .eq("token", token)
    .maybeSingle();
  if (!device?.ativo || !device.estabelecimento_id) return resposta({ error: "Aparelho inválido ou inativo" }, 403);

  const body = parsed.data;
  if (body.acao === "ack") {
    if (!body.command_id || !body.status) return resposta({ error: "Comando e situação são obrigatórios" }, 400);
    const finalizado = body.status === "concluido" || body.status === "erro";
    const { error } = await admin.from("app_update_commands").update({
      status: body.status,
      resultado: { mensagem: body.mensagem || null, versao_informada: body.versao_app || null },
      recebido_em: body.status === "recebido" ? new Date().toISOString() : undefined,
      concluido_em: finalizado ? new Date().toISOString() : undefined,
    }).eq("id", body.command_id).eq("device_id", device.id).eq("app", body.app);
    if (error) return resposta({ error: "Não foi possível confirmar a atualização" }, 500);
    return resposta({ ok: true });
  }

  if (body.versao_app) {
    const { data: abertos } = await admin.from("app_update_commands")
      .select("id, versao_alvo")
      .eq("device_id", device.id)
      .eq("app", body.app)
      .in("status", ["recebido", "instalando"]);
    const concluidos = (abertos || []).filter((c) => versaoMaiorOuIgual(body.versao_app || "", c.versao_alvo)).map((c) => c.id);
    if (concluidos.length) {
      await admin.from("app_update_commands").update({
        status: "concluido",
        concluido_em: new Date().toISOString(),
        resultado: { mensagem: "Versão confirmada pelo aparelho", versao_informada: body.versao_app },
      }).in("id", concluidos);
    }
    await admin.from("sms_devices").update({ versao_app: body.versao_app }).eq("id", device.id);
  }

  const { data: command } = await admin.from("app_update_commands")
    .select("id, versao_alvo, arquivo_url, release:app_releases(arquivo_url, arquivo_nome, notas)")
    .eq("device_id", device.id)
    .eq("app", body.app)
    .eq("status", "pendente")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!command) return resposta({ command: null });
  await admin.from("app_update_commands").update({ status: "recebido", recebido_em: new Date().toISOString() }).eq("id", command.id);
  const release = Array.isArray(command.release) ? command.release[0] : command.release;
  const url = (command as { arquivo_url?: string | null }).arquivo_url || release?.arquivo_url;
  if (!url) return resposta({ command: null });
  return resposta({ command: { id: command.id, versao: command.versao_alvo, url, arquivo: release?.arquivo_nome, notas: release?.notas } });
});
