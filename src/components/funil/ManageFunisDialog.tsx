import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface Funil {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ativo: boolean;
  ordem: number;
}

interface ManageFunisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFunilsUpdated: () => void;
}

export function ManageFunisDialog({ open, onOpenChange, onFunilsUpdated }: ManageFunisDialogProps) {
  const [funis, setFunis] = useState<Funil[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#3b82f6',
  });

  useEffect(() => {
    if (open) {
      loadFunis();
    }
  }, [open]);

  const loadFunis = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from('funis')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setFunis(data || []);
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
      toast.error('Erro ao carregar funis');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error('Estabelecimento não encontrado');
        return;
      }

      if (editingId) {
        // Atualizar
        const { error } = await supabase
          .from('funis')
          .update({
            nome: formData.nome,
            descricao: formData.descricao,
            cor: formData.cor,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Funil atualizado com sucesso');
      } else {
        // Criar novo
        const { error } = await supabase
          .from('funis')
          .insert({
            estabelecimento_id: estabelecimentoId,
            nome: formData.nome,
            descricao: formData.descricao,
            cor: formData.cor,
            ordem: funis.length,
          });

        if (error) throw error;
        toast.success('Funil criado com sucesso');
      }

      setFormData({ nome: '', descricao: '', cor: '#3b82f6' });
      setShowForm(false);
      setEditingId(null);
      loadFunis();
      onFunilsUpdated();
    } catch (error) {
      console.error('Erro ao salvar funil:', error);
      toast.error('Erro ao salvar funil');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (funil: Funil) => {
    setFormData({
      nome: funil.nome,
      descricao: funil.descricao || '',
      cor: funil.cor,
    });
    setEditingId(funil.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este funil? Todos os deals e etapas serão removidos.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('funis')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Funil excluído com sucesso');
      loadFunis();
      onFunilsUpdated();
    } catch (error) {
      console.error('Erro ao excluir funil:', error);
      toast.error('Erro ao excluir funil');
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('funis')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
      toast.success(ativo ? 'Funil ativado' : 'Funil desativado');
      loadFunis();
      onFunilsUpdated();
    } catch (error) {
      console.error('Erro ao atualizar funil:', error);
      toast.error('Erro ao atualizar funil');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Funis</DialogTitle>
          <DialogDescription>
            Crie e gerencie múltiplos funis de vendas, cada um com suas próprias etapas
          </DialogDescription>
        </DialogHeader>

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome do Funil *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Vendas B2B, Pós-venda, Recrutamento"
                required
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o propósito deste funil"
                rows={3}
              />
            </div>

            <div>
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">{formData.cor}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar Funil'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ nome: '', descricao: '', cor: '#3b82f6' });
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <>
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo Funil
            </Button>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-20">Cor</TableHead>
                  <TableHead className="w-24">Ativo</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum funil criado. Clique no botão acima para criar.
                    </TableCell>
                  </TableRow>
                ) : (
                  funis.map((funil) => (
                    <TableRow key={funil.id}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      </TableCell>
                      <TableCell className="font-medium">{funil.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {funil.descricao || '-'}
                      </TableCell>
                      <TableCell>
                        <div 
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: funil.cor }}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={funil.ativo}
                          onCheckedChange={(checked) => toggleAtivo(funil.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(funil)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(funil.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
