export interface OpcaoMaterial { id: string; produto_id: string; quantidade: number; unidade: string; largura_cm?: number }
export interface GrupoMaterial { id: string; nome: string; opcoes: OpcaoMaterial[] }
export interface OpcaoMaquina { id: string; maquina_id: string; capacidade_minuto: number; setup_minutos?: number; largura_min_cm?: number; largura_max_cm?: number }
export interface EtapaProducao { id: string; nome: string; opcoes: OpcaoMaquina[]; material_largura_id?: string }
export interface FichaProducao { quantidade_base: number; unidade_produto: string; materiais: GrupoMaterial[]; etapas: EtapaProducao[]; largura_produto_cm?: number }
export const unidadesConsumo = ['un', 'kg', 'g', 'L', 'mL', 'm', 'm²', 'm³'] as const;
export const fichaVazia = (): FichaProducao => ({ quantidade_base: 1, unidade_produto: 'un', materiais: [], etapas: [] });
export function lerFicha(valor: unknown): FichaProducao {
  if (!valor || typeof valor !== 'object' || !('quantidade_base' in valor) || !('materiais' in valor) || !('etapas' in valor)) return fichaVazia();
  return valor as FichaProducao;
}
export function validarFicha(f: FichaProducao): string | null {
  if (!Number.isFinite(f.quantidade_base) || f.quantidade_base <= 0) return 'Informe uma quantidade-base maior que zero';
  if (!f.unidade_produto) return 'Informe a unidade do produto';
  const positivoOpcional = (n: number | undefined) => n == null || (Number.isFinite(n) && n > 0);
  if (!positivoOpcional(f.largura_produto_cm)) return 'A largura do produto deve ser maior que zero';
  for (const g of f.materiais) {
    if (!g.opcoes.length) return 'Cada material precisa de pelo menos uma matéria-prima';
    if (new Set(g.opcoes.map(o => o.produto_id)).size !== g.opcoes.length) return 'Não repita a mesma matéria-prima no grupo';
    for (const o of g.opcoes) if (!o.produto_id || !o.unidade || !Number.isFinite(o.quantidade) || o.quantidade <= 0) return 'Selecione a matéria-prima, quantidade positiva e unidade';
    for (const o of g.opcoes) if (!positivoOpcional(o.largura_cm)) return 'A largura da matéria-prima deve ser maior que zero';
  }
  for (const e of f.etapas) {
    if (!e.nome.trim() || !e.opcoes.length) return 'Cada etapa precisa de nome e pelo menos uma máquina';
    if (new Set(e.opcoes.map(o => o.maquina_id)).size !== e.opcoes.length) return 'Não repita a mesma máquina na etapa';
    for (const o of e.opcoes) if (!o.maquina_id || !Number.isFinite(o.capacidade_minuto) || o.capacidade_minuto <= 0) return 'Selecione a máquina e sua capacidade por minuto';
    for (const o of e.opcoes) if (o.setup_minutos != null && (!Number.isFinite(o.setup_minutos) || o.setup_minutos < 0)) return 'O tempo de setup não pode ser negativo';
    const material = f.materiais.find(g => g.id === e.material_largura_id);
    if (e.material_largura_id && (!f.largura_produto_cm || !material || material.opcoes.some(o => !o.largura_cm))) return 'Para calcular por largura, informe a largura do produto e de todas as alternativas do material da etapa';
    for (const o of e.opcoes) {
      if (!positivoOpcional(o.largura_min_cm) || !positivoOpcional(o.largura_max_cm)) return 'Os limites de largura da máquina devem ser maiores que zero';
      if ((o.largura_min_cm || o.largura_max_cm) && !e.material_largura_id) return 'Selecione o material usado na regra de largura da etapa';
      if (o.largura_min_cm && o.largura_max_cm && o.largura_min_cm > o.largura_max_cm) return 'A largura mínima da máquina não pode superar a máxima';
    }
  }
  return null;
}
export function calcularProducao(f: FichaProducao, quantidade: number, escolhas: Record<string, string> = {}, indisponiveis: string[] = []) {
  if (validarFicha(f) || !Number.isFinite(quantidade) || quantidade <= 0) return null;
  const materiais = f.materiais.map(g => {
    const o = g.opcoes.find(o => o.id === escolhas[g.id]) || g.opcoes[0];
    return { grupo_id: g.id, produto_id: o.produto_id, quantidade: quantidade / f.quantidade_base * o.quantidade, unidade: o.unidade, largura: o.largura_cm };
  });
  const etapas = f.etapas.map(e => {
    const o = e.opcoes.find(o => o.id === escolhas[e.id]) || e.opcoes[0];
    const material = materiais.find(m => m.grupo_id === e.material_largura_id);
    const largura = material?.largura;
    const simultaneos = e.material_largura_id && largura && f.largura_produto_cm ? Math.floor((largura + 1e-9) / f.largura_produto_cm) : 1;
    const erro = simultaneos < 1 ? 'Matéria-prima mais estreita que o produto acabado' : largura && o.largura_min_cm && largura < o.largura_min_cm ? `Matéria-prima de ${largura} cm abaixo do mínimo de ${o.largura_min_cm} cm` : largura && o.largura_max_cm && largura > o.largura_max_cm ? `Matéria-prima de ${largura} cm acima do máximo de ${o.largura_max_cm} cm` : null;
    const capacidade = o.capacidade_minuto * simultaneos;
    const minutosProducao = erro ? null : quantidade / capacidade;
    return { etapa_id: e.id, maquina_id: o.maquina_id, capacidade, simultaneos, largura, sobraLargura: largura && f.largura_produto_cm ? Math.max(0, largura - simultaneos * f.largura_produto_cm) : 0, erro, setup: o.setup_minutos || 0, minutosProducao, minutos: minutosProducao == null ? null : (o.setup_minutos || 0) + minutosProducao, indisponivel: indisponiveis.includes(o.maquina_id) || !!erro };
  });
  const incompativel = etapas.some(e => e.erro);
  const gargalo = etapas.length && !incompativel ? Math.min(...etapas.map(e => e.capacidade)) : null;
  return { materiais, etapas, minutosSequenciais: incompativel ? null : etapas.reduce((s, e) => s + (e.minutos ?? 0), 0), capacidadeLinha: gargalo, setupTotal: etapas.reduce((s, e) => s + e.setup, 0), minutosLinha: gargalo ? etapas.reduce((s, e) => s + e.setup, 0) + quantidade / gargalo : null, indisponivel: etapas.some(e => e.indisponivel), incompativel };
}