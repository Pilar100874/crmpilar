import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type Responsavel = "motorista" | "mecanico";
export interface ChecklistItem {
  id?: string;
  responsavel: Responsavel;
  categoria: string;
  item: string;
  /** Vazio = vale para todos os tipos */
  tipos_veiculo: string[];
  ordem: number;
  ativo: boolean;
}

export const RESPONSAVEIS: { valor: Responsavel; rotulo: string }[] = [
  { valor: "motorista", rotulo: "Motorista" },
  { valor: "mecanico", rotulo: "Mecânico" },
];

const CAMINHOES = ["Caminhão Leve", "Caminhão Médio", "Caminhão Pesado"];
const PESADOS = ["Caminhão Médio", "Caminhão Pesado"];
const QUATRO_RODAS = ["Carro", "Van", ...CAMINHOES];

type Sug = [Responsavel, string, string, string[]];
const SUG: Sug[] = [
  // Motorista — inspeção visual antes de sair
  ["motorista", "Documentos", "CRLV, CNH e documentos de carga no veículo", []],
  ["motorista", "Pneus", "Pneus sem cortes/bolhas e calibragem visual", []],
  ["motorista", "Pneus", "Estepe, macaco e chave de roda", QUATRO_RODAS],
  ["motorista", "Iluminação", "Faróis, lanternas, setas e luz de freio", []],
  ["motorista", "Iluminação", "Luz de ré e alerta sonoro de ré", [...CAMINHOES, "Van"]],
  ["motorista", "Cabine", "Painel sem luzes de alerta acesas", []],
  ["motorista", "Cabine", "Buzina funcionando", []],
  ["motorista", "Cabine", "Cinto de segurança em todos os bancos", QUATRO_RODAS],
  ["motorista", "Cabine", "Retrovisores ajustados e sem danos", []],
  ["motorista", "Cabine", "Limpador e esguicho de para-brisa", QUATRO_RODAS],
  ["motorista", "Cabine", "Para-brisa sem trincas", QUATRO_RODAS],
  ["motorista", "Segurança", "Triângulo e extintor dentro da validade", QUATRO_RODAS],
  ["motorista", "Segurança", "Capacete, viseira e antena corta-pipa", ["Moto"]],
  ["motorista", "Carga", "Carga amarrada / baú e portas travados", ["Van", ...CAMINHOES]],
  ["motorista", "Carga", "Tacógrafo com disco/registro em ordem", PESADOS],
  ["motorista", "Geral", "Nível de combustível suficiente para a rota", []],
  ["motorista", "Geral", "Lataria sem avarias novas (anotar)", []],
  ["motorista", "Geral", "Vazamentos visíveis sob o veículo", []],
  // Mecânico — itens técnicos
  ["mecanico", "Motor", "Nível do óleo do motor", []],
  ["mecanico", "Motor", "Nível do líquido de arrefecimento", QUATRO_RODAS],
  ["mecanico", "Motor", "Correias e mangueiras sem desgaste", QUATRO_RODAS],
  ["mecanico", "Freios", "Nível do fluido de freio", []],
  ["mecanico", "Freios", "Teste de freio e freio de estacionamento", []],
  ["mecanico", "Freios", "Pressão do sistema de ar / drenagem dos reservatórios", PESADOS],
  ["mecanico", "Transmissão", "Corrente/relação lubrificada e esticada", ["Moto"]],
  ["mecanico", "Transmissão", "Embreagem e câmbio sem ruídos", QUATRO_RODAS],
  ["mecanico", "Direção", "Folga de direção e nível do fluido hidráulico", QUATRO_RODAS],
  ["mecanico", "Suspensão", "Amortecedores, molas e feixes", QUATRO_RODAS],
  ["mecanico", "Rodas", "Aperto das porcas das rodas", []],
  ["mecanico", "Elétrica", "Bateria, terminais e fixação", []],
  ["mecanico", "Elétrica", "Arla 32 abastecido", PESADOS],
  ["mecanico", "Geral", "Vazamentos de óleo, água ou combustível", []],
  ["mecanico", "Geral", "Liberado para sair (assinatura do mecânico)", []],
];

export const itensSugeridos = (): ChecklistItem[] =>
  SUG.map(([responsavel, categoria, item, tipos_veiculo], ordem) => ({
    responsavel, categoria, item, tipos_veiculo, ordem, ativo: true,
  }));

/** Item vale para o tipo? (lista vazia = todos) */
export const aplicaAoTipo = (i: Pick<ChecklistItem, "tipos_veiculo">, tipo: string) =>
  i.tipos_veiculo.length === 0 || i.tipos_veiculo.includes(tipo);

export async function listarChecklist(): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from("cv_checklist_saida_itens")
    .select("*")
    .order("responsavel").order("ordem");
  if (error) throw error;
  return (data ?? []) as ChecklistItem[];
}

export function gerarPdfChecklist(itens: ChecklistItem[], tipos: string[], empresa = "") {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const larg = doc.internal.pageSize.getWidth();
  const ativos = itens.filter(i => i.ativo);

  RESPONSAVEIS.forEach(({ valor, rotulo }, idx) => {
    const lista = ativos.filter(i => i.responsavel === valor);
    if (!lista.length) return;
    if (idx > 0 && doc.getNumberOfPages() >= 1 && (doc as any).lastAutoTable) doc.addPage();

    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text(`Check list diário de saída de veículo — ${rotulo}`, 10, 12);
    doc.setFont("helvetica", "normal").setFontSize(9);
    if (empresa) doc.text(empresa, larg - 10, 12, { align: "right" });
    const campos = ["Data: ____/____/______", "Placa: __________", "Hora saída: ______",
      "KM saída: __________", `${rotulo}: ______________________________`];
    doc.text(campos.join("     "), 10, 19);
    doc.setFontSize(7.5);
    doc.text("Marque apenas a coluna do tipo do veículo que está saindo. OK = conforme · NC = não conforme (descrever em observações). Colunas cinzas não se aplicam.", 10, 24);

    const corpo = lista.map(i => [i.categoria, i.item, ...tipos.map(t => (aplicaAoTipo(i, t) ? "" : "—"))]);
    autoTable(doc, {
      startY: 27,
      head: [["Grupo", "Item a verificar", ...tipos]],
      body: corpo,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1.6, valign: "middle" },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, halign: "center" },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: "bold" },
        1: { cellWidth: tipos.length > 6 ? 70 : 95 },
        ...Object.fromEntries(tipos.map((_, k) => [k + 2, { halign: "center" }])),
      },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index >= 2 && d.cell.raw === "—") {
          d.cell.styles.fillColor = [220, 220, 220];
          d.cell.styles.textColor = [150, 150, 150];
        }
      },
      didDrawCell: (d) => {
        if (d.section !== "body" || d.column.index < 2 || d.cell.raw === "—") return;
        // Duas caixinhas: OK e NC
        const y = d.cell.y + d.cell.height / 2 - 1.5;
        const cx = d.cell.x + d.cell.width / 2;
        doc.setDrawColor(60).setFontSize(5.5);
        doc.rect(cx - 7, y, 3, 3); doc.text("OK", cx - 3.5, y + 2.4);
        doc.rect(cx + 0.5, y, 3, 3); doc.text("NC", cx + 4, y + 2.4);
      },
      margin: { left: 10, right: 10 },
    });

    let y = (doc as any).lastAutoTable.finalY + 6;
    if (y > 175) { doc.addPage(); y = 15; }
    doc.setFontSize(9).text("Observações / não conformidades:", 10, y);
    for (let k = 1; k <= 3; k++) doc.line(10, y + k * 6, larg - 10, y + k * 6);
    y += 26;
    doc.line(10, y, 100, y); doc.line(larg - 100, y, larg - 10, y);
    doc.text(`Assinatura do ${rotulo.toLowerCase()}`, 10, y + 4);
    doc.text("Assinatura do responsável pela liberação", larg - 100, y + 4);
  });

  doc.save("checklist-saida-veiculos.pdf");
}
