import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { calcularProducao, unidadesConsumo, type FichaProducao, type GrupoMaterial, type EtapaProducao } from '@/lib/producao/fichaProducao';
import type { MaquinaOpcao } from './ProdutoProducaoTabs';

type Materia = { id: string; nome: string; ativo: boolean };
function Numero({ label, valor, onChange }: { label: string; valor: number; onChange: (v: number) => void }) {
  return <div className="min-w-0 space-y-1"><Label className="text-xs">{label}</Label><Input aria-label={label} type="number" min="0.000001" step="any" value={valor || ''} onChange={e => onChange(Number(e.target.value))} /></div>;
}
function Unidade({ valor, onChange, label }: { valor: string; onChange: (v: string) => void; label: string }) {
  return <div className="space-y-1 min-w-0"><Label className="text-xs">{label}</Label><Select value={valor} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{unidadesConsumo.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>;
}

export function FichaProducaoEditor({ ficha, onChange, materias, maquinas }: {
  ficha: FichaProducao; onChange: (f: FichaProducao) => void; materias: Materia[]; maquinas: MaquinaOpcao[];
}) {
  const [remocao, setRemocao] = useState<{ nome: string; executar: () => void } | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const atualizarMaterial = (g: GrupoMaterial) => onChange({ ...ficha, materiais: ficha.materiais.map(x => x.id === g.id ? g : x) });
  const atualizarEtapa = (e: EtapaProducao) => onChange({ ...ficha, etapas: ficha.etapas.map(x => x.id === e.id ? e : x) });
  const mover = (index: number, delta: number) => {
    const etapas = [...ficha.etapas]; const outra = etapas[index + delta]; const atual = etapas[index];
    if (!outra || !atual) return;
    etapas[index] = outra; etapas[index + delta] = atual; onChange({ ...ficha, etapas });
  };
  const resultado = calcularProducao(ficha, quantidade, escolhas, maquinas.filter(m => !m.ativo || m.em_manutencao).map(m => m.id));
  const nomeMateria = (id: string) => materias.find(m => m.id === id)?.nome || 'Matéria-prima não disponível';
  const nomeMaquina = (id: string) => maquinas.find(m => m.id === id)?.nome || 'Máquina não disponível';
  const formatar = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  return <div className="space-y-6 min-w-0">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Numero label="Quantidade-base produzida" valor={ficha.quantidade_base} onChange={v => onChange({ ...ficha, quantidade_base: v })} />
      <Unidade label="Unidade do produto acabado" valor={ficha.unidade_produto} onChange={v => onChange({ ...ficha, unidade_produto: v })} />
    </div>
    <section className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2"><h4 className="font-medium">Matérias-primas necessárias</h4><Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...ficha, materiais: [...ficha.materiais, { id: crypto.randomUUID(), nome: `Material ${ficha.materiais.length + 1}`, opcoes: [{ id: crypto.randomUUID(), produto_id: '', quantidade: 1, unidade: 'kg' }] }] })}><Plus className="h-4 w-4 mr-1" />Adicionar material</Button></div>
      {ficha.materiais.map((g, index) => <div key={g.id} className="border rounded-md p-3 space-y-3 min-w-0">
        <div className="flex items-center gap-2"><Input aria-label={`Nome do material ${index + 1}`} value={g.nome} onChange={e => atualizarMaterial({ ...g, nome: e.target.value })} /><Button type="button" variant="ghost" size="icon" title="Excluir material" aria-label={`Excluir material ${index + 1}`} onClick={() => setRemocao({ nome: g.nome, executar: () => onChange({ ...ficha, materiais: ficha.materiais.filter(x => x.id !== g.id) }) })}><Trash2 className="h-4 w-4" /></Button></div>
        {g.opcoes.map((o, i) => <div key={o.id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end border-b pb-3">
          <div className="min-w-0 space-y-1"><Label className="text-xs">{i === 0 ? 'Matéria-prima principal' : `OU substituto ${i}`}</Label><Select value={o.produto_id} onValueChange={v => atualizarMaterial({ ...g, opcoes: g.opcoes.map(x => x.id === o.id ? { ...x, produto_id: v } : x) })}><SelectTrigger aria-label={`Matéria-prima ${index + 1} opção ${i + 1}`} className="min-w-0 [&>span]:truncate"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{materias.filter(m => m.ativo || m.id === o.produto_id).map(m => <SelectItem key={m.id} value={m.id}>{m.nome}{!m.ativo && ' (inativa)'}</SelectItem>)}</SelectContent></Select></div>
          <Numero label={`Consumo material ${index + 1} opção ${i + 1}`} valor={o.quantidade} onChange={v => atualizarMaterial({ ...g, opcoes: g.opcoes.map(x => x.id === o.id ? { ...x, quantidade: v } : x) })} />
          <Unidade label={`Unidade material ${index + 1} opção ${i + 1}`} valor={o.unidade} onChange={v => atualizarMaterial({ ...g, opcoes: g.opcoes.map(x => x.id === o.id ? { ...x, unidade: v } : x) })} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Excluir opção ${i + 1} do material ${index + 1}`} title="Excluir opção" onClick={() => setRemocao({ nome: i === 0 ? 'matéria-prima principal' : 'substituto', executar: () => atualizarMaterial({ ...g, opcoes: g.opcoes.filter(x => x.id !== o.id) }) })}><Trash2 className="h-4 w-4" /></Button>
        </div>)}
        <Button type="button" variant="ghost" size="sm" onClick={() => atualizarMaterial({ ...g, opcoes: [...g.opcoes, { id: crypto.randomUUID(), produto_id: '', quantidade: 1, unidade: 'kg' }] })}><Plus className="h-4 w-4 mr-1" />Adicionar substituto</Button>
      </div>)}
    </section>
    <section className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2"><h4 className="font-medium">Etapas em sequência</h4><Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...ficha, etapas: [...ficha.etapas, { id: crypto.randomUUID(), nome: `Etapa ${ficha.etapas.length + 1}`, opcoes: [{ id: crypto.randomUUID(), maquina_id: '', capacidade_minuto: 1 }] }] })}><Plus className="h-4 w-4 mr-1" />Adicionar etapa</Button></div>
      {ficha.etapas.map((e, index) => <div key={e.id} className="border rounded-md p-3 space-y-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{index + 1}.</span><Input className="flex-1 min-w-0" aria-label={`Nome da etapa ${index + 1}`} value={e.nome} onChange={ev => atualizarEtapa({ ...e, nome: ev.target.value })} /><div className="flex shrink-0">
          <Button type="button" variant="ghost" size="icon" title="Mover etapa para cima" aria-label={`Subir etapa ${index + 1}`} disabled={index === 0} onClick={() => mover(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" title="Mover etapa para baixo" aria-label={`Descer etapa ${index + 1}`} disabled={index === ficha.etapas.length - 1} onClick={() => mover(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" title="Excluir etapa" aria-label={`Excluir etapa ${index + 1}`} onClick={() => setRemocao({ nome: e.nome, executar: () => onChange({ ...ficha, etapas: ficha.etapas.filter(x => x.id !== e.id) }) })}><Trash2 className="h-4 w-4" /></Button>
        </div></div>
        {e.opcoes.map((o, i) => <div key={o.id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end border-b pb-3">
          <div className="min-w-0 space-y-1"><Label className="text-xs">{i === 0 ? 'Máquina principal' : `OU máquina alternativa ${i}`}</Label><Select value={o.maquina_id} onValueChange={v => atualizarEtapa({ ...e, opcoes: e.opcoes.map(x => x.id === o.id ? { ...x, maquina_id: v } : x) })}><SelectTrigger aria-label={`Máquina etapa ${index + 1} opção ${i + 1}`} className="[&>span]:truncate"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{maquinas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}{m.em_manutencao ? ' (em manutenção)' : !m.ativo ? ' (inativa)' : ''}</SelectItem>)}</SelectContent></Select></div>
          <Numero label={`Capacidade etapa ${index + 1} opção ${i + 1} (${ficha.unidade_produto}/min)`} valor={o.capacidade_minuto} onChange={v => atualizarEtapa({ ...e, opcoes: e.opcoes.map(x => x.id === o.id ? { ...x, capacidade_minuto: v } : x) })} />
          <div className="min-w-0 space-y-1"><Label className="text-xs">Setup (min)</Label><Input type="number" min="0" step="any" aria-label={`Setup etapa ${index + 1} opção ${i + 1} (min)`} value={o.setup_minutos ?? 0} onChange={ev => atualizarEtapa({ ...e, opcoes: e.opcoes.map(x => x.id === o.id ? { ...x, setup_minutos: Math.max(0, Number(ev.target.value) || 0) } : x) })} /></div>
          <Button type="button" variant="ghost" size="icon" title="Excluir opção" aria-label={`Excluir máquina ${i + 1} da etapa ${index + 1}`} onClick={() => setRemocao({ nome: 'opção de máquina', executar: () => atualizarEtapa({ ...e, opcoes: e.opcoes.filter(x => x.id !== o.id) }) })}><Trash2 className="h-4 w-4" /></Button>
        </div>)}
        <Button type="button" variant="ghost" size="sm" onClick={() => atualizarEtapa({ ...e, opcoes: [...e.opcoes, { id: crypto.randomUUID(), maquina_id: '', capacidade_minuto: 1 }] })}><Plus className="h-4 w-4 mr-1" />Adicionar máquina alternativa</Button>
      </div>)}
    </section>
    <section className="space-y-3 border-t pt-4">
      <h4 className="font-medium">Previsão de produção</h4>
      <Numero label={`Quantidade a produzir (${ficha.unidade_produto})`} valor={quantidade} onChange={setQuantidade} />
      {ficha.materiais.filter(g => g.opcoes.length > 1).map(g => <div key={g.id} className="space-y-1"><Label>{g.nome}</Label><Select value={escolhas[g.id] || g.opcoes[0]?.id} onValueChange={v => setEscolhas({ ...escolhas, [g.id]: v })}><SelectTrigger aria-label={`Escolha para ${g.nome}`}><SelectValue /></SelectTrigger><SelectContent>{g.opcoes.map(o => <SelectItem key={o.id} value={o.id}>{nomeMateria(o.produto_id)}</SelectItem>)}</SelectContent></Select></div>)}
      {ficha.etapas.filter(e => e.opcoes.length > 1).map(e => <div key={e.id} className="space-y-1"><Label>{e.nome}</Label><Select value={escolhas[e.id] || e.opcoes[0]?.id} onValueChange={v => setEscolhas({ ...escolhas, [e.id]: v })}><SelectTrigger aria-label={`Escolha para ${e.nome}`}><SelectValue /></SelectTrigger><SelectContent>{e.opcoes.map(o => <SelectItem key={o.id} value={o.id}>{nomeMaquina(o.maquina_id)}</SelectItem>)}</SelectContent></Select></div>)}
      {resultado && <div className="space-y-2 text-sm break-words">
        {resultado.materiais.map(m => <p key={m.grupo_id}>{nomeMateria(m.produto_id)}: <strong>{formatar(m.quantidade)} {m.unidade}</strong></p>)}
        {resultado.etapas.map((e, i) => <p key={e.etapa_id}>{i + 1}. {nomeMaquina(e.maquina_id)}: <strong>{formatar(e.minutos)} min</strong>{e.setup > 0 && <span className="text-muted-foreground"> (setup {formatar(e.setup)} + produção {formatar(e.minutosProducao)})</span>}{e.indisponivel && <span className="text-destructive"> · Indisponível</span>}</p>)}
        {resultado.etapas.length > 0 && <><p>Tempo do lote, etapas sem sobreposição: <strong>{formatar(resultado.minutosSequenciais)} min</strong></p><p>Capacidade máxima da linha (gargalo): <strong>{formatar(resultado.capacidadeLinha || 0)} {ficha.unidade_produto}/min</strong></p>{resultado.setupTotal > 0 && <p>Setup total das máquinas: <strong>{formatar(resultado.setupTotal)} min</strong></p>}</>}
        {resultado.indisponivel && <p className="text-destructive">Previsão indisponível: há máquina inativa ou em manutenção na seleção.</p>}
      </div>}
    </section>
    <DeleteConfirmDialog open={!!remocao} onOpenChange={v => { if (!v) setRemocao(null); }} itemName={remocao?.nome} onConfirm={() => { remocao?.executar(); setRemocao(null); }} />
  </div>;
}