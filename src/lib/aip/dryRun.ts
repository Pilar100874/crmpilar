import { cronValido, descreverCron, proximaExecucao } from "@/lib/aip/cron";
import type { ConectorRegistro } from "@/lib/aip/conectores";

/**
 * Simulação (dry-run) de uma rotina agendada: valida o cadastro atual,
 * confere os conectores no registro sincronizado e monta a prévia exata
 * do payload que o agendador enviaria — sem executar nada.
 */

export type NivelCheck = "ok" | "alerta" | "erro";

export interface CheckDryRun {
  grupo: "Cadastro" | "Alvo" | "Conectores" | "Inputs" | "Agendamento";
  titulo: string;
  nivel: NivelCheck;
  detalhe?: string;
}

export interface RotinaDryRunEntrada {
  id?: string;
  nome?: string | null;
  descricao?: string | null;
  tipo_alvo?: string;
  workflow_id?: string | null;
  agent_id?: string | null;
  prompt?: string | null;
  modelo?: string | null;
  input?: Record<string, unknown> | null;
  conectores?: { tipo: string; ref: string; nome: string }[] | null;
  cron_expressao?: string | null;
  fuso?: string | null;
  timeout_ms?: number | null;
  retry_max?: number | null;
  max_concorrencia?: number | null;
  retry_backoff_ms?: number | null;
  retry_fator?: number | null;
  bloquear_duplicados?: boolean | null;
  ativo?: boolean | null;

}

export interface ResultadoDryRun {
  ok: boolean;
  checks: CheckDryRun[];
  payload: Record<string, unknown>;
  destino: string;
  proxima: string | null;
  resumoCron: string;
}

const temErro = (checks: CheckDryRun[]) => checks.some((c) => c.nivel === "erro");

export function simularRotina(
  rotina: RotinaDryRunEntrada,
  contexto: {
    conectores: ConectorRegistro[];
    workflows: { id: string; nome: string; ativo?: boolean | null }[];
    agentes: { id: string; nome: string; modelo_ia?: string | null; prompt_principal?: string | null }[];
  },
): ResultadoDryRun {
  const checks: CheckDryRun[] = [];
  const tipo = rotina.tipo_alvo ?? "workflow";
  const fuso = rotina.fuso || "America/Sao_Paulo";
  const cron = rotina.cron_expressao ?? "";

  // Cadastro ---------------------------------------------------------
  if (rotina.nome?.trim()) {
    checks.push({ grupo: "Cadastro", titulo: "Nome informado", nivel: "ok", detalhe: rotina.nome });
  } else {
    checks.push({ grupo: "Cadastro", titulo: "Nome obrigatório", nivel: "erro" });
  }
  if (!rotina.descricao?.trim()) {
    checks.push({
      grupo: "Cadastro",
      titulo: "Sem descrição",
      nivel: "alerta",
      detalhe: "Ajuda a identificar a rotina no histórico e nas notificações.",
    });
  }
  if (rotina.ativo === false) {
    checks.push({
      grupo: "Cadastro",
      titulo: "Rotina pausada",
      nivel: "alerta",
      detalhe: "Não será disparada automaticamente enquanto estiver inativa.",
    });
  }

  // Alvo -------------------------------------------------------------
  let destino = "—";
  if (tipo === "workflow") {
    const wf = contexto.workflows.find((w) => w.id === rotina.workflow_id);
    if (!rotina.workflow_id) {
      checks.push({ grupo: "Alvo", titulo: "Workflow não selecionado", nivel: "erro" });
    } else if (!wf) {
      checks.push({
        grupo: "Alvo",
        titulo: "Workflow inexistente ou sem acesso",
        nivel: "erro",
        detalhe: rotina.workflow_id,
      });
    } else {
      destino = `Workflow: ${wf.nome}`;
      checks.push({ grupo: "Alvo", titulo: "Workflow encontrado", nivel: "ok", detalhe: wf.nome });
      if (wf.ativo === false) {
        checks.push({
          grupo: "Alvo",
          titulo: "Workflow inativo",
          nivel: "alerta",
          detalhe: "O motor executa mesmo assim, mas revise se é o esperado.",
        });
      }
    }
  } else {
    if (tipo === "agente") {
      const ag = contexto.agentes.find((a) => a.id === rotina.agent_id);
      if (!rotina.agent_id) {
        checks.push({ grupo: "Alvo", titulo: "Agente não selecionado", nivel: "erro" });
      } else if (!ag) {
        checks.push({
          grupo: "Alvo",
          titulo: "Agente inexistente ou sem acesso",
          nivel: "erro",
          detalhe: rotina.agent_id,
        });
      } else {
        destino = `Agente: ${ag.nome}`;
        checks.push({ grupo: "Alvo", titulo: "Agente encontrado", nivel: "ok", detalhe: ag.nome });
        if (!ag.prompt_principal?.trim()) {
          checks.push({
            grupo: "Alvo",
            titulo: "Agente sem prompt principal",
            nivel: "alerta",
            detalhe: "A rotina dependerá apenas do prompt informado aqui.",
          });
        }
      }
    } else {
      destino = "Claude Code (prompt livre)";
    }

    const promptEfetivo =
      rotina.prompt?.trim() ||
      (tipo === "agente" ? `Execute a rotina agendada "${rotina.nome ?? ""}".` : "");
    if (!promptEfetivo) {
      checks.push({ grupo: "Alvo", titulo: "Prompt obrigatório para Claude Code", nivel: "erro" });
    } else if (!rotina.prompt?.trim()) {
      checks.push({
        grupo: "Alvo",
        titulo: "Prompt padrão será usado",
        nivel: "alerta",
        detalhe: promptEfetivo,
      });
    } else {
      checks.push({
        grupo: "Alvo",
        titulo: "Prompt definido",
        nivel: "ok",
        detalhe: `${promptEfetivo.length} caracteres`,
      });
    }
  }

  // Conectores -------------------------------------------------------
  const selecionados = rotina.conectores ?? [];
  if (selecionados.length === 0) {
    checks.push({
      grupo: "Conectores",
      titulo: "Nenhum conector vinculado",
      nivel: "alerta",
      detalhe: "A rotina rodará sem acesso a ferramentas externas.",
    });
  }
  for (const c of selecionados) {
    const reg = contexto.conectores.find((r) => r.tipo === c.tipo && r.ref === c.ref);
    if (!reg) {
      checks.push({
        grupo: "Conectores",
        titulo: `${c.nome} não está no registro`,
        nivel: "erro",
        detalhe: "Sincronize os conectores ou remova o vínculo.",
      });
    } else if (!reg.disponivel) {
      checks.push({
        grupo: "Conectores",
        titulo: `${reg.nome} indisponível`,
        nivel: "erro",
        detalhe: reg.ultimo_erro ?? reg.status ?? "Conector fora do ar na última sincronização.",
      });
    } else {
      checks.push({
        grupo: "Conectores",
        titulo: `${reg.nome} pronto`,
        nivel: "ok",
        detalhe: reg.ferramentas?.length
          ? `${reg.ferramentas.length} ferramenta(s) expostas`
          : (reg.categoria ?? reg.tipo),
      });
    }
  }

  // Inputs -----------------------------------------------------------
  const input = rotina.input ?? {};
  if (typeof input !== "object" || Array.isArray(input)) {
    checks.push({ grupo: "Inputs", titulo: "Input deve ser um objeto JSON", nivel: "erro" });
  } else {
    const chaves = Object.keys(input);
    if (chaves.length === 0) {
      checks.push({
        grupo: "Inputs",
        titulo: "Sem variáveis de entrada",
        nivel: "alerta",
        detalhe: "A rotina usará apenas o prompt e os conectores.",
      });
    } else {
      checks.push({
        grupo: "Inputs",
        titulo: `${chaves.length} variável(is) de entrada`,
        nivel: "ok",
        detalhe: chaves.join(", "),
      });
      const vazias = chaves.filter((k) => {
        const v = (input as Record<string, unknown>)[k];
        return v === null || v === undefined || (typeof v === "string" && !v.trim());
      });
      if (vazias.length) {
        checks.push({
          grupo: "Inputs",
          titulo: "Variáveis sem valor",
          nivel: "alerta",
          detalhe: vazias.join(", "),
        });
      }
    }
  }

  // Agendamento ------------------------------------------------------
  let proxima: string | null = null;
  if (!cronValido(cron)) {
    checks.push({ grupo: "Agendamento", titulo: "Expressão cron inválida", nivel: "erro", detalhe: cron });
  } else {
    try {
      proxima = proximaExecucao(cron, fuso)?.toISOString() ?? null;
    } catch {
      proxima = null;
    }
    checks.push({
      grupo: "Agendamento",
      titulo: "Agendamento válido",
      nivel: "ok",
      detalhe: descreverCron(cron, fuso),
    });
    if (!proxima) {
      checks.push({
        grupo: "Agendamento",
        titulo: "Não foi possível calcular a próxima execução",
        nivel: "alerta",
      });
    }
  }

  const timeout = Number(rotina.timeout_ms ?? 120000);
  if (!Number.isFinite(timeout) || timeout < 1000) {
    checks.push({
      grupo: "Agendamento",
      titulo: "Timeout muito baixo",
      nivel: "erro",
      detalhe: "Use pelo menos 1000 ms por etapa.",
    });
  }
  const tentativas = Number(rotina.retry_max ?? 1);
  if (!Number.isFinite(tentativas) || tentativas < 0 || tentativas > 5) {
    checks.push({
      grupo: "Agendamento",
      titulo: "Tentativas fora do intervalo (0 a 5)",
      nivel: "erro",
      detalhe: String(rotina.retry_max),
    });
  }

  // Payload ----------------------------------------------------------
  const agenteSel = contexto.agentes.find((a) => a.id === rotina.agent_id);
  const payload: Record<string, unknown> =
    tipo === "workflow"
      ? {
          destino: "aip-execute-workflow",
          workflow_id: rotina.workflow_id ?? null,
          input: { ...input, conectores: selecionados },
          origem: "rotina",
          rotina: { id: rotina.id ?? "(não salva)", nome: rotina.nome ?? "" },
          timeout_ms: timeout,
          retry_max: tentativas,
        }
      : {
          destino: "runner Claude Code (/run)",
          prompt:
            rotina.prompt?.trim() ||
            (tipo === "agente" ? `Execute a rotina agendada "${rotina.nome ?? ""}".` : ""),
          system: agenteSel?.prompt_principal ?? null,
          model: rotina.modelo || agenteSel?.modelo_ia || "claude-sonnet-4",
          input,
          connectors: selecionados,
          rotina: { id: rotina.id ?? "(não salva)", nome: rotina.nome ?? "" },
        };

  return {
    ok: !temErro(checks),
    checks,
    payload,
    destino,
    proxima,
    resumoCron: cronValido(cron) ? descreverCron(cron, fuso) : "Agendamento inválido",
  };
}
