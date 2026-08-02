import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { db } from "@/lib/aip/db";

export interface RelatorioExecucao {
  gerado_em: string;
  execucao: Record<string, any>;
  etapas: Record<string, any>[];
  totais: {
    etapas: number;
    tokens_input: number;
    tokens_output: number;
    tokens_total: number;
    custo_total: number;
    duracao_ms: number | null;
  };
}

const brl = (v: number) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dt = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "—");

const txt = (v: any, max = 4000) => {
  if (v == null) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v, null, 2);
  return s.length > max ? `${s.slice(0, max)}\n… (truncado)` : s;
};

/** Monta o relatório completo (execução + etapas + totais) a partir do banco. */
export async function montarRelatorio(executionId: string): Promise<RelatorioExecucao> {
  const { data: exec, error } = await db
    .from("aip_executions")
    .select("*")
    .eq("id", executionId)
    .maybeSingle();
  if (error) throw error;
  if (!exec) throw new Error("Execução não encontrada");

  const { data: etapas } = await db
    .from("aip_execution_steps")
    .select("*")
    .eq("execution_id", executionId)
    .order("ordem", { ascending: true })
    .order("tentativa", { ascending: true });

  const lista = (etapas ?? []) as any[];
  const somaEtapas = (campo: string) =>
    lista.reduce((acc, s) => acc + Number((s as any)[campo] ?? 0), 0);

  const tokensIn = Number((exec as any).tokens_input ?? 0) || somaEtapas("tokens_input");
  const tokensOut = Number((exec as any).tokens_output ?? 0) || somaEtapas("tokens_output");
  const custo = Number((exec as any).custo ?? 0) || somaEtapas("custo");

  return {
    gerado_em: new Date().toISOString(),
    execucao: exec as any,
    etapas: lista,
    totais: {
      etapas: lista.length,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      tokens_total: tokensIn + tokensOut,
      custo_total: custo,
      duracao_ms: (exec as any).duracao_ms ?? null,
    },
  };
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportarRelatorioJSON(executionId: string) {
  const rel = await montarRelatorio(executionId);
  baixar(
    new Blob([JSON.stringify(rel, null, 2)], { type: "application/json" }),
    `execucao-${executionId.slice(0, 8)}.json`,
  );
  return rel;
}

export async function exportarRelatorioPDF(executionId: string) {
  const rel = await montarRelatorio(executionId);
  const e = rel.execucao;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 40;
  let y = 48;

  const quebraPagina = (altura = 40) => {
    if (y + altura > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 48;
    }
  };

  const bloco = (titulo: string, conteudo: string) => {
    if (!conteudo) return;
    quebraPagina(60);
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text(titulo, margem, y);
    y += 14;
    doc.setFont("courier", "normal").setFontSize(8);
    const linhas = doc.splitTextToSize(conteudo, largura - margem * 2);
    for (const linha of linhas) {
      quebraPagina(12);
      doc.text(linha, margem, y);
      y += 10;
    }
    y += 8;
  };

  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("Relatório de Execução — Plataforma de Agentes IA", margem, y);
  y += 18;
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`Gerado em ${new Date(rel.gerado_em).toLocaleString("pt-BR")}`, margem, y);
  y += 20;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59] },
    head: [["Campo", "Valor"]],
    body: [
      ["ID", String(e.id)],
      ["Origem", String(e.origem ?? "—")],
      ["Status", String(e.status ?? "—")],
      ["Modelo", String(e.modelo ?? "—")],
      ["Versão do workflow", e.workflow_versao ? `v${e.workflow_versao}` : "—"],
      ["Início", dt(e.iniciado_em)],
      ["Fim", dt(e.finalizado_em ?? e.concluido_em)],
      ["Duração", e.duracao_ms ? `${e.duracao_ms} ms` : "—"],
      ["Pausado em", dt(e.pausado_em)],
      ["Retomado em", dt(e.retomado_em)],
      ["Motivo da interrupção", String(e.motivo_interrupcao ?? "—")],
      ["Tokens (entrada)", String(rel.totais.tokens_input)],
      ["Tokens (saída)", String(rel.totais.tokens_output)],
      ["Tokens (total)", String(rel.totais.tokens_total)],
      ["Custo total", brl(rel.totais.custo_total)],
      ["Etapas", String(rel.totais.etapas)],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  quebraPagina(60);
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Resumo das etapas", margem, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [30, 41, 59] },
    head: [["#", "Etapa", "Tipo", "Status", "Tent.", "Duração", "Tokens", "Custo"]],
    body: rel.etapas.map((s: any) => [
      String(s.ordem ?? ""),
      String(s.titulo ?? s.node_id ?? "—"),
      String(s.tipo ?? "—"),
      String(s.status ?? "—"),
      `${s.tentativa ?? 1}/${s.tentativas_max ?? 1}`,
      s.duracao_ms != null ? `${s.duracao_ms} ms` : "—",
      String((Number(s.tokens_input ?? 0) + Number(s.tokens_output ?? 0)) || "—"),
      s.custo != null ? brl(Number(s.custo)) : "—",
    ]),
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  if (e.prompt) bloco("Prompt / entrada da execução", txt(e.prompt));
  if (e.input) bloco("Input da execução", txt(e.input));

  for (const s of rel.etapas as any[]) {
    quebraPagina(70);
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.text(
      `Etapa ${s.ordem ?? ""} — ${s.titulo ?? s.node_id ?? ""} (${s.status ?? ""})`,
      margem,
      y,
    );
    y += 16;
    bloco("Input", txt(s.input));
    bloco("Output", txt(s.output));
    bloco("Logs", txt(s.logs));
    if (s.erro) bloco("Erro", txt(s.erro));
  }

  if (e.resposta) bloco("Resposta final", txt(e.resposta, 8000));
  if (e.erro) bloco("Erro da execução", txt(e.erro));

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(
      `Página ${i} de ${total}`,
      largura - margem,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" },
    );
  }

  doc.save(`execucao-${String(e.id).slice(0, 8)}.pdf`);
  return rel;
}
