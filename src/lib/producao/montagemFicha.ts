import { calcularProducao, converterQuantidade, unidadeCadastrada, type FichaProducao, type GrupoMaterial, type OpcaoMaterial, type UnidadesCadastroPorProduto } from './fichaProducao';

/** Quick-assembly helpers for the production recipe; all pure so the editor and tests agree. */
const novoId = () => crypto.randomUUID();
const usadas = (f: FichaProducao) => new Set(f.materiais.flatMap(g => g.opcoes.map(o => o.produto_id)).filter(Boolean));
const opcaoNova = (id: string, unidades: UnidadesCadastroPorProduto): OpcaoMaterial => ({ id: novoId(), produto_id: id, quantidade: 1, unidade: unidadeCadastrada(unidades, id) });

export function adicionarMateriasEmLote(f: FichaProducao, ids: string[], nomes: Record<string, string>, unidades: UnidadesCadastroPorProduto): FichaProducao {
  const ja = usadas(f);
  const novos = [...new Set(ids)].filter(id => !ja.has(id)).map((id): GrupoMaterial => ({ id: novoId(), nome: nomes[id] || 'Material', opcoes: [opcaoNova(id, unidades)] }));
  return novos.length ? { ...f, materiais: [...f.materiais, ...novos] } : f;
}
export function adicionarSubstitutosEmLote(f: FichaProducao, grupoId: string, ids: string[], unidades: UnidadesCadastroPorProduto): FichaProducao {
  const ja = usadas(f);
  return { ...f, materiais: f.materiais.map(g => g.id !== grupoId ? g : { ...g, opcoes: [...g.opcoes, ...[...new Set(ids)].filter(id => !ja.has(id)).map(id => opcaoNova(id, unidades))] }) };
}
export function adicionarEtapaComMaquinas(f: FichaProducao, ids: string[], nome?: string): FichaProducao {
  const unicos = [...new Set(ids)];
  if (!unicos.length) return f;
  return { ...f, etapas: [...f.etapas, { id: novoId(), nome: nome || `Etapa ${f.etapas.length + 1}`, opcoes: unicos.map(maquina_id => ({ id: novoId(), maquina_id, capacidade_minuto: 1 })) }] };
}
export function adicionarMaquinasNaEtapa(f: FichaProducao, etapaId: string, ids: string[]): FichaProducao {
  return { ...f, etapas: f.etapas.map(e => {
    if (e.id !== etapaId) return e;
    const ja = new Set(e.opcoes.map(o => o.maquina_id));
    return { ...e, opcoes: [...e.opcoes, ...[...new Set(ids)].filter(id => !ja.has(id)).map(maquina_id => ({ id: novoId(), maquina_id, capacidade_minuto: e.opcoes[0]?.capacidade_minuto || 1, setup_minutos: e.opcoes[0]?.setup_minutos })) ] };
  }) };
}

export type ParametrosMaterial = Pick<OpcaoMaterial, 'quantidade' | 'unidade' | 'rendimento' | 'perda_max_percentual'>;
export const copiarParametros = (o: OpcaoMaterial): ParametrosMaterial => ({ quantidade: o.quantidade, unidade: o.unidade, rendimento: o.rendimento, perda_max_percentual: o.perda_max_percentual });
/** Pastes consumption converted to the target unit; incompatible units keep the target consumption. */
export function colarParametros(o: OpcaoMaterial, p: ParametrosMaterial): OpcaoMaterial {
  const quantidade = o.unidade ? converterQuantidade(p.quantidade, p.unidade, o.unidade) : null;
  return { ...o, quantidade: quantidade ?? (o.unidade ? o.quantidade : p.quantidade), unidade: o.unidade || p.unidade, rendimento: p.rendimento, perda_max_percentual: p.perda_max_percentual };
}
/** Same parameters, empty raw material: a recipe never repeats a raw material. */
export function duplicarOpcao(f: FichaProducao, grupoId: string, opcaoId: string): FichaProducao {
  return { ...f, materiais: f.materiais.map(g => {
    const i = g.opcoes.findIndex(o => o.id === opcaoId);
    if (g.id !== grupoId || i < 0) return g;
    const opcoes = [...g.opcoes]; opcoes.splice(i + 1, 0, { ...g.opcoes[i], id: novoId(), produto_id: '' });
    return { ...g, opcoes };
  }) };
}
/** Moves every option of one group into another as substitutes, dropping references to the removed group. */
export function tornarSubstituto(f: FichaProducao, origemId: string, destinoId: string): FichaProducao {
  const origem = f.materiais.find(g => g.id === origemId);
  if (!origem || origemId === destinoId || !f.materiais.some(g => g.id === destinoId)) return f;
  return {
    ...f,
    materiais: f.materiais.filter(g => g.id !== origemId).map(g => ({ ...(g.id === destinoId ? { ...g, opcoes: [...g.opcoes, ...origem.opcoes] } : g), ...(g.segue_grupo_id === origemId ? { segue_grupo_id: undefined } : {}) })),
    etapas: f.etapas.map(e => e.material_regra_id === origemId ? { ...e, material_regra_id: undefined, opcoes: e.opcoes.map(o => ({ ...o, regras_materiais: [] })) } : e),
  };
}
export function moverEtapa(f: FichaProducao, de: number, para: number): FichaProducao {
  if (de === para || de < 0 || para < 0 || de >= f.etapas.length || para >= f.etapas.length) return f;
  const etapas = [...f.etapas]; const [e] = etapas.splice(de, 1); etapas.splice(para, 0, e);
  return { ...f, etapas };
}
/** Copies another product's recipe with fresh ids, remapping every internal reference. */
export function importarReceita(origem: FichaProducao, produtoAtualId?: string): FichaProducao {
  const mapa = new Map<string, string>();
  const id = (antigo: string) => { if (!mapa.has(antigo)) mapa.set(antigo, novoId()); return mapa.get(antigo)!; };
  const materiais = origem.materiais.map(g => ({ ...g, id: id(g.id), opcoes: g.opcoes.filter(o => o.produto_id !== produtoAtualId).map(o => ({ ...o, id: id(o.id) })) })).filter(g => g.opcoes.length);
  const grupos = new Set(materiais.map(g => g.id));
  return {
    ...origem,
    materiais: materiais.map(g => ({ ...g, segue_grupo_id: g.segue_grupo_id && grupos.has(id(g.segue_grupo_id)) ? id(g.segue_grupo_id) : undefined })),
    etapas: origem.etapas.map(e => ({ ...e, id: id(e.id), material_regra_id: e.material_regra_id && grupos.has(id(e.material_regra_id)) ? id(e.material_regra_id) : undefined,
      opcoes: e.opcoes.map(o => ({ ...o, id: id(o.id), regras_materiais: o.regras_materiais?.filter(r => mapa.has(r.material_opcao_id)).map(r => ({ ...r, material_opcao_id: id(r.material_opcao_id) })) })) })),
    funcionarios_extras: origem.funcionarios_extras?.map(a => ({ ...a, id: novoId() })),
  };
}

export interface DadosMateria { id: string; unidade?: string | null; estoque?: number | null; preco_tabela?: number | null }
export interface AnaliseMaterial { grupo_id: string; produto_id: string; necessario: number | null; unidade: string; estoque: number; falta: number; custo: number | null; alternativa?: { opcao_id: string; produto_id: string } }
/** Stock and theoretical cost (registered table price) per chosen raw material, suggesting substitutes that cover the batch. */
export function analisarAbastecimento(f: FichaProducao, quantidade: number, escolhas: Record<string, string>, dados: DadosMateria[]) {
  const r = calcularProducao(f, quantidade, escolhas);
  if (!r) return null;
  const info = (id: string) => dados.find(d => d.id === id);
  const necessidade = (m: { produto_id: string; quantidade_com_perda: number; unidade: string }) => {
    const d = info(m.produto_id); const u = (d?.unidade || '').trim();
    return { u: u || m.unidade, n: u ? converterQuantidade(m.quantidade_com_perda, m.unidade, u) : m.quantidade_com_perda, d };
  };
  const materiais: AnaliseMaterial[] = r.materiais.map(m => {
    const { u, n, d } = necessidade(m);
    const estoque = Number(d?.estoque) || 0;
    const falta = n == null ? 0 : Math.max(0, n - estoque);
    let alternativa: AnaliseMaterial['alternativa'];
    if (falta > 0) {
      const g = f.materiais.find(x => x.id === m.grupo_id)!;
      for (const o of g.opcoes.filter(o => o.id !== m.opcao_id)) {
        const alt = calcularProducao(f, quantidade, { ...escolhas, [g.id]: o.id })?.materiais.find(x => x.grupo_id === g.id);
        const na = alt && necessidade(alt);
        if (na?.n != null && na.n <= (Number(na.d?.estoque) || 0)) { alternativa = { opcao_id: o.id, produto_id: o.produto_id }; break; }
      }
    }
    return { grupo_id: m.grupo_id, produto_id: m.produto_id, necessario: n, unidade: u, estoque, falta, custo: n != null && d?.preco_tabela != null ? n * Number(d.preco_tabela) : null, alternativa };
  });
  const custos = materiais.map(m => m.custo);
  const custoTotal = custos.every(c => c != null) ? custos.reduce((s: number, c) => s + (c as number), 0) : null;
  return { materiais, custoTotal, custoUnitario: custoTotal == null ? null : custoTotal / quantidade, faltando: materiais.some(m => m.falta > 0) };
}
/** Unit cost of the batch for each option of a group, keeping the other choices. */
export function custoPorOpcao(f: FichaProducao, grupoId: string, quantidade: number, escolhas: Record<string, string>, dados: DadosMateria[]) {
  const g = f.materiais.find(x => x.id === grupoId);
  return (g?.opcoes || []).map(o => ({ opcao_id: o.id, produto_id: o.produto_id, custoUnitario: analisarAbastecimento(f, quantidade, { ...escolhas, [grupoId]: o.id }, dados)?.custoUnitario ?? null }));
}
/** Steps whose chosen machine is slower than the others (bottleneck) and machines without trained operators. */
export function alertasLinha(f: FichaProducao, quantidade: number, escolhas: Record<string, string>, operadoresPorMaquina: Record<string, number>) {
  const r = calcularProducao(f, quantidade, escolhas);
  const alertas: string[] = [];
  if (!r) return alertas;
  if (r.etapas.length > 1 && r.capacidadeLinha) {
    const max = Math.max(...r.etapas.map(e => e.capacidade));
    r.etapas.forEach((e, i) => { if (e.capacidade === r.capacidadeLinha && max > e.capacidade) alertas.push(`Gargalo: a etapa ${i + 1} (${f.etapas[i].nome}) produz ${e.capacidade} por minuto e limita a linha.`); });
  }
  f.etapas.forEach((e, i) => { const o = e.opcoes.find(o => o.id === escolhas[e.id]) || e.opcoes[0]; if (o?.maquina_id && !operadoresPorMaquina[o.maquina_id]) alertas.push(`A máquina da etapa ${i + 1} (${e.nome}) não tem operador com conhecimento cadastrado.`); });
  return alertas;
}
