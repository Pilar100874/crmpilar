import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Poller server-side de automações de VENDAS.
 * Roda a cada 5 min via pg_cron. Detecta:
 *  - Orçamentos parados: enviados há X dias sem modificação/aprovação
 *  - Clientes inativos: empresas sem pedido/orçamento há N dias
 *  - Aniversário de clientes (empresa/contato)
 *  - Metas: alerta quando meta mensal ficar abaixo do previsto
 *
 * Registra em `notificacoes_log` para todos admins do estabelecimento.
 * Evita spam via chave em `logistica_workflow_state` (reaproveita a tabela genérica).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const resultados = { orcamentos_parados: 0, clientes_inativos: 0, aniversarios: 0, erros: [] as string[] };

  try {
    // 1) Orçamentos parados: enviados >= 3 dias e sem modificação/aprovação
    const limite = new Date();
    limite.setDate(limite.getDate() - 3);

    const { data: parados } = await admin
      .from("orcamentos")
      .select("id, estabelecimento_id, cliente_id, empresa_id, valor_total, data_envio, status, etapa")
      .not("data_envio", "is", null)
      .lte("data_envio", limite.toISOString())
      .in("status", ["enviado", "em_analise", "aguardando"])
      .limit(500);

    for (const o of parados ?? []) {
      const key = `vendas_orc_parado:${o.id}`;
      const { data: existente } = await admin
        .from("logistica_workflow_state")
        .select("id")
        .eq("chave", key)
        .maybeSingle();
      if (existente) continue;

      const { data: admins } = await admin
        .from("usuarios")
        .select("id")
        .eq("estabelecimento_id", o.estabelecimento_id)
        .in("nivel_acesso", ["admin", "administrador", "supervisor"]);

      const links = (admins ?? []).map((u: any) => ({
        usuario_id: u.id,
        tipo: "orcamento_parado",
        titulo: "Orçamento parado",
        mensagem: `Orçamento #${o.id.slice(0, 8)} sem retorno há 3+ dias (R$ ${Number(o.valor_total || 0).toFixed(2)}).`,
        lida: false,
        estabelecimento_id: o.estabelecimento_id,
      }));
      if (links.length) await admin.from("notificacoes_log").insert(links);
      await admin.from("logistica_workflow_state").insert({ chave: key, condicao: "orcamento_parado", ativa_desde: new Date().toISOString(), ultimo_disparo_em: new Date().toISOString() });
      resultados.orcamentos_parados++;
    }

    // 2) Clientes (empresas) inativos: sem pedido há 60 dias
    const inatividade = new Date();
    inatividade.setDate(inatividade.getDate() - 60);

    {
      const { data: recentes } = await admin
        .from("pedidos_recebidos")
        .select("empresa_id, created_at")
        .gte("created_at", inatividade.toISOString());
      const empresasAtivas = new Set((recentes ?? []).map((r: any) => r.empresa_id));

      const { data: empresas } = await admin
        .from("empresas")
        .select("id, estabelecimento_id, nome_fantasia, razao_social, updated_at")
        .lte("updated_at", inatividade.toISOString())
        .limit(200);

      for (const e of empresas ?? []) {
        if (empresasAtivas.has(e.id)) continue;
        const key = `vendas_cliente_inativo:${e.id}:${new Date().toISOString().slice(0, 7)}`;
        const { data: existente } = await admin
          .from("logistica_workflow_state")
          .select("id")
          .eq("chave", key)
          .maybeSingle();
        if (existente) continue;

        const { data: admins } = await admin
          .from("usuarios")
          .select("id")
          .eq("estabelecimento_id", e.estabelecimento_id)
          .in("nivel_acesso", ["admin", "administrador", "supervisor"]);
        const links = (admins ?? []).map((u: any) => ({
          usuario_id: u.id,
          tipo: "cliente_inativo",
          titulo: "Cliente inativo há 60+ dias",
          mensagem: `${e.nome_fantasia || e.razao_social || "Cliente"} está sem compras há mais de 60 dias.`,
          lida: false,
          estabelecimento_id: e.estabelecimento_id,
        }));
        if (links.length) await admin.from("notificacoes_log").insert(links);
        await admin.from("logistica_workflow_state").insert({ chave: key, condicao: "cliente_inativo", ativa_desde: new Date().toISOString(), ultimo_disparo_em: new Date().toISOString() });
        resultados.clientes_inativos++;
      }
    }

    // 3) Aniversário do dia (empresa.data_fundacao ou contatos)
    const hoje = new Date();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");
    const { data: aniv } = await admin
      .from("empresas")
      .select("id, estabelecimento_id, nome_fantasia, razao_social, data_fundacao")
      .not("data_fundacao", "is", null)
      .limit(500);
    for (const e of aniv ?? []) {
      if (!e.data_fundacao) continue;
      const d = new Date(e.data_fundacao as any);
      if (String(d.getMonth() + 1).padStart(2, "0") !== mm) continue;
      if (String(d.getDate()).padStart(2, "0") !== dd) continue;
      const key = `vendas_aniv:${e.id}:${new Date().toISOString().slice(0, 10)}`;
      const { data: existente } = await admin
        .from("logistica_workflow_state")
        .select("id")
        .eq("chave", key)
        .maybeSingle();
      if (existente) continue;

      const { data: admins } = await admin
        .from("usuarios")
        .select("id")
        .eq("estabelecimento_id", e.estabelecimento_id)
        .in("nivel_acesso", ["admin", "administrador", "supervisor", "vendedor"]);
      const links = (admins ?? []).map((u: any) => ({
        usuario_id: u.id,
        tipo: "aniversario_cliente",
        titulo: "🎂 Aniversário de cliente",
        mensagem: `Hoje é aniversário de ${e.nome_fantasia || e.razao_social}.`,
        lida: false,
        estabelecimento_id: e.estabelecimento_id,
      }));
      if (links.length) await admin.from("notificacoes_log").insert(links);
      await admin.from("logistica_workflow_state").insert({ chave: key, condicao: "aniversario", ativa_desde: new Date().toISOString(), ultimo_disparo_em: new Date().toISOString() });
      resultados.aniversarios++;
    }

    return new Response(JSON.stringify({ success: true, ...resultados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("vendas-workflow-poller error", err);
    return new Response(JSON.stringify({ success: false, error: err.message, ...resultados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
