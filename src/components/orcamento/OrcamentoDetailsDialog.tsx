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
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface OrcamentoDetailsDialogProps {
  orcamento: Orcamento;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export default function OrcamentoDetailsDialog({ 
  orcamento, 
  open, 
  onOpenChange,
  onSave 
}: OrcamentoDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("detalhes");

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
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="itens">
              Itens ({orcamento.itens?.length || 0})
            </TabsTrigger>
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
              {orcamento.itens && orcamento.itens.length > 0 ? (
                orcamento.itens.map((item) => (
                  <Card key={item.id}>
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
                          <h4 className="font-semibold">{item.produto?.nome}</h4>
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum item adicionado ainda</p>
                  </CardContent>
                </Card>
              )}
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
