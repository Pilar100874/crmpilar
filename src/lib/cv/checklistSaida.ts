import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { normalizarGrupo } from "./gruposBiblioteca";

export type Responsavel = "motorista" | "mecanico" | "porteiro";
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
  { valor: "porteiro", rotulo: "Porteiro" },
  { valor: "mecanico", rotulo: "Mecânico" },
];

export const periodicidadeChecklistDias: Record<Responsavel, number> = {
  motorista: 1, porteiro: 1, mecanico: 7,
};

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
  ["motorista", "Fluidos", "Verificar diariamente o nível da água / líquido de arrefecimento, com o motor frio (não abrir o reservatório quente)", []],
  ["motorista", "Motor", "Verificar diariamente o nível do óleo do motor, com o veículo nivelado e motor desligado, conforme manual", []],
  ["motorista", "Motor", "Verificar diariamente se há vazamento de óleo no motor (embaixo do veículo e em volta do motor), antes da saída", []],
  ["motorista", "Motor", "Conferir se a troca de óleo do motor está em dia (km da última troca dentro do prazo; em dúvida, comunicar o mecânico)", []],
  ["motorista", "Freios", "Testar freios de serviço e estacionamento em local seguro, antes da saída; comunicar falhas e não sair sem liberação", []],
  // Mecânico — itens técnicos
  ["mecanico", "Motor", "Nível do óleo do motor", []],
  ["mecanico", "Motor", "Vazamento de óleo no motor (juntas, tampa de válvulas, cárter, filtro e bujão do cárter)", []],
  ["mecanico", "Motor", "Troca de óleo em dia (conferir km/horas da última troca, registrar e programar a próxima)", []],
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
  ["mecanico", "Geral", "Liberação semanal do veículo: preencher e assinar este check list uma vez por semana (validade de 7 dias), anotando placa, data da inspeção e validade; registrar pendências antes de liberar", []],
  // Portaria — conferência do veículo e do motorista, com dados anotados no formulário
  ["porteiro", "Geral", "Conferir e anotar no formulário a placa, o tipo e a cor do veículo que sai", []],
  ["porteiro", "Geral", "Anotar hora de saída e quilometragem do painel do veículo", []],
  ["porteiro", "Documentação", "Conferir e anotar a CNH válida e o nome do motorista autorizado a este veículo", []],
  ["porteiro", "Documentação", "Conferir a existência do check list semanal do mecânico preenchido e assinado para a mesma placa, dentro da validade de 7 dias; anotar data, validade e nome do mecânico. Se ausente, vencido ou sem liberação, reter a saída e comunicar o responsável", []],
  ["porteiro", "Segurança", "Motorista sem sinais de embriaguez (hálito, fala, equilíbrio); em caso de suspeita, registrar a ocorrência e reter a saída até autorização", []],
  ["porteiro", "Segurança", "Motorista em condição de dirigir (sem sonolência ou sinais de uso de substâncias); registrar qualquer alteração de comportamento", []],
  ["porteiro", "Segurança", "Ocupantes com cinto de segurança afivelado antes da liberação", QUATRO_RODAS],
  ["porteiro", "Segurança", "Veículo sem avarias novas; anotar riscos, amassados ou vidros trincados no formulário", []],
  ["porteiro", "Segurança", "Sem vazamentos de óleo ou combustível sob o veículo; anotar quando houver", []],
  ["porteiro", "Segurança", "Pneus em condição visível de rodagem; anotar quando não conforme", []],
  ["porteiro", "Geral", "Saída liberada somente após as conferências; anotar destino e motivo da saída", []],
  ["porteiro", "Geral", "Observações do porteiro sobre o estado do veículo e do motorista registradas no formulário", []],
];

export const itensSugeridos = (): ChecklistItem[] =>
  SUG.map(([responsavel, categoria, item, tipos_veiculo], ordem) => ({
    responsavel, categoria: normalizarGrupo(categoria), item, tipos_veiculo, ordem, ativo: true,
  }));

/** Item vale para o tipo? (lista vazia = todos) */
export const aplicaAoTipo = (i: Pick<ChecklistItem, "tipos_veiculo">, tipo: string) =>
  i.tipos_veiculo.length === 0 || i.tipos_veiculo.includes(tipo);

export async function listarChecklist(): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from("cv_maintenance_catalog")
    .select("*")
    .eq("ativo", true)
    .order("sistema").order("checklist_ordem");
  if (error) throw error;
  return (data ?? []).flatMap(i => RESPONSAVEIS
    .filter(r => i.checklist_selecionados.includes(r.valor))
    .map(r => ({ id: i.id, responsavel: r.valor, categoria: normalizarGrupo(i.sistema),
      item: i.uso_manutencao ? `${i.componente} — ${i.acao}` : i.componente,
      tipos_veiculo: i.checklist_tipos, ordem: i.checklist_ordem, ativo: i.ativo })));
}

export function itensDoResponsavel(itens: ChecklistItem[], responsavel: Responsavel) {
  return itens.filter(i => i.ativo && i.responsavel === responsavel);
}

export function gerarPdfChecklist(itens: ChecklistItem[], tipos: string[], responsavel: Responsavel, empresa = "") {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const larg = doc.internal.pageSize.getWidth();
  const ativos = itensDoResponsavel(itens, responsavel);

  let primeira = true;
  RESPONSAVEIS.filter(r => r.valor === responsavel).forEach(({ valor, rotulo }) => {
    const lista = ativos.filter(i => i.responsavel === valor)
      .sort((a, b) => a.categoria.localeCompare(b.categoria, "pt-BR") || a.ordem - b.ordem);
    if (!lista.length) return;
    const inicio = 12;
    if (!primeira) doc.addPage();
    primeira = false;

    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text(`Check list ${periodicidadeChecklistDias[valor] === 7 ? "semanal de liberação" : "diário de saída"} de veículo — ${rotulo}`, 10, inicio);
    doc.setFont("helvetica", "normal").setFontSize(9);
    if (empresa) doc.text(empresa, larg - 10, inicio, { align: "right" });
    const campos = valor === "mecanico"
      ? ["Data inspeção: ____/____/______", "Placa: __________", "KM: __________", "Válido até: ____/____/______", "Mecânico: ____________________"]
      : ["Data: ____/____/______", "Placa: __________", "Hora saída: ______",
        "KM saída: __________", `${rotulo}: ______________________________`];
    doc.text(campos.join("     "), 10, inicio + 7);
    doc.setFontSize(7.5);
    doc.text("Marque a coluna do veículo. OK = conforme; NC = não conforme (anotar); NA = não se aplica. Colunas cinzas não se aplicam.", 10, inicio + 12);
    if (valor === "mecanico") doc.text("Inspeção e liberação uma vez por semana (7 dias). Registrar a validade e apresentar o formulário preenchido e assinado à portaria.", 10, inicio + 17);
    if (valor === "porteiro") doc.text("Check list do mecânico: data ____/____/______   válido até ____/____/______   mecânico ____________________   placa __________", 10, inicio + 17);

    // Colunas de tipo com largura igual (mín. 18mm p/ caber OK e NC)
    const colTipo = Math.max(18, Math.min(30, (larg - 20 - 24 - 70) / Math.max(1, tipos.length)));
    const corpo = lista.map(i => [i.categoria, i.item, ...tipos.map(t => (aplicaAoTipo(i, t) ? "" : "—"))]);
    autoTable(doc, {
      startY: inicio + (valor === "motorista" ? 15 : 20),
      head: [["Grupo", "Item a verificar", ...tipos]],
      body: corpo,
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.2, valign: "middle" },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, halign: "center" },
      columnStyles: {
        0: { cellWidth: 34, fontStyle: "bold" },
        1: { cellWidth: larg - 20 - 34 - colTipo * tipos.length },
        ...Object.fromEntries(tipos.map((_, k) => [k + 2, { halign: "center", cellWidth: colTipo }])),
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
    if (valor === "porteiro") {
      doc.text("Decisão: [  ] Saída liberada   [  ] Saída retida     Autorizado por: ____________________", 10, y + 10);
    }
    if (valor === "mecanico") {
      doc.text("Decisão do mecânico: [  ] Veículo liberado   [  ] Veículo não liberado     Validade: 7 dias da inspeção", 10, y + 10);
    }
  });

  doc.save(`checklist-saida-${responsavel}.pdf`);
}
