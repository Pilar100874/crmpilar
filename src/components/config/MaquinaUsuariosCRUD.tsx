import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { grausConhecimento } from '@/lib/producao/regrasProduto';
import { toast } from '@/lib/toast-config';
import type { Tables } from '@/integrations/supabase/types';

type Vinculo = Tables<'producao_maquina_usuarios'>;
const vazio = { maquina_id: '', usuario_id: '', grau_conhecimento: 'iniciante', observacoes: '' };
export function MaquinaUsuariosCRUD({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [items, setItems] = useState<Vinculo[]>([]);
  const [maquinas, setMaquinas] = useState<Tables<'producao_maquinas'>[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
  const [form, setForm] = useState(vazio);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<Vinculo | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [busca, setBusca] = useState('');
  const carregar = async () => {
    const [m, u, v] = await Promise.all([
      supabase.from('producao_maquinas').select('*').eq('estabelecimento_id', estabelecimentoId).order('nome'),
      supabase.from('usuarios').select('id,nome').eq('estabelecimento_id', estabelecimentoId).order('nome'),
      supabase.from('producao_maquina_usuarios').select('*').order('created_at'),
    ]);
    if (m.error || u.error || v.error) { toast.error('Não foi possível carregar os conhecimentos'); return; }
    setMaquinas(m.data || []); setUsuarios(u.data || []); setItems(v.data || []);
  };
  useEffect(() => { void carregar(); }, [estabelecimentoId]);
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form.maquina_id || !form.usuario_id) { toast.error('Selecione a máquina e o usuário'); return; }
    setOcupado(true);
    const r = editando ? await supabase.from('producao_maquina_usuarios').update(form).eq('id', editando) : await supabase.from('producao_maquina_usuarios').insert(form);
    setOcupado(false);
    if (r.error) { toast.error(r.error.code === '23505' ? 'Este usuário já está vinculado à máquina' : 'Não foi possível salvar o conhecimento'); return; }
    toast.success('Conhecimento salvo'); setAberto(false); void carregar();
  };
  const remover = async () => {
    if (!excluir) return; setOcupado(true);
    const r = await supabase.from('producao_maquina_usuarios').delete().eq('id', excluir.id);
    setOcupado(false); if (r.error) { toast.error('Não foi possível excluir o vínculo'); return; } setExcluir(null); void carregar();
  };
  const nomeUsuario = (id: string) => usuarios.find(u => u.id === id)?.nome || 'Usuário';
  const nomeMaquina = (id: string) => maquinas.find(m => m.id === id)?.nome || 'Máquina';
  return <section className="min-w-0 space-y-4">
    <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="text-lg font-semibold">Conhecimento em máquinas</h2><Button onClick={() => { setEditando(null); setForm(vazio); setAberto(true); }}><Plus className="h-4 w-4 mr-2" />Vincular usuário</Button></div>
    <Input aria-label="Buscar conhecimentos" placeholder="Buscar usuário ou máquina" value={busca} onChange={e => setBusca(e.target.value)} />
    {!items.length && <p className="text-sm text-muted-foreground">Nenhum usuário vinculado.</p>}
    {items.filter(v => `${nomeUsuario(v.usuario_id)} ${nomeMaquina(v.maquina_id)}`.toLowerCase().includes(busca.toLowerCase())).map(v => <div key={v.id} className="flex justify-between items-center gap-2 border-b py-3"><div className="min-w-0 break-words"><p className="font-medium">{nomeUsuario(v.usuario_id)}</p><p className="text-sm text-muted-foreground">{nomeMaquina(v.maquina_id)} · {grausConhecimento.find(g => g.valor === v.grau_conhecimento)?.nome}</p>{v.observacoes && <p className="text-sm">{v.observacoes}</p>}</div><div className="shrink-0 flex"><Button variant="ghost" size="icon" aria-label={`Editar conhecimento de ${nomeUsuario(v.usuario_id)}`} onClick={() => { setEditando(v.id); setForm({ maquina_id: v.maquina_id, usuario_id: v.usuario_id, grau_conhecimento: v.grau_conhecimento, observacoes: v.observacoes || '' }); setAberto(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label="Excluir vínculo" onClick={() => setExcluir(v)}><Trash2 className="h-4 w-4" /></Button></div></div>)}
    <Dialog open={aberto} onOpenChange={setAberto}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editando ? 'Editar conhecimento' : 'Vincular usuário à máquina'}</DialogTitle></DialogHeader><form onSubmit={salvar} className="space-y-4">
      <div className="space-y-2"><Label>Máquina *</Label><Select value={form.maquina_id} onValueChange={v => setForm({ ...form, maquina_id: v })}><SelectTrigger aria-label="Máquina"><SelectValue placeholder="Selecione a máquina" /></SelectTrigger><SelectContent>{maquinas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}{!m.ativo && ' (inativa)'}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Usuário *</Label><Select value={form.usuario_id} onValueChange={v => setForm({ ...form, usuario_id: v })}><SelectTrigger aria-label="Usuário"><SelectValue placeholder="Selecione o usuário" /></SelectTrigger><SelectContent>{usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Grau de conhecimento *</Label><Select value={form.grau_conhecimento} onValueChange={v => setForm({ ...form, grau_conhecimento: v })}><SelectTrigger aria-label="Grau de conhecimento"><SelectValue /></SelectTrigger><SelectContent>{grausConhecimento.map(g => <SelectItem key={g.valor} value={g.valor}>{g.nome}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="conhecimento-obs">Observações</Label><Textarea id="conhecimento-obs" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAberto(false)}>Cancelar</Button><Button disabled={ocupado}>Salvar</Button></div>
    </form></DialogContent></Dialog>
    <DeleteConfirmDialog open={!!excluir} onOpenChange={v => { if (!v) setExcluir(null); }} onConfirm={remover} itemName="vínculo de conhecimento" isLoading={ocupado} />
  </section>;
}