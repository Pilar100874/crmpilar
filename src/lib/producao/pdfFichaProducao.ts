import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FichaProducao } from "./fichaProducao";

const n = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });

/** Printable factory sheet for operators, built only from the saved recipe fields. */
export function gerarPdfFichaProducao(produto: string, f: FichaProducao, nomeMateria: (id: string) => string, nomeMaquina: (id: string) => string) {
  const doc = new jsPDF();
  doc.setFontSize(14); doc.text(`Ficha de produção — ${produto || "Produto"}`, 14, 16);
  doc.setFontSize(9); doc.text(`Quantidade-base: ${n(f.quantidade_base)} ${f.unidade_produto} · Emitido em ${new Date().toLocaleString("pt-BR")}`, 14, 22);
  const grupo = (id?: string) => f.materiais.find(g => g.id === id)?.nome || "";
  autoTable(doc, {
    startY: 28, head: [["Material", "Opção", "Matéria-prima", "Consumo", "Rendimento", "Perda máx."]],
    body: f.materiais.flatMap(g => g.opcoes.map((o, i) => [g.nome, i === 0 ? "Principal" : `Substituto ${i}`, nomeMateria(o.produto_id), `${n(o.quantidade)} ${o.unidade}${g.segue_grupo_id ? ` por ciclo de ${grupo(g.segue_grupo_id)}` : ""}`, g.segue_grupo_id ? "Segue ciclo" : o.rendimento ? `${n(o.rendimento)} ${f.unidade_produto}` : "Por quantidade-base", o.perda_max_percentual ? `${n(o.perda_max_percentual)}%` : "—"])),
    styles: { fontSize: 8 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = (doc as any).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: y, head: [["Etapa", "Máquina", "Capacidade/min", "Setup inicial", "Setup reposição"]],
    body: f.etapas.flatMap((e, i) => e.opcoes.map((o, j) => [j === 0 ? `${i + 1}. ${e.nome}` : "", `${j === 0 ? "" : "OU "}${nomeMaquina(o.maquina_id)}`, n(o.capacidade_minuto), `${n(o.setup_minutos)} min`, `${n(o.setup_troca_material_minutos)} min`])),
    styles: { fontSize: 8 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;
  if (f.funcionarios_extras?.length) autoTable(doc, { startY: y, head: [["Funcionários extras", "Serviço"]], body: f.funcionarios_extras.map(a => [String(a.quantidade), a.servico]), styles: { fontSize: 8 } });
  doc.save(`ficha-producao-${(produto || "produto").replace(/[^\w-]+/g, "-")}.pdf`);
}
