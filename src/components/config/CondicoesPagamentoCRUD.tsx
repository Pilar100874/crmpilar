import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Pencil, Plus } from "lucide-react";
import { CondicaoPagamento, TipoPagamento } from "@/types/orcamento";

interface CondicoesPagamentoCRUDProps {
  estabelecimentoId: string;
}

export function CondicoesPagamentoCRUD({ estabelecimentoId }: CondicoesPagamentoCRUDProps) {
  const [condicoes, setCondicoes] = useState<CondicaoPagamento[]>([]);
  const [tiposPagamento, setTiposPagamento] = useState<TipoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCondicao, setEditingCondicao] = useState<CondicaoPagamento | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    valor_minimo: "",
    valor_maximo: "",
    tipo_pagamento_id: "",
    ativo: true,
  });

  useEffect(() => {
    if (estabelecimentoId) {
      loadCondicoes();
      loadTiposPagamento();
    }
  }, [estabelecimentoId]);

  const loadTiposPagamento = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_pagamento')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setTiposPagamento(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar tipos de pagamento:', error);
    }
  };

  const loadCondicoes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('condicoes_pagamento')
        .select('*, tipo_pagamento:tipos_pagamento(*)')
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
        tipo_pagamento_id: formData.tipo_pagamento_id || null,
        ativo: formData.ativo,
      };

      if (editingCondicao) {
        const { error } = await supabase
          .from('condicoes_pagamento')
          .update(condicaoData)
          .eq('id', editingCondicao.id);

        if (error) {
          console.error('Erro ao atualizar:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Condição atualizada!");
      } else {
        const { error } = await supabase
          .from('condicoes_pagamento')
          .insert(condicaoData);

        if (error) {
          console.error('Erro ao inserir:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Condição criada!");
      }

      setShowDialog(false);
      setEditingCondicao(null);
      setFormData({
        nome: "",
        descricao: "",
        valor_minimo: "",
        valor_maximo: "",
        tipo_pagamento_id: "",
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
      tipo_pagamento_id: condicao.tipo_pagamento_id || "",
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
    return <div className="text-sm text-muted-foreground">Carregando condições...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-base sm:text-lg font-semibold">Condições de Pagamento</h3>
        <Button size="sm" className="w-full sm:w-auto" onClick={() => {
          setEditingCondicao(null);
          setFormData({
            nome: "",
            descricao: "",
            valor_minimo: "",
            valor_maximo: "",
            tipo_pagamento_id: "",
            ativo: true,
          });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Condição
        </Button>
      </div>

      {/* Mobile: Card layout */}
      <div className="block lg:hidden space-y-3">
        {condicoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma condição cadastrada
          </div>
        ) : (
          condicoes.map((condicao) => (
            <div key={condicao.id} className="border rounded-lg p-3 bg-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{condicao.nome}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${condicao.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                      {condicao.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {condicao.descricao && <p className="text-xs text-muted-foreground mt-1">{condicao.descricao}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span>Tipo: {condicao.tipo_pagamento?.nome || "-"}</span>
                    <span>Mín: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(condicao.valor_minimo)}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(condicao)}>
                  <Pencil className="w-4 h-4 mr-1" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(condicao.id)} className="text-destructive">
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
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo Pagamento</TableHead>
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
                <TableCell>{condicao.tipo_pagamento?.nome || "-"}</TableCell>
                <TableCell>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(condicao.valor_minimo)}
                </TableCell>
                <TableCell>{condicao.valor_maximo || "-"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${condicao.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                    {condicao.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(condicao)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(condicao.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {condicoes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma condição cadastrada
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
              {editingCondicao ? "Editar Condição" : "Nova Condição"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs sm:text-sm">Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: À vista, 30 dias, etc."
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm">Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva a condição de pagamento"
                rows={2}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs sm:text-sm">Tipo de Pagamento</Label>
              <Select
                value={formData.tipo_pagamento_id}
                onValueChange={(value) => setFormData({ ...formData, tipo_pagamento_id: value })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione um tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposPagamento.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome} ({tipo.taxa_percentual}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs sm:text-sm">Valor Mínimo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_minimo}
                  onChange={(e) => setFormData({ ...formData, valor_minimo: e.target.value })}
                  placeholder="0.00"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Valor Máximo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_maximo}
                  onChange={(e) => setFormData({ ...formData, valor_maximo: e.target.value })}
                  placeholder="Sem limite"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label className="text-xs sm:text-sm">Condição ativa</Label>
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
