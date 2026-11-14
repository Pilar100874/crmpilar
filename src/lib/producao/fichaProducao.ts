export interface OpcaoMaterial { id: string; produto_id: string; quantidade: number; unidade: string }
export interface GrupoMaterial { id: string; nome: string; opcoes: OpcaoMaterial[] }
export interface OpcaoMaquina { id: string; maquina_id: string; capacidade_minuto: number }
export interface EtapaProducao { id: string; nome: string; opcoes: OpcaoMaquina[] }
export interface FichaProducao { quantidade_base: number; unidade_produto: string; materiais: GrupoMaterial[]; etapas: EtapaProducao[] }
export const unidadesConsumo = ['un', 'kg', 'g', 'L', 'mL', 'm', 'm²', 'm³'] as const;
export const fichaVazia = (): FichaProducao => ({ quantidade_base: 1, unidade_produto: 'un', materiais: [], etapas: [] });
export function lerFicha(valor: unknown): FichaProducao {
  if (!valor || typeof valor !== 'object' || !('quantidade_base' in valor) || !('materiais' in valor) || !('etapas' in valor)) return fichaVazia();
  return valor as FichaProducao;
}
export function validarFicha(f: FichaProducao): string | null {
  if (!Number.isFinite(f.quantidade_base) || f.quantidade_base <= 0) return 'Informe uma quantidade-base maior que zero';
  if (!f.unidade_produto) return 'Informe a unidade do produto';
  for (const g of f.materiais) {
    if (!g.opcoes.length) return 'Cada material precisa de pelo menos uma matéria-prima';
    if (new Set(g.opcoes.map(o => o.produto_id)).size !== g.opcoes.length) return 'Não repita a mesma matéria-prima no grupo';
    for (const o of g.opcoes) if (!o.produto_id || !o.unidade || !Number.isFinite(o.quantidade) || o.quantidade <= 0) return 'Selecione a matéria-prima, quantidade positiva e unidade';
  }
  for (const e of f.etapas) {
    if (!e.nome.trim() || !e.opcoes.length) return 'Cada etapa precisa de nome e pelo menos uma máquina';
    if (new Set(e.opcoes.map(o => o.maquina_id)).size !== e.opcoes.length) return 'Não repita a mesma máquina na etapa';
    for (const o of e.opcoes) if (!o.maquina_id || !Number.isFinite(o.capacidade_minuto) || o.capacidade_minuto <= 0) return 'Selecione a máquina e sua capacidade por minuto';
  }
  return null;
}
export function calcularProducao(f: FichaProducao, quantidade: number, escolhas: Record<string, string> = {}, indisponiveis: string[] = []) {
  if (validarFicha(f) || !Number.isFinite(quantidade) || quantidade <= 0) return null;
  const materiais = f.materiais.map(g => {
    const o = g.opcoes.find(o => o.id === escolhas[g.id]) || g.opcoes[0];
    return { grupo_id: g.id, produto_id: o.produto_id, quantidade: quantidade / f.quantidade_base * o.quantidade, unidade: o.unidade };
  });
  const etapas = f.etapas.map(e => {
    const o = e.opcoes.find(o => o.id === escolhas[e.id]) || e.opcoes[0];
    return { etapa_id: e.id, maquina_id: o.maquina_id, capacidade: o.capacidade_minuto, minutos: quantidade / o.capacidade_minuto, indisponivel: indisponiveis.includes(o.maquina_id) };
  });
  const gargalo = etapas.length ? Math.min(...etapas.map(e => e.capacidade)) : null;
  return { materiais, etapas, minutosSequenciais: etapas.reduce((s, e) => s + e.minutos, 0), capacidadeLinha: gargalo, minutosLinha: gargalo ? quantidade / gargalo : null, indisponivel: etapas.some(e => e.indisponivel) };
}