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
    <div className="min-h-screen bg-slate-900 flex">
      {/* Lado Esquerdo - Itens */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Orçamento #{orcamento.id.slice(0, 8)}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {format(new Date(orcamento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
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
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-3">
            {orcamento.itens?.map((item: any) => (
              <div key={item.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-700 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.produto?.foto_url ? (
                      <img 
                        src={item.produto.foto_url} 
                        alt={item.produto.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-400 text-xl">{item.produto?.nome?.[0]}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-base">{item.produto?.nome}</h4>
                    <div className="flex gap-4 mt-1 text-sm text-slate-400">
                      <span>Qtd: {item.quantidade}</span>
                      <span>
                        Unit: {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(item.preco_unitario)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(item.subtotal)}
                    </div>
                  </div>
                </div>

                {editMode && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <Label htmlFor={`preco-${item.id}`} className="text-slate-300 text-sm">
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
                      className="mt-2 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado Direito - Informações e Ações */}
      <div className="w-[420px] bg-slate-800 border-l border-slate-700 flex flex-col">
        {/* Informações do Cliente e Vendedor */}
        <div className="p-6 border-b border-slate-700 space-y-4">
          <div>
            <Label className="text-slate-400 text-sm">Cliente</Label>
            <p className="font-semibold text-white text-base mt-1">{orcamento.cliente?.nome}</p>
          </div>
          <div>
            <Label className="text-slate-400 text-sm">Vendedor</Label>
            <p className="font-semibold text-white text-base mt-1">{orcamento.vendedor?.nome}</p>
          </div>
          {orcamento.observacoes && (
            <div>
              <Label className="text-slate-400 text-sm">Observações</Label>
              <p className="text-sm text-slate-300 mt-1">{orcamento.observacoes}</p>
            </div>
          )}
        </div>

        {/* Área de Edição (quando ativo) */}
        {editMode && (
          <div className="p-6 border-b border-slate-700">
            <Label htmlFor="observacoes" className="text-slate-300">
              Observações sobre sua proposta
            </Label>
            <Textarea
              id="observacoes"
              placeholder="Explique porque você está sugerindo estes preços..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        )}

        {/* Resumo e Total */}
        <div className="flex-1"></div>
        
        <div className="p-6 border-t border-slate-700 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-sm">Itens:</span>
              <span className="text-sm">{orcamento.itens?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Valor Total:</span>
              <span className="font-bold text-white text-2xl">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(orcamento.valor_total || 0)}
              </span>
            </div>
          </div>

          {/* Botões de Ação */}
          {!isAprovado && !isRejeitado && (
            <div className="space-y-3">
              {editMode ? (
                <>
                  <Button 
                    onClick={handleSugerirPrecos} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
                  >
                    <DollarSign className="w-5 h-5 mr-2" />
                    Enviar Proposta
                  </Button>
                  <Button 
                    onClick={() => setEditMode(false)}
                    variant="outline"
                    className="w-full bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-12"
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleConfirmar}
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Confirmar Orçamento
                  </Button>
                  <Button 
                    onClick={() => setEditMode(true)}
                    variant="outline"
                    className="w-full bg-slate-700 border-slate-600 text-white hover:bg-slate-600 h-12"
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
                </>
              )}
            </div>
          )}

          {/* Status de Aprovado */}
          {isAprovado && (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Orçamento Confirmado!</h3>
              <p className="text-slate-400 text-sm mt-1">
                Obrigado pela confirmação. Em breve entraremos em contato.
              </p>
            </div>
          )}

          {/* Status de Rejeitado */}
          {isRejeitado && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-center">
              <XCircle className="w-12 h-12 mx-auto mb-2 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Orçamento Rejeitado</h3>
              <p className="text-slate-400 text-sm mt-1">
                Obrigado pelo feedback. Ficamos à disposição para futuras cotações.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
