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
import { Trash2, Pencil, Plus } from "lucide-react";
import { ProdutoCategoria } from "@/types/orcamento";

interface ProdutoCategoriasCRUDProps {
  estabelecimentoId: string;
}

export function ProdutoCategoriasCRUD({ estabelecimentoId }: ProdutoCategoriasCRUDProps) {
  const [categorias, setCategorias] = useState<ProdutoCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<ProdutoCategoria | null>(null);
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (estabelecimentoId) {
      loadCategorias();
    }
  }, [estabelecimentoId]);

  const loadCategorias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produto_categorias')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar categorias:', error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    try {
      if (editingCategoria) {
        const { error } = await supabase
          .from('produto_categorias')
          .update({ nome })
          .eq('id', editingCategoria.id);

        if (error) {
          console.error('Erro ao atualizar:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Categoria atualizada!");
      } else {
        const { error } = await supabase
          .from('produto_categorias')
          .insert({
            estabelecimento_id: estabelecimentoId,
            nome,
          });

        if (error) {
          console.error('Erro ao inserir:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Categoria criada!");
      }

      setShowDialog(false);
      setEditingCategoria(null);
      setNome("");
      loadCategorias();
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);
      toast.error("Erro ao salvar categoria");
    }
  };

  const handleEdit = (categoria: ProdutoCategoria) => {
    setEditingCategoria(categoria);
    setNome(categoria.nome);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const { error } = await supabase
        .from('produto_categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Categoria excluída!");
      loadCategorias();
    } catch (error: any) {
      console.error('Erro ao excluir categoria:', error);
      toast.error("Erro ao excluir categoria");
    }
  };

  if (loading) {
    return <div>Carregando categorias...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Categorias de Produtos</h3>
        <Button onClick={() => {
          setEditingCategoria(null);
          setNome("");
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categorias.map((categoria) => (
            <TableRow key={categoria.id}>
              <TableCell className="font-medium">{categoria.nome}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(categoria)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(categoria.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {categorias.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground">
                Nenhuma categoria cadastrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategoria ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da categoria"
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
