import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Conversa {
  id: string;
  titulo: string | null;
  tipo: 'direto' | 'grupo';
  created_at: string;
  updated_at: string;
  participantes?: Participante[];
  ultima_mensagem?: Mensagem;
  nao_lidas?: number;
}

interface Participante {
  id: string;
  conversa_id: string;
  usuario_id: string;
  ultima_leitura: string | null;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
}

interface Mensagem {
  id: string;
  conversa_id: string;
  remetente_id: string | null;
  conteudo: string;
  tipo: 'texto' | 'arquivo' | 'sistema';
  metadata: any;
  created_at: string;
  remetente?: {
    id: string;
    nome: string;
  };
}

export function useChatInterno() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtual, setConversaAtual] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [usuarioAtualId, setUsuarioAtualId] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    setUsuarioAtualId(userId);
  }, []);

  const carregarConversas = useCallback(async () => {
    if (!usuarioAtualId) return;
    
    setLoading(true);
    try {
      const { data: participacoes, error } = await supabase
        .from('chat_interno_participantes')
        .select(`
          conversa_id,
          ultima_leitura,
          chat_interno_conversas!inner (
            id,
            titulo,
            tipo,
            created_at,
            updated_at
          )
        `)
        .eq('usuario_id', usuarioAtualId);

      if (error) throw error;

      const conversasFormatadas: Conversa[] = (participacoes || []).map((p: any) => ({
        id: p.chat_interno_conversas.id,
        titulo: p.chat_interno_conversas.titulo,
        tipo: p.chat_interno_conversas.tipo,
        created_at: p.chat_interno_conversas.created_at,
        updated_at: p.chat_interno_conversas.updated_at,
      }));

      setConversas(conversasFormatadas);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  }, [usuarioAtualId]);

  const carregarMensagens = useCallback(async (conversaId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_interno_mensagens')
        .select(`
          *,
          remetente:usuarios!chat_interno_mensagens_remetente_id_fkey (
            id,
            nome
          )
        `)
        .eq('conversa_id', conversaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMensagens((data || []) as Mensagem[]);

      // Atualizar última leitura
      if (usuarioAtualId) {
        await supabase
          .from('chat_interno_participantes')
          .update({ ultima_leitura: new Date().toISOString() })
          .eq('conversa_id', conversaId)
          .eq('usuario_id', usuarioAtualId);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  }, [usuarioAtualId]);

  const criarConversa = async (participantesIds: string[], titulo?: string) => {
    const estabelecimentoId = localStorage.getItem('estabelecimentoId');
    if (!estabelecimentoId || !usuarioAtualId) {
      toast.error('Erro ao criar conversa');
      return null;
    }

    try {
      const tipo = participantesIds.length > 1 ? 'grupo' : 'direto';
      
      const { data: conversa, error: conversaError } = await supabase
        .from('chat_interno_conversas')
        .insert({
          estabelecimento_id: estabelecimentoId,
          titulo: titulo || null,
          tipo,
        })
        .select()
        .single();

      if (conversaError) throw conversaError;

      // Adicionar participantes
      const participantes = [...participantesIds, usuarioAtualId].map(id => ({
        conversa_id: conversa.id,
        usuario_id: id,
      }));

      const { error: partError } = await supabase
        .from('chat_interno_participantes')
        .insert(participantes);

      if (partError) throw partError;

      toast.success('Conversa criada');
      await carregarConversas();
      return conversa;
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      toast.error('Erro ao criar conversa');
      return null;
    }
  };

  const enviarMensagem = async (conversaId: string, conteudo: string, tipo: 'texto' | 'arquivo' = 'texto') => {
    if (!usuarioAtualId) return;

    try {
      const { error } = await supabase
        .from('chat_interno_mensagens')
        .insert({
          conversa_id: conversaId,
          remetente_id: usuarioAtualId,
          conteudo,
          tipo,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  // Realtime subscription
  useEffect(() => {
    if (!conversaAtual) return;

    const channel = supabase
      .channel(`chat-interno-${conversaAtual.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_interno_mensagens',
          filter: `conversa_id=eq.${conversaAtual.id}`,
        },
        async (payload) => {
          const novaMensagem = payload.new as Mensagem;
          
          // Buscar dados do remetente
          if (novaMensagem.remetente_id) {
            const { data: remetente } = await supabase
              .from('usuarios')
              .select('id, nome')
              .eq('id', novaMensagem.remetente_id)
              .single();
            
            novaMensagem.remetente = remetente || undefined;
          }
          
          setMensagens(prev => [...prev, novaMensagem]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaAtual]);

  useEffect(() => {
    carregarConversas();
  }, [carregarConversas]);

  return {
    conversas,
    conversaAtual,
    setConversaAtual,
    mensagens,
    loading,
    usuarioAtualId,
    carregarConversas,
    carregarMensagens,
    criarConversa,
    enviarMensagem,
  };
}
