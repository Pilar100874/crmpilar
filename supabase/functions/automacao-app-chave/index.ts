import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Aplicativos que usam chave de empresa. */
const APPS_VALIDOS = ["pilar-fone", "fone", "automacao", "controle", "sms", "remotas", "coletor", "coletor-tv"];
const CORTE_ATIVACAO_COLETOR = "2026-09-14T14:13:57.000Z";

const MigracaoLegadaSchema = z.object({
  acao: z.literal("migrar_coletor_legado"),
  device_key: z.string().uuid(),
  filial_id: z.string().uuid(),
  hostname: z.string().trim().min(1).max(120).optional(),
});

const AtivacaoSchema = z.object({
  chave: z.string().trim().min(1).max(120),
  app: z.string().trim().toLowerCase().optional(),
});

function gerarChaveColetor() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const texto = Array.from(bytes, (byte) => alfabeto[byte % alfabeto.length]).join("");
  return `${texto.slice(0, 4)}-${texto.slice(4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const corpo = await req.json().catch(() => null);

    if (corpo?.acao === "migrar_coletor_legado") {
      const entrada = MigracaoLegadaSchema.safeParse(corpo);
      if (!entrada.success) return json({ error: entrada.error.flatten().fieldErrors }, 400);

      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      const { device_key: deviceKey, filial_id: filialId, hostname } = entrada.data;

      const { data: unidade } = await sb
        .from("unidades")
        .select("id, nome, estabelecimento_id, estabelecimentos(nome)")
        .eq("id", filialId)
        .maybeSingle();
      if (!unidade?.estabelecimento_id) return json({ error: "unidade legada não encontrada" }, 403);

      const [{ data: registroPortaria }, { data: registroRemoto }] = await Promise.all([
        sb.from("port_coletores")
          .select("id, unidade_id, created_at")
          .eq("device_key", deviceKey)
          .eq("unidade_id", filialId)
          .lt("created_at", CORTE_ATIVACAO_COLETOR)
          .maybeSingle(),
        sb.from("coletor_dispositivos")
          .select("id, unidade_id, estabelecimento_id, created_at")
          .eq("device_key", deviceKey)
          .eq("unidade_id", filialId)
          .lt("created_at", CORTE_ATIVACAO_COLETOR)
          .maybeSingle(),
      ]);
      const remotoCompativel = registroRemoto
        && (!registroRemoto.estabelecimento_id || registroRemoto.estabelecimento_id === unidade.estabelecimento_id);
      if (!registroPortaria && !remotoCompativel) {
        return json({ error: "instalação antiga não reconhecida; informe a chave da empresa" }, 403);
      }

      const { data: existente } = await sb
        .from("automacao_app_chaves")
        .select("id, chave, estabelecimento_id, bloqueado")
        .eq("coletor_device_key", deviceKey)
        .maybeSingle();
      if (existente?.bloqueado) return json({ error: "chave bloqueada" }, 403);

      let registro = existente;
      if (!registro) {
        for (let tentativa = 0; tentativa < 5 && !registro; tentativa += 1) {
          const { data: criado, error: erroCriacao } = await sb
            .from("automacao_app_chaves")
            .insert({
              nome: hostname || `Coletor ${unidade.nome}`,
              chave: gerarChaveColetor(),
              app: "coletor",
              estabelecimento_id: unidade.estabelecimento_id,
              coletor_device_key: deviceKey,
            })
            .select("id, chave, estabelecimento_id, bloqueado")
            .maybeSingle();
          if (!erroCriacao) registro = criado;
        }
      }
      if (!registro || registro.estabelecimento_id !== unidade.estabelecimento_id) {
        return json({ error: "não foi possível migrar a instalação antiga" }, 409);
      }

      await sb.from("coletor_dispositivos")
        .update({ estabelecimento_id: unidade.estabelecimento_id })
        .eq("device_key", deviceKey);

      return json({
        chave: registro.chave,
        estabelecimento_id: registro.estabelecimento_id,
        empresa: (unidade.estabelecimentos as { nome?: string } | null)?.nome ?? "",
        migrado: true,
      });
    }

    const entrada = AtivacaoSchema.safeParse(corpo);
    if (!entrada.success) return json({ error: entrada.error.flatten().fieldErrors }, 400);
    const chave = entrada.data.chave;

    const app = entrada.data.app ?? "automacao";
    if (!APPS_VALIDOS.includes(app)) return json({ error: "aplicativo inválido" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: registro, error } = await sb
      .from("automacao_app_chaves")
      .select("id, nome, bloqueado, estabelecimento_id, app, dispositivo_id")
      .eq("chave", String(chave).trim().toUpperCase())
      .maybeSingle();

    if (error) return json({ error: "falha ao validar a chave" }, 500);
    if (!registro) return json({ error: "chave não encontrada" }, 404);
    if (registro.bloqueado) return json({ error: "chave bloqueada" }, 403);
    const appDaChave = registro.app ?? "automacao";
    const coletorCompativel = app === "coletor" && appDaChave === "controle";
    if (appDaChave !== app && !coletorCompativel) {
      return json({ error: "esta chave é de outro aplicativo" }, 403);
    }

    const { data: estabelecimento } = await sb
      .from("estabelecimentos")
      .select("nome")
      .eq("id", registro.estabelecimento_id)
      .maybeSingle();

    await sb
      .from("automacao_app_chaves")
      .update({ ultima_comunicacao: new Date().toISOString() })
      .eq("id", registro.id);

    let deviceToken = "";
    if (app === "sms" && registro.dispositivo_id) {
      const { data: dispositivo, error: dispositivoError } = await sb
        .from("sms_devices")
        .select("token")
        .eq("id", registro.dispositivo_id)
        .eq("estabelecimento_id", registro.estabelecimento_id)
        .eq("tipo_dispositivo", "android")
        .eq("ativo", true)
        .maybeSingle();
      if (dispositivoError || !dispositivo?.token) {
        return json({ error: "aparelho SMS não está disponível" }, 409);
      }
      deviceToken = dispositivo.token;
    }

    return json({
      chave_id: registro.id,
      chave_nome: registro.nome,
      app: registro.app ?? "automacao",
      estabelecimento_id: registro.estabelecimento_id,
      empresa: estabelecimento?.nome ?? "",
      dispositivo_id: registro.dispositivo_id ?? "",
      ...(app === "sms" ? { device_token: deviceToken } : {}),
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
