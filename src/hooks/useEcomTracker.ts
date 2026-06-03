import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "ecom_session_id";
const ESTAB_KEY = "ecom_estab_id_cached";

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Rastreia uso público da loja (pageview/duração/produto) e atualiza
 * snapshot de carrinho ativo para detecção de abandono.
 */
export function useEcomTracker(estabelecimentoId?: string | null) {
  const location = useLocation();
  const enterAtRef = useRef<number>(Date.now());
  const currentRouteRef = useRef<string>(location.pathname);
  const estabRef = useRef<string | null>(estabelecimentoId ?? null);

  useEffect(() => {
    if (estabelecimentoId) {
      estabRef.current = estabelecimentoId;
      localStorage.setItem(ESTAB_KEY, estabelecimentoId);
    } else {
      estabRef.current = localStorage.getItem(ESTAB_KEY);
    }
  }, [estabelecimentoId]);

  useEffect(() => {
    const flush = async (route: string, duration: number) => {
      const estab = estabRef.current;
      if (!estab) return;
      const productMatch = route.match(/\/ecommerce\/produto\/([^/?#]+)/);
      const productId = productMatch ? productMatch[1] : null;
      try {
        await supabase.from("ecom_usage_events" as any).insert({
          estabelecimento_id: estab,
          session_id: getSessionId(),
          customer_id: null,
          route,
          page_title: document.title,
          product_id: productId,
          event_type: "pageview",
          duration_ms: duration,
        });
      } catch {}
    };

    if (currentRouteRef.current !== location.pathname) {
      const now = Date.now();
      const dur = now - enterAtRef.current;
      if (dur > 1000) flush(currentRouteRef.current, dur);
      currentRouteRef.current = location.pathname;
      enterAtRef.current = now;
    }

    const onUnload = () => {
      const now = Date.now();
      const dur = now - enterAtRef.current;
      if (dur > 1000) flush(currentRouteRef.current, dur);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [location.pathname]);
}

/** Salva/atualiza snapshot do carrinho para detecção de abandono. */
export async function upsertActiveCart(params: {
  estabelecimento_id: string;
  items: Array<{ id: string; nome: string; qtd: number; preco: number }>;
  total: number;
  customer_id?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
}) {
  if (!params.estabelecimento_id) return;
  const session_id = getSessionId();
  const item_count = params.items.reduce((s, i) => s + (i.qtd || 0), 0);
  try {
    // Upsert por session_id (constraint UNIQUE)
    await supabase.from("ecom_active_carts" as any).upsert(
      {
        estabelecimento_id: params.estabelecimento_id,
        session_id,
        customer_id: params.customer_id ?? null,
        customer_email: params.customer_email ?? null,
        customer_phone: params.customer_phone ?? null,
        items: params.items as any,
        total: params.total,
        item_count,
        status: item_count > 0 ? "active" : "active",
        last_activity_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );
  } catch {}
}

/** Marca o carrinho como convertido (pedido criado). */
export async function markCartConverted() {
  const session_id = localStorage.getItem(SESSION_KEY);
  if (!session_id) return;
  try {
    await supabase
      .from("ecom_active_carts" as any)
      .update({ status: "converted", last_activity_at: new Date().toISOString() })
      .eq("session_id", session_id);
  } catch {}
}
