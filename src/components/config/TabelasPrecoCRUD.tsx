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

        if (error) {
          console.error('Erro ao atualizar:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Tabela atualizada!");
      } else {
        const { error } = await supabase
          .from('tabelas_preco')
          .insert(tabelaData);

        if (error) {
          console.error('Erro ao inserir:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
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
    return <div className="text-sm text-muted-foreground">Carregando tabelas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-base sm:text-lg font-semibold">Tabelas de Preço</h3>
        <Button size="sm" className="w-full sm:w-auto" onClick={() => {
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

      {/* Mobile: Card layout */}
      <div className="block lg:hidden space-y-3">
        {tabelas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma tabela cadastrada
          </div>
        ) : (
          tabelas.map((tabela) => (
            <div key={tabela.id} className="border rounded-lg p-3 bg-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{tabela.categoria?.nome}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${tabela.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                      {tabela.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span>Mín: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tabela.preco_minimo)}</span>
                    <span>Tabela: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tabela.preco_tabela)}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(tabela)}>
                  <Pencil className="w-4 h-4 mr-1" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(tabela.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-1" /> Excluir
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden lg:block overflow-x-auto">
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
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tabela.preco_minimo)}
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tabela.preco_tabela)}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${tabela.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                    {tabela.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(tabela)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(tabela.id)}>
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
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] max-w-lg p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingTabela ? "Editar Tabela" : "Nova Tabela"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs sm:text-sm">Categoria *</Label>
              <Select
                value={formData.categoria_id}
                onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
              >
                <SelectTrigger className="text-sm">
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
              <Label className="text-xs sm:text-sm">Unidade (opcional)</Label>
              <Select
                value={formData.unidade_id || "all"}
                onValueChange={(value) => setFormData({ ...formData, unidade_id: value === "all" ? "" : value })}
              >
                <SelectTrigger className="text-sm">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs sm:text-sm">Preço Mínimo (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.preco_minimo}
                  onChange={(e) => setFormData({ ...formData, preco_minimo: e.target.value })}
                  placeholder="0.00"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Preço Tabela (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.preco_tabela}
                  onChange={(e) => setFormData({ ...formData, preco_tabela: e.target.value })}
                  placeholder="0.00"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label className="text-xs sm:text-sm">Tabela ativa</Label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDialog(false)} size="sm" className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSave} size="sm" className="w-full sm:w-auto">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
