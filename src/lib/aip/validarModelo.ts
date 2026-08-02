import { cronValido, descreverCron } from "@/lib/aip/cron";

/**
 * Validação de um "modelo" montado no assistente de criação.
 *
 * Confere, antes de executar, se tudo que o modelo precisa está cadastrado e
 * ativo: objetivo, modelo de IA, skills, tools, MCPs, etapas e agendamento.
 */

export type NivelValidacao = "ok" | "alerta" | "erro";

export interface CheckModelo {
  grupo: "Básico" | "Conhecimento" | "Ferramentas" | "Execução" | "Agendamento" | "Servidor";
  titulo: string;
  nivel: NivelValidacao;
  detalhe?: string;
  comoResolver?: string;
}

export interface ModeloEntrada {
  nome?: string | null;
  tipo?: string | null;
  objetivo?: string | null;
  detalhes?: string | null;
  modelo?: string | null;
  skill_ids?: string[] | null;
  tool_ids?: string[] | null;
  mcp_ids?: string[] | null;
  referencias?: { nome?: string; url?: string }[] | null;
  md_conteudo?: string | null;
  modo_execucao?: "unica" | "etapas" | null;
  etapas?: { id?: string; titulo?: string; instrucao?: string }[] | null;
  agenda?: { frequencia?: string; hora?: string; minuto?: string } | null;
  cron?: string | null;
  criaRotina?: boolean;
  precisaReferencias?: boolean;
}

export interface ContextoValidacao {
  skills: { id: string; nome: string; ativo?: boolean | null; status?: string | null; conteudo_md?: string | null }[];
  tools: { id: string; nome: string; status?: string | null; endpoint?: string | null; tipo?: string | null; credencial_ref?: string | null }[];
  mcps: { id: string; nome: string; status?: string | null; endpoint?: string | null; ultimo_erro?: string | null }[];
  modelosDisponiveis: string[];
  servidorConfigurado?: boolean | null;
}

export interface ResultadoValidacao {
  ok: boolean;
  erros: number;
  alertas: number;
  pontuacao: number;
  checks: CheckModelo[];
  /** Resumo em texto — usado para pedir correções à IA. */
  resumo: string;
}

const push = (
  lista: CheckModelo[],
  grupo: CheckModelo["grupo"],
  titulo: string,
  nivel: NivelValidacao,
  detalhe?: string,
  comoResolver?: string,
) => lista.push({ grupo, titulo, nivel, detalhe, comoResolver });

export function validarModelo(
  entrada: ModeloEntrada,
  ctx: ContextoValidacao,
): ResultadoValidacao {
  const checks: CheckModelo[] = [];

  // ---------- Básico ----------
  const nome = (entrada.nome ?? "").trim();
  push(
    checks,
    "Básico",
    "Nome do modelo",
    nome.length > 2 ? "ok" : "erro",
    nome || "Sem nome",
    "Dê um nome curto que identifique o que este modelo faz.",
  );

  const objetivo = (entrada.objetivo ?? "").trim();
  push(
    checks,
    "Básico",
    "Objetivo descrito",
    objetivo.length >= 25 ? "ok" : objetivo.length > 5 ? "alerta" : "erro",
    objetivo ? `${objetivo.length} caracteres` : "Objetivo em branco",
    "Explique o que fazer, com quais dados e para quem entregar o resultado.",
  );

  const modelo = (entrada.modelo ?? "").trim();
  const modeloConhecido = ctx.modelosDisponiveis.includes(modelo);
  push(
    checks,
    "Básico",
    "Modelo de IA",
    modelo ? (modeloConhecido ? "ok" : "alerta") : "erro",
    modelo || "Nenhum modelo escolhido",
    modelo && !modeloConhecido
      ? "O modelo informado não está na lista oficial. Escolha um da lista para evitar erro na execução."
      : "Escolha o modelo de IA que vai processar o trabalho.",
  );

  if (entrada.precisaReferencias) {
    const refs = entrada.referencias ?? [];
    const semUrl = refs.filter((r) => !r?.url).length;
    push(
      checks,
      "Básico",
      "Imagens de referência",
      refs.length === 0 ? "alerta" : semUrl > 0 ? "erro" : "ok",
      refs.length === 0
        ? "Nenhuma referência enviada"
        : `${refs.length} referência(s)${semUrl ? `, ${semUrl} sem endereço` : ""}`,
      "Envie ao menos uma imagem para o resultado ficar parecido com a sua marca.",
    );
  }

  // ---------- Conhecimento ----------
  const skillIds = entrada.skill_ids ?? [];
  const skillsFaltando = skillIds.filter((id) => !ctx.skills.some((s) => s.id === id));
  const skillsInativas = ctx.skills.filter(
    (s) => skillIds.includes(s.id) && (s.ativo === false || s.status === "inativo"),
  );
  const skillsVazias = ctx.skills.filter(
    (s) => skillIds.includes(s.id) && !(s.conteudo_md ?? "").trim(),
  );

  if (skillIds.length === 0 && !(entrada.md_conteudo ?? "").trim()) {
    push(
      checks,
      "Conhecimento",
      "Nenhum conhecimento vinculado",
      "alerta",
      "O agente vai trabalhar só com o objetivo escrito",
      "Vincule uma skill ou envie um arquivo .md com regras e materiais da empresa.",
    );
  } else {
    push(
      checks,
      "Conhecimento",
      "Skills vinculadas",
      skillsFaltando.length ? "erro" : "ok",
      skillsFaltando.length
        ? `${skillsFaltando.length} skill(s) não existem mais`
        : `${skillIds.length} skill(s) encontradas`,
      "Remova as skills apagadas ou recadastre-as em Recursos → Skills.",
    );
    if (skillsInativas.length)
      push(
        checks,
        "Conhecimento",
        "Skills desativadas",
        "erro",
        skillsInativas.map((s) => s.nome).join(", "),
        "Ative a skill em Recursos → Skills ou tire ela do modelo.",
      );
    if (skillsVazias.length)
      push(
        checks,
        "Conhecimento",
        "Skills sem conteúdo",
        "alerta",
        skillsVazias.map((s) => s.nome).join(", "),
        "Abra a skill e escreva as instruções — sem conteúdo ela não ajuda o agente.",
      );
  }

  // ---------- Ferramentas ----------
  const toolIds = entrada.tool_ids ?? [];
  const toolsFaltando = toolIds.filter((id) => !ctx.tools.some((t) => t.id === id));
  const toolsSelecionadas = ctx.tools.filter((t) => toolIds.includes(t.id));
  const toolsInativas = toolsSelecionadas.filter((t) => t.status && t.status !== "ativo");
  const toolsSemEndpoint = toolsSelecionadas.filter(
    (t) => (t.tipo === "http" || t.tipo === "api" || !t.tipo) && !t.endpoint,
  );

  if (toolIds.length) {
    push(
      checks,
      "Ferramentas",
      "Tools vinculadas",
      toolsFaltando.length ? "erro" : "ok",
      toolsFaltando.length
        ? `${toolsFaltando.length} tool(s) não existem mais`
        : `${toolIds.length} tool(s) encontradas`,
      "Recadastre a ferramenta em Recursos → Tools ou remova do modelo.",
    );
    if (toolsInativas.length)
      push(
        checks,
        "Ferramentas",
        "Tools inativas",
        "erro",
        toolsInativas.map((t) => t.nome).join(", "),
        "Ative a ferramenta em Recursos → Tools antes de executar.",
      );
    if (toolsSemEndpoint.length)
      push(
        checks,
        "Ferramentas",
        "Tools sem endereço configurado",
        "erro",
        toolsSemEndpoint.map((t) => t.nome).join(", "),
        "Informe a URL (endpoint) da ferramenta no cadastro.",
      );
  }

  const mcpIds = entrada.mcp_ids ?? [];
  const mcpsFaltando = mcpIds.filter((id) => !ctx.mcps.some((m) => m.id === id));
  const mcpsSelecionados = ctx.mcps.filter((m) => mcpIds.includes(m.id));
  const mcpsComErro = mcpsSelecionados.filter((m) => m.ultimo_erro);
  const mcpsInativos = mcpsSelecionados.filter((m) => m.status && m.status !== "ativo");

  if (mcpIds.length) {
    push(
      checks,
      "Ferramentas",
      "MCPs vinculados",
      mcpsFaltando.length ? "erro" : "ok",
      mcpsFaltando.length
        ? `${mcpsFaltando.length} MCP(s) não existem mais`
        : `${mcpIds.length} MCP(s) encontrados`,
      "Recadastre a conexão em Recursos → MCPs ou remova do modelo.",
    );
    if (mcpsInativos.length)
      push(
        checks,
        "Ferramentas",
        "MCPs inativos",
        "erro",
        mcpsInativos.map((m) => m.nome).join(", "),
        "Ative a conexão em Recursos → MCPs.",
      );
    if (mcpsComErro.length)
      push(
        checks,
        "Ferramentas",
        "MCPs com erro na última conexão",
        "alerta",
        mcpsComErro.map((m) => `${m.nome}: ${m.ultimo_erro}`).join(" | "),
        "Teste a conexão em Recursos → MCPs e corrija as credenciais.",
      );
  }

  // ---------- Execução ----------
  if (entrada.modo_execucao === "etapas") {
    const etapas = entrada.etapas ?? [];
    const semTitulo = etapas.filter((e) => !(e.titulo ?? "").trim()).length;
    push(
      checks,
      "Execução",
      "Etapas do processo",
      etapas.length === 0 ? "erro" : semTitulo ? "erro" : etapas.length < 2 ? "alerta" : "ok",
      etapas.length === 0
        ? "Modo por etapas escolhido, mas nenhuma etapa cadastrada"
        : `${etapas.length} etapa(s)${semTitulo ? `, ${semTitulo} sem título` : ""}`,
      "Cadastre as etapas com um título claro em cada uma, ou volte para execução única.",
    );
  } else {
    push(checks, "Execução", "Execução única", "ok", "Roda tudo de uma vez e devolve o resultado");
  }

  // ---------- Agendamento ----------
  if (entrada.criaRotina) {
    const cron = (entrada.cron ?? "").trim();
    const valido = cron ? cronValido(cron) : false;
    push(
      checks,
      "Agendamento",
      "Horário de execução",
      valido ? "ok" : "erro",
      valido ? descreverCron(cron) : cron || "Sem agendamento definido",
      "Escolha frequência e horário na etapa de agendamento.",
    );
  }

  // ---------- Servidor ----------
  if (ctx.servidorConfigurado === false) {
    push(
      checks,
      "Servidor",
      "Motor de execução não configurado",
      "erro",
      "O servidor Claude Agent SDK não respondeu ou não está cadastrado",
      "Abra Administração → Config. do servidor e informe a URL e a chave.",
    );
  } else if (ctx.servidorConfigurado) {
    push(checks, "Servidor", "Motor de execução pronto", "ok");
  }

  const erros = checks.filter((c) => c.nivel === "erro").length;
  const alertas = checks.filter((c) => c.nivel === "alerta").length;
  const total = checks.length || 1;
  const pontuacao = Math.max(
    0,
    Math.round(((total - erros * 1 - alertas * 0.4) / total) * 100),
  );

  const resumo = checks
    .filter((c) => c.nivel !== "ok")
    .map((c) => `- [${c.nivel.toUpperCase()}] ${c.titulo}: ${c.detalhe ?? ""} (${c.comoResolver ?? ""})`)
    .join("\n");

  return { ok: erros === 0, erros, alertas, pontuacao, checks, resumo };
}
