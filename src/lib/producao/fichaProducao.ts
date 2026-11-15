export interface OpcaoMaterial { id: string; produto_id: string; quantidade: number; unidade: string; meta_producao?: number }
export interface GrupoMaterial { id: string; nome: string; opcoes: OpcaoMaterial[] }
export interface RegraMaterialMaquina { material_opcao_id: string; permitida: boolean; simultaneos: number }
export interface OpcaoMaquina { id: string; maquina_id: string; capacidade_minuto: number; setup_minutos?: number; setup_troca_material_minutos?: number; regras_materiais?: RegraMaterialMaquina[] }
export interface EtapaProducao { id: string; nome: string; opcoes: OpcaoMaquina[]; material_regra_id?: string }
export interface ApoioProducao { id: string; quantidade: number; servico: string }
export interface FichaProducao { quantidade_base: number; unidade_produto: string; materiais: GrupoMaterial[]; etapas: EtapaProducao[]; funcionarios_extras?: ApoioProducao[] }
export const unidadesConsumo = ['un', 'kg', 'g', 'L', 'mL', 'm', 'm²', 'm³'] as const;
export const fichaVazia = (): FichaProducao => ({ quantidade_base: 1, unidade_produto: 'un', materiais: [], etapas: [] });
export function lerFicha(valor: unknown): FichaProducao {
  if (!valor || typeof valor !== 'object' || !('quantidade_base' in valor) || !('materiais' in valor) || !('etapas' in valor)) return fichaVazia();
  // Translate previously saved width rules once, preserving their result without exposing width fields.
  type Legada = Omit<FichaProducao, 'materiais' | 'etapas'> & { largura_produto_cm?: number; materiais: (Omit<GrupoMaterial, 'opcoes'> & { opcoes: (OpcaoMaterial & { largura_cm?: number })[] })[]; etapas: (Omit<EtapaProducao, 'opcoes'> & { material_largura_id?: string; opcoes: (OpcaoMaquina & { largura_min_cm?: number; largura_max_cm?: number })[] })[] };
  const f = valor as Legada;
  return {
    quantidade_base: f.quantidade_base, unidade_produto: f.unidade_produto,
    ...(f.funcionarios_extras ? { funcionarios_extras: f.funcionarios_extras.map(a => ({ id: a.id, quantidade: a.quantidade, servico: a.servico })) } : {}),
    materiais: f.materiais.map(g => ({ id: g.id, nome: g.nome, opcoes: g.opcoes.map(o => ({ id: o.id, produto_id: o.produto_id, quantidade: o.quantidade, unidade: o.unidade, meta_producao: o.meta_producao })) })),
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
export function validarFicha(f: FichaProducao): string | null {
  if (!Number.isFinite(f.quantidade_base) || f.quantidade_base <= 0) return 'Informe uma quantidade-base maior que zero';
  if (!f.unidade_produto) return 'Informe a unidade do produto';
  for (const apoio of f.funcionarios_extras ?? []) {
    if (!Number.isInteger(apoio.quantidade) || apoio.quantidade <= 0) return 'Informe uma quantidade inteira maior que zero de funcionários extras';
    if (!apoio.servico.trim()) return 'Informe o serviço realizado pelos funcionários extras';
  }
  for (const g of f.materiais) {
    if (!g.opcoes.length) return 'Cada material precisa de pelo menos uma matéria-prima';
    if (new Set(g.opcoes.map(o => o.produto_id)).size !== g.opcoes.length) return 'Não repita a mesma matéria-prima no grupo';
    for (const o of g.opcoes) {
      if (!o.produto_id || !o.unidade || !Number.isFinite(o.quantidade) || o.quantidade <= 0) return 'Selecione a matéria-prima, quantidade positiva e unidade';
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
  const materiais = f.materiais.map(g => {
    const o = g.opcoes.find(o => o.id === escolhas[g.id]) || g.opcoes[0];
    return { grupo_id: g.id, opcao_id: o.id, produto_id: o.produto_id, quantidade: quantidade / f.quantidade_base * o.quantidade, unidade: o.unidade, meta_producao: o.meta_producao };
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