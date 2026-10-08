import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Ponte do aplicativo Android "Pilar Voz" com o CRM.
 * O aparelho se identifica pela chave da empresa (app = "voz") e nunca recebe
 * chaves internas: a IA é chamada daqui pela função voz-ia-turno.
 *
 * Ações: config | turno | iniciar | fala | sugestao | finalizar | comandos | comando_status
 */
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const corpo = await req.json().catch(() => ({}));
    const chave = String(corpo?.chave ?? "").trim().toUpperCase();
    const acao = String(corpo?.acao ?? "");
    if (!chave) return json({ error: "chave obrigatória" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: reg } = await sb.from("automacao_app_chaves")
      .select("id, estabelecimento_id, bloqueado, app").eq("chave", chave).maybeSingle();
    if (!reg || reg.app !== "voz") return json({ error: "chave inválida para o Pilar Voz" }, 403);
    if (reg.bloqueado) return json({ error: "chave bloqueada" }, 403);
    const empresa = reg.estabelecimento_id as string;
    await sb.from("automacao_app_chaves").update({ ultima_comunicacao: new Date().toISOString() }).eq("id", reg.id);

    const agente = async () => (await sb.from("voz_agentes").select("*").eq("estabelecimento_id", empresa)
      .eq("ativo", true).order("created_at").limit(1).maybeSingle()).data;

    // Garante que a chamada pertence à empresa da chave.
    const chamadaDaEmpresa = async (id: string) =>
      (await sb.from("voz_chamadas").select("id, transcricao, sugestoes, iniciada_em")
        .eq("id", id).eq("estabelecimento_id", empresa).maybeSingle()).data;

    switch (acao) {
      case "config": {
        const a = await agente();
        if (!a) return json({ error: "Nenhum agente de voz ativo. Cadastre em Agentes de Voz." }, 404);
        return json({ agente: a });
      }
      case "turno": {
        const a = await agente();
        if (!a) return json({ error: "Nenhum agente ativo" }, 404);
        const objetivo = corpo.objetivo ? `\nObjetivo desta ligação: ${corpo.objetivo}` : "";
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/voz-ia-turno`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-runner-key": Deno.env.get("AIP_RUNNER_KEY") ?? "" },
          body: JSON.stringify({
            audio_wav_b64: corpo.audio_wav_b64 ?? null,
            prompt: (corpo.prompt_extra ? `${corpo.prompt_extra}\n` : "") + (a.prompt ?? "") + objetivo,
            historico: Array.isArray(corpo.historico) ? corpo.historico.slice(-20) : [],
            modo: corpo.modo ?? "receber",
            voz: a.voz || "alloy",
          }),
        });
        return new Response(await r.text(), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      case "iniciar": {
        const a = await agente();
        if (!a) return json({ error: "Nenhum agente ativo" }, 404);
        const { data, error } = await sb.from("voz_chamadas").insert({
          estabelecimento_id: empresa, agente_id: a.id, modo: corpo.modo ?? "receber",
          numero: corpo.numero ?? null, ramal_monitorado: corpo.ramal ?? null,
        }).select("id").single();
        if (error) return json({ error: error.message }, 500);
        return json({ id: data.id });
      }
      case "fala":
      case "sugestao": {
        const c = await chamadaDaEmpresa(String(corpo.chamada_id ?? ""));
        if (!c) return json({ error: "chamada não encontrada" }, 404);
        const em = new Date().toISOString();
        const texto = String(corpo.texto ?? "").slice(0, 2000);
        const upd = acao === "fala"
          ? { transcricao: [...(c.transcricao as unknown[] ?? []), { papel: corpo.papel === "agente" ? "agente" : "cliente", texto, em }] }
          : { sugestoes: [...(c.sugestoes as unknown[] ?? []), { texto, em }] };
        await sb.from("voz_chamadas").update(upd).eq("id", c.id);
        return json({ ok: true });
      }
      case "finalizar": {
        const c = await chamadaDaEmpresa(String(corpo.chamada_id ?? ""));
        if (!c) return json({ error: "chamada não encontrada" }, 404);
        await sb.from("voz_chamadas").update({
          status: corpo.status === "erro" ? "erro" : "finalizada",
          finalizada_em: new Date().toISOString(),
          duracao_seg: Math.round((Date.now() - new Date(c.iniciada_em as string).getTime()) / 1000),
        }).eq("id", c.id);
        return json({ ok: true });
      }
      case "comandos": {
        const { data } = await sb.from("voz_comandos").select("*").eq("estabelecimento_id", empresa)
          .eq("status", "pendente").order("created_at").limit(1);
        const cmd = data?.[0];
        if (!cmd) return json({ comando: null });
        await sb.from("voz_comandos").update({ status: "executando", processado_em: new Date().toISOString() }).eq("id", cmd.id);
        return json({ comando: cmd });
      }
      case "comando_status": {
        const status = ["concluido", "sem_resposta", "erro"].includes(corpo.status) ? corpo.status : "erro";
        await sb.from("voz_comandos").update({ status, erro: corpo.erro ?? null })
          .eq("id", String(corpo.comando_id ?? "")).eq("estabelecimento_id", empresa);
        return json({ ok: true });
      }
      default:
        return json({ error: `ação desconhecida: ${acao}` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
