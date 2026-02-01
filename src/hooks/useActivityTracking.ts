import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

const ACTIVITY_UPDATE_INTERVAL = 30000; // 30 segundos
const INACTIVITY_TIMEOUT = 60000; // 1 minuto sem atividade = offline

const routeTitles: Record<string, string> = {
  '/': 'Login',
  '/dashboard': 'Dashboard',
  '/dashboard-atendente': 'Dashboard Atendente',
  '/dashboard-supervisor': 'Dashboard Supervisor',
  '/sla-dashboard': 'Dashboard SLA',
  '/advanced-analytics': 'Analytics Avançado',
  '/dashboard-pesquisas-satisfacao': 'Pesquisas de Satisfação',
  '/dashboard-gastos-ia': 'Gastos com IA',
  '/funil': 'Funil',
  '/atendimento': 'Painel de Chats',
  '/monitor-filas': 'Monitor de Filas',
  '/monitor-funcionarios': 'Monitor de Funcionários',
  '/test-roteamento': 'Teste de Roteamento',
  '/atendimento-config': 'Config. Atendimento',
  '/calendario': 'Calendário',
  '/orcamentos': 'Orçamentos',
  '/vendas-config': 'Config. Vendas',
  '/listas': 'Listas',
  '/email': 'E-mail',
  '/marketing': 'Marketing',
  '/relatorios': 'Relatórios',
  '/logistica': 'Logística',
  '/marketplaces': 'Marketplaces',
  '/ads': 'Ads',
  '/robo-precos': 'Robô de Preços',
  '/config': 'Configurações',
  '/contatos': 'Contatos',
  '/empresas': 'Empresas',
  '/perfil': 'Perfil',
  '/chat-interno': 'Chat Interno',
  '/base-conhecimento': 'Base de Conhecimento',
  '/campanhas': 'Campanhas',
  '/softphone': 'Softphone',
  '/video-call': 'Video Chamada',
};

export function useActivityTracking() {
  const location = useLocation();
  const lastActivityRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  const totalActiveTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const usuarioIdRef = useRef<string | null>(null);
  const estabelecimentoIdRef = useRef<string | null>(null);

  // Atualizar atividade no banco
  const updateActivity = async (isOnline: boolean = true) => {
    if (!usuarioIdRef.current || !estabelecimentoIdRef.current) return;

    const pageTitle = routeTitles[location.pathname] || location.pathname;
    const now = Date.now();
    const sessionDuration = Math.floor((now - sessionStartRef.current) / 1000);

    try {
      await supabase
        .from('user_activity_tracking')
        .upsert({
          usuario_id: usuarioIdRef.current,
          estabelecimento_id: estabelecimentoIdRef.current,
          current_route: location.pathname,
          current_page_title: pageTitle,
          last_activity_at: new Date().toISOString(),
          total_active_time_seconds: sessionDuration,
          is_online: isOnline,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'usuario_id,estabelecimento_id'
        });
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
    }
  };

  // Inicializar tracking
  useEffect(() => {
    const init = async () => {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;
      
      estabelecimentoIdRef.current = estabId;

      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (usuario) {
        usuarioIdRef.current = usuario.id;
        sessionStartRef.current = Date.now();
        await updateActivity(true);
      }
    };

    init();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Marcar como offline ao sair
      updateActivity(false);
    };
  }, []);

  // Atualizar quando a rota muda
  useEffect(() => {
    if (usuarioIdRef.current) {
      updateActivity(true);
    }
  }, [location.pathname]);

  // Atualização periódica e detecção de atividade
  useEffect(() => {
    // Eventos de atividade do usuário
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Atualização periódica
    intervalRef.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const isActive = timeSinceLastActivity < INACTIVITY_TIMEOUT;
      updateActivity(isActive);
    }, ACTIVITY_UPDATE_INTERVAL);

    // Listeners de atividade
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [location.pathname]);

  // Detectar fechamento da aba/navegador
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Usar sendBeacon para garantir que a requisição seja enviada
      const payload = JSON.stringify({
        usuario_id: usuarioIdRef.current,
        estabelecimento_id: estabelecimentoIdRef.current,
        is_online: false,
        last_activity_at: new Date().toISOString(),
      });
      
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_activity_tracking?on_conflict=usuario_id,estabelecimento_id`,
        new Blob([payload], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
