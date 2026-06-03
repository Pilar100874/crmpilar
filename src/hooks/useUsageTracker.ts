import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Rastreia tempo gasto em cada rota e tempo ocioso (sem interação)
 * para alimentar o Mapa de Calor do Sistema.
 */
export function useUsageTracker() {
  const location = useLocation();
  const enterAtRef = useRef<number>(Date.now());
  const lastInteractionRef = useRef<number>(Date.now());
  const idleAccumRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());
  const currentRouteRef = useRef<string>(location.pathname);
  const ctxRef = useRef<{ usuario_id: string; estabelecimento_id: string } | null>(null);

  // Carrega contexto do usuário uma vez
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: u } = await supabase
        .from("usuarios")
        .select("id, estabelecimento_id")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      if (!mounted || !u) return;
      ctxRef.current = { usuario_id: u.id, estabelecimento_id: u.estabelecimento_id };
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Listeners de interação
  useEffect(() => {
    const onActivity = () => {
      lastInteractionRef.current = Date.now();
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    // Tick para acumular ocioso
    const tick = setInterval(() => {
      const now = Date.now();
      const sinceLast = now - lastTickRef.current;
      const sinceInteraction = now - lastInteractionRef.current;
      if (sinceInteraction > 30_000) {
        // considera ocioso quando >30s sem interação
        idleAccumRef.current += sinceLast;
      }
      lastTickRef.current = now;
    }, 5000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(tick);
    };
  }, []);

  // Persiste evento ao mudar de rota / desmontar / fechar aba
  useEffect(() => {
    const flush = async (routeToFlush: string) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const now = Date.now();
      const duration = now - enterAtRef.current;
      if (duration < 1500) return; // ignora flicker
      const idle = Math.min(idleAccumRef.current, duration);
      try {
        await supabase.from("usage_events" as any).insert({
          estabelecimento_id: ctx.estabelecimento_id,
          usuario_id: ctx.usuario_id,
          route: routeToFlush,
          page_title: document.title,
          duration_ms: duration,
          idle_ms: idle,
          started_at: new Date(enterAtRef.current).toISOString(),
          ended_at: new Date(now).toISOString(),
        });
      } catch (e) {
        // silencioso
      }
    };

    // Quando a rota muda, fecha a anterior
    if (currentRouteRef.current !== location.pathname) {
      flush(currentRouteRef.current);
      currentRouteRef.current = location.pathname;
      enterAtRef.current = Date.now();
      idleAccumRef.current = 0;
      lastInteractionRef.current = Date.now();
      lastTickRef.current = Date.now();
    }

    const onBeforeUnload = () => {
      // best-effort
      const ctx = ctxRef.current;
      if (!ctx) return;
      const now = Date.now();
      const duration = now - enterAtRef.current;
      if (duration < 1500) return;
      try {
        const body = JSON.stringify({
          estabelecimento_id: ctx.estabelecimento_id,
          usuario_id: ctx.usuario_id,
          route: currentRouteRef.current,
          page_title: document.title,
          duration_ms: duration,
          idle_ms: Math.min(idleAccumRef.current, duration),
          started_at: new Date(enterAtRef.current).toISOString(),
          ended_at: new Date(now).toISOString(),
        });
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/usage_events`;
        const blob = new Blob([body], { type: "application/json" });
        // sendBeacon não envia headers de auth → fallback: fire-and-forget fetch
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Prefer: "return=minimal",
          },
          body,
          keepalive: true,
        }).catch(() => {});
        void blob;
      } catch {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [location.pathname]);
}
