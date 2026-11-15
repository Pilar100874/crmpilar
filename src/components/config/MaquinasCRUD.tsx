import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, Pencil, Trash2, ArrowLeft, Cog, Wrench } from 'lucide-react';
import { toast } from '@/lib/toast-config';
import type { Tables } from '@/integrations/supabase/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaquinaUsuariosCRUD } from './MaquinaUsuariosCRUD';

type Maquina = Tables<'producao_maquinas'>;
const vazio = { nome: '', codigo: '', fabricante: '', modelo: '', observacoes: '', ativo: true, em_manutencao: false };

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
    const r = editando ? await supabase.from('producao_maquinas').update(dados).eq('id', editando).select('id').single() : await supabase.from('producao_maquinas').insert(dados).select('id').single();
    setOcupado(false);
    if (r.error) { toast.error(r.error.code === '23505' ? 'Já existe uma máquina com este código' : 'Não foi possível salvar a máquina'); return; }
    toast.success('Máquina salva');
    if (!editando && r.data) setEditando(r.data.id); else setAberto(false);
    void carregar();
  };
  const remover = async () => {
    if (!excluir) return;
    setOcupado(true);
    const r = await supabase.from('producao_maquinas').delete().eq('id', excluir.id);
    setOcupado(false);
    if (r.error) { toast.error('Não foi possível excluir a máquina'); return; }
    setExcluir(null); void carregar();
  };
  const abrirEdicao = (m: Maquina) => { setEditando(m.id); setForm({ nome: m.nome, codigo: m.codigo, fabricante: m.fabricante || '', modelo: m.modelo || '', observacoes: m.observacoes || '', ativo: m.ativo, em_manutencao: m.em_manutencao }); setAberto(true); };
  if (aberto) return <section className="space-y-4 min-w-0">
    <div className="flex flex-wrap items-center gap-2"><Button variant="ghost" size="sm" onClick={() => setAberto(false)}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button><h2 className="text-lg font-semibold break-words min-w-0">{editando ? `Editar máquina: ${form.nome}` : 'Nova máquina'}</h2></div>
    <div className="rounded-lg border bg-card p-4">
      <Tabs defaultValue="dados"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="dados">Dados da máquina</TabsTrigger><TabsTrigger value="usuarios" disabled={!editando}>Usuários e conhecimento</TabsTrigger></TabsList>
      <TabsContent value="dados"><form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">{(['nome', 'codigo', 'fabricante', 'modelo'] as const).map(k => <div key={k} className="space-y-1"><Label htmlFor={`maquina-${k}`}>{({ nome: 'Nome', codigo: 'Código', fabricante: 'Fabricante', modelo: 'Modelo' })[k]}{(k === 'nome' || k === 'codigo') && ' *'}</Label><Input id={`maquina-${k}`} required={k === 'nome' || k === 'codigo'} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>)}</div>
      <div className="flex flex-wrap gap-4"><Label className="flex items-center gap-2"><Checkbox checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v === true })} />Máquina ativa</Label>
      <Label htmlFor="maquina-manutencao" className="flex items-center gap-2"><Checkbox id="maquina-manutencao" checked={form.em_manutencao} onCheckedChange={v => setForm({ ...form, em_manutencao: v === true })} />Em manutenção</Label></div>
      <div className="space-y-1"><Label htmlFor="maquina-obs">Observações</Label><Textarea id="maquina-obs" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button><Button disabled={ocupado}>Salvar</Button></div>
    </form></TabsContent>
    <TabsContent value="usuarios">{editando && <MaquinaUsuariosCRUD estabelecimentoId={estabelecimentoId} maquinaId={editando} />}</TabsContent>
    </Tabs></div>
    <DeleteConfirmDialog open={!!excluir} onOpenChange={v => { if (!v) setExcluir(null); }} onConfirm={remover} itemName={excluir?.nome} isLoading={ocupado} />
  </section>;
  return <section className="space-y-4 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Máquinas</h2><Button onClick={() => { setEditando(null); setForm(vazio); setAberto(true); }}><Plus className="mr-2 h-4 w-4" />Nova máquina</Button></div>
    <Input aria-label="Buscar máquinas" placeholder="Buscar por nome ou código" value={busca} onChange={e => setBusca(e.target.value)} />
    {!items.length && <p className="text-muted-foreground text-sm">Nenhuma máquina cadastrada.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {items.filter(m => `${m.nome} ${m.codigo}`.toLowerCase().includes(busca.toLowerCase())).map(m => <div key={m.id} role="button" tabIndex={0} onClick={() => abrirEdicao(m)} onKeyDown={e => { if (e.key === 'Enter') abrirEdicao(m); }} className="cursor-pointer rounded-lg border bg-card p-4 transition-shadow hover:shadow-md min-w-0">
      <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Cog className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1 break-words"><p className="font-semibold">{m.nome}</p><p className="text-xs text-muted-foreground">Código {m.codigo}</p></div></div>
      <div className="mt-3 flex flex-wrap gap-1"><Badge variant={m.ativo ? 'default' : 'secondary'}>{m.ativo ? 'Ativa' : 'Inativa'}</Badge>{m.em_manutencao && <Badge variant="destructive"><Wrench className="mr-1 h-3 w-3" />Em manutenção</Badge>}</div>
      <p className="mt-2 text-sm text-muted-foreground break-words">{[m.fabricante, m.modelo].filter(Boolean).join(' · ') || 'Sem fabricante/modelo'}</p>
      <div className="mt-3 flex justify-end gap-1 border-t pt-2" onClick={e => e.stopPropagation()}><Button variant="ghost" size="sm" aria-label={`Editar ${m.nome}`} onClick={() => abrirEdicao(m)}><Pencil className="mr-1 h-4 w-4" />Editar</Button><Button variant="ghost" size="sm" aria-label={`Excluir ${m.nome}`} onClick={() => setExcluir(m)}><Trash2 className="mr-1 h-4 w-4" />Excluir</Button></div>
    </div>)}
    </div>
    <DeleteConfirmDialog open={!!excluir} onOpenChange={v => { if (!v) setExcluir(null); }} onConfirm={remover} itemName={excluir?.nome} description="Excluir esta máquina também remove seus vínculos com produtos e usuários. Deseja continuar?" isLoading={ocupado} />
  </section>;
}