import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export interface MaquinaOpcao { id: string; nome: string; codigo: string; ativo: boolean; em_manutencao?: boolean }

export function ProdutoProducaoCampos({ tempo, observacoes, onChange }: {
  tempo: string; observacoes: string; onChange: (campo: 'producao_tempo_minutos' | 'producao_observacoes', valor: string) => void;
}) {
  return <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border-t pt-3">
    <div className="space-y-1"><Label className="text-xs text-muted-foreground" htmlFor="tempo-producao">Tempo por unidade (min)</Label><Input className="h-8 px-2 text-sm" id="tempo-producao" type="number" min="0" step="0.01" value={tempo} onChange={e => onChange('producao_tempo_minutos', e.target.value)} /></div>
    <div className="space-y-1 md:col-span-3"><Label className="text-xs text-muted-foreground" htmlFor="observacoes-producao">Processo e observações</Label><Textarea className="min-h-16 px-2 py-1.5 text-sm" id="observacoes-producao" rows={2} value={observacoes} onChange={e => onChange('producao_observacoes', e.target.value)} /></div>
  </div>;
}

export function ProdutoMaquinasCampos({ maquinas, selecionadas, onChange }: {
  maquinas: MaquinaOpcao[]; selecionadas: string[]; onChange: (ids: string[]) => void;
}) {
  return <div className="space-y-3">
    {!maquinas.length && <p className="text-sm text-muted-foreground">Nenhuma máquina cadastrada.</p>}
    {maquinas.map(m => <label key={m.id} className="flex items-center gap-3 border-b py-3 text-sm break-words">
      <Checkbox checked={selecionadas.includes(m.id)} onCheckedChange={v => onChange(v === true ? [...selecionadas, m.id] : selecionadas.filter(id => id !== m.id))} />
      <span className="min-w-0">{m.nome} · {m.codigo}{!m.ativo && ' (inativa)'}</span>
    </label>)}
  </div>;
}