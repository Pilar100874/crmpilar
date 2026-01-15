import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
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
import { Trash2, Pencil, Plus } from "lucide-react";

interface ProdutoGrupo {
  id: string;
  nome: string;
  percentual_comissao?: number;
  estabelecimento_id: string;
}

interface ProdutoGruposCRUDProps {
  estabelecimentoId: string;
}

export function ProdutoGruposCRUD({ estabelecimentoId }: ProdutoGruposCRUDProps) {
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<ProdutoGrupo | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    percentual_comissao: "",
  });

  useEffect(() => {
    if (estabelecimentoId) {
      loadGrupos();
    }
  }, [estabelecimentoId]);

  const loadGrupos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produto_grupos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar grupos:', error);
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }

    try {
      const grupoData = {
        estabelecimento_id: estabelecimentoId,
        nome: formData.nome,
        percentual_comissao: formData.percentual_comissao ? parseFloat(formData.percentual_comissao) : 0,
      };

      if (editingGrupo) {
        const { error } = await supabase
          .from('produto_grupos')
          .update(grupoData)
          .eq('id', editingGrupo.id);

        if (error) {
          console.error('Erro ao atualizar:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Grupo atualizado!");
      } else {
        const { error } = await supabase
          .from('produto_grupos')
          .insert(grupoData);

        if (error) {
          console.error('Erro ao inserir:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Grupo criado!");
      }

      setShowDialog(false);
      setEditingGrupo(null);
      setFormData({ nome: "", percentual_comissao: "" });
      loadGrupos();
    } catch (error: any) {
      console.error('Erro ao salvar grupo:', error);
      toast.error("Erro ao salvar grupo");
    }
  };

  const handleEdit = (grupo: ProdutoGrupo) => {
    setEditingGrupo(grupo);
    setFormData({
      nome: grupo.nome,
      percentual_comissao: grupo.percentual_comissao?.toString() || "0",
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este grupo?")) return;

    try {
      const { error } = await supabase
        .from('produto_grupos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Grupo excluído!");
      loadGrupos();
    } catch (error: any) {
      console.error('Erro ao excluir grupo:', error);
      toast.error("Erro ao excluir grupo");
    }
  };

  if (loading) {
    return <div>Carregando grupos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Grupos de Produtos</h3>
        <Button onClick={() => {
          setEditingGrupo(null);
          setFormData({ nome: "", percentual_comissao: "" });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Grupo
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>% Comissão</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grupos.map((grupo) => (
            <TableRow key={grupo.id}>
              <TableCell className="font-medium">{grupo.nome}</TableCell>
              <TableCell>{grupo.percentual_comissao}%</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(grupo)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(grupo.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {grupos.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Nenhum grupo cadastrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {editingGrupo ? "Editar Grupo" : "Novo Grupo"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do grupo"
              />
            </div>

            <div>
              <Label>Percentual de Comissão (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.percentual_comissao}
                onChange={(e) => setFormData({ ...formData, percentual_comissao: e.target.value })}
                placeholder="0.00"
              />
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
