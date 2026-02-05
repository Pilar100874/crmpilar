import { useState } from "react";
import { Orcamento } from "@/types/orcamento";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Calendar, 
  DollarSign, 
  Package, 
  Copy,
  Share2,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/lib/toast-config";
import ImageItemExtractor from "./ImageItemExtractor";
import AddItemForm from "./AddItemForm";
import OrcamentoItemCard from "./OrcamentoItemCard";
import { supabase } from "@/integrations/supabase/client";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface OrcamentoDetailsDialogProps {
  orcamento: Orcamento;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onDelete?: () => void;
}

export default function OrcamentoDetailsDialog({ 
  orcamento, 
  open, 
  onOpenChange,
  onSave,
  onDelete 
}: OrcamentoDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("detalhes");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Primeiro excluir os itens do orçamento
      const { error: itemsError } = await supabase
        .from('orcamento_itens')
        .delete()
        .eq('orcamento_id', orcamento.id);

      if (itemsError) throw itemsError;

      // Depois excluir o orçamento
      const { error } = await supabase
        .from('orcamentos')
        .delete()
        .eq('id', orcamento.id);

      if (error) throw error;

      toast.success("Orçamento excluído com sucesso!");
      setShowDeleteDialog(false);
      onOpenChange(false);
      onDelete?.();
    } catch (error: any) {
      console.error('Erro ao excluir orçamento:', error);
      toast.error("Erro ao excluir orçamento");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = () => {
    if (orcamento.token_compartilhamento) {
      const link = `${window.location.origin}/orcamento/${orcamento.token_compartilhamento}`;
      navigator.clipboard.writeText(link);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  const handleDuplicate = () => {
    toast.info("Funcionalidade de duplicar será implementada");
  };

  const handleItemsExtracted = async (items: any[]) => {
    try {
      // Converter itens extraídos para formato do banco
      // Por enquanto, vamos apenas criar os itens sem vincular a produtos existentes
      const itemsToInsert = items.map(item => ({
        orcamento_id: orcamento.id,
        produto_id: null, // Será null, o usuário pode vincular depois
        quantidade: item.quantidade,
        preco_unitario: item.valor_unitario,
        preco_original: item.valor_unitario,
        desconto: 0,
        subtotal: item.quantidade * item.valor_unitario
      }));

      const { error } = await supabase
        .from('orcamento_itens')
        .insert(itemsToInsert);

      if (error) throw error;

      toast.success(`${items.length} item(ns) adicionado(s) ao orçamento!`);
      onSave(); // Recarregar orçamento
    } catch (error: any) {
      console.error('Erro ao adicionar itens:', error);
      toast.error("Erro ao adicionar itens ao orçamento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Orçamento #{orcamento.id.slice(0, 8)}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {orcamento.cliente?.nome}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              <Button variant="outline" size="sm" onClick={handleDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
          
          <DeleteConfirmDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={handleDelete}
            title="Excluir Orçamento"
            description={`Tem certeza que deseja excluir o orçamento #${orcamento.id.slice(0, 8)}? Todos os itens serão removidos. Esta ação não pode ser desfeita.`}
            isLoading={isDeleting}
          />
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="itens">
              Itens ({orcamento.itens?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="sugestoes">Sugestões</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            <TabsContent value="detalhes" className="space-y-4">
              {/* Informações do Orçamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Cliente</p>
                        <p className="text-sm text-muted-foreground">
                          {orcamento.cliente?.nome}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Vendedor</p>
                        <p className="text-sm text-muted-foreground">
                          {orcamento.vendedor?.nome || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Data de Criação</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(orcamento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Valor Total</p>
                        <p className="text-sm font-semibold">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(orcamento.valor_total || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status e Etapa */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Etapa Atual</p>
                    <Badge variant="default">{orcamento.etapa}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Status</p>
                    <Badge variant={orcamento.status === 'em_aberto' ? 'default' : 'secondary'}>
                      {orcamento.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Observações */}
              {orcamento.observacoes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {orcamento.observacoes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="itens" className="space-y-3">
              {/* Formulário para adicionar itens manualmente */}
              <AddItemForm 
                orcamentoId={orcamento.id}
                estabelecimentoId={orcamento.estabelecimento_id}
                onItemAdded={onSave}
              />

              {/* Componente de extração de imagem */}
              <ImageItemExtractor onItemsExtracted={handleItemsExtracted} />

              {/* Lista de itens existentes */}
              {orcamento.itens && orcamento.itens.length > 0 ? (
                orcamento.itens.map((item) => (
                  <OrcamentoItemCard 
                    key={item.id} 
                    item={item} 
                    onUpdate={onSave}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum item adicionado ainda</p>
                    <p className="text-xs mt-1">Use o formulário acima ou reconhecimento de imagem</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sugestoes">
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Sugestões de produtos serão exibidas aqui</p>
                  <p className="text-xs mt-1">Baseadas no histórico de compras do cliente</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historico">
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Histórico será implementado</p>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
