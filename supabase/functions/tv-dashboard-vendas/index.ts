import { authenticateDevice, corsHeaders, json, serviceClient } from "../_shared/tv-auth.ts";

const statusVenda = ["aprovado", "finalizado", "faturado"];

function somaValor(rows: any[] = []) {
  return rows.reduce((acc, row) => acc + (Number(row.valor_total) || 0), 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await authenticateDevice(req);
  if (!auth) return json({ error: "não autenticado" }, 401);

  const sb = serviceClient();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const dozeMesesAtras = new Date();
  dozeMesesAtras.setMonth(dozeMesesAtras.getMonth() - 12);
  const hojeStr = hoje.toISOString().split("T")[0];

  const [
    { data: usuarios },
    { data: activities },
    { data: atendentes },
    { data: orcamentosHoje },
    { data: orcamentosMes },
    { data: orcamentos12Meses },
    { data: conversationsFinalizadas },
    { data: conversationsResposta },
    { data: tarefas },
  ] = await Promise.all([
    sb.from("usuarios").select("id, nome").eq("estabelecimento_id", auth.estabelecimentoId),
    sb.from("user_activity_tracking").select("usuario_id, is_online").eq("estabelecimento_id", auth.estabelecimentoId),
    sb.from("atendentes").select("id, usuario_id").eq("estabelecimento_id", auth.estabelecimentoId),
    sb.from("orcamentos").select("id, vendedor_id, status, valor_total, created_at").eq("estabelecimento_id", auth.estabelecimentoId).gte("created_at", hoje.toISOString()).lt("created_at", amanha.toISOString()),
    sb.from("orcamentos").select("id, vendedor_id, status, valor_total, created_at").eq("estabelecimento_id", auth.estabelecimentoId).gte("created_at", inicioMes.toISOString()),
    sb.from("orcamentos").select("id, vendedor_id, status, valor_total, created_at").eq("estabelecimento_id", auth.estabelecimentoId).gte("created_at", dozeMesesAtras.toISOString()),
    sb.from("conversations").select("id, atendente_atual_id, canal").eq("estabelecimento_id", auth.estabelecimentoId).eq("chat_status", "encerrado").gte("updated_at", hoje.toISOString()),
    sb.from("conversations").select("sla_tempo_primeira_resposta").eq("estabelecimento_id", auth.estabelecimentoId).gte("created_at", hoje.toISOString()).not("sla_tempo_primeira_resposta", "is", null),
    sb.from("calendario_tarefas").select("id, user_id").eq("estabelecimento_id", auth.estabelecimentoId).eq("date", hojeStr),
  ]);

  const orcHoje = orcamentosHoje || [];
  const orcMes = orcamentosMes || [];
  const orc12 = orcamentos12Meses || [];
  const vendasHoje = orcHoje.filter((o: any) => statusVenda.includes(o.status || ""));
  const vendasMes = orcMes.filter((o: any) => statusVenda.includes(o.status || ""));
  const vendas12 = orc12.filter((o: any) => statusVenda.includes(o.status || ""));

  const vendedores = (usuarios || []).map((usuario: any) => {
    const activity = (activities || []).find((a: any) => a.usuario_id === usuario.id);
    const userHoje = orcHoje.filter((o: any) => o.vendedor_id === usuario.id);
    const userMes = orcMes.filter((o: any) => o.vendedor_id === usuario.id);
    const atendente = (atendentes || []).find((a: any) => a.usuario_id === usuario.id);
    const chatsFinalizados = atendente ? (conversationsFinalizadas || []).filter((c: any) => c.atendente_atual_id === atendente.id).length : 0;
    return {
      id: usuario.id,
      nome: usuario.nome,
      isOnline: !!activity?.is_online,
      agendaHoje: (tarefas || []).filter((t: any) => t.user_id === usuario.id).length,
      chatsFinalizados,
      emailsEnviados: 0,
      emailsRecebidos: 0,
      orcamentosTotal: userHoje.length,
      orcamentosPendentes: userHoje.filter((o: any) => ["pendente", "rascunho"].includes(o.status || "")).length,
      orcamentosAprovados: userHoje.filter((o: any) => ["aprovado", "finalizado"].includes(o.status || "")).length,
      orcamentosFaturados: userHoje.filter((o: any) => o.status === "faturado").length,
      valorTotal: somaValor(userHoje.filter((o: any) => statusVenda.includes(o.status || ""))),
      valorMes: somaValor(userMes.filter((o: any) => statusVenda.includes(o.status || ""))),
    };
  }).sort((a: any, b: any) => b.valorMes - a.valorMes);

  const horasMap: Record<string, { valor: number; quantidade: number }> = {};
  const horaAtual = new Date().getHours();
  for (let h = 8; h <= horaAtual; h++) horasMap[`${String(h).padStart(2, "0")}h`] = { valor: 0, quantidade: 0 };
  for (const o of vendasHoje) {
    const horaStr = `${String(new Date(o.created_at).getHours()).padStart(2, "0")}h`;
    if (horasMap[horaStr]) {
      horasMap[horaStr].valor += Number(o.valor_total) || 0;
      horasMap[horaStr].quantidade++;
    }
  }

  const mesesMap: Record<string, { valor: number; quantidade: number }> = {};
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
  for (let i = 11; i >= 0; i--) {
    const mes = new Date();
    mes.setMonth(mes.getMonth() - i);
    mesesMap[formatter.format(mes).replace(" de ", "/")] = { valor: 0, quantidade: 0 };
  }
  for (const o of vendas12) {
    const mesStr = formatter.format(new Date(o.created_at)).replace(" de ", "/");
    if (mesesMap[mesStr]) {
      mesesMap[mesStr].valor += Number(o.valor_total) || 0;
      mesesMap[mesStr].quantidade++;
    }
  }

  const tempos = (conversationsResposta || []).map((c: any) => Number(c.sla_tempo_primeira_resposta) || 0).filter((t: number) => t > 0);

  return json({
    estabelecimento_id: auth.estabelecimentoId,
    vendedores,
    totalVendasHoje: vendasHoje.length,
    totalValorHoje: somaValor(vendasHoje),
    totalVendasMes: vendasMes.length,
    totalValorMes: somaValor(vendasMes),
    totalVendas12Meses: vendas12.length,
    totalValor12Meses: somaValor(vendas12),
    vendasPorHora: Object.entries(horasMap).map(([hora, data]) => ({ hora, ...data })).sort((a, b) => a.hora.localeCompare(b.hora)),
    vendasMensais: Object.entries(mesesMap).map(([mes, data]) => ({ mes, ...data })),
    taxaConversao: orcHoje.length ? Math.round((vendasHoje.length / orcHoje.length) * 100) : 0,
    tempoMedioResposta: tempos.length ? Math.round((tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length) / 60) : 0,
  });
});