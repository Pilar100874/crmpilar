import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Aviso {
  id: string;
  estabelecimento_id: string | null;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'alerta' | 'urgente' | 'sucesso' | 'erro';
  destinatarios_tipo: 'todos' | 'usuarios_especificos' | 'roles';
  destinatarios_ids: string[] | null;
  destinatarios_roles: string[] | null;
  criado_por: string | null;
  expira_em: string | null;
  ativo: boolean;
  created_at: string;
  lido?: boolean;
  resolvido?: boolean;
  resolvido_por?: string | null;
  resolvido_em?: string | null;
}

export function useAvisosSistema() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [avisosNaoLidos, setAvisosNaoLidos] = useState<number>(0);
  const [avisosPendentes, setAvisosPendentes] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [usuarioAtualId, setUsuarioAtualId] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    setUsuarioAtualId(userId);
  }, []);

  const carregarAvisos = useCallback(async () => {
    if (!usuarioAtualId) return;
    
    setLoading(true);
    try {
      // Buscar avisos ativos
      const { data: avisosData, error } = await supabase
        .from('avisos_sistema')
        .select('*')
        .eq('ativo', true)
        .or(`expira_em.is.null,expira_em.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar avisos lidos pelo usuário
      const { data: lidosData } = await supabase
        .from('avisos_lidos')
        .select('aviso_id')
        .eq('usuario_id', usuarioAtualId);

      const lidosIds = new Set((lidosData || []).map(l => l.aviso_id));

      const avisosComStatus = (avisosData || []).map((aviso: any) => ({
        ...aviso,
        lido: lidosIds.has(aviso.id),
        resolvido: aviso.resolvido ?? false,
      })) as Aviso[];

      setAvisos(avisosComStatus);
      setAvisosNaoLidos(avisosComStatus.filter(a => !a.lido && !a.resolvido).length);
      setAvisosPendentes(avisosComStatus.filter(a => !a.resolvido).length);
    } catch (error) {
      console.error('Erro ao carregar avisos:', error);
    } finally {
      setLoading(false);
    }
  }, [usuarioAtualId]);

  const marcarComoLido = async (avisoId: string) => {
    if (!usuarioAtualId) return;

    try {
      const { error } = await supabase
        .from('avisos_lidos')
        .insert({
          aviso_id: avisoId,
          usuario_id: usuarioAtualId,
        });

      if (error && !error.message.includes('duplicate')) throw error;

      setAvisos(prev => prev.map(a => 
        a.id === avisoId ? { ...a, lido: true } : a
      ));
      setAvisosNaoLidos(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar aviso como lido:', error);
    }
  };

  const marcarResolvido = async (avisoId: string, resolvido: boolean) => {
    if (!usuarioAtualId) return;

    try {
      const { error } = await supabase
        .from('avisos_sistema')
        .update({
          resolvido,
          resolvido_por: resolvido ? usuarioAtualId : null,
          resolvido_em: resolvido ? new Date().toISOString() : null,
        })
        .eq('id', avisoId);

      if (error) throw error;

      setAvisos(prev => prev.map(a => 
        a.id === avisoId ? { ...a, resolvido, resolvido_por: resolvido ? usuarioAtualId : null } : a
      ));
      setAvisosPendentes(prev => resolvido ? prev - 1 : prev + 1);
      toast.success(resolvido ? 'Aviso resolvido' : 'Aviso reaberto');
    } catch (error) {
      console.error('Erro ao marcar aviso como resolvido:', error);
      toast.error('Erro ao atualizar aviso');
    }
  };

  const marcarTodosComoLidos = async () => {
    if (!usuarioAtualId) return;

    try {
      const avisosNaoLidosIds = avisos.filter(a => !a.lido).map(a => a.id);
      
      if (avisosNaoLidosIds.length === 0) return;

      const inserts = avisosNaoLidosIds.map(avisoId => ({
        aviso_id: avisoId,
        usuario_id: usuarioAtualId,
      }));

      await supabase.from('avisos_lidos').insert(inserts);

      setAvisos(prev => prev.map(a => ({ ...a, lido: true })));
      setAvisosNaoLidos(0);
      toast.success('Todos os avisos marcados como lidos');
    } catch (error) {
      console.error('Erro ao marcar avisos como lidos:', error);
    }
  };

  const criarAviso = async (aviso: Omit<Aviso, 'id' | 'created_at' | 'lido' | 'resolvido'>) => {
    try {
      const { data, error } = await supabase
        .from('avisos_sistema')
        .insert({ ...aviso, resolvido: false })
        .select()
        .single();

      if (error) throw error;

      toast.success('Aviso criado com sucesso');
      return data;
    } catch (error) {
      console.error('Erro ao criar aviso:', error);
      toast.error('Erro ao criar aviso');
      return null;
    }
  };

  // Realtime subscription for avisos_sistema and avisos_lidos
  useEffect(() => {
    const channel = supabase
      .channel('avisos-sistema-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'avisos_sistema',
        },
        () => {
          carregarAvisos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'avisos_lidos',
        },
        () => {
          carregarAvisos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregarAvisos]);

  useEffect(() => {
    carregarAvisos();
  }, [carregarAvisos]);

  return {
    avisos,
    avisosNaoLidos,
    avisosPendentes,
    loading,
    carregarAvisos,
    marcarComoLido,
    marcarResolvido,
    marcarTodosComoLidos,
    criarAviso,
  };
}
