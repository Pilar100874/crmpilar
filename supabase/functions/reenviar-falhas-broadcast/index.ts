// Reenvia automaticamente apenas os destinatários que falharam em um disparo em massa,
// mantendo o progresso do monitor (os já enviados não são reenviados).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getAuthContext, serviceClient, unauthorized } from "../_shared/auth.ts";
import { carregarRitmo, esperarEntreEnvios, esperarLote, consumirCota, foraDaJanela, variarTexto } from "../_shared/ritmoHumano.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await getAuthContext(req);
  if (!auth?.estabelecimentoId) return unauthorized(corsHeaders);

  let body: any = {};
  try { body = await req.json(); } catch { /* noop */ }
  const monitorId = typeof body?.monitorId === "string" ? body.monitorId : null;
  if (!monitorId) return json({ error: "monitorId é obrigatório" }, 400);

  const svc = serviceClient();
  const { data: monitor } = await svc
    .from("broadcast_monitor")
    .select("*")
    .eq("id", monitorId)
    .eq("estabelecimento_id", auth.estabelecimentoId)
    .maybeSingle();

  if (!monitor) return json({ error: "Disparo não encontrado" }, 404);
  if (monitor.status === "executando") return json({ error: "O disparo ainda está em andamento." }, 409);

  const { data: falhados } = await svc
    .from("broadcast_monitor_itens")
    .select("id, ordem, nome, telefone, mensagem")
    .eq("monitor_id", monitorId)
    .eq("status", "falha")
    .order("ordem", { ascending: true });

  const itens = (falhados || []).filter((i: any) => (i.telefone || "").replace(/\D/g, "").length >= 10);
  if (itens.length === 0) return json({ error: "Não há envios com falha para reenviar." }, 400);

  const ritmo = await carregarRitmo(svc, auth.estabelecimentoId);
  if (ritmo.ativo) {
    const bloqueio = foraDaJanela(ritmo);
    if (bloqueio) return json({ error: bloqueio }, 409);
  }

  await svc.from("broadcast_monitor").update({
    status: "executando",
    erro: null,
    finalizado_em: null,
    atualizado_em: new Date().toISOString(),
  }).eq("id", monitorId);

  const processar = async () => {
    let recuperados = 0;
    let aindaFalham = 0;

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i] as any;
      if (ritmo.ativo && i > 0) {
        await esperarLote(ritmo, i);
        await esperarEntreEnvios(ritmo);
      }
      if (ritmo.ativo) {
        const usados = await consumirCota(svc, auth.estabelecimentoId!, "");
        if (ritmo.limiteDiario > 0 && usados > ritmo.limiteDiario) {
          await svc.from("broadcast_monitor").update({
            status: "parcial",
            erro: "Limite diário do Ritmo Humano atingido durante o reenvio.",
            atualizado_em: new Date().toISOString(),
          }).eq("id", monitorId);
          break;
        }
      }

      await svc.from("broadcast_monitor_itens")
        .update({ status: "enviando", motivo: "Reenvio automático em andamento", updated_at: new Date().toISOString() })
        .eq("id", item.id);
      await svc.from("broadcast_monitor").update({
        atual: item.ordem, atual_nome: item.nome, atual_telefone: item.telefone,
        atualizado_em: new Date().toISOString(),
      }).eq("id", monitorId);

      const texto = variarTexto(String(item.mensagem || monitor.mensagem_base || ""), ritmo);
      let ok = false;
      let motivo: string | null = null;
      try {
        const { data, error } = await svc.functions.invoke("send-agent-message", {
          body: {
            estabelecimento_id: auth.estabelecimentoId,
            telefone: item.telefone,
            text: texto,
            botFlowId: monitor.bot_flow_id || null,
            origem: `${monitor.origem || "bot"}_reenvio`,
          },
        });
        ok = !error && (data as any)?.success !== false;
        motivo = error?.message || (data as any)?.reason || (data as any)?.error || null;
      } catch (e) {
        ok = false;
        motivo = e instanceof Error ? e.message : String(e);
      }

      await svc.from("broadcast_monitor_itens").update({
        status: ok ? "enviado" : "falha",
        motivo: ok ? "Recuperado no reenvio automático" : `Reenvio falhou: ${motivo || "erro desconhecido"}`,
        updated_at: new Date().toISOString(),
      }).eq("id", item.id);

      if (ok) recuperados++; else aindaFalham++;

      const { data: atual } = await svc.from("broadcast_monitor").select("enviados, falhas").eq("id", monitorId).maybeSingle();
      await svc.from("broadcast_monitor").update({
        enviados: Math.max(0, (atual?.enviados || 0) + (ok ? 1 : 0)),
        falhas: Math.max(0, (atual?.falhas || 0) - (ok ? 1 : 0)),
        atualizado_em: new Date().toISOString(),
      }).eq("id", monitorId);
    }

    await svc.from("broadcast_monitor").update({
      status: aindaFalham > 0 ? "parcial" : "concluido",
      atual_nome: null,
      atual_telefone: null,
      finalizado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }).eq("id", monitorId);

    console.log(`[reenvio] monitor=${monitorId} recuperados=${recuperados} falhas=${aindaFalham}`);
  };

  // @ts-ignore EdgeRuntime existe no runtime do Supabase
  EdgeRuntime.waitUntil(processar());

  return json({ success: true, reenviando: itens.length }, 202);
});
