import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
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
      <div className="min-h-screen bg-foreground/90 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="min-h-screen bg-foreground/90 flex items-center justify-center p-4">
        <div className="bg-foreground/80 border border-border rounded-lg p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-semibold mb-2 text-white">Orçamento não encontrado</h2>
          <p className="text-muted-foreground">
            O link pode estar inválido ou o orçamento foi removido.
          </p>
        </div>
      </div>
    );
  }

  const isAprovado = orcamento.etapa === 'aprovacao_gerencia' || orcamento.etapa === 'finalizado';
  const isRejeitado = orcamento.etapa === 'perdido';

  return (
    <div className="flex flex-col h-screen bg-foreground/90">
      <div className="flex flex-1 overflow-hidden">
        {/* Lado Esquerdo - Itens */}
        <div className="flex-1 flex flex-col bg-foreground/90">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Orçamento #{orcamento.id.slice(0, 8)}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(orcamento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>
                  {orcamento.data_visualizacao && (
                    <span className="text-xs">
                      Visualizado em {format(new Date(orcamento.data_visualizacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  )}
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

          {/* Itens do Orçamento */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-3">
              {orcamento.itens?.map((item: any) => (
                <div key={item.id} className="bg-foreground/80 rounded-lg p-4 border border-border hover:border-slate-600 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-muted-foreground rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.produto?.foto_url ? (
                        <img 
                          src={item.produto.foto_url} 
                          alt={item.produto.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-base mb-2">{item.produto?.nome}</h4>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Qtd: <span className="text-white font-medium">{item.quantidade}</span></span>
                        <span>
                          Unit: <span className="text-white font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(item.preco_unitario)}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Subtotal</div>
                      <div className="text-xl font-bold text-blue-400">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(item.subtotal)}
                      </div>
                    </div>
                  </div>

                  {editMode && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Label htmlFor={`preco-${item.id}`} className="text-muted-foreground/60 text-sm font-medium">
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
                        className="mt-2 bg-muted-foreground border-slate-600 text-white h-11"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Lado Direito - Informações e Ações */}
        <div className="w-[420px] bg-foreground/80 border-l border-border flex flex-col overflow-hidden">
        {/* Informações do Cliente e Vendedor */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <div className="bg-muted-foreground rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Informações
              </h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Cliente</Label>
                  <p className="font-semibold text-white text-base mt-1">{orcamento.cliente?.nome}</p>
                  {orcamento.cliente?.email && (
                    <p className="text-sm text-muted-foreground">{orcamento.cliente.email}</p>
                  )}
                </div>
                <Separator className="bg-muted-foreground/80" />
                <div>
                  <Label className="text-muted-foreground text-xs">Vendedor</Label>
                  <p className="font-semibold text-white text-base mt-1">{orcamento.vendedor?.nome}</p>
                  {orcamento.vendedor?.email && (
                    <p className="text-sm text-muted-foreground">{orcamento.vendedor.email}</p>
                  )}
                </div>
              </div>
            </div>

            {orcamento.observacoes && (
              <div className="bg-muted-foreground rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Observações</h3>
                <p className="text-sm text-muted-foreground/60">{orcamento.observacoes}</p>
              </div>
            )}

            <div className="bg-muted-foreground rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Resumo</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Itens:</span>
                  <span className="text-white font-medium">{orcamento.itens?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade Total:</span>
                  <span className="text-white font-medium">
                    {orcamento.itens?.reduce((sum: number, item: any) => sum + item.quantidade, 0) || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Área de Edição (quando ativo) */}
            {editMode && (
              <div className="bg-muted-foreground rounded-lg p-4">
                <Label htmlFor="observacoes" className="text-white font-semibold text-sm">
                  Observações sobre sua proposta
                </Label>
                <Textarea
                  id="observacoes"
                  placeholder="Explique porque você está sugerindo estes preços..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={4}
                  className="mt-2 bg-muted-foreground/80 border-slate-500 text-white placeholder:text-muted-foreground"
                />
              </div>
            )}

            {/* Status de Aprovado */}
            {isAprovado && (
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Orçamento Confirmado!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Obrigado pela confirmação. Em breve entraremos em contato.
                </p>
              </div>
            )}

            {/* Status de Rejeitado */}
            {isRejeitado && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
                <XCircle className="w-12 h-12 mx-auto mb-2 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Orçamento Rejeitado</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Obrigado pelo feedback. Ficamos à disposição para futuras cotações.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Botões de Ação Fixos */}
        {!isAprovado && !isRejeitado && (
          <div className="border-t border-border p-4 bg-foreground/80">
            {editMode ? (
              <div className="space-y-2">
                <Button 
                  onClick={handleSugerirPrecos} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 font-semibold"
                >
                  <DollarSign className="w-5 h-5 mr-2" />
                  Enviar Proposta
                </Button>
                <Button 
                  onClick={() => setEditMode(false)}
                  variant="outline"
                  className="w-full bg-muted-foreground border-slate-600 text-white hover:bg-muted-foreground/80 h-12"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button 
                  onClick={handleConfirmar}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12 font-semibold"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Confirmar Orçamento
                </Button>
                <Button 
                  onClick={() => setEditMode(true)}
                  variant="outline"
                  className="w-full bg-muted-foreground border-slate-600 text-white hover:bg-muted-foreground/80 h-12"
                >
                  <Edit2 className="w-5 h-5 mr-2" />
                  Sugerir Preços
                </Button>
                <Button 
                  onClick={handleRejeitar}
                  variant="outline"
                  className="w-full bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/30 h-12"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Rejeitar
                </Button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Barra de Total Inferior */}
      <div className="bg-foreground/80 border-t border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-5 h-5" />
            <span className="text-sm">{orcamento.cliente?.nome}</span>
          </div>
          <div className="h-8 w-px bg-muted-foreground" />
          <div>
            <div className="text-muted-foreground text-xs mb-1">Valor Total</div>
            <div className="text-white font-bold text-3xl">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(orcamento.valor_total || 0)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isAprovado && (
            <Badge className="bg-green-600 text-white px-4 py-2 text-sm">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmado
            </Badge>
          )}
          {isRejeitado && (
            <Badge className="bg-red-600 text-white px-4 py-2 text-sm">
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitado
            </Badge>
          )}
          {!isAprovado && !isRejeitado && (
            <Badge className="bg-blue-600 text-white px-4 py-2 text-sm">
              Aguardando Resposta
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
