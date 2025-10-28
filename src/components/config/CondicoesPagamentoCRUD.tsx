import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Trash2, Pencil, Plus } from "lucide-react";
import { CondicaoPagamento } from "@/types/orcamento";

interface CondicoesPagamentoCRUDProps {
  estabelecimentoId: string;
}

export function CondicoesPagamentoCRUD({ estabelecimentoId }: CondicoesPagamentoCRUDProps) {
  const [condicoes, setCondicoes] = useState<CondicaoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCondicao, setEditingCondicao] = useState<CondicaoPagamento | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    valor_minimo: "",
    valor_maximo: "",
    ativo: true,
  });

  useEffect(() => {
    if (estabelecimentoId) {
      loadCondicoes();
    }
  }, [estabelecimentoId]);

  const loadCondicoes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('condicoes_pagamento')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setCondicoes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar condições:', error);
      toast.error("Erro ao carregar condições de pagamento");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome da condição é obrigatório");
      return;
    }

    try {
      const condicaoData = {
        estabelecimento_id: estabelecimentoId,
        nome: formData.nome,
        descricao: formData.descricao || null,
        valor_minimo: formData.valor_minimo ? parseFloat(formData.valor_minimo) : 0,
        valor_maximo: formData.valor_maximo ? parseFloat(formData.valor_maximo) : null,
        ativo: formData.ativo,
      };

      if (editingCondicao) {
        const { error } = await supabase
          .from('condicoes_pagamento')
          .update(condicaoData)
          .eq('id', editingCondicao.id);

        if (error) throw error;
        toast.success("Condição atualizada!");
      } else {
        const { error } = await supabase
          .from('condicoes_pagamento')
          .insert(condicaoData);

        if (error) throw error;
        toast.success("Condição criada!");
      }

      setShowDialog(false);
      setEditingCondicao(null);
      setFormData({
        nome: "",
        descricao: "",
        valor_minimo: "",
        valor_maximo: "",
        ativo: true,
      });
      loadCondicoes();
    } catch (error: any) {
      console.error('Erro ao salvar condição:', error);
      toast.error("Erro ao salvar condição de pagamento");
    }
  };

  const handleEdit = (condicao: CondicaoPagamento) => {
    setEditingCondicao(condicao);
    setFormData({
      nome: condicao.nome,
      descricao: condicao.descricao || "",
      valor_minimo: condicao.valor_minimo.toString(),
      valor_maximo: condicao.valor_maximo?.toString() || "",
      ativo: condicao.ativo,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta condição?")) return;

    try {
      const { error } = await supabase
        .from('condicoes_pagamento')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Condição excluída!");
      loadCondicoes();
    } catch (error: any) {
      console.error('Erro ao excluir condição:', error);
      toast.error("Erro ao excluir condição de pagamento");
    }
  };

  if (loading) {
    return <div>Carregando condições...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Condições de Pagamento</h3>
        <Button onClick={() => {
          setEditingCondicao(null);
          setFormData({
            nome: "",
            descricao: "",
            valor_minimo: "",
            valor_maximo: "",
            ativo: true,
          });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Condição
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Valor Mín.</TableHead>
            <TableHead>Valor Máx.</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {condicoes.map((condicao) => (
            <TableRow key={condicao.id}>
              <TableCell className="font-medium">{condicao.nome}</TableCell>
              <TableCell>{condicao.descricao || "-"}</TableCell>
              <TableCell>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(condicao.valor_minimo)}
              </TableCell>
              <TableCell>
                {condicao.valor_maximo
                  ? new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(condicao.valor_maximo)
                  : "-"}
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${condicao.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {condicao.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(condicao)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(condicao.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {condicoes.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma condição cadastrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCondicao ? "Editar Condição" : "Nova Condição"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: À vista, 30 dias, etc."
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva a condição de pagamento"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Mínimo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_minimo}
                  onChange={(e) => setFormData({ ...formData, valor_minimo: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Valor Máximo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_maximo}
                  onChange={(e) => setFormData({ ...formData, valor_maximo: e.target.value })}
                  placeholder="Sem limite"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label>Condição ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
