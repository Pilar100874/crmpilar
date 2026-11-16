export interface OpcaoMaterial { id: string; produto_id: string; quantidade: number; unidade: string; meta_producao?: number; rendimento?: number; perda_max_percentual?: number }
/** segue_grupo_id: o consumo informado vale por ciclo do grupo indicado (ex.: 1 saco por ciclo da bobina). */
export interface GrupoMaterial { id: string; nome: string; opcoes: OpcaoMaterial[]; segue_grupo_id?: string }
export interface RegraMaterialMaquina { material_opcao_id: string; permitida: boolean; simultaneos: number }
export interface OpcaoMaquina { id: string; maquina_id: string; capacidade_minuto: number; setup_minutos?: number; setup_troca_material_minutos?: number; regras_materiais?: RegraMaterialMaquina[] }
export interface EtapaProducao { id: string; nome: string; opcoes: OpcaoMaquina[]; material_regra_id?: string }
export interface ApoioProducao { id: string; quantidade: number; servico: string }
export interface FichaProducao { quantidade_base: number; unidade_produto: string; materiais: GrupoMaterial[]; etapas: EtapaProducao[]; funcionarios_extras?: ApoioProducao[]; checklist?: ItemChecklistProducao[] }
export interface ItemChecklistProducao { id: string; texto: string }
export const unidadesConsumo = ['un', 'kg', 'g', 'L', 'mL', 'm', 'm²', 'm³'] as const;
export const unidadesCadastro = ['un', 'kg', 'g', 't', 'L', 'mL', 'm', 'cm', 'm²', 'm³', 'caixa', 'pote', 'saco', 'balde', 'rolo', 'par', 'cento', 'milheiro'] as const;
export const fichaVazia = (): FichaProducao => ({ quantidade_base: 1, unidade_produto: 'un', materiais: [], etapas: [] });

// Factors relative to grams, millilitres and centimetres; packaging has no implicit conversion.
const gruposConversao = [
  { g: 1, kg: 1000, t: 1000000 },
  { mL: 1, L: 1000 },
  { cm: 1, m: 100 },
] as const;
export function unidadesCompativeis(unidade: string): string[] {
  const u = unidade.trim();
  const grupo = gruposConversao.find(g => Object.prototype.hasOwnProperty.call(g, u));
  return grupo ? Object.keys(grupo) : u ? [u] : [];
}
export function converterQuantidade(quantidade: number, origem: string, destino: string): number | null {
  if (!Number.isFinite(quantidade) || !origem.trim() || !unidadesCompativeis(origem).includes(destino.trim())) return null;
  if (origem.trim() === destino.trim()) return quantidade;
  const grupo = gruposConversao.find(g => Object.prototype.hasOwnProperty.call(g, origem.trim()));
  if (!grupo) return null;
  const fatores: Record<string, number> = grupo;
  return quantidade * fatores[origem.trim()] / fatores[destino.trim()];
}

/** Unidades de medida cadastradas em cada produto (chave = id do produto). */
export type UnidadesCadastroPorProduto = Record<string, string | null | undefined>;

/** Unidade registrada no cadastro do produto, ou vazio quando ele ainda não tem. */
export function unidadeCadastrada(unidades: UnidadesCadastroPorProduto, produtoId: string): string {
  return (unidades[produtoId] || '').trim();
}

/**
 * Preserva unidades de consumo compatíveis com o cadastro; o produto acabado segue o cadastro.
 * Retorna a mesma ficha quando nada muda, para não disparar re-render sem necessidade.
 * Quando o produto ainda não tem unidade cadastrada, mantém a unidade já salva na ficha.
 */
export function sincronizarUnidades(f: FichaProducao, unidades: UnidadesCadastroPorProduto, unidadeDoProdutoAtual?: string | null): FichaProducao {
  let mudou = false;
  const atual = (unidadeDoProdutoAtual || '').trim();
  const unidade_produto = atual && atual !== f.unidade_produto ? (mudou = true, atual) : f.unidade_produto;
  const materiais = f.materiais.map(g => ({
    ...g,
    opcoes: g.opcoes.map(o => {
      const u = unidadeCadastrada(unidades, o.produto_id);
      if (u && !unidadesCompativeis(u).includes(o.unidade)) { mudou = true; return { ...o, unidade: u }; }
      return o;
    }),
  }));
  return mudou ? { ...f, unidade_produto, materiais } : f;
}
export function lerFicha(valor: unknown): FichaProducao {
  if (!valor || typeof valor !== 'object' || !('quantidade_base' in valor) || !('materiais' in valor) || !('etapas' in valor)) return fichaVazia();
  // Translate previously saved width rules once, preserving their result without exposing width fields.
  type Legada = Omit<FichaProducao, 'materiais' | 'etapas'> & { largura_produto_cm?: number; materiais: (Omit<GrupoMaterial, 'opcoes'> & { opcoes: (OpcaoMaterial & { largura_cm?: number })[] })[]; etapas: (Omit<EtapaProducao, 'opcoes'> & { material_largura_id?: string; opcoes: (OpcaoMaquina & { largura_min_cm?: number; largura_max_cm?: number })[] })[] };
  const f = valor as Legada;
  return {
    quantidade_base: f.quantidade_base, unidade_produto: f.unidade_produto,
    ...(f.funcionarios_extras ? { funcionarios_extras: f.funcionarios_extras.map(a => ({ id: a.id, quantidade: a.quantidade, servico: a.servico })) } : {}),
    materiais: f.materiais.map(g => ({ id: g.id, nome: g.nome, ...(g.segue_grupo_id ? { segue_grupo_id: g.segue_grupo_id } : {}), opcoes: g.opcoes.map(o => ({ id: o.id, produto_id: o.produto_id, quantidade: o.quantidade, unidade: o.unidade, meta_producao: o.meta_producao, rendimento: o.rendimento, perda_max_percentual: o.perda_max_percentual })) })),
    etapas: f.etapas.map(e => {
      const grupo = f.materiais.find(g => g.id === e.material_largura_id);
      return { id: e.id, nome: e.nome, material_regra_id: e.material_regra_id || e.material_largura_id,
        opcoes: e.opcoes.map(o => ({ id: o.id, maquina_id: o.maquina_id, capacidade_minuto: o.capacidade_minuto, setup_minutos: o.setup_minutos, setup_troca_material_minutos: o.setup_troca_material_minutos,
          regras_materiais: o.regras_materiais ?? grupo?.opcoes.map(m => {
            const largura = m.largura_cm;
            const n = largura && f.largura_produto_cm ? Math.floor((largura + 1e-9) / f.largura_produto_cm) : 1;
            return { material_opcao_id: m.id, simultaneos: Math.max(1, n), permitida: n >= 1 && !(largura && o.largura_min_cm && largura < o.largura_min_cm) && !(largura && o.largura_max_cm && largura > o.largura_max_cm) };
          }) })) };
    }),
  };
}
export function validarFicha(f: FichaProducao, unidades?: UnidadesCadastroPorProduto): string | null {
  if (!Number.isFinite(f.quantidade_base) || f.quantidade_base <= 0) return 'Informe uma quantidade-base maior que zero';
  if (!f.unidade_produto) return 'Informe a unidade do produto';
  for (const item of f.checklist ?? []) if (!item.texto.trim()) return 'Preencha o texto de todos os itens do check list de produção';
  for (const apoio of f.funcionarios_extras ?? []) {
    if (!Number.isInteger(apoio.quantidade) || apoio.quantidade <= 0) return 'Informe uma quantidade inteira maior que zero de funcionários extras';
    if (!apoio.servico.trim()) return 'Informe o serviço realizado pelos funcionários extras';
  }
  const materiasUsadas = new Set<string>();
  for (const g of f.materiais) {
    if (!g.opcoes.length) return 'Cada material precisa de pelo menos uma matéria-prima';
    if (g.segue_grupo_id) {
      const ref = f.materiais.find(x => x.id === g.segue_grupo_id);
      if (!ref || ref.id === g.id) return 'O material só pode seguir o ciclo de outro material da ficha';
      if (ref.segue_grupo_id) return 'Siga um material que tenha rendimento próprio, não outro que também segue ciclo';
    }
    for (const o of g.opcoes) {
      if (o.produto_id && materiasUsadas.has(o.produto_id)) return 'Não repita a mesma matéria-prima na ficha de produção, inclusive nos substitutos';
      if (o.produto_id) materiasUsadas.add(o.produto_id);
      if (!o.produto_id || !o.unidade || !Number.isFinite(o.quantidade) || o.quantidade <= 0) return 'Selecione a matéria-prima, a unidade e uma quantidade positiva';
      if (unidades && !unidadesCompativeis(unidadeCadastrada(unidades, o.produto_id)).includes(o.unidade)) return 'A unidade de consumo deve ser compatível com a unidade cadastrada da matéria-prima';
      if (o.perda_max_percentual != null && (!Number.isFinite(o.perda_max_percentual) || o.perda_max_percentual < 0 || o.perda_max_percentual >= 100)) return 'A perda máxima deve ficar entre 0% e 99,9%';
      if (o.rendimento != null && (!Number.isFinite(o.rendimento) || o.rendimento <= 0)) return 'O rendimento deve ser maior que zero';
      if (o.meta_producao != null && (!Number.isFinite(o.meta_producao) || o.meta_producao <= 0)) return 'A meta de produção deve ser maior que zero';
    }
  }
  for (const e of f.etapas) {
    if (!e.nome.trim() || !e.opcoes.length) return 'Cada etapa precisa de nome e pelo menos uma máquina';
    if (new Set(e.opcoes.map(o => o.maquina_id)).size !== e.opcoes.length) return 'Não repita a mesma máquina na etapa';
    for (const o of e.opcoes) if (!o.maquina_id || !Number.isFinite(o.capacidade_minuto) || o.capacidade_minuto <= 0) return 'Selecione a máquina e sua capacidade por minuto';
    for (const o of e.opcoes) {
      if (o.setup_minutos != null && (!Number.isFinite(o.setup_minutos) || o.setup_minutos < 0)) return 'O tempo de setup não pode ser negativo';
      if (o.setup_troca_material_minutos != null && (!Number.isFinite(o.setup_troca_material_minutos) || o.setup_troca_material_minutos < 0)) return 'O setup de reposição não pode ser negativo';
    }
    const material = f.materiais.find(g => g.id === e.material_regra_id);
    if (e.material_regra_id && !material) return 'Selecione um material existente para as regras da etapa';
    for (const o of e.opcoes) {
      const regras = o.regras_materiais || [];
      if (new Set(regras.map(r => r.material_opcao_id)).size !== regras.length) return 'Não repita regras para a mesma matéria-prima na máquina';
      for (const r of regras) {
        if (!material?.opcoes.some(m => m.id === r.material_opcao_id)) return 'A regra da máquina deve usar uma opção do material da etapa';
        if (typeof r.permitida !== 'boolean' || !Number.isInteger(r.simultaneos) || r.simultaneos <= 0) return 'Informe uma quantidade inteira maior que zero para produção por vez';
      }
    }
  }
  return null;
}
export function calcularProducao(f: FichaProducao, quantidade: number, escolhas: Record<string, string> = {}, indisponiveis: string[] = []) {
  if (validarFicha(f) || !Number.isFinite(quantidade) || quantidade <= 0) return null;
  const escolhida = (g: GrupoMaterial) => g.opcoes.find(o => o.id === escolhas[g.id]) || g.opcoes[0];
  const materiais = f.materiais.map(g => {
    const o = escolhida(g);
    const ref = g.segue_grupo_id ? f.materiais.find(x => x.id === g.segue_grupo_id) : undefined;
    const refRend = ref ? escolhida(ref).rendimento : undefined;
    // Seguindo outro grupo: o consumo vale por ciclo do material escolhido naquele grupo.
    // Com rendimento: o consumo informado gera "rendimento" unidades do produto acabado (um ciclo).
    // Sem rendimento: o consumo vale para a quantidade-base, então insumos como embalagem acompanham as unidades produzidas.
    const rend = refRend || (ref ? undefined : o.rendimento);
    const base = rend ? quantidade / rend * o.quantidade : quantidade / f.quantidade_base * o.quantidade;
    const ciclos = rend ? quantidade / rend : null;
    const perda = o.perda_max_percentual ?? 0;
    return { grupo_id: g.id, opcao_id: o.id, produto_id: o.produto_id, quantidade: base, rendimento: ref ? undefined : o.rendimento, segue_grupo_id: g.segue_grupo_id, ciclos, quantidade_com_perda: base * (1 + perda / 100), perda_max_percentual: perda, unidade: o.unidade, meta_producao: o.meta_producao };
  });
  const etapas = f.etapas.map(e => {
    const o = e.opcoes.find(o => o.id === escolhas[e.id]) || e.opcoes[0];
    const material = materiais.find(m => m.grupo_id === e.material_regra_id);
    const regra = o.regras_materiais?.find(r => r.material_opcao_id === material?.opcao_id);
    const simultaneos = regra?.simultaneos ?? 1;
    const erro = regra?.permitida === false ? 'A máquina não aceita a matéria-prima selecionada' : null;
    const capacidade = o.capacidade_minuto * simultaneos;
    const minutosProducao = erro ? null : quantidade / capacidade;
    return { etapa_id: e.id, maquina_id: o.maquina_id, material_id: material?.produto_id, capacidade, simultaneos, erro, setup: o.setup_minutos || 0, setupTrocaMaterial: o.setup_troca_material_minutos || 0, minutosProducao, minutos: minutosProducao == null ? null : (o.setup_minutos || 0) + minutosProducao, indisponivel: indisponiveis.includes(o.maquina_id) || !!erro };
  });
  const incompativel = etapas.some(e => e.erro);
  const gargalo = etapas.length && !incompativel ? Math.min(...etapas.map(e => e.capacidade)) : null;
  return { materiais, etapas, minutosSequenciais: incompativel ? null : etapas.reduce((s, e) => s + (e.minutos ?? 0), 0), capacidadeLinha: gargalo, setupTotal: etapas.reduce((s, e) => s + e.setup, 0), minutosLinha: gargalo ? etapas.reduce((s, e) => s + e.setup, 0) + quantidade / gargalo : null, indisponivel: etapas.some(e => e.indisponivel), incompativel };
}