import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronsUp, Users, Copy, ClipboardPaste, CopyPlus, Layers, LayoutGrid, Rows3, FileDown, Download, GripVertical, ArrowRight, Package, Cog, AlertTriangle, CheckCircle2, Search, ClipboardList, ChevronDown, ChevronRight, Workflow, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { FluxoConferenciaProducao } from './FluxoConferenciaProducao';
import { adicionarMateriasEmLote, adicionarSubstitutosEmLote, adicionarEtapaComMaquinas, adicionarMaquinasNaEtapa, copiarParametros, colarParametros, duplicarOpcao, tornarSubstituto, moverEtapa, priorizarMateria, importarReceita, analisarAbastecimento, custoPorOpcao, alertasLinha, type ParametrosMaterial } from '@/lib/producao/montagemFicha';
import { gerarPdfFichaProducao } from '@/lib/producao/pdfFichaProducao';
import { lerFicha } from '@/lib/producao/fichaProducao';
import { calcularProducao, validarFicha, unidadesConsumo, sincronizarUnidades, unidadeCadastrada, unidadesCompativeis, converterQuantidade, type FichaProducao, type GrupoMaterial, type EtapaProducao, type UnidadesCadastroPorProduto } from '@/lib/producao/fichaProducao';
import type { MaquinaOpcao } from './ProdutoProducaoTabs';

type Materia = { id: string; nome: string; ativo: boolean; unidade?: string | null; estoque?: number | null; preco_tabela?: number | null };
export type ReceitaOrigem = { id: string; nome: string; ficha_producao?: unknown };
const rotuloCompacto = 'text-[11px] leading-4 text-muted-foreground';
const campoCompacto = 'h-8 px-2 text-sm';
const Obrig = () => <span className="text-destructive" aria-hidden> *</span>;
function Numero({ label, valor, onChange, texto, className = '', obrigatorio }: { label: string; valor: number; onChange: (v: number) => void; texto?: string; className?: string; obrigatorio?: boolean }) {
  return <div className={`min-w-0 space-y-0.5 ${className}`}><Label className={rotuloCompacto}>{texto || label}{obrigatorio && <Obrig />}</Label><Input className={campoCompacto} aria-label={label} type="number" min="0.000001" step="any" value={valor || ''} onChange={e => onChange(Number(e.target.value))} /></div>;
}
function Unidade({ valor, onChange, label }: { valor: string; onChange: (v: string) => void; label: string }) {
  return <div className="space-y-0.5 min-w-0"><Label className={rotuloCompacto}>{label}</Label><Select value={valor} onValueChange={onChange}><SelectTrigger aria-label={label} className={campoCompacto}><SelectValue /></SelectTrigger><SelectContent>{unidadesConsumo.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>;
}
/** Consumption units are restricted to the registered unit's physical dimension. */
function UnidadeDoCadastro({ label, produtoId, unidades, valor, onChange, className = '' }: { label: string; produtoId: string; unidades: UnidadesCadastroPorProduto; valor: string; onChange: (v: string) => void; className?: string }) {
  const unidade = unidadeCadastrada(unidades, produtoId);
  return <div className={`space-y-0.5 min-w-0 ${className}`}><Label className={rotuloCompacto}>Unidade<Obrig /></Label>
    {!produtoId ? <p className="flex h-8 items-center rounded-md border border-dashed px-2 text-[11px] text-muted-foreground">Selecione o material</p>
      : unidade ? <Select value={valor} onValueChange={onChange}><SelectTrigger aria-label={label} className={campoCompacto}><SelectValue /></SelectTrigger><SelectContent>{unidadesCompativeis(unidade).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
        : <p className="flex h-8 items-center rounded-md border border-destructive/40 px-2 text-[11px] text-destructive">Sem unidade no cadastro</p>}
  </div>;
}


/** Multi-select drawer: search, tick many items and add them at once. */
function SelecaoLote({ aberto, titulo, itens, onFechar, onConfirmar }: { aberto: boolean; titulo: string; itens: { id: string; nome: string; detalhe?: string; bloqueado?: boolean }[]; onFechar: () => void; onConfirmar: (ids: string[]) => void }) {
  const [busca, setBusca] = useState(''); const [marcados, setMarcados] = useState<string[]>([]);
  useEffect(() => { if (aberto) { setBusca(''); setMarcados([]); } }, [aberto]);
  const visiveis = itens.filter(i => i.nome.toLowerCase().includes(busca.toLowerCase()));
  return <Dialog open={aberto} onOpenChange={v => { if (!v) onFechar(); }}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{titulo}</DialogTitle></DialogHeader>
    <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Buscar pelo nome" aria-label="Buscar itens" value={busca} onChange={e => setBusca(e.target.value)} /></div>
    <div className="max-h-[50vh] overflow-y-auto space-y-1">
      {!visiveis.length && <p className="text-sm text-muted-foreground p-2">Nada encontrado.</p>}
      {visiveis.map(i => <label key={i.id} className={`flex items-center gap-2 rounded-md border p-2 text-sm min-w-0 ${i.bloqueado ? 'opacity-50' : 'cursor-pointer hover:bg-muted/50'}`}>
        <Checkbox disabled={i.bloqueado} checked={marcados.includes(i.id)} onCheckedChange={v => setMarcados(m => v === true ? [...m, i.id] : m.filter(x => x !== i.id))} aria-label={`Selecionar ${i.nome}`} />
        <span className="flex-1 min-w-0 break-words">{i.nome}</span>{i.detalhe && <span className="text-xs text-muted-foreground shrink-0">{i.detalhe}</span>}
      </label>)}
    </div>
    <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button><Button type="button" disabled={!marcados.length} onClick={() => { onConfirmar(marcados); onFechar(); }}>Adicionar {marcados.length || ''} selecionada(s)</Button></DialogFooter>
  </DialogContent></Dialog>;
}

export function FichaProducaoEditor({ ficha, onChange, materias, maquinas, unidadeDoProdutoAtual, erroCadastro, receitas = [], nomeProduto = '', produtoAtualId }: {
  ficha: FichaProducao; onChange: (f: FichaProducao) => void; materias: Materia[]; maquinas: MaquinaOpcao[]; unidadeDoProdutoAtual?: string | null; erroCadastro?: string | null;
  receitas?: ReceitaOrigem[]; nomeProduto?: string; produtoAtualId?: string;
}) {
  const unidades: UnidadesCadastroPorProduto = useMemo(() => Object.fromEntries(materias.map(m => [m.id, m.unidade])), [materias]);
  // Keep compatible consumption units when the recipe or product registration changes.
  useEffect(() => {
    const sincronizada = sincronizarUnidades(ficha, unidades, unidadeDoProdutoAtual);
    if (sincronizada !== ficha) onChange(sincronizada);
  }, [ficha, unidades, unidadeDoProdutoAtual, onChange]);
  const [remocao, setRemocao] = useState<{ nome: string; executar: () => void } | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [visao, setVisao] = useState<'blocos' | 'tabela'>('blocos');
  const [conferencia, setConferencia] = useState(false);
  const [fechados, setFechados] = useState<Record<string, boolean>>({});
  const alternar = (id: string) => setFechados(f => ({ ...f, [id]: !f[id] }));
  const todosIds = [...ficha.materiais.map(g => g.id), ...ficha.etapas.map(e => e.id)];
  const definirTodos = (v: boolean) => setFechados(Object.fromEntries(todosIds.map(id => [id, v])));
  const seta = (id: string, rotulo: string) => <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-expanded={!fechados[id]} aria-label={`${fechados[id] ? 'Expandir' : 'Recolher'} ${rotulo}`} title={fechados[id] ? 'Expandir' : 'Recolher'} onClick={() => alternar(id)}>{fechados[id] ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>;
  const [lote, setLote] = useState<{ tipo: 'materias' | 'substitutos' | 'etapa' | 'maquinas'; alvo?: string } | null>(null);
  const [parametros, setParametros] = useState<ParametrosMaterial | null>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [importar, setImportar] = useState<string>('');
  const [operadores, setOperadores] = useState<Record<string, number>>({});
  const idsMaquinas = maquinas.map(m => m.id).join(',');
  useEffect(() => {
    if (!idsMaquinas) return;
    supabase.from('producao_maquina_usuarios').select('maquina_id').in('maquina_id', idsMaquinas.split(',')).then(r => {
      const c: Record<string, number> = {}; for (const v of r.data || []) c[v.maquina_id] = (c[v.maquina_id] || 0) + 1; setOperadores(c);
    });
  }, [idsMaquinas]);
  const atualizarMaterial = (g: GrupoMaterial) => onChange({ ...ficha, materiais: ficha.materiais.map(x => x.id === g.id ? g : x) });
  const atualizarEtapa = (e: EtapaProducao) => onChange({ ...ficha, etapas: ficha.etapas.map(x => x.id === e.id ? e : x) });
  const mover = (index: number, delta: number) => onChange(moverEtapa(ficha, index, index + delta));
  const indisponiveis = maquinas.filter(m => !m.ativo || m.em_manutencao).map(m => m.id);
  const resultado = erroCadastro ? null : calcularProducao(ficha, quantidade, escolhas, indisponiveis);
  const abastecimento = resultado ? analisarAbastecimento(ficha, quantidade, escolhas, materias) : null;
  const alertas = resultado ? alertasLinha(ficha, quantidade, escolhas, operadores) : [];
  const nomeMateria = (id: string) => materias.find(m => m.id === id)?.nome || 'Matéria-prima não disponível';
  const nomeMaquina = (id: string) => maquinas.find(m => m.id === id)?.nome || 'Máquina não disponível';
  const formatar = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const usadas = new Set(ficha.materiais.flatMap(g => g.opcoes.map(o => o.produto_id)));
  const nomesMaterias = Object.fromEntries(materias.map(m => [m.id, m.nome]));
  const itensMaterias = materias.filter(m => m.ativo).map(m => ({ id: m.id, nome: m.nome, detalhe: m.unidade || 'sem unidade', bloqueado: usadas.has(m.id) }));
  const etapaAlvo = ficha.etapas.find(e => e.id === lote?.alvo);
  const itensMaquinas = maquinas.map(m => ({ id: m.id, nome: m.nome, detalhe: m.em_manutencao ? 'em manutenção' : !m.ativo ? 'inativa' : undefined, bloqueado: !!etapaAlvo?.opcoes.some(o => o.maquina_id === m.id) }));
  const confirmarLote = (ids: string[]) => {
    if (lote?.tipo === 'materias') onChange(adicionarMateriasEmLote(ficha, ids, nomesMaterias, unidades));
    if (lote?.tipo === 'substitutos' && lote.alvo) onChange(adicionarSubstitutosEmLote(ficha, lote.alvo, ids, unidades));
    if (lote?.tipo === 'etapa') onChange(adicionarEtapaComMaquinas(ficha, ids, nomeMaquina(ids[0])));
    if (lote?.tipo === 'maquinas' && lote.alvo) onChange(adicionarMaquinasNaEtapa(ficha, lote.alvo, ids));
  };
  const mudarOpcao = (g: GrupoMaterial, id: string, valores: Partial<GrupoMaterial['opcoes'][number]>) => atualizarMaterial({ ...g, opcoes: g.opcoes.map(x => x.id === id ? { ...x, ...valores } : x) });
  const mudarPrioridade = (g: GrupoMaterial, opcaoId: string, posicao: number) => {
    onChange(priorizarMateria(ficha, g.id, opcaoId, posicao));
    // A priority change returns this group's simulation to its new default.
    setEscolhas(atual => { const nova = { ...atual }; delete nova[g.id]; return nova; });
  };
  const receitasValidas = receitas.filter(r => { const f = lerFicha(r.ficha_producao); return f.materiais.length || f.etapas.length; });

  const campoMateria = (g: GrupoMaterial, o: GrupoMaterial['opcoes'][number], index: number, i: number) => <Select value={o.produto_id} onValueChange={v => mudarOpcao(g, o.id, { produto_id: v, unidade: unidadeCadastrada(unidades, v) || o.unidade })}><SelectTrigger aria-label={`Matéria-prima ${index + 1} opção ${i + 1}`} className="min-h-8 h-auto min-w-0 px-2 py-1.5 text-sm [&>span]:whitespace-normal [&>span]:break-words"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{materias.filter(m => m.ativo || m.id === o.produto_id).map(m => <SelectItem key={m.id} value={m.id} disabled={ficha.materiais.some(grupo => grupo.opcoes.some(opcao => opcao.id !== o.id && opcao.produto_id === m.id))}>{m.nome}{!m.ativo && ' (inativa)'}</SelectItem>)}</SelectContent></Select>;
  const campoUnidade = (g: GrupoMaterial, o: GrupoMaterial['opcoes'][number], index: number, i: number, label = `Unidade material ${index + 1} opção ${i + 1}`, className = '') => <UnidadeDoCadastro className={className} label={label} produtoId={o.produto_id} unidades={unidades} valor={o.unidade} onChange={v => {
    const q = converterQuantidade(o.quantidade, o.unidade, v); if (q == null) return; mudarOpcao(g, o.id, { unidade: v, quantidade: q });
  }} />;
  const acoesOpcao = (g: GrupoMaterial, o: GrupoMaterial['opcoes'][number], index: number, i: number) => <div className="flex flex-wrap justify-end gap-0">
    {g.opcoes.length > 1 && <>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} title="Tornar primeira prioridade" aria-label={`Tornar primeira prioridade material ${index + 1} opção ${i + 1}`} onClick={() => mudarPrioridade(g, o.id, 0)}><ChevronsUp className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} title="Aumentar prioridade" aria-label={`Aumentar prioridade material ${index + 1} opção ${i + 1}`} onClick={() => mudarPrioridade(g, o.id, i - 1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === g.opcoes.length - 1} title="Diminuir prioridade" aria-label={`Diminuir prioridade material ${index + 1} opção ${i + 1}`} onClick={() => mudarPrioridade(g, o.id, i + 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
    </>}
    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Copiar consumo, rendimento e perda" aria-label={`Copiar parâmetros material ${index + 1} opção ${i + 1}`} onClick={() => setParametros(copiarParametros(o))}><Copy className="h-3.5 w-3.5" /></Button>
    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!parametros} title="Colar parâmetros copiados" aria-label={`Colar parâmetros material ${index + 1} opção ${i + 1}`} onClick={() => parametros && atualizarMaterial({ ...g, opcoes: g.opcoes.map(x => x.id === o.id ? colarParametros(x, parametros) : x) })}><ClipboardPaste className="h-3.5 w-3.5" /></Button>
    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Duplicar como novo substituto" aria-label={`Duplicar material ${index + 1} opção ${i + 1}`} onClick={() => onChange(duplicarOpcao(ficha, g.id, o.id))}><CopyPlus className="h-3.5 w-3.5" /></Button>
    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Excluir opção ${i + 1} do material ${index + 1}`} title="Excluir opção" onClick={() => setRemocao({ nome: i === 0 ? 'matéria-prima principal' : 'substituto', executar: () => atualizarMaterial({ ...g, opcoes: g.opcoes.filter(x => x.id !== o.id) }) })}><Trash2 className="h-3.5 w-3.5" /></Button>
  </div>;

  return <div className="space-y-4 min-w-0">
    <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2">
      <div className="min-w-0 w-full sm:w-auto sm:flex-1 space-y-0.5"><Label className={rotuloCompacto}>Carregar receita de outro produto (modelo)</Label><Select value={importar} onValueChange={setImportar}><SelectTrigger aria-label="Receita de outro produto" className="min-h-8 h-auto px-2 py-1.5 text-sm [&>span]:whitespace-normal [&>span]:break-words"><SelectValue placeholder={receitasValidas.length ? 'Escolha o produto modelo' : 'Nenhum produto com ficha montada'} /></SelectTrigger><SelectContent>{receitasValidas.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent></Select></div>
      <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={!importar} onClick={() => { const r = receitas.find(x => x.id === importar); if (r) setRemocao({ nome: 'a receita atual (será substituída pela do modelo)', executar: () => { onChange({ ...importarReceita(lerFicha(r.ficha_producao), produtoAtualId), unidade_produto: ficha.unidade_produto }); setEscolhas({}); } }); }}><Download className="h-3.5 w-3.5 mr-1" />Carregar</Button>
      <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => gerarPdfFichaProducao(nomeProduto, ficha, nomeMateria, nomeMaquina)}><FileDown className="h-3.5 w-3.5 mr-1" />PDF da ficha</Button>
      <Button type="button" variant={conferencia ? 'default' : 'outline'} size="sm" className="h-8 px-2 text-xs" onClick={() => setConferencia(v => !v)}><Workflow className="h-3.5 w-3.5 mr-1" />{conferencia ? 'Voltar à edição' : 'Conferir em fluxo'}</Button>
      {!conferencia && todosIds.length > 0 && <><Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => definirTodos(true)}><ChevronsDownUp className="h-3.5 w-3.5 mr-1" />Recolher tudo</Button><Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => definirTodos(false)}><ChevronsUpDown className="h-3.5 w-3.5 mr-1" />Expandir tudo</Button></>}
    </div>
    {conferencia ? <FluxoConferenciaProducao ficha={ficha} nomeMateria={nomeMateria} nomeMaquina={nomeMaquina} maquinas={maquinas} operadores={operadores} erro={erroCadastro || validarFicha(ficha, unidades)} onEditar={id => { setConferencia(false); setFechados(f => ({ ...f, [id]: false })); }} /> : <>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <Numero obrigatorio label="Quantidade-base produzida" texto="Quantidade-base" valor={ficha.quantidade_base} onChange={v => onChange({ ...ficha, quantidade_base: v })} />
      {(unidadeDoProdutoAtual || '').trim()
        ? <div className="space-y-0.5 min-w-0"><Label className={rotuloCompacto}>Unidade do produto</Label><p aria-label="Unidade do produto acabado (do cadastro)" className="flex h-8 items-center rounded-md border bg-muted/30 px-2 text-sm font-medium">{(unidadeDoProdutoAtual || '').trim()}</p></div>
        : <Unidade label="Unidade do produto acabado" valor={ficha.unidade_produto} onChange={v => onChange({ ...ficha, unidade_produto: v })} />}
    </div>
    <section className="space-y-2">
      <div className="flex flex-wrap justify-between items-center gap-1.5 border-b pb-1.5">
        <h4 className="min-w-0 font-medium flex items-center gap-2"><Package className="h-4 w-4 shrink-0" />Matérias-primas</h4>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-md border"><Button type="button" size="sm" variant={visao === 'blocos' ? 'secondary' : 'ghost'} onClick={() => setVisao('blocos')} aria-label="Ver em blocos"><LayoutGrid className="h-4 w-4" /></Button><Button type="button" size="sm" variant={visao === 'tabela' ? 'secondary' : 'ghost'} onClick={() => setVisao('tabela')} aria-label="Ver em tabela rápida"><Rows3 className="h-4 w-4" /></Button></div>
          <Button type="button" size="sm" onClick={() => setLote({ tipo: 'materias' })}><Layers className="h-4 w-4 mr-1" />Inserir várias</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...ficha, materiais: [...ficha.materiais, { id: crypto.randomUUID(), nome: `Material ${ficha.materiais.length + 1}`, opcoes: [{ id: crypto.randomUUID(), produto_id: '', quantidade: 1, unidade: '' }] }] })}><Plus className="h-4 w-4 mr-1" />Adicionar material</Button>
        </div>
      </div>
      {parametros && <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2"><ClipboardPaste className="h-3.5 w-3.5" />Copiado: {formatar(parametros.quantidade)} {parametros.unidade}{parametros.rendimento ? ` · rende ${formatar(parametros.rendimento)}` : ''}{parametros.perda_max_percentual ? ` · perda ${formatar(parametros.perda_max_percentual)}%` : ''} — use o botão colar em outra matéria-prima.<Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setParametros(null)}>Limpar</Button></p>}
      {!ficha.materiais.length && <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Clique em <strong>Inserir várias</strong> para marcar todas as matérias-primas de uma vez.</p>}
      {visao === 'tabela' && ficha.materiais.length > 0 && <div className="rounded-md border divide-y">
        {ficha.materiais.flatMap((g, index) => g.opcoes.map((o, i) => <div key={o.id} className="grid grid-cols-2 md:grid-cols-12 gap-x-2 gap-y-1.5 p-2 items-end">
          <div className="col-span-2 md:col-span-4 min-w-0 space-y-0.5"><Label className={rotuloCompacto}>{g.nome} · {i + 1}ª prioridade{i === 0 ? ' (principal)' : ''}<Obrig /></Label>{campoMateria(g, o, index, i)}</div>
          <Numero obrigatorio className="md:col-span-2" label="Consumo" valor={o.quantidade} onChange={v => mudarOpcao(g, o.id, { quantidade: v })} />
          {campoUnidade(g, o, index, i, 'Unidade')}
          {g.segue_grupo_id ? <div className="min-w-0 space-y-0.5 md:col-span-2"><Label className={rotuloCompacto}>Rendimento</Label><p className="flex h-8 items-center text-[11px] text-muted-foreground">Segue ciclo</p></div> : <Numero className="md:col-span-2" label="Rendimento" valor={o.rendimento ?? 0} onChange={v => mudarOpcao(g, o.id, { rendimento: v > 0 ? v : undefined })} />}
          <Numero className="md:col-span-1" label="Perda %" valor={o.perda_max_percentual ?? 0} onChange={v => mudarOpcao(g, o.id, { perda_max_percentual: v > 0 ? v : undefined })} />
          <div className="col-span-2 md:col-span-2">{acoesOpcao(g, o, index, i)}</div>
        </div>))}
      </div>}
      {visao === 'blocos' && ficha.materiais.map((g, index) => {
        const custos = abastecimento && g.opcoes.length > 1 ? custoPorOpcao(ficha, g.id, quantidade, escolhas, materias) : [];
        return <div key={g.id} className="border rounded-md p-2 space-y-2 min-w-0 bg-card">
        <div className="flex items-center gap-1.5">{seta(g.id, `material ${index + 1}`)}<Badge variant="secondary" className="shrink-0">{index + 1}</Badge><Input className={campoCompacto + (g.nome.trim() ? '' : ' border-destructive')} placeholder="Nome do material *" aria-required aria-label={`Nome do material ${index + 1}`} value={g.nome} onChange={e => atualizarMaterial({ ...g, nome: e.target.value })} /><Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Excluir material" aria-label={`Excluir material ${index + 1}`} onClick={() => setRemocao({ nome: g.nome, executar: () => onChange({ ...ficha, materiais: ficha.materiais.filter(x => x.id !== g.id).map(x => x.segue_grupo_id === g.id ? { ...x, segue_grupo_id: undefined } : x), etapas: ficha.etapas.map(e => e.material_regra_id === g.id ? { ...e, material_regra_id: undefined } : e) }) })}><Trash2 className="h-3.5 w-3.5" /></Button></div>
        {fechados[g.id] ? <p className="pl-10 text-xs text-muted-foreground break-words">{g.opcoes.map(o => o.produto_id ? nomeMateria(o.produto_id) : 'sem matéria-prima').join(' OU ')}{g.segue_grupo_id ? ' · segue ciclo' : ''}</p> : <>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-2 gap-y-1.5">
          <div className="min-w-0 space-y-0.5 md:col-span-5"><Label className={rotuloCompacto}>Como calcular o consumo</Label><Select value={g.segue_grupo_id || 'proprio'} onValueChange={v => atualizarMaterial({ ...g, segue_grupo_id: v === 'proprio' ? undefined : v })}><SelectTrigger aria-label={`Cálculo do material ${index + 1}`} className="min-h-8 h-auto px-2 py-1.5 text-sm [&>span]:whitespace-normal [&>span]:break-words"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="proprio">Rendimento próprio (ou por quantidade-base)</SelectItem>{ficha.materiais.filter(x => x.id !== g.id && !x.segue_grupo_id).map(x => <SelectItem key={x.id} value={x.id}>Seguir o ciclo de: {x.nome}</SelectItem>)}</SelectContent></Select></div>
          {g.segue_grupo_id ? <p className="text-[11px] leading-4 text-muted-foreground self-center md:col-span-7">Consumo <strong>por ciclo</strong> de {ficha.materiais.find(x => x.id === g.segue_grupo_id)?.nome}; este material acompanha o rendimento escolhido lá.</p>
            : <p className="text-[11px] leading-4 text-muted-foreground self-center md:col-span-7">Rendimento = {ficha.unidade_produto} produzidas com esse consumo. Zero conta por quantidade-base.</p>}
          {!g.segue_grupo_id && ficha.materiais.length > 1 && <div className="md:col-span-12 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><ArrowRight className="h-3.5 w-3.5" />Tornar substituto de:
            <Select value="" onValueChange={v => onChange(tornarSubstituto(ficha, g.id, v))}><SelectTrigger aria-label={`Tornar material ${index + 1} substituto`} className="min-h-8 h-auto w-full sm:w-44 px-2 text-xs [&>span]:whitespace-normal"><SelectValue placeholder="Escolha o material" /></SelectTrigger><SelectContent>{ficha.materiais.filter(x => x.id !== g.id).map(x => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent></Select></div>}
        </div>
        {g.opcoes.map((o, i) => { const custo = custos.find(c => c.opcao_id === o.id)?.custoUnitario; return <div key={o.id} className={`rounded-md border p-2 space-y-1.5 ${i === 0 ? 'border-primary/40' : 'ml-2 sm:ml-4 border-dashed'}`}>
          <div className="flex flex-wrap items-center gap-1.5"><Badge variant={i === 0 ? 'default' : 'outline'}>{i + 1}ª prioridade · {i === 0 ? 'Principal' : 'OU substituto'}</Badge>{custo != null && <span className="text-[11px] text-muted-foreground">Custo/{ficha.unidade_produto}: <strong>{moeda(custo)}</strong></span>}<div className="ml-auto">{acoesOpcao(g, o, index, i)}</div></div>
          <div className="grid grid-cols-2 md:grid-cols-12 gap-x-2 gap-y-1.5 items-end">
            <div className="min-w-0 space-y-0.5 col-span-2 md:col-span-5"><Label className={rotuloCompacto}>Matéria-prima<Obrig /></Label>{campoMateria(g, o, index, i)}</div>
            <Numero obrigatorio className="md:col-span-2" texto={g.segue_grupo_id ? 'Consumo/ciclo' : 'Consumo'} label={`Consumo material ${index + 1} opção ${i + 1}${g.segue_grupo_id ? ' (por ciclo)' : ''}`} valor={o.quantidade} onChange={v => mudarOpcao(g, o.id, { quantidade: v })} />
            {campoUnidade(g, o, index, i, undefined, 'md:col-span-1')}
            {!g.segue_grupo_id && <Numero className="md:col-span-2" texto={`Rendimento (${ficha.unidade_produto})`} label={`Rendimento material ${index + 1} opção ${i + 1} (${ficha.unidade_produto} produzidas com esse consumo)`} valor={o.rendimento ?? 0} onChange={v => mudarOpcao(g, o.id, { rendimento: v > 0 ? v : undefined })} />}
            <Numero className="md:col-span-2" texto="Perda máx. (%)" label={`Perda máxima (%) material ${index + 1} opção ${i + 1}`} valor={o.perda_max_percentual ?? 0} onChange={v => mudarOpcao(g, o.id, { perda_max_percentual: v > 0 ? v : undefined })} />
          </div>
        </div>; })}
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setLote({ tipo: 'substitutos', alvo: g.id })}><Layers className="h-3.5 w-3.5 mr-1" />Inserir substitutos</Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => atualizarMaterial({ ...g, opcoes: [...g.opcoes, { id: crypto.randomUUID(), produto_id: '', quantidade: 1, unidade: '' }] })}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar substituto</Button>
        </div></>}
      </div>; })}
    </section>
    <section className="space-y-2">
      <div className="flex flex-wrap justify-between items-center gap-1.5 border-b pb-1.5"><h4 className="min-w-0 font-medium flex items-center gap-2"><Cog className="h-4 w-4 shrink-0" />Esteira de produção (etapas em sequência)</h4><div className="flex flex-wrap gap-1"><Button type="button" size="sm" className="h-8 px-2 text-xs" onClick={() => setLote({ tipo: 'etapa' })}><Layers className="h-3.5 w-3.5 mr-1" />Etapa com várias máquinas</Button><Button type="button" size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onChange({ ...ficha, etapas: [...ficha.etapas, { id: crypto.randomUUID(), nome: `Etapa ${ficha.etapas.length + 1}`, opcoes: [{ id: crypto.randomUUID(), maquina_id: '', capacidade_minuto: 1 }] }] })}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar etapa</Button></div></div>
      {ficha.etapas.length > 1 && <p className="text-xs text-muted-foreground">Arraste pelo ícone <GripVertical className="inline h-3 w-3" /> para mudar a ordem (ou use as setas).</p>}
      {ficha.etapas.map((e, index) => { const r = resultado?.etapas[index]; const gargalo = !!r && ficha.etapas.length > 1 && r.capacidade === resultado?.capacidadeLinha && Math.max(...(resultado?.etapas.map(x => x.capacidade) || [0])) > r.capacidade; return <div key={e.id} className="space-y-2">
        {index > 0 && <div className="flex justify-center text-muted-foreground"><ArrowDown className="h-4 w-4" /></div>}
        <div draggable onDragStart={() => setArrastando(index)} onDragOver={ev => ev.preventDefault()} onDrop={() => { if (arrastando != null) onChange(moverEtapa(ficha, arrastando, index)); setArrastando(null); }} onDragEnd={() => setArrastando(null)} className={`border rounded-md p-2 space-y-2 min-w-0 bg-card ${arrastando === index ? 'opacity-50' : ''} ${gargalo ? 'border-destructive/60' : ''}`}>
        <div className="flex flex-wrap items-center gap-1.5">{seta(e.id, `etapa ${index + 1}`)}<GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" aria-hidden /><Badge className="shrink-0">{index + 1}</Badge><Input className={'h-8 flex-1 min-w-32 px-2 text-sm' + (e.nome.trim() ? '' : ' border-destructive')} placeholder="Nome da etapa *" aria-required aria-label={`Nome da etapa ${index + 1}`} value={e.nome} onChange={ev => atualizarEtapa({ ...e, nome: ev.target.value })} />{gargalo && <Badge variant="destructive">Gargalo</Badge>}<div className="flex shrink-0">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Mover etapa para cima" aria-label={`Subir etapa ${index + 1}`} disabled={index === 0} onClick={() => mover(index, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Mover etapa para baixo" aria-label={`Descer etapa ${index + 1}`} disabled={index === ficha.etapas.length - 1} onClick={() => mover(index, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Excluir etapa" aria-label={`Excluir etapa ${index + 1}`} onClick={() => setRemocao({ nome: e.nome, executar: () => onChange({ ...ficha, etapas: ficha.etapas.filter(x => x.id !== e.id) }) })}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div></div>
        {fechados[e.id] ? <p className="pl-10 text-xs text-muted-foreground break-words">{e.opcoes.map(o => o.maquina_id ? `${nomeMaquina(o.maquina_id)} (${formatar(o.capacidade_minuto || 0)}/min)` : 'sem máquina').join(' OU ')}</p> : <>
        <div className="space-y-0.5 min-w-0 md:max-w-md"><Label className={rotuloCompacto}>Matéria-prima para regras da máquina</Label><Select value={e.material_regra_id || 'nenhum'} onValueChange={v => atualizarEtapa({ ...e, material_regra_id: v === 'nenhum' ? undefined : v, opcoes: e.opcoes.map(o => ({ ...o, regras_materiais: [] })) })}><SelectTrigger aria-label={`Material das regras etapa ${index + 1}`} className="min-h-8 h-auto px-2 py-1.5 text-sm [&>span]:whitespace-normal [&>span]:break-words"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nenhum">Sem regra por matéria-prima</SelectItem>{ficha.materiais.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent></Select></div>
        {e.opcoes.map((o, i) => { const maq = maquinas.find(m => m.id === o.maquina_id); return <div key={o.id} className={`rounded-md border p-2 grid grid-cols-2 md:grid-cols-12 gap-x-2 gap-y-1.5 items-end ${i === 0 ? '' : 'ml-2 sm:ml-4 border-dashed'}`}>
          <div className="col-span-2 md:col-span-12 flex flex-wrap items-center gap-1.5"><Badge variant={i === 0 ? 'default' : 'outline'}>{i === 0 ? 'Máquina principal' : `OU alternativa ${i}`}</Badge>
            {maq && (maq.em_manutencao ? <Badge variant="destructive">Em manutenção</Badge> : !maq.ativo ? <Badge variant="destructive">Inativa</Badge> : <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Ativa</Badge>)}
            {o.maquina_id && <Badge variant={operadores[o.maquina_id] ? 'outline' : 'destructive'}><Users className="h-3 w-3 mr-1" />{operadores[o.maquina_id] || 0} operador(es)</Badge>}
            <Badge variant="outline">{formatar(o.capacidade_minuto || 0)} {ficha.unidade_produto}/min</Badge>
            <Button type="button" variant="ghost" size="icon" className="ml-auto h-7 w-7" title="Excluir opção" aria-label={`Excluir máquina ${i + 1} da etapa ${index + 1}`} onClick={() => setRemocao({ nome: 'opção de máquina', executar: () => atualizarEtapa({ ...e, opcoes: e.opcoes.filter(x => x.id !== o.id) }) })}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="min-w-0 space-y-0.5 col-span-2 md:col-span-4"><Label className={rotuloCompacto}>Máquina<Obrig /></Label><Select value={o.maquina_id} onValueChange={v => atualizarEtapa({ ...e, opcoes: e.opcoes.map(x => x.id === o.id ? { ...x, maquina_id: v } : x) })}><SelectTrigger aria-label={`Máquina etapa ${index + 1} opção ${i + 1}`} className="min-h-8 h-auto px-2 py-1.5 text-sm [&>span]:whitespace-normal [&>span]:break-words"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{maquinas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}{m.em_manutencao ? ' (em manutenção)' : !m.ativo ? ' (inativa)' : ''}</SelectItem>)}</SelectContent></Select></div>
          <Numero obrigatorio className="md:col-span-2" texto={`Capacidade (${ficha.unidade_produto}/min)`} label={`Capacidade etapa ${index + 1} opção ${i + 1} (${ficha.unidade_produto}/min${e.material_regra_id ? ' por unidade simultânea' : ''})`} valor={o.capacidade_minuto} onChange={v => atualizarEtapa({ ...e, opcoes: e.opcoes.map(x => x.id === o.id ? { ...x, capacidade_minuto: v } : x) })} />
          <div className="min-w-0 space-y-0.5 md:col-span-3"><Label className={rotuloCompacto}>Setup inicial (min)</Label><Input className={campoCompacto} type="number" min="0" step="any" aria-label={`Setup etapa ${index + 1} opção ${i + 1} (min)`} value={o.setup_minutos ?? 0} onChange={ev => atualizarEtapa({ ...e, opcoes: e.opcoes.map(x => x.id === o.id ? { ...x, setup_minutos: Math.max(0, Number(ev.target.value) || 0) } : x) })} /></div>
          <div className="min-w-0 space-y-0.5 md:col-span-3"><Label className={rotuloCompacto}>Setup reposição MP (min)</Label><Input className={campoCompacto} type="number" min="0" step="any" aria-label={`Setup reposição etapa ${index + 1} opção ${i + 1} (min)`} value={o.setup_troca_material_minutos ?? 0} onChange={ev => atualizarEtapa({ ...e, opcoes: e.opcoes.map(x => x.id === o.id ? { ...x, setup_troca_material_minutos: Math.max(0, Number(ev.target.value) || 0) } : x) })} /></div>
          {ficha.materiais.find(g => g.id === e.material_regra_id)?.opcoes.map(m => {
            const regra = o.regras_materiais?.find(r => r.material_opcao_id === m.id) || { material_opcao_id: m.id, permitida: true, simultaneos: 1 };
            const mudar = (valores: Partial<typeof regra>) => atualizarEtapa({ ...e, opcoes: e.opcoes.map(x => x.id === o.id ? { ...x, regras_materiais: [...(x.regras_materiais || []).filter(r => r.material_opcao_id !== m.id), { ...regra, ...valores }] } : x) });
            return <div key={m.id} className="col-span-2 md:col-span-12 min-w-0 flex flex-wrap items-center gap-2 border-t pt-1.5">
              <label className="flex items-center gap-2 text-xs min-w-0 flex-1"><Checkbox aria-label={`Aceita material ${m.id} máquina ${o.id}`} checked={regra.permitida} onCheckedChange={v => mudar({ permitida: v === true })} /><span className="break-words">{nomeMateria(m.produto_id)}</span></label>
              {regra.permitida ? <div className="flex items-center gap-1.5"><Label className="text-[11px]">Por vez</Label><Input className="h-7 w-16 px-2 text-sm" aria-label={`Produzidos por vez material ${m.id} máquina ${o.id}`} type="number" min="1" step="1" value={regra.simultaneos} onChange={ev => mudar({ simultaneos: Number(ev.target.value) })} /></div> : <Badge variant="outline">Não aceita</Badge>}
            </div>;
          })}
        </div>; })}
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setLote({ tipo: 'maquinas', alvo: e.id })}><Layers className="h-3.5 w-3.5 mr-1" />Inserir várias máquinas</Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => atualizarEtapa({ ...e, opcoes: [...e.opcoes, { id: crypto.randomUUID(), maquina_id: '', capacidade_minuto: 1 }] })}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar máquina alternativa</Button>
        </div></>}
      </div></div>; })}
    </section>
    <section className="space-y-2">
      <div className="flex flex-wrap justify-between items-center gap-1.5 border-b pb-1.5">
        <h4 className="min-w-0 font-medium flex items-center gap-2"><ClipboardList className="h-4 w-4 shrink-0" />Check list de produção</h4>
        <div className="flex flex-wrap gap-1.5"><ChecklistModelos ficha={ficha} onChange={onChange} /><Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => onChange({ ...ficha, checklist: [...(ficha.checklist ?? []), { id: crypto.randomUUID(), texto: '' }] })}><Plus className="h-3.5 w-3.5 mr-1" />Item avulso</Button></div>
      </div>
      <p className="text-xs text-muted-foreground">Itens que o operador deve conferir durante a produção deste produto.</p>
      {(ficha.checklist ?? []).map((item, index) => <div key={item.id} className="flex items-center gap-2 min-w-0 rounded-md border border-accent bg-accent/30 px-2 py-1">
        <Checkbox disabled aria-hidden />
        <Input className={campoCompacto + ' flex-1 min-w-0'} aria-label={`Item ${index + 1} do check list`} placeholder="Ex.: Pesar bobina a cada 10 produzidas" value={item.texto} onChange={ev => onChange({ ...ficha, checklist: ficha.checklist?.map(c => c.id === item.id ? { ...c, texto: ev.target.value } : c) })} />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={index === 0} aria-label={`Subir item ${index + 1}`} onClick={() => { const l = [...(ficha.checklist ?? [])]; [l[index - 1], l[index]] = [l[index], l[index - 1]]; onChange({ ...ficha, checklist: l }); }}><ArrowUp className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Excluir item ${index + 1}`} onClick={() => setRemocao({ nome: item.texto || 'item do check list', executar: () => onChange({ ...ficha, checklist: ficha.checklist?.filter(c => c.id !== item.id) }) })}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>)}
    </section>
    <section className="space-y-2">
      <div className="flex flex-wrap justify-between items-center gap-1.5 border-b pb-1.5">
        <h4 className="min-w-0 font-medium flex items-center gap-2"><Users className="h-4 w-4 shrink-0" />Funcionários extras</h4>
        <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => onChange({ ...ficha, funcionarios_extras: [...(ficha.funcionarios_extras ?? []), { id: crypto.randomUUID(), quantidade: 1, servico: '' }] })}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar serviço</Button>
      </div>
      {(ficha.funcionarios_extras ?? []).map((apoio, index) => <div key={apoio.id} className="border rounded-md p-2 min-w-0 produto-editor-apoio grid grid-cols-[minmax(0,1fr)_2rem] md:grid-cols-[8rem_minmax(0,1fr)_2rem] gap-2 items-end">
        <div className="min-w-0 space-y-0.5 col-span-2 md:col-span-1"><Label htmlFor={`apoio-quantidade-${apoio.id}`} className={rotuloCompacto}>Quantidade<Obrig /></Label><Input className={campoCompacto} id={`apoio-quantidade-${apoio.id}`} aria-label={`Quantidade de funcionários extras serviço ${index + 1}`} type="number" min="1" step="1" value={apoio.quantidade || ''} onChange={ev => onChange({ ...ficha, funcionarios_extras: ficha.funcionarios_extras?.map(a => a.id === apoio.id ? { ...a, quantidade: Number(ev.target.value) } : a) })} /></div>
        <div className="min-w-0 space-y-0.5"><Label htmlFor={`apoio-servico-${apoio.id}`} className={rotuloCompacto}>Serviço realizado<Obrig /></Label><Input className={campoCompacto} id={`apoio-servico-${apoio.id}`} aria-label={`Serviço realizado pelos funcionários extras ${index + 1}`} placeholder="Ex.: embalar ou abastecer a máquina" value={apoio.servico} onChange={ev => onChange({ ...ficha, funcionarios_extras: ficha.funcionarios_extras?.map(a => a.id === apoio.id ? { ...a, servico: ev.target.value } : a) })} /></div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Excluir serviço extra ${index + 1}`} title="Excluir serviço extra" onClick={() => setRemocao({ nome: apoio.servico || 'serviço de funcionários extras', executar: () => onChange({ ...ficha, funcionarios_extras: ficha.funcionarios_extras?.filter(a => a.id !== apoio.id) }) })}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>)}
      <p className="text-xs text-muted-foreground">Total além dos operadores: <strong>{(ficha.funcionarios_extras ?? []).reduce((total, a) => total + (a.quantidade || 0), 0)}</strong></p>
    </section>
    </>}
    <section className="space-y-2 border-t pt-3">
      <h4 className="font-medium">Simulação do lote</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <Numero label={`Quantidade a produzir (${ficha.unidade_produto})`} valor={quantidade} onChange={setQuantidade} />
        {ficha.materiais.filter(g => g.opcoes.length > 1).map(g => <div key={g.id} className="space-y-0.5 min-w-0"><Label className={rotuloCompacto}>{g.nome}</Label><Select value={escolhas[g.id] || g.opcoes[0]?.id} onValueChange={v => setEscolhas({ ...escolhas, [g.id]: v })}><SelectTrigger aria-label={`Escolha para ${g.nome}`} className="min-h-8 h-auto px-2 py-1.5 text-sm [&>span]:whitespace-normal [&>span]:break-words"><SelectValue /></SelectTrigger><SelectContent>{g.opcoes.map(o => <SelectItem key={o.id} value={o.id}>{nomeMateria(o.produto_id)}</SelectItem>)}</SelectContent></Select></div>)}
        {ficha.etapas.filter(e => e.opcoes.length > 1).map(e => <div key={e.id} className="space-y-0.5 min-w-0"><Label className={rotuloCompacto}>{e.nome}</Label><Select value={escolhas[e.id] || e.opcoes[0]?.id} onValueChange={v => setEscolhas({ ...escolhas, [e.id]: v })}><SelectTrigger aria-label={`Escolha para ${e.nome}`} className="min-h-8 h-auto px-2 py-1.5 text-sm [&>span]:whitespace-normal [&>span]:break-words"><SelectValue /></SelectTrigger><SelectContent>{e.opcoes.map(o => <SelectItem key={o.id} value={o.id}>{nomeMaquina(o.maquina_id)}</SelectItem>)}</SelectContent></Select></div>)}
      </div>
      {resultado && <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {[['Ciclos', resultado.materiais.find(m => m.ciclos != null)?.ciclos != null ? formatar(resultado.materiais.find(m => m.ciclos != null)!.ciclos!) : '—'],
          ['Tempo do lote', resultado.minutosSequenciais != null ? `${formatar(resultado.minutosSequenciais)} min` : '—'],
          ['Gargalo', resultado.capacidadeLinha ? `${formatar(resultado.capacidadeLinha)} ${ficha.unidade_produto}/min` : '—'],
          ['Custo MP / ' + ficha.unidade_produto, abastecimento?.custoUnitario != null ? moeda(abastecimento.custoUnitario) : '—']].map(([t, v]) => <div key={t} className="rounded-md border p-1.5 min-w-0"><p className="text-[11px] text-muted-foreground">{t}</p><p className="text-sm font-semibold break-words">{v}</p></div>)}
      </div>}
      {alertas.map(a => <p key={a} className="flex items-start gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{a}</p>)}
      {resultado && <div className="space-y-1.5 text-xs break-words">
        {resultado.materiais.map(m => { const a = abastecimento?.materiais.find(x => x.grupo_id === m.grupo_id); return <div key={m.grupo_id} className={`rounded-md border p-1.5 ${a?.falta ? 'border-destructive/60' : ''}`}>
          <p className="flex flex-wrap items-center gap-2">{a && (a.falta ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-primary" />)}{nomeMateria(m.produto_id)}: <strong>{formatar(m.quantidade)} {m.unidade}</strong>{m.perda_max_percentual > 0 && <> · com perda máx. {formatar(m.perda_max_percentual)}%: <strong>{formatar(m.quantidade_com_perda)} {m.unidade}</strong></>}{m.ciclos != null && <span className="text-muted-foreground">· {formatar(m.ciclos)} ciclo(s){m.segue_grupo_id ? ' (seguindo outro material)' : ''}</span>}</p>
          {a && <p className="text-muted-foreground">Estoque: {formatar(a.estoque)} {a.unidade}{a.falta > 0 && <span className="text-destructive"> · faltam {formatar(a.falta)} {a.unidade}</span>}{a.custo != null && <> · custo {moeda(a.custo)}</>}</p>}
          {a?.alternativa && <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setEscolhas({ ...escolhas, [a.grupo_id]: a.alternativa!.opcao_id })}>O substituto {nomeMateria(a.alternativa.produto_id)} tem estoque suficiente — simular com ele</Button>}
        </div>; })}
        {abastecimento && <p className="text-xs text-muted-foreground">Custo calculado pelo preço de tabela de cada matéria-prima, já com a perda máxima.{abastecimento.custoTotal != null && <> Total do lote: <strong>{moeda(abastecimento.custoTotal)}</strong>.</>}</p>}
        {resultado.etapas.map((e, i) => <div key={e.etapa_id}><p>{i + 1}. {nomeMaquina(e.maquina_id)}: {e.minutos != null && <strong>{formatar(e.minutos)} min</strong>}{e.setup > 0 && e.minutosProducao != null && <span className="text-muted-foreground"> (setup {formatar(e.setup)} + produção {formatar(e.minutosProducao)})</span>}{e.indisponivel && <span className="text-destructive"> · Indisponível</span>}</p>{e.setupTrocaMaterial > 0 && <p className="text-muted-foreground">Reposição de matéria-prima: +{formatar(e.setupTrocaMaterial)} min por nova carga.</p>}{e.material_id && <p className="text-muted-foreground">{nomeMateria(e.material_id)} · {e.simultaneos} por vez · {formatar(e.capacidade)} {ficha.unidade_produto}/min</p>}{e.erro && <p className="text-destructive">{e.erro}</p>}</div>)}
        {resultado.setupTotal > 0 && <p>Setup total das máquinas: <strong>{formatar(resultado.setupTotal)} min</strong></p>}
        {resultado.indisponivel && <p className="text-destructive">Previsão indisponível: há máquina incompatível, inativa ou em manutenção na seleção.</p>}
      </div>}
      {!resultado && (erroCadastro || validarFicha(ficha)) && <p className="text-sm text-destructive">{erroCadastro || validarFicha(ficha)}</p>}
    </section>
    <SelecaoLote aberto={!!lote} titulo={lote?.tipo === 'materias' ? 'Inserir matérias-primas' : lote?.tipo === 'substitutos' ? 'Inserir substitutos' : lote?.tipo === 'etapa' ? 'Nova etapa: marque a máquina principal e as alternativas' : 'Inserir máquinas alternativas'} itens={lote?.tipo === 'materias' || lote?.tipo === 'substitutos' ? itensMaterias : itensMaquinas} onFechar={() => setLote(null)} onConfirmar={confirmarLote} />
    <DeleteConfirmDialog open={!!remocao} onOpenChange={v => { if (!v) setRemocao(null); }} itemName={remocao?.nome} onConfirm={() => { remocao?.executar(); setRemocao(null); }} />
  </div>;
}

type ModeloChecklist = { id: string; nome: string; itens: { texto: string }[] };
function ChecklistModelos({ ficha, onChange }: { ficha: FichaProducao; onChange: (f: FichaProducao) => void }) {
  const [modelos, setModelos] = useState<ModeloChecklist[]>([]);
  const [salvarAberto, setSalvarAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [excluir, setExcluir] = useState<ModeloChecklist | null>(null);
  const carregar = async () => { const { data } = await supabase.from('producao_checklist_modelos').select('id,nome,itens').order('nome'); setModelos((data ?? []) as unknown as ModeloChecklist[]); };
  useEffect(() => { void carregar(); }, []);
  const aplicar = (m: ModeloChecklist) => {
    const atuais = ficha.checklist ?? [];
    const existentes = new Set(atuais.map(i => i.texto.trim().toLowerCase()));
    const novos = m.itens.filter(i => i.texto.trim() && !existentes.has(i.texto.trim().toLowerCase())).map(i => ({ id: crypto.randomUUID(), texto: i.texto }));
    onChange({ ...ficha, checklist: [...atuais, ...novos] });
    toast.success(novos.length ? `${novos.length} item(ns) adicionados do modelo "${m.nome}"` : 'Todos os itens do modelo já estão na lista');
  };
  const salvar = async () => {
    const itens = (ficha.checklist ?? []).filter(i => i.texto.trim()).map(i => ({ texto: i.texto.trim() }));
    if (!nome.trim() || !itens.length) { toast.error('Informe o nome e tenha ao menos um item preenchido'); return; }
    const existente = modelos.find(m => m.nome.toLowerCase() === nome.trim().toLowerCase());
    const { error } = existente ? await supabase.from('producao_checklist_modelos').update({ itens }).eq('id', existente.id) : await supabase.from('producao_checklist_modelos').insert({ nome: nome.trim(), itens });
    if (error) { toast.error('Não foi possível salvar o modelo'); return; }
    toast.success(existente ? 'Modelo atualizado' : 'Modelo salvo'); setSalvarAberto(false); setNome(''); void carregar();
  };
  return <>
    <Select value="" onValueChange={id => { const m = modelos.find(x => x.id === id); if (m) aplicar(m); }}>
      <SelectTrigger className="h-8 w-auto text-xs gap-1" aria-label="Usar modelo de check list"><ClipboardList className="h-3.5 w-3.5" /><SelectValue placeholder={modelos.length ? 'Usar modelo' : 'Sem modelos'} /></SelectTrigger>
      <SelectContent>{modelos.map(m => <SelectItem key={m.id} value={m.id}>{m.nome} ({m.itens.length})</SelectItem>)}</SelectContent>
    </Select>
    <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={!(ficha.checklist ?? []).some(i => i.texto.trim())} onClick={() => setSalvarAberto(true)}><CopyPlus className="h-3.5 w-3.5 mr-1" />Salvar como modelo</Button>
    <Dialog open={salvarAberto} onOpenChange={setSalvarAberto}><DialogContent>
      <DialogHeader><DialogTitle>Modelos de check list</DialogTitle></DialogHeader>
      <div className="space-y-1"><Label htmlFor="nome-modelo-checklist">Nome do modelo</Label><Input id="nome-modelo-checklist" placeholder="Ex.: Bobinas de papel" value={nome} onChange={e => setNome(e.target.value)} />
        <p className="text-xs text-muted-foreground">Usar um nome existente atualiza aquele modelo com os itens atuais.</p></div>
      {modelos.length > 0 && <div className="space-y-1 max-h-48 overflow-y-auto">{modelos.map(m => <div key={m.id} className="flex items-center justify-between gap-2 text-sm border rounded px-2 py-1"><button type="button" className="truncate text-left" onClick={() => setNome(m.nome)}>{m.nome} <span className="text-muted-foreground">({m.itens.length})</span></button><Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Excluir modelo ${m.nome}`} onClick={() => setExcluir(m)}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div>}
      <DialogFooter><Button type="button" onClick={salvar}>Salvar</Button></DialogFooter>
    </DialogContent></Dialog>
    <DeleteConfirmDialog open={!!excluir} onOpenChange={o => !o && setExcluir(null)} itemName={excluir?.nome ?? ''} onConfirm={async () => { if (excluir) await supabase.from('producao_checklist_modelos').delete().eq('id', excluir.id); setExcluir(null); void carregar(); }} />
  </>;
}
