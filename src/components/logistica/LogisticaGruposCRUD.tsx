import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';

interface Grupo {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  ativo: boolean;
}

interface Props {
  estabelecimentoId: string | null;
}

export const LogisticaGruposCRUD: React.FC<Props> = ({ estabelecimentoId }) => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Grupo | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', cor: '#3b82f6', ativo: true });

  const fetchGrupos = async () => {
    const { data, error } = await supabase
      .from('logistica_grupos')
      .select('*')
      .order('nome');
    if (error) {
      toast.error('Erro ao carregar grupos');
      return;
    }
    setGrupos((data || []) as Grupo[]);
  };

  useEffect(() => {
    fetchGrupos();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ nome: '', descricao: '', cor: '#3b82f6', ativo: true });
    setOpen(true);
  };

  const openEdit = (g: Grupo) => {
    setEditing(g);
    setForm({ nome: g.nome, descricao: g.descricao || '', cor: g.cor || '#3b82f6', ativo: g.ativo });
    setOpen(true);
  };

  const save = async () => {
    if (saving) return;
    const nome = form.nome.trim();
    if (!nome) {
      toast.error('Informe o nome do grupo');
      return;
    }
    // Impede duplicidade de nome (case-insensitive), ignorando o próprio em edição
    const dup = grupos.find(
      g => g.nome.trim().toLowerCase() === nome.toLowerCase() && g.id !== editing?.id
    );
    if (dup) {
      toast.error('Já existe um grupo com esse nome');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome,
        descricao: form.descricao.trim() || null,
        cor: form.cor,
        ativo: form.ativo,
        estabelecimento_id: estabelecimentoId,
      };
      const { error } = editing
        ? await supabase.from('logistica_grupos').update(payload).eq('id', editing.id)
        : await supabase.from('logistica_grupos').insert(payload);
      if (error) {
        toast.error('Erro ao salvar grupo');
        return;
      }
      toast.success('Grupo salvo');
      setOpen(false);
      fetchGrupos();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (g: Grupo) => {
    if (!confirm(`Excluir o grupo "${g.nome}"?`)) return;
    const { error } = await supabase.from('logistica_grupos').delete().eq('id', g.id);
    if (error) {
      toast.error('Erro ao excluir');
      return;
    }
    toast.success('Grupo excluído');
    fetchGrupos();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" />
          Grupos (Unidades / Filiais)
        </CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo grupo
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Cadastro independente de grupos para filtrar veículos/pessoas no monitoramento, dashboard e histórico.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupos.map(g => (
              <TableRow key={g.id}>
                <TableCell>
                  <div className="h-4 w-4 rounded-full border" style={{ background: g.cor || '#999' }} />
                </TableCell>
                <TableCell className="font-medium">{g.nome}</TableCell>
                <TableCell className="text-muted-foreground">{g.descricao || '-'}</TableCell>
                <TableCell>{g.ativo ? 'Sim' : 'Não'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(g)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(g)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {grupos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  Nenhum grupo cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar grupo' : 'Novo grupo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Matriz, Filial SP" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div>
              <Label>Cor</Label>
              <input type="color" value={form.cor} onChange={e => setForm({ ...form, cor: e.target.value })} className="h-9 w-16 rounded border" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
