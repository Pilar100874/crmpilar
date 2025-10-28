import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { TipoPagamento } from "@/types/orcamento";

interface TiposPagamentoCRUDProps {
  estabelecimentoId: string;
}

export function TiposPagamentoCRUD({ estabelecimentoId }: TiposPagamentoCRUDProps) {
  const [tipos, setTipos] = useState<TipoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoPagamento | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    taxa_percentual: "",
    ativo: true,
  });

  useEffect(() => {
    if (estabelecimentoId) {
      loadTipos();
    }
  }, [estabelecimentoId]);

  const loadTipos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tipos_pagamento')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setTipos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar tipos:', error);
      toast.error("Erro ao carregar tipos de pagamento");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome do tipo é obrigatório");
      return;
    }

    try {
      const tipoData = {
        estabelecimento_id: estabelecimentoId,
        nome: formData.nome,
        taxa_percentual: formData.taxa_percentual ? parseFloat(formData.taxa_percentual) : 0,
        ativo: formData.ativo,
      };

      if (editingTipo) {
        const { error } = await supabase
          .from('tipos_pagamento')
          .update(tipoData)
          .eq('id', editingTipo.id);

        if (error) {
          console.error('Erro ao atualizar:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Tipo atualizado!");
      } else {
        const { error } = await supabase
          .from('tipos_pagamento')
          .insert(tipoData);

        if (error) {
          console.error('Erro ao inserir:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Tipo criado!");
      }

      setShowDialog(false);
      setEditingTipo(null);
      setFormData({
        nome: "",
        taxa_percentual: "",
        ativo: true,
      });
      loadTipos();
    } catch (error: any) {
      console.error('Erro ao salvar tipo:', error);
      toast.error("Erro ao salvar tipo de pagamento");
    }
  };

  const handleEdit = (tipo: TipoPagamento) => {
    setEditingTipo(tipo);
    setFormData({
      nome: tipo.nome,
      taxa_percentual: tipo.taxa_percentual.toString(),
      ativo: tipo.ativo,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este tipo?")) return;

    try {
      const { error } = await supabase
        .from('tipos_pagamento')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Tipo excluído!");
      loadTipos();
    } catch (error: any) {
      console.error('Erro ao excluir tipo:', error);
      toast.error("Erro ao excluir tipo de pagamento");
    }
  };

  if (loading) {
    return <div>Carregando tipos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tipos de Pagamento</h3>
        <Button onClick={() => {
          setEditingTipo(null);
          setFormData({
            nome: "",
            taxa_percentual: "",
            ativo: true,
          });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Taxa (%)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tipos.map((tipo) => (
            <TableRow key={tipo.id}>
              <TableCell className="font-medium">{tipo.nome}</TableCell>
              <TableCell>{tipo.taxa_percentual}%</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${tipo.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {tipo.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(tipo)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(tipo.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {tipos.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum tipo cadastrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTipo ? "Editar Tipo" : "Novo Tipo"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Cartão de Crédito, PIX, Boleto"
              />
            </div>

            <div>
              <Label>Taxa (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.taxa_percentual}
                onChange={(e) => setFormData({ ...formData, taxa_percentual: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label>Tipo ativo</Label>
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
