import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardAtendente, DashboardSupervisor, Chat, Atendente } from "@/types/atendimento";

export const useAtendimento = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hook para Dashboard do Atendente
  const useDashboardAtendente = (atendenteId: string) => {
    const [dashboard, setDashboard] = useState<DashboardAtendente | null>(null);

    useEffect(() => {
      const loadDashboard = async () => {
        try {
          setLoading(true);
          
          // Buscar dados do atendente
          const { data: atendenteData, error: atendenteError } = await supabase
            .from("atendentes")
            .select("*")
            .eq("id", atendenteId)
            .single();

          if (atendenteError) throw atendenteError;

          // Buscar chats ativos
          const { data: chatsAtivos, error: chatsAtivosError } = await supabase
            .from("conversations")
            .select("*")
            .eq("atendente_atual_id", atendenteId)
            .in("chat_status", ["em_atendimento", "aguardando_cliente"]);

          if (chatsAtivosError) throw chatsAtivosError;

          // Buscar chats em espera da fila do atendente
          const { data: chatsEspera, error: chatsEsperaError } = await supabase
            .from("conversations")
            .select("*")
            .eq("chat_status", "em_fila")
            .limit(10);

          if (chatsEsperaError) throw chatsEsperaError;

          // Buscar métricas de hoje
          const hoje = new Date().toISOString().split('T')[0];
          const { data: metricasData, error: metricasError } = await supabase
            .from("metricas_atendente")
            .select("*")
            .eq("atendente_id", atendenteId)
            .eq("data", hoje)
            .maybeSingle();

          if (metricasError) throw metricasError;

          // Buscar skills
          const { data: skillsData, error: skillsError } = await supabase
            .from("atendente_skills")
            .select("*, skill:skills(*)")
            .eq("atendente_id", atendenteId);

          if (skillsError) throw skillsError;

          setDashboard({
            atendente: atendenteData as Atendente,
            chats_ativos: (chatsAtivos || []) as Chat[],
            chats_em_espera: (chatsEspera || []) as Chat[],
            metricas_hoje: metricasData || null,
            skills: skillsData || []
          });

        } catch (err) {
          console.error("Erro ao carregar dashboard do atendente:", err);
          setError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
          setLoading(false);
        }
      };

      loadDashboard();

      // Realtime para chats
      const channel = supabase
        .channel('atendente-dashboard')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'conversations' },
          () => loadDashboard()
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }, [atendenteId]);

    return { dashboard, loading, error };
  };

  // Hook para Dashboard do Supervisor
  const useDashboardSupervisor = (estabelecimentoId: string) => {
    const [dashboard, setDashboard] = useState<DashboardSupervisor | null>(null);

    useEffect(() => {
      const loadDashboard = async () => {
        try {
          setLoading(true);

          // Buscar filas
          const { data: filasData, error: filasError } = await supabase
            .from("filas_atendimento")
            .select("*")
            .eq("estabelecimento_id", estabelecimentoId);

          if (filasError) throw filasError;

          // Buscar atendentes
          const { data: atendentesData, error: atendentesError } = await supabase
            .from("atendentes")
            .select("*, usuario:usuarios(nome, email)")
            .eq("estabelecimento_id", estabelecimentoId);

          if (atendentesError) throw atendentesError;

          // Buscar métricas gerais
          const { data: chatsAtivos } = await supabase
            .from("conversations")
            .select("id")
            .eq("estabelecimento_id", estabelecimentoId)
            .in("chat_status", ["em_atendimento", "aguardando_cliente"]);

          const { data: chatsEmFila } = await supabase
            .from("conversations")
            .select("id")
            .eq("estabelecimento_id", estabelecimentoId)
            .eq("chat_status", "em_fila");

          // Processar dados para o dashboard
          const filasProcessadas = await Promise.all((filasData || []).map(async (fila) => {
            const { data: chatsNaFila } = await supabase
              .from("conversations")
              .select("id")
              .eq("fila_id", fila.id)
              .eq("chat_status", "em_fila");

            const { data: atendentesNaFila } = await supabase
              .from("atendente_filas")
              .select("atendente_id")
              .eq("fila_id", fila.id);

            const atendentesDisponiveis = (atendentesData || []).filter(a => 
              a.status === 'disponivel' && 
              atendentesNaFila?.some(af => af.atendente_id === a.id)
            );

            return {
              ...fila,
              chats_em_fila: chatsNaFila?.length || 0,
              atendentes_disponiveis: atendentesDisponiveis.length,
              atendentes_total: atendentesNaFila?.length || 0
            };
          }));

          const atendentesProcessados = await Promise.all((atendentesData || []).map(async (atendente) => {
            const { data: chatsDoAtendente } = await supabase
              .from("conversations")
              .select("id")
              .eq("atendente_atual_id", atendente.id)
              .in("chat_status", ["em_atendimento", "aguardando_cliente"]);

            return {
              ...atendente,
              chats_ativos: chatsDoAtendente?.length || 0
            };
          }));

          setDashboard({
            filas: filasProcessadas,
            atendentes: atendentesProcessados,
            metricas_gerais: {
              total_chats_ativos: chatsAtivos?.length || 0,
              total_chats_em_fila: chatsEmFila?.length || 0,
              tempo_medio_espera: 0, // TODO: calcular
              taxa_abandono: 0 // TODO: calcular
            }
          });

        } catch (err) {
          console.error("Erro ao carregar dashboard do supervisor:", err);
          setError(err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
          setLoading(false);
        }
      };

      loadDashboard();

      // Realtime
      const channel = supabase
        .channel('supervisor-dashboard')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'conversations' },
          () => loadDashboard()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'atendentes' },
          () => loadDashboard()
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }, [estabelecimentoId]);

    return { dashboard, loading, error };
  };

  return {
    useDashboardAtendente,
    useDashboardSupervisor,
    loading,
    error
  };
};
