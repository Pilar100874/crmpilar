import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export interface MaquinaOpcao { id: string; nome: string; codigo: string; ativo: boolean }

export function ProdutoProducaoCampos({ tempo, observacoes, onChange }: {
  tempo: string; observacoes: string; onChange: (campo: 'producao_tempo_minutos' | 'producao_observacoes', valor: string) => void;
}) {
  return <div className="space-y-4">
    <div className="space-y-2"><Label htmlFor="tempo-producao">Tempo de produção por unidade (minutos)</Label><Input id="tempo-producao" type="number" min="0" step="0.01" value={tempo} onChange={e => onChange('producao_tempo_minutos', e.target.value)} /></div>
    <div className="space-y-2"><Label htmlFor="observacoes-producao">Processo de produção e observações</Label><Textarea id="observacoes-producao" rows={5} value={observacoes} onChange={e => onChange('producao_observacoes', e.target.value)} /></div>
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