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
            .select(`
              id,
              nivel,
              skill_id,
              atendente_id,
              created_at,
              skills (
                id,
                nome,
                descricao,
                cor
              )
            `)
            .eq("atendente_id", atendenteId);

          if (skillsError) {
            console.error("Erro ao buscar skills do atendente:", skillsError);
            throw skillsError;
          }
          
          console.log("Skills carregadas:", skillsData);
          
          // Mapear para o formato esperado
          const skillsMapeadas = skillsData?.map((item: any) => ({
            ...item,
            skill: item.skills
          })) || [];

          setDashboard({
            atendente: atendenteData as Atendente,
            chats_ativos: (chatsAtivos || []) as Chat[],
            chats_em_espera: (chatsEspera || []) as Chat[],
            metricas_hoje: metricasData || null,
            skills: skillsMapeadas
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
      if (!estabelecimentoId) {
        console.log('[Dashboard Supervisor] Aguardando estabelecimentoId...');
        return;
      }

      const loadDashboard = async () => {
        try {
          setLoading(true);
          console.log('[Dashboard Supervisor] Carregando dados para estabelecimento:', estabelecimentoId);

          // Buscar filas
          const { data: filasData, error: filasError } = await supabase
            .from("filas_atendimento")
            .select("*")
            .eq("estabelecimento_id", estabelecimentoId);

          if (filasError) {
            console.error('[Dashboard Supervisor] Erro ao buscar filas:', filasError);
            throw filasError;
          }
          console.log('[Dashboard Supervisor] Filas encontradas:', filasData?.length || 0);

          // Buscar atendentes
          const { data: atendentesData, error: atendentesError } = await supabase
            .from("atendentes")
            .select("*, usuario:usuarios(nome, email)")
            .eq("estabelecimento_id", estabelecimentoId);

          if (atendentesError) {
            console.error('[Dashboard Supervisor] Erro ao buscar atendentes:', atendentesError);
            throw atendentesError;
          }
          console.log('[Dashboard Supervisor] Atendentes encontrados:', atendentesData?.length || 0);

          // Buscar métricas gerais - chats ativos
          const { data: chatsAtivos } = await supabase
            .from("conversations")
            .select("id, tempo_atendimento_inicio")
            .eq("estabelecimento_id", estabelecimentoId)
            .in("chat_status", ["em_atendimento", "aguardando_cliente"]);

          console.log('[Dashboard Supervisor] Chats ativos:', chatsAtivos?.length || 0);

          // Buscar chats em fila com tempo de espera
          const { data: chatsEmFila } = await supabase
            .from("conversations")
            .select("id, tempo_espera_inicio")
            .eq("estabelecimento_id", estabelecimentoId)
            .eq("chat_status", "em_fila");

          console.log('[Dashboard Supervisor] Chats em fila:', chatsEmFila?.length || 0);

          // Calcular tempo médio de espera
          let tempoMedioEspera = 0;
          if (chatsEmFila && chatsEmFila.length > 0) {
            const agora = new Date();
            const temposEspera = chatsEmFila
              .filter(chat => chat.tempo_espera_inicio)
              .map(chat => {
                const inicio = new Date(chat.tempo_espera_inicio!);
                return (agora.getTime() - inicio.getTime()) / 1000 / 60; // minutos
              });
            
            if (temposEspera.length > 0) {
              tempoMedioEspera = temposEspera.reduce((a, b) => a + b, 0) / temposEspera.length;
            }
          }

          // Calcular taxa de abandono (últimas 24 horas)
          const umDiaAtras = new Date();
          umDiaAtras.setHours(umDiaAtras.getHours() - 24);

          const { data: chatsRecentes } = await supabase
            .from("conversations")
            .select("id, chat_status, motivo_encerramento")
            .eq("estabelecimento_id", estabelecimentoId)
            .gte("created_at", umDiaAtras.toISOString());

          let taxaAbandono = 0;
          if (chatsRecentes && chatsRecentes.length > 0) {
            const chatsAbandonados = chatsRecentes.filter(
              chat => chat.chat_status === "encerrado" && 
                     (chat.motivo_encerramento?.toLowerCase().includes('abandono') ||
                      chat.motivo_encerramento?.toLowerCase().includes('timeout'))
            ).length;
            taxaAbandono = (chatsAbandonados / chatsRecentes.length) * 100;
          }

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

          const dashboardData = {
            filas: filasProcessadas,
            atendentes: atendentesProcessados,
            metricas_gerais: {
              total_chats_ativos: chatsAtivos?.length || 0,
              total_chats_em_fila: chatsEmFila?.length || 0,
              tempo_medio_espera: Math.round(tempoMedioEspera),
              taxa_abandono: Math.round(taxaAbandono * 10) / 10 // 1 casa decimal
            }
          };

          console.log('[Dashboard Supervisor] Dashboard montado:', {
            filas: dashboardData.filas.length,
            atendentes: dashboardData.atendentes.length,
            metricas: dashboardData.metricas_gerais
          });

          setDashboard(dashboardData);

        } catch (err) {
          console.error("[Dashboard Supervisor] Erro ao carregar dashboard:", err);
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
