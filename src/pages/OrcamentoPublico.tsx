import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Edit2, DollarSign, Package, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function OrcamentoPublico() {
  const { token } = useParams();
  const [orcamento, setOrcamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [precosSugeridos, setPrecosSugeridos] = useState<{ [key: string]: number }>({});
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    loadOrcamento();
  }, [token]);

  const loadOrcamento = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          cliente:customers(nome, email, telefone),
          vendedor:usuarios(nome, email),
          condicao_pagamento:condicoes_pagamento(nome, descricao),
          itens:orcamento_itens(
            *,
            produto:produtos(nome, foto_url)
          )
        `)
        .eq('token_compartilhamento', token)
        .single();

      if (error) throw error;

      setOrcamento(data);
      
      // Marcar como visualizado
      if (!data.data_visualizacao) {
        await supabase
          .from('orcamentos')
          .update({ data_visualizacao: new Date().toISOString() })
          .eq('id', data.id);
      }
    } catch (error: any) {
      console.error('Error loading orcamento:', error);
      toast.error('Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async () => {
    if (!orcamento) return;

    try {
      // Atualizar status para aprovado
      const { error: updateError } = await supabase
        .from('orcamentos')
        .update({ 
          etapa: 'aprovacao_gerencia',
          status: 'aprovado_cliente' 
        })
        .eq('id', orcamento.id);

      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from('orcamento_historico')
        .insert({
          orcamento_id: orcamento.id,
          tipo_usuario: 'cliente',
          acao: 'confirmacao',
          dados_novos: { status: 'aprovado_cliente' }
        });

      if (histError) throw histError;

      toast.success('Orçamento confirmado! O vendedor foi notificado.');
      setEditMode(false);
      loadOrcamento();
    } catch (error: any) {
      console.error('Error confirming:', error);
      toast.error('Erro ao confirmar orçamento');
    }
  };

  const handleSugerirPrecos = async () => {
    if (!orcamento || Object.keys(precosSugeridos).length === 0) {
      toast.error('Nenhuma alteração de preço sugerida');
      return;
    }

    try {
      // Atualizar status
      const { error: updateError } = await supabase
        .from('orcamentos')
        .update({ 
          data_modificacao_cliente: new Date().toISOString(),
          etapa: 'negociacao'
        })
        .eq('id', orcamento.id);

      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from('orcamento_historico')
        .insert({
          orcamento_id: orcamento.id,
          tipo_usuario: 'cliente',
          acao: 'sugestao_preco',
          dados_anteriores: {
            itens: orcamento.itens.map((i: any) => ({
              id: i.id,
              preco: i.preco_unitario
            }))
          },
          dados_novos: {
            precos_sugeridos: precosSugeridos,
            observacoes: observacoes
          }
        });

      if (histError) throw histError;

      toast.success('Sugestão enviada! O vendedor irá avaliar sua proposta.');
      setEditMode(false);
      setPrecosSugeridos({});
      setObservacoes("");
      loadOrcamento();
    } catch (error: any) {
      console.error('Error suggesting prices:', error);
      toast.error('Erro ao enviar sugestão');
    }
  };

  const handleRejeitar = async () => {
    if (!orcamento) return;

    try {
      const { error: updateError } = await supabase
        .from('orcamentos')
        .update({ 
          etapa: 'perdido',
          motivo_perda: 'Rejeitado pelo cliente'
        })
        .eq('id', orcamento.id);

      if (updateError) throw updateError;

      // Registrar no histórico
      const { error: histError } = await supabase
        .from('orcamento_historico')
        .insert({
          orcamento_id: orcamento.id,
          tipo_usuario: 'cliente',
          acao: 'rejeicao',
          dados_novos: { motivo: 'Rejeitado pelo cliente' }
        });

      if (histError) throw histError;

      toast.success('Orçamento rejeitado. Obrigado pelo feedback.');
      loadOrcamento();
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast.error('Erro ao rejeitar orçamento');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-semibold mb-2 text-white">Orçamento não encontrado</h2>
          <p className="text-slate-400">
            O link pode estar inválido ou o orçamento foi removido.
          </p>
        </div>
      </div>
    );
  }

  const isAprovado = orcamento.etapa === 'aprovacao_gerencia' || orcamento.etapa === 'finalizado';
  const isRejeitado = orcamento.etapa === 'perdido';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Lado Esquerdo - Lista de Itens */}
      <div className="flex-1 flex flex-col border-r border-border">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Orçamento #{orcamento.id.slice(0, 8)}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(orcamento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
            <Badge 
              className={
                isAprovado 
                  ? "bg-green-600 text-white" 
                  : isRejeitado 
                  ? "bg-red-600 text-white" 
                  : "bg-blue-600 text-white"
              }
            >
              {orcamento.etapa}
            </Badge>
          </div>
        </div>

        {/* Lista de Produtos */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {orcamento.itens?.map((item: any) => (
              <Card key={item.id} className="p-3 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.produto?.foto_url ? (
                      <img 
                        src={item.produto.foto_url} 
                        alt={item.produto.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm mb-1">{item.produto?.nome}</h4>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>Qtd: <span className="text-foreground font-medium">{item.quantidade}</span></span>
                      <span>
                        Unit: <span className="text-foreground font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(item.preco_unitario)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-0.5">Subtotal</div>
                    <div className="text-lg font-bold text-primary">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(item.subtotal)}
                    </div>
                  </div>
                </div>

                {editMode && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Label htmlFor={`preco-${item.id}`} className="text-xs font-medium">
                      Sugerir novo preço unitário
                    </Label>
                    <Input
                      id={`preco-${item.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={`Atual: ${item.preco_unitario}`}
                      value={precosSugeridos[item.id] || ''}
                      onChange={(e) => setPrecosSugeridos({
                        ...precosSugeridos,
                        [item.id]: Number(e.target.value)
                      })}
                      className="mt-1 h-9"
                    />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Lado Direito - Informações */}
      <div className="w-96 flex flex-col bg-card border-l border-border">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Informações do Cliente e Vendedor */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Informações
              </h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{orcamento.cliente?.nome}</p>
                  {orcamento.cliente?.email && (
                    <p className="text-xs text-muted-foreground">{orcamento.cliente.email}</p>
                  )}
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Vendedor</Label>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{orcamento.vendedor?.nome}</p>
                  {orcamento.vendedor?.email && (
                    <p className="text-xs text-muted-foreground">{orcamento.vendedor.email}</p>
                  )}
                </div>
              </div>
            </Card>

            {orcamento.observacoes && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Observações</h3>
                <p className="text-xs text-muted-foreground">{orcamento.observacoes}</p>
              </Card>
            )}

            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Resumo</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Total de Itens:</span>
                  <span className="text-foreground font-medium text-xs">{orcamento.itens?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Quantidade Total:</span>
                  <span className="text-foreground font-medium text-xs">
                    {orcamento.itens?.reduce((sum: number, item: any) => sum + item.quantidade, 0) || 0}
                  </span>
                </div>
              </div>
            </Card>

            {/* Área de Edição */}
            {editMode && (
              <Card className="p-4">
                <Label htmlFor="observacoes" className="text-sm font-semibold">
                  Observações sobre sua proposta
                </Label>
                <Textarea
                  id="observacoes"
                  placeholder="Explique porque você está sugerindo estes preços..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </Card>
            )}

            {/* Status Cards */}
            {isAprovado && (
              <Card className="p-4 bg-green-950/20 border-green-800">
                <div className="text-center">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                  <h3 className="text-base font-semibold text-foreground">Orçamento Confirmado!</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Obrigado pela confirmação. Em breve entraremos em contato.
                  </p>
                </div>
              </Card>
            )}

            {isRejeitado && (
              <Card className="p-4 bg-red-950/20 border-red-800">
                <div className="text-center">
                  <XCircle className="w-10 h-10 mx-auto mb-2 text-red-500" />
                  <h3 className="text-base font-semibold text-foreground">Orçamento Rejeitado</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Obrigado pelo feedback. Ficamos à disposição para futuras cotações.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Botões de Ação */}
        {!isAprovado && !isRejeitado && (
          <div className="p-4 border-t border-border bg-card">
            {editMode ? (
              <div className="space-y-2">
                <Button 
                  onClick={handleSugerirPrecos} 
                  className="w-full h-10"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Enviar Proposta
                </Button>
                <Button 
                  onClick={() => setEditMode(false)}
                  variant="outline"
                  className="w-full h-10"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button 
                  onClick={handleConfirmar}
                  className="w-full h-10 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Orçamento
                </Button>
                <Button 
                  onClick={() => setEditMode(true)}
                  variant="outline"
                  className="w-full h-10"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Sugerir Preços
                </Button>
                <Button 
                  onClick={handleRejeitar}
                  variant="outline"
                  className="w-full h-10 border-red-800 text-red-500 hover:bg-red-950/20"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra de Total Inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{orcamento.cliente?.nome}</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-xs text-muted-foreground">Valor Total</div>
            <div className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(orcamento.valor_total || 0)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isAprovado && (
            <Badge className="bg-green-600 text-white px-4 py-1.5">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmado
            </Badge>
          )}
          {isRejeitado && (
            <Badge className="bg-red-600 text-white px-4 py-1.5">
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitado
            </Badge>
          )}
          {!isAprovado && !isRejeitado && (
            <Badge className="bg-blue-600 text-white px-4 py-1.5">
              Aguardando Resposta
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
