import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { OrcamentoItem } from "@/types/orcamento";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";

interface OrcamentoItemCardProps {
  item: OrcamentoItem;
  onUpdate: () => void;
}

export default function OrcamentoItemCard({ item, onUpdate }: OrcamentoItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
  });

  const handleSave = async () => {
    try {
      const subtotal = editData.quantidade * editData.preco_unitario;

      const { error } = await supabase
        .from('orcamento_itens')
        .update({
          quantidade: editData.quantidade,
          preco_unitario: editData.preco_unitario,
          subtotal: subtotal,
        })
        .eq('id', item.id);

      if (error) throw error;

      // Atualizar valor total do orçamento
      const { data: itens, error: itensError } = await supabase
        .from('orcamento_itens')
        .select('subtotal')
        .eq('orcamento_id', item.orcamento_id);

      if (itensError) throw itensError;

      const valorTotal = itens.reduce((sum, i) => sum + Number(i.subtotal), 0);

      const { error: updateError } = await supabase
        .from('orcamentos')
        .update({ valor_total: valorTotal })
        .eq('id', item.orcamento_id);

      if (updateError) throw updateError;

      toast.success('Item atualizado com sucesso!');
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error('Erro ao atualizar item');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const { error } = await supabase
        .from('orcamento_itens')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      // Atualizar valor total do orçamento
      const { data: itens, error: itensError } = await supabase
        .from('orcamento_itens')
        .select('subtotal')
        .eq('orcamento_id', item.orcamento_id);

      if (itensError) throw itensError;

      const valorTotal = itens.reduce((sum, i) => sum + Number(i.subtotal), 0);

      const { error: updateError } = await supabase
        .from('orcamentos')
        .update({ valor_total: valorTotal })
        .eq('id', item.orcamento_id);

      if (updateError) throw updateError;

      toast.success('Item excluído com sucesso!');
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao excluir item');
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {item.produto?.foto_url && (
            <img
              src={item.produto.foto_url}
              alt={item.produto.nome}
              className="w-16 h-16 object-cover rounded"
            />
          )}
          
          <div className="flex-1">
            <h4 className="font-semibold">{item.produto?.nome || "Item sem produto vinculado"}</h4>
            
            {isEditing ? (
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <Input
                    type="number"
                    value={editData.quantidade}
                    onChange={(e) => setEditData({ ...editData, quantidade: Number(e.target.value) })}
                    className="h-8"
                    min="1"
                  />
                  <span className="text-xs text-muted-foreground">Qtd</span>
                </div>
                <div>
                  <Input
                    type="number"
                    value={editData.preco_unitario}
                    onChange={(e) => setEditData({ ...editData, preco_unitario: Number(e.target.value) })}
                    className="h-8"
                    min="0"
                    step="0.01"
                  />
                  <span className="text-xs text-muted-foreground">Preço Unit.</span>
                </div>
                <div>
                  <div className="text-sm font-semibold h-8 flex items-center">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(editData.quantidade * editData.preco_unitario)}
                  </div>
                  <span className="text-xs text-muted-foreground">Subtotal</span>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span>Qtd: {item.quantidade}</span>
                <span>
                  Unit: {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(item.preco_unitario)}
                </span>
                <span className="font-semibold text-foreground">
                  Total: {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(item.subtotal)}
                </span>
              </div>
            )}

            {item.produto && (
              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                {item.produto.largura && <span>L: {item.produto.largura}cm</span>}
                {item.produto.comprimento && <span>C: {item.produto.comprimento}cm</span>}
                {item.produto.gramatura && <span>Gram: {item.produto.gramatura}g/m²</span>}
              </div>
            )}
          </div>

          <div className="flex gap-1">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSave}
                  className="h-8 w-8"
                >
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      quantidade: item.quantidade,
                      preco_unitario: item.preco_unitario,
                    });
                  }}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}