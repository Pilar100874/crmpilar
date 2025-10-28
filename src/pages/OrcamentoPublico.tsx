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
import { CheckCircle, XCircle, Edit2, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Orçamento não encontrado</h2>
            <p className="text-muted-foreground">
              O link pode estar inválido ou o orçamento foi removido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAprovado = orcamento.etapa === 'aprovacao_gerencia' || orcamento.etapa === 'finalizado';
  const isRejeitado = orcamento.etapa === 'perdido';

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  Orçamento #{orcamento.id.slice(0, 8)}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(orcamento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
              <Badge variant={isAprovado ? "default" : isRejeitado ? "destructive" : "secondary"}>
                {orcamento.etapa}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Cliente</Label>
                <p className="font-semibold">{orcamento.cliente?.nome}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Vendedor</Label>
                <p className="font-semibold">{orcamento.vendedor?.nome}</p>
              </div>
            </div>

            {orcamento.observacoes && (
              <div>
                <Label className="text-muted-foreground">Observações</Label>
                <p className="text-sm">{orcamento.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Itens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Itens do Orçamento
              {!isAprovado && !isRejeitado && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {editMode ? 'Cancelar' : 'Sugerir Preços'}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orcamento.itens?.map((item: any) => (
              <div key={item.id}>
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
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
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
                    
                    {editMode && (
                      <div className="mt-2">
                        <Label htmlFor={`preco-${item.id}`}>Sugerir novo preço unitário</Label>
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
                          className="max-w-xs mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <Separator className="mt-4" />
              </div>
            ))}

            <div className="flex justify-between items-center text-lg font-bold pt-2">
              <span>Valor Total:</span>
              <span>
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(orcamento.valor_total || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        {!isAprovado && !isRejeitado && (
          <Card>
            <CardContent className="p-6">
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="observacoes">Observações sobre sua proposta</Label>
                    <Textarea
                      id="observacoes"
                      placeholder="Explique porque você está sugerindo estes preços..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleSugerirPrecos} className="flex-1">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Enviar Proposta
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={handleConfirmar} className="flex-1" variant="default">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar Orçamento
                  </Button>
                  <Button onClick={handleRejeitar} className="flex-1" variant="destructive">
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isAprovado && (
          <Card className="border-primary">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-primary" />
              <h3 className="text-lg font-semibold">Orçamento Confirmado!</h3>
              <p className="text-muted-foreground mt-1">
                Obrigado pela confirmação. Em breve entraremos em contato.
              </p>
            </CardContent>
          </Card>
        )}

        {isRejeitado && (
          <Card className="border-destructive">
            <CardContent className="p-6 text-center">
              <XCircle className="w-12 h-12 mx-auto mb-2 text-destructive" />
              <h3 className="text-lg font-semibold">Orçamento Rejeitado</h3>
              <p className="text-muted-foreground mt-1">
                Obrigado pelo feedback. Ficamos à disposição para futuras cotações.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
