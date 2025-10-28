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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Pencil, Plus } from "lucide-react";
import { TabelaPreco, ProdutoCategoria } from "@/types/orcamento";

interface TabelasPrecoCRUDProps {
  estabelecimentoId: string;
}

export function TabelasPrecoCRUD({ estabelecimentoId }: TabelasPrecoCRUDProps) {
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([]);
  const [categorias, setCategorias] = useState<ProdutoCategoria[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTabela, setEditingTabela] = useState<TabelaPreco | null>(null);
  const [formData, setFormData] = useState({
    categoria_id: "",
    unidade_id: "",
    preco_minimo: "",
    preco_tabela: "",
    ativo: true,
  });

  useEffect(() => {
    if (estabelecimentoId) {
      loadData();
    }
  }, [estabelecimentoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [tabelasRes, categoriasRes, unidadesRes] = await Promise.all([
        supabase
          .from('tabelas_preco')
          .select('*, categoria:produto_categorias(id, nome)')
          .eq('estabelecimento_id', estabelecimentoId)
          .order('created_at', { ascending: false }),
        supabase
          .from('produto_categorias')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .order('nome'),
        supabase
          .from('unidades')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .order('nome'),
      ]);

      if (tabelasRes.error) throw tabelasRes.error;
      if (categoriasRes.error) throw categoriasRes.error;
      if (unidadesRes.error) throw unidadesRes.error;

      setTabelas((tabelasRes.data as any) || []);
      setCategorias(categoriasRes.data || []);
      setUnidades(unidadesRes.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error("Erro ao carregar tabelas de preço");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.categoria_id || !formData.preco_minimo || !formData.preco_tabela) {
      toast.error("Categoria, preço mínimo e preço de tabela são obrigatórios");
      return;
    }

    try {
      const tabelaData = {
        estabelecimento_id: estabelecimentoId,
        categoria_id: formData.categoria_id,
        unidade_id: formData.unidade_id || null,
        preco_minimo: parseFloat(formData.preco_minimo),
        preco_tabela: parseFloat(formData.preco_tabela),
        ativo: formData.ativo,
      };

      if (editingTabela) {
        const { error } = await supabase
          .from('tabelas_preco')
          .update(tabelaData)
          .eq('id', editingTabela.id);

        if (error) throw error;
        toast.success("Tabela atualizada!");
      } else {
        const { error } = await supabase
          .from('tabelas_preco')
          .insert(tabelaData);

        if (error) throw error;
        toast.success("Tabela criada!");
      }

      setShowDialog(false);
      setEditingTabela(null);
      setFormData({
        categoria_id: "",
        unidade_id: "",
        preco_minimo: "",
        preco_tabela: "",
        ativo: true,
      });
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar tabela:', error);
      toast.error("Erro ao salvar tabela de preço");
    }
  };

  const handleEdit = (tabela: TabelaPreco) => {
    setEditingTabela(tabela);
    setFormData({
      categoria_id: tabela.categoria_id,
      unidade_id: tabela.unidade_id || "",
      preco_minimo: tabela.preco_minimo.toString(),
      preco_tabela: tabela.preco_tabela.toString(),
      ativo: tabela.ativo,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tabela?")) return;

    try {
      const { error } = await supabase
        .from('tabelas_preco')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Tabela excluída!");
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir tabela:', error);
      toast.error("Erro ao excluir tabela de preço");
    }
  };

  if (loading) {
    return <div>Carregando tabelas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tabelas de Preço</h3>
        <Button onClick={() => {
          setEditingTabela(null);
          setFormData({
            categoria_id: "",
            unidade_id: "",
            preco_minimo: "",
            preco_tabela: "",
            ativo: true,
          });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Tabela
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoria</TableHead>
            <TableHead>Preço Mínimo</TableHead>
            <TableHead>Preço Tabela</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabelas.map((tabela) => (
            <TableRow key={tabela.id}>
              <TableCell className="font-medium">{tabela.categoria?.nome}</TableCell>
              <TableCell>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(tabela.preco_minimo)}
              </TableCell>
              <TableCell>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(tabela.preco_tabela)}
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${tabela.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {tabela.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(tabela)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(tabela.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {tabelas.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhuma tabela cadastrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTabela ? "Editar Tabela" : "Nova Tabela"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Categoria *</Label>
              <Select
                value={formData.categoria_id}
                onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unidade (opcional)</Label>
              <Select
                value={formData.unidade_id || "all"}
                onValueChange={(value) => setFormData({ ...formData, unidade_id: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as unidades</SelectItem>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço Mínimo (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.preco_minimo}
                  onChange={(e) => setFormData({ ...formData, preco_minimo: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Preço Tabela (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.preco_tabela}
                  onChange={(e) => setFormData({ ...formData, preco_tabela: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label>Tabela ativa</Label>
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
