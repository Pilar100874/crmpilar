import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

interface OnlineUser {
  id: string;
  nome: string;
  online_at: string;
}

export function useChatInterno() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtual, setConversaAtual] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [usuarioAtualId, setUsuarioAtualId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [naoLidasPorConversa, setNaoLidasPorConversa] = useState<Record<string, number>>({});

  // Fetch atual usuario id from auth + usuarios table
  useEffect(() => {
    const fetchUsuarioAtualId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuario) {
        setUsuarioAtualId(usuario.id);
        localStorage.setItem('userId', usuario.id);
      }
    };

    fetchUsuarioAtualId();
  }, []);

  // Setup presence tracking
  useEffect(() => {
    if (!usuarioAtualId) return;

    const estabelecimentoId = localStorage.getItem('estabelecimentoId');
    if (!estabelecimentoId) return;

    // Get user name from localStorage or fetch it
    const setupPresence = async () => {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('nome')
        .eq('id', usuarioAtualId)
        .single();

      const userName = userData?.nome || 'Usuário';

      const channel = supabase.channel(`presence-chat-${estabelecimentoId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const users: OnlineUser[] = [];
          
          Object.values(state).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              if (presence.id !== usuarioAtualId) {
                users.push({
                  id: presence.id,
                  nome: presence.nome,
                  online_at: presence.online_at,
                });
              }
            });
          });
          
          setOnlineUsers(users);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              id: usuarioAtualId,
              nome: userName,
              online_at: new Date().toISOString(),
            });
          }
        });

      setPresenceChannel(channel);
    };

    setupPresence();

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [usuarioAtualId]);

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
      
      // Para conversas diretas (1:1), verificar se já existe uma conversa com essa pessoa
      if (tipo === 'direto' && participantesIds.length === 1) {
        const outroUsuarioId = participantesIds[0];
        
        // Buscar TODAS as conversas diretas do estabelecimento
        const { data: todasConversas } = await supabase
          .from('chat_interno_conversas')
          .select('id')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('tipo', 'direto');

        if (todasConversas && todasConversas.length > 0) {
          // Para cada conversa, verificar se tem exatamente os 2 usuários
          for (const conversa of todasConversas) {
            const { data: participantes } = await supabase
              .from('chat_interno_participantes')
              .select('usuario_id')
              .eq('conversa_id', conversa.id);

            if (participantes && participantes.length === 2) {
              const ids = participantes.map(p => p.usuario_id);
              if (ids.includes(outroUsuarioId) && ids.includes(usuarioAtualId)) {
                // Conversa já existe! Buscar dados completos
                const { data: conversaExistente } = await supabase
                  .from('chat_interno_conversas')
                  .select('*')
                  .eq('id', conversa.id)
                  .single();
                
                if (conversaExistente) {
                  // Retorna a conversa existente sem criar nova
                  return {
                    ...conversaExistente,
                    tipo: conversaExistente.tipo as 'direto' | 'grupo'
                  };
                }
              }
            }
          }
        }
      }
      
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

  // Carregar contador inicial de mensagens não lidas
  const carregarNaoLidas = useCallback(async () => {
    if (!usuarioAtualId) return;

    try {
      // Buscar todas as participações do usuário
      const { data: participacoes } = await supabase
        .from('chat_interno_participantes')
        .select('conversa_id, ultima_leitura')
        .eq('usuario_id', usuarioAtualId);

      if (!participacoes || participacoes.length === 0) {
        setTotalNaoLidas(0);
        setNaoLidasPorConversa({});
        return;
      }

      let total = 0;
      const porConversa: Record<string, number> = {};
      
      for (const p of participacoes) {
        const query = supabase
          .from('chat_interno_mensagens')
          .select('id', { count: 'exact', head: true })
          .eq('conversa_id', p.conversa_id)
          .neq('remetente_id', usuarioAtualId);

        if (p.ultima_leitura) {
          query.gt('created_at', p.ultima_leitura);
        }

        const { count } = await query;
        const countValue = count || 0;
        total += countValue;
        
        if (countValue > 0) {
          porConversa[p.conversa_id] = countValue;
        }
      }

      setTotalNaoLidas(total);
      setNaoLidasPorConversa(porConversa);
    } catch (error) {
      console.error('Erro ao carregar mensagens não lidas:', error);
    }
  }, [usuarioAtualId]);

  useEffect(() => {
    carregarConversas();
    carregarNaoLidas();
  }, [carregarConversas, carregarNaoLidas]);

  // Subscription global para detectar novas mensagens em qualquer conversa
  useEffect(() => {
    if (!usuarioAtualId) return;

    const estabelecimentoId = localStorage.getItem('estabelecimentoId');
    if (!estabelecimentoId) return;

    const globalChannel = supabase
      .channel(`chat-interno-global-${usuarioAtualId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_interno_mensagens',
        },
        async (payload) => {
          const novaMensagem = payload.new as Mensagem;
          
          // Verificar se o usuário é participante dessa conversa
          const { data: participante } = await supabase
            .from('chat_interno_participantes')
            .select('id')
            .eq('conversa_id', novaMensagem.conversa_id)
            .eq('usuario_id', usuarioAtualId)
            .single();

          if (participante && novaMensagem.remetente_id !== usuarioAtualId) {
            // Nova mensagem em uma conversa do usuário, de outro remetente
            setTotalNaoLidas(prev => prev + 1);
            setNaoLidasPorConversa(prev => ({
              ...prev,
              [novaMensagem.conversa_id]: (prev[novaMensagem.conversa_id] || 0) + 1
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [usuarioAtualId]);

  // Recalcular contador quando abrir uma conversa (após marcar como lida)
  const handleSetConversaAtual = useCallback((conversa: Conversa | null) => {
    setConversaAtual(conversa);
    if (conversa) {
      // Aguardar um pouco para a marcação de leitura ser processada, depois recalcular
      setTimeout(() => {
        carregarNaoLidas();
      }, 500);
    }
  }, [carregarNaoLidas]);

  return {
    conversas,
    conversaAtual,
    setConversaAtual: handleSetConversaAtual,
    mensagens,
    loading,
    usuarioAtualId,
    onlineUsers,
    totalNaoLidas,
    naoLidasPorConversa,
    carregarConversas,
    carregarMensagens,
    criarConversa,
    enviarMensagem,
  };
}
