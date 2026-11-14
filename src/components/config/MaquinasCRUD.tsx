import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast-config';
import type { Tables } from '@/integrations/supabase/types';

type Maquina = Tables<'producao_maquinas'>;
const vazio = { nome: '', codigo: '', fabricante: '', modelo: '', observacoes: '', ativo: true };

export function MaquinasCRUD({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [items, setItems] = useState<Maquina[]>([]);
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState(vazio);
  const [excluir, setExcluir] = useState<Maquina | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const carregar = async () => {
    const r = await supabase.from('producao_maquinas').select('*').eq('estabelecimento_id', estabelecimentoId).order('nome');
    if (r.error) toast.error('Não foi possível carregar as máquinas'); else setItems(r.data || []);
  };
  useEffect(() => { void carregar(); }, [estabelecimentoId]);
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault(); setOcupado(true);
    const dados = { ...form, nome: form.nome.trim(), codigo: form.codigo.trim(), estabelecimento_id: estabelecimentoId };
    const r = editando ? await supabase.from('producao_maquinas').update(dados).eq('id', editando) : await supabase.from('producao_maquinas').insert(dados);
    setOcupado(false);
    if (r.error) { toast.error(r.error.code === '23505' ? 'Já existe uma máquina com este código' : 'Não foi possível salvar a máquina'); return; }
    toast.success('Máquina salva'); setAberto(false); void carregar();
  };
  const remover = async () => {
    if (!excluir) return;
    setOcupado(true);
    const r = await supabase.from('producao_maquinas').delete().eq('id', excluir.id);
    setOcupado(false);
    if (r.error) { toast.error('Não foi possível excluir a máquina'); return; }
    setExcluir(null); void carregar();
  };
  return <section className="space-y-4 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Máquinas</h2><Button onClick={() => { setEditando(null); setForm(vazio); setAberto(true); }}><Plus className="mr-2 h-4 w-4" />Nova máquina</Button></div>
    <Input aria-label="Buscar máquinas" placeholder="Buscar por nome ou código" value={busca} onChange={e => setBusca(e.target.value)} />
    {!items.length && <p className="text-muted-foreground text-sm">Nenhuma máquina cadastrada.</p>}
    {items.filter(m => `${m.nome} ${m.codigo}`.toLowerCase().includes(busca.toLowerCase())).map(m => <div key={m.id} className="flex items-center justify-between gap-2 border-b py-3">
      <div className="min-w-0 break-words"><p className="font-medium">{m.nome}</p><p className="text-sm text-muted-foreground">{m.codigo} · {m.modelo || 'Sem modelo'} · {m.ativo ? 'Ativa' : 'Inativa'}</p></div>
      <div className="flex shrink-0"><Button variant="ghost" size="icon" aria-label={`Editar ${m.nome}`} onClick={() => { setEditando(m.id); setForm({ nome: m.nome, codigo: m.codigo, fabricante: m.fabricante || '', modelo: m.modelo || '', observacoes: m.observacoes || '', ativo: m.ativo }); setAberto(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label={`Excluir ${m.nome}`} onClick={() => setExcluir(m)}><Trash2 className="h-4 w-4" /></Button></div>
    </div>)}
    <Dialog open={aberto} onOpenChange={setAberto}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editando ? 'Editar máquina' : 'Nova máquina'}</DialogTitle></DialogHeader><form onSubmit={salvar} className="space-y-4">
      {(['nome', 'codigo', 'fabricante', 'modelo'] as const).map(k => <div key={k} className="space-y-2"><Label htmlFor={`maquina-${k}`}>{({ nome: 'Nome', codigo: 'Código', fabricante: 'Fabricante', modelo: 'Modelo' })[k]}{(k === 'nome' || k === 'codigo') && ' *'}</Label><Input id={`maquina-${k}`} required={k === 'nome' || k === 'codigo'} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>)}
      <Label className="flex items-center gap-2"><Checkbox checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v === true })} />Máquina ativa</Label>
      <div className="space-y-2"><Label htmlFor="maquina-obs">Observações</Label><Textarea id="maquina-obs" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button><Button disabled={ocupado}>Salvar</Button></div>
    </form></DialogContent></Dialog>
    <DeleteConfirmDialog open={!!excluir} onOpenChange={v => { if (!v) setExcluir(null); }} onConfirm={remover} itemName={excluir?.nome} description="Excluir esta máquina também remove seus vínculos com produtos e usuários. Deseja continuar?" isLoading={ocupado} />
  </section>;
}