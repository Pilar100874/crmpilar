import { AlertTriangle, ArrowDown, CheckCircle2, ClipboardList, Cog, Package, PackageCheck, Pencil, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FichaProducao } from '@/lib/producao/fichaProducao';
import type { MaquinaOpcao } from './ProdutoProducaoTabs';

/** Read-only flow of the production recipe for review: materials → steps → checklist → finished product. */
export function FluxoConferenciaProducao({ ficha, nomeMateria, nomeMaquina, maquinas, operadores, erro, onEditar }: {
  ficha: FichaProducao; nomeMateria: (id: string) => string; nomeMaquina: (id: string) => string; maquinas: MaquinaOpcao[];
  operadores: Record<string, number>; erro: string | null; onEditar: (id: string) => void;
}) {
  const f = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  const Seta = () => <div className="flex justify-center py-1 text-muted-foreground"><ArrowDown className="h-5 w-5" /></div>;
  const Bloco = ({ icone, titulo, children, alerta }: { icone: React.ReactNode; titulo: string; children: React.ReactNode; alerta?: boolean }) =>
    <div className={`rounded-lg border-2 bg-card p-3 space-y-2 min-w-0 ${alerta ? 'border-destructive/60' : 'border-primary/30'}`}><p className="flex items-center gap-2 font-medium">{icone}{titulo}</p>{children}</div>;
  const extras = (ficha.funcionarios_extras ?? []).reduce((t, a) => t + (a.quantidade || 0), 0);
  return <div className="space-y-1 min-w-0">
    <div className={`flex items-start gap-2 rounded-md border p-2 text-sm ${erro ? 'border-destructive/60 text-destructive' : 'border-primary/40'}`}>
      {erro ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />}
      <span>{erro || 'Ficha completa: todos os campos obrigatórios estão preenchidos.'}</span>
    </div>
    <Bloco icone={<Package className="h-4 w-4" />} titulo={`Entrada: ${ficha.materiais.length} material(is)`} alerta={!ficha.materiais.length}>
      {!ficha.materiais.length && <p className="text-xs text-muted-foreground">Nenhuma matéria-prima cadastrada.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {ficha.materiais.map(g => <div key={g.id} className="rounded-md border p-2 min-w-0 space-y-1">
          <div className="flex items-center gap-1"><p className="flex-1 min-w-0 text-sm font-medium break-words">{g.nome || <span className="text-destructive">Sem nome</span>}</p><Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Editar ${g.nome}`} onClick={() => onEditar(g.id)}><Pencil className="h-3.5 w-3.5" /></Button></div>
          {g.segue_grupo_id && <Badge variant="outline">Segue ciclo de {ficha.materiais.find(x => x.id === g.segue_grupo_id)?.nome}</Badge>}
          {g.opcional && <Badge variant="secondary">Permite rodar sem esse item</Badge>}
          {g.opcoes.map((o, i) => <p key={o.id} className="text-xs break-words">{i > 0 && <span className="font-semibold text-muted-foreground">OU </span>}
            <span className={o.produto_id ? '' : 'text-destructive'}>{o.produto_id ? nomeMateria(o.produto_id) : 'Matéria-prima não escolhida'}</span>
            {' · '}{f(o.quantidade || 0)} {o.unidade}{o.rendimento ? ` → ${f(o.rendimento)} ${ficha.unidade_produto}` : ''}{o.perda_max_percentual ? ` · perda ${f(o.perda_max_percentual)}%` : ''}</p>)}
        </div>)}
      </div>
    </Bloco>
    {ficha.etapas.map((e, i) => <div key={e.id}><Seta />
      <Bloco icone={<Cog className="h-4 w-4" />} titulo={`Etapa ${i + 1}: ${e.nome || 'sem nome'}`} alerta={!e.opcoes.length || e.opcoes.some(o => !o.maquina_id)}>
        <div className="flex flex-wrap gap-2">{e.opcoes.map((o, j) => { const m = maquinas.find(x => x.id === o.maquina_id); const off = m && (m.em_manutencao || !m.ativo);
          return <div key={o.id} className={`rounded-md border p-2 text-xs min-w-0 flex-1 basis-48 ${off || !o.maquina_id ? 'border-destructive/60' : ''}`}>
            <p className="font-medium break-words">{j === 0 ? '' : 'OU '}{o.maquina_id ? nomeMaquina(o.maquina_id) : <span className="text-destructive">Máquina não escolhida</span>}</p>
            <p className="text-muted-foreground">{f(o.capacidade_minuto || 0)} {ficha.unidade_produto}/min{o.setup_minutos ? ` · setup ${f(o.setup_minutos)} min` : ''}</p>
            {o.maquina_id && <p className={operadores[o.maquina_id] ? 'text-muted-foreground' : 'text-destructive'}>{operadores[o.maquina_id] || 0} operador(es){o.operadores_necessarios ? ` · precisa de ${o.operadores_necessarios}` : ''}{off ? ' · indisponível' : ''}</p>}
            {o.max_setups_dia ? <p className="text-muted-foreground">Máx. {o.max_setups_dia} setup(s)/dia (ideal)</p> : null}
          </div>; })}
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 self-start" aria-label={`Editar etapa ${i + 1}`} onClick={() => onEditar(e.id)}><Pencil className="h-3.5 w-3.5" /></Button></div>
      </Bloco></div>)}
    {(ficha.checklist ?? []).length > 0 && <><Seta /><Bloco icone={<ClipboardList className="h-4 w-4" />} titulo="Check list durante a produção">
      <ul className="list-disc pl-5 text-xs space-y-0.5">{ficha.checklist!.map(c => <li key={c.id} className="break-words">{c.texto || <span className="text-destructive">Item vazio</span>}</li>)}</ul></Bloco></>}
    {extras > 0 && <><Seta /><Bloco icone={<Users className="h-4 w-4" />} titulo={`Apoio: ${extras} funcionário(s) extra(s)`}>
      <p className="text-xs break-words">{ficha.funcionarios_extras!.map(a => `${a.quantidade}× ${a.servico || '—'}`).join(' · ')}</p></Bloco></>}
    <Seta />
    <Bloco icone={<PackageCheck className="h-4 w-4" />} titulo="Saída: produto acabado"><p className="text-xs">Quantidade-base: <strong>{f(ficha.quantidade_base)} {ficha.unidade_produto}</strong></p></Bloco>
  </div>;
}
