import { supabase } from "@/integrations/supabase/client";
import {
  carregarAlertasManutencao, carregarPlanosPorId, calcularAtraso, gerarOrdemAgrupada,
  type AlertaManutencao,
} from "./manutencao";

import { carregarChecklistPorOrdens, type ChecklistItem } from "./checklist";

export type Prioridade = "quebra" | "preventiva" | "aguardar";

export const PRIORIDADES: { value: Prioridade; label: string; descricao: string }[] = [
  { value: "quebra", label: "1 · Quebra (veículo parado)", descricao: "Urgente — o veículo não pode rodar." },
  { value: "preventiva", label: "2 · Manutenção preventiva", descricao: "Item do roteiro/plano de manutenção." },
  { value: "aguardar", label: "3 · Pode aguardar (agrupar)", descricao: "Avaria não urgente (lataria, estofamento...) para juntar na próxima parada." },
];

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  quebra: "QUEBRA",
  preventiva: "PREVENTIVA",
  aguardar: "PODE AGUARDAR",
};

export const PESO: Record<Prioridade, number> = { quebra: 0, preventiva: 1, aguardar: 2 };

/** Natureza do serviço: manutenção programada (plano) ou defeito/avaria reportado. */
export type TipoServico = "manutencao" | "defeito";

export const TIPO_LABEL: Record<TipoServico, string> = {
  manutencao: "MANUTENÇÃO",
  defeito: "DEFEITO",
};

export const TIPO_TONE: Record<TipoServico, string> = {
  manutencao: "border-primary/50 bg-primary/10 text-primary",
  defeito: "border-destructive/50 bg-destructive/10 text-destructive",
};

export interface ItemParada {
  /** id do item de checklist (quando a ordem tem checklist) ou da própria ordem */
  id: string;
  origem: "checklist" | "ordem";
  tipo: TipoServico;
  ordemId: string;
  planId: string | null;
  descricao: string;
  pecas: string | null;
  prioridade: Prioridade;
  feito: boolean | null;
  /** Atraso do plano vinculado: em km (controle por km) ou em dias (controle por dias) */
  atraso?: string | null;
  atrasado?: boolean;
}


export interface ParadaVeiculo {
  vehicle: any;
  prioridade: Prioridade;
  itens: ItemParada[];
  /** preventivas vencidas/próximas que ainda não viraram ordem */
  alertasSemOrdem: AlertaManutencao[];
  pecas: string[];
  totalManutencao: number;
  totalDefeito: number;
}

const norm = (p: any): Prioridade =>
  p === "quebra" || p === "aguardar" ? p : "preventiva";


/** Carrega, por veículo, tudo que está pendente de manutenção — já ordenado por prioridade. */
export async function carregarParadas(): Promise<ParadaVeiculo[]> {
  const { data: vehicles } = await supabase
    .from("cv_vehicles")
    .select("*")
    .eq("active", true)
    .order("name");
  const veiculos = (vehicles ?? []) as any[];
  if (!veiculos.length) return [];

  const { data: ordensData } = await supabase
    .from("cv_defect_reports")
    .select("*")
    .in("vehicle_id", veiculos.map(v => v.id))
    .neq("status", "resolved");
  const ordens = (ordensData ?? []) as any[];

  const checklists = await carregarChecklistPorOrdens(ordens.map(o => o.id));
  const alertasPorVeiculo = await carregarAlertasManutencao(
    veiculos.map(v => ({ id: v.id, current_km: v.current_km ?? 0 })),
  );
  const planos = await carregarPlanosPorId(veiculos.map(v => v.id));

  const paradas: ParadaVeiculo[] = veiculos.map(v => {
    const minhas = ordens.filter(o => o.vehicle_id === v.id);
    const itens: ItemParada[] = [];
    const atrasoDe = (planId: string | null) => {
      const plan = planId ? planos[planId] : null;
      if (!plan) return { atraso: null as string | null, atrasado: false };
      const a = calcularAtraso(plan, v.current_km ?? 0);
      return { atraso: a.atrasado ? a.label : null, atrasado: a.atrasado };
    };
    for (const o of minhas) {
      const prioridade = norm(o.prioridade);
      const tipoOrdem: TipoServico = o.maintenance_plan_id ? "manutencao" : "defeito";
      const chk = (checklists[o.id] ?? []) as ChecklistItem[];
      if (chk.length) {
        chk.forEach(c =>
          itens.push({
            id: c.id, origem: "checklist", tipo: c.plan_id ? "manutencao" : tipoOrdem,
            ordemId: o.id, planId: c.plan_id,
            descricao: c.descricao, pecas: (c as any).pecas ?? null,
            prioridade, feito: c.feito ?? null,
            ...atrasoDe(c.plan_id),
          }),
        );
      } else {
        itens.push({
          id: o.id, origem: "ordem", tipo: tipoOrdem, ordemId: o.id, planId: o.maintenance_plan_id ?? null,
          descricao: o.defect_description, pecas: o.pecas ?? null,
          prioridade, feito: null,
          ...atrasoDe(o.maintenance_plan_id ?? null),
        });
      }
    }


    const alertas = alertasPorVeiculo[v.id] ?? [];
    const alertasSemOrdem = alertas.filter(a => !a.ordemAberta);

    itens.sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade]);
    const prioridade: Prioridade = itens.some(i => i.prioridade === "quebra")
      ? "quebra"
      : itens.some(i => i.prioridade === "preventiva") || alertasSemOrdem.length
        ? "preventiva"
        : "aguardar";

    const pecas = Array.from(
      new Set(
        itens.flatMap(i => (i.pecas ?? "").split(/[;,\n]/).map(s => s.trim()).filter(Boolean)),
      ),
    );

    return {
      vehicle: v, prioridade, itens, alertasSemOrdem, pecas,
      totalManutencao: itens.filter(i => i.tipo === "manutencao").length,
      totalDefeito: itens.filter(i => i.tipo === "defeito").length,
    };

  }).filter(p => p.itens.length > 0 || p.alertasSemOrdem.length > 0);

  paradas.sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade] || b.itens.length - a.itens.length);
  return paradas;
}

/**
 * Agrupa todas as preventivas vencidas/próximas do veículo em UMA única ordem,
 * para parar o veículo o mínimo de vezes possível.
 */
export async function consolidarParada(parada: ParadaVeiculo) {
  if (!parada.alertasSemOrdem.length) return { criado: false, itens: 0 };
  return gerarOrdemAgrupada({
    vehicleId: parada.vehicle.id,
    estabelecimentoId: parada.vehicle.estabelecimento_id,
    alertas: parada.alertasSemOrdem,
    vehicleKm: parada.vehicle.current_km ?? null,
  });
}

/**
 * Dá baixa na parada: marca o que foi feito, informa data e KM (ajustando os próximos
 * vencimentos dos planos) e mantém pendente o que não foi executado.
 */
export async function darBaixaParada(params: {
  parada: ParadaVeiculo;
  marcados: Record<string, boolean>;
  km: number;
  data: string; // ISO
  responsavel: string;
  custo?: number | null;
  observacao?: string;
}) {
  const { parada, marcados, km, data, responsavel } = params;
  let feitos = 0;

  for (const item of parada.itens) {
    const feito = !!marcados[item.id];
    if (item.origem === "checklist") {
      const { error } = await supabase.from("cv_maintenance_checklist").update({
        feito,
        done_at: feito ? data : null,
        done_by: feito ? responsavel : null,
      }).eq("id", item.id);
      if (error) throw error;
    }
    if (feito) feitos++;
    // ajusta o plano para recalcular o próximo vencimento a partir da data/KM informados
    if (feito && item.planId) {
      await supabase.from("cv_maintenance_plans")
        .update({ last_done_km: km, last_done_at: data })
        .eq("id", item.planId);
    }
  }

  // fecha as ordens em que tudo foi feito
  const ordens = Array.from(new Set(parada.itens.map(i => i.ordemId)));
  for (const ordemId of ordens) {
    const itensDaOrdem = parada.itens.filter(i => i.ordemId === ordemId);
    const todos = itensDaOrdem.every(i => marcados[i.id]);
    const algum = itensDaOrdem.some(i => marcados[i.id]);
    if (!algum) continue;
    const padrao = todos ? "Executado na parada programada" : "Parcialmente executado na parada programada";
    await supabase.from("cv_defect_reports").update({
      status: todos ? "resolved" : "in_progress",
      resolved_at: todos ? data : null,
      resolved_by: responsavel,
      data_baixa: data,
      km_baixa: km,
      ...(params.custo ? { cost: params.custo } : {}),
      solution: params.observacao ? `${padrao} — ${params.observacao}` : padrao,
    }).eq("id", ordemId);

  }

  if (km && km > (parada.vehicle.current_km ?? 0)) {
    await supabase.from("cv_vehicles").update({ current_km: km }).eq("id", parada.vehicle.id);
  }

  const pendentes = parada.itens.length - feitos;
  return { feitos, pendentes };
}

/** Monta e abre a ficha de manutenção para impressão. */
export function imprimirFicha(parada: ParadaVeiculo) {
  const v = parada.vehicle;
  const linhas = parada.itens.map((i, idx) => `
    <tr>
      <td class="c">${idx + 1}</td>
      <td><span class="tag t-${i.prioridade}">${PRIORIDADE_LABEL[i.prioridade]}</span></td>
      <td>${i.descricao}</td>
      <td>${i.pecas ?? "-"}</td>
      <td class="c box"></td>
      <td class="c box"></td>
      <td></td>
    </tr>`).join("");

  const pecas = parada.pecas.length
    ? parada.pecas.map(p => `<li>${p}</li>`).join("")
    : "<li>Nenhuma peça/insumo cadastrado nos itens desta parada.</li>";

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <title>Ficha de manutenção — ${v.plate ?? ""}</title>
  <style>
    *{font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}
    body{margin:24px;color:#111;font-size:12px}
    h1{font-size:18px;margin:0 0 2px}
    h2{font-size:13px;margin:18px 0 6px;border-bottom:1px solid #999;padding-bottom:3px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:8px}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th,td{border:1px solid #999;padding:5px;vertical-align:top}
    th{background:#eee;font-size:11px;text-align:left}
    .c{text-align:center}
    .box{width:38px;height:26px}
    .tag{font-size:9px;padding:2px 4px;border:1px solid #111;border-radius:3px;white-space:nowrap}
    .t-quebra{background:#ffdada;border-color:#c00}
    .t-preventiva{background:#e6f0ff}
    .t-aguardar{background:#f2f2f2}
    ul{margin:4px 0 0 18px}
    .assinaturas{display:flex;gap:24px;margin-top:42px}
    .assinaturas div{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center}
    @media print{body{margin:10mm}}
  </style></head><body>
  <div class="head">
    <div>
      <h1>Ficha de Manutenção — Parada Programada</h1>
      <div><b>Veículo:</b> ${v.name ?? ""} &nbsp; <b>Placa:</b> ${v.plate ?? ""} &nbsp; <b>Tipo:</b> ${v.fleet_type ?? v.vehicle_type ?? "-"}</div>
      <div><b>KM atual:</b> ${(v.current_km ?? 0).toLocaleString("pt-BR")} &nbsp; <b>Prioridade da parada:</b> ${PRIORIDADE_LABEL[parada.prioridade]}</div>
    </div>
    <div style="text-align:right">
      <div><b>Emissão:</b> ${new Date().toLocaleString("pt-BR")}</div>
      <div><b>Itens:</b> ${parada.itens.length}</div>
    </div>
  </div>

  <h2>Serviços a executar</h2>
  <table>
    <thead><tr>
      <th style="width:26px">#</th><th style="width:80px">Prioridade</th><th>Serviço</th>
      <th style="width:150px">Peças / insumos</th><th style="width:38px">Feito</th><th style="width:38px">Não</th><th style="width:150px">Observação</th>
    </tr></thead>
    <tbody>${linhas || '<tr><td colspan="7" class="c">Sem itens</td></tr>'}</tbody>
  </table>

  <h2>Peças e insumos necessários para a parada</h2>
  <ul>${pecas}</ul>

  <h2>Baixa do serviço</h2>
  <table><tbody>
    <tr><td style="width:50%"><b>Data de execução:</b><br><br></td><td><b>KM do veículo na execução:</b><br><br></td></tr>
    <tr><td><b>Mecânico responsável:</b><br><br></td><td><b>Custo total (R$):</b><br><br></td></tr>
  </tbody></table>

  <div class="assinaturas">
    <div>Funcionário / Mecânico</div>
    <div>Encarregado de manutenção</div>
  </div>
  <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
