import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Scope = "sistema" | "ecommerce";
type EventType =
  | "click"
  | "move"
  | "scroll"
  | "rage_click"
  | "dead_click"
  | "quick_back"
  | "form_field";

interface Buffered {
  scope: Scope;
  session_id: string;
  usuario_id: string | null;
  estabelecimento_id: string;
  route: string;
  event_type: EventType;
  x?: number | null;
  y?: number | null;
  vw?: number | null;
  vh?: number | null;
  scroll_depth?: number | null;
  element_selector?: string | null;
  element_text?: string | null;
  device: string;
  browser: string;
  is_new_visitor: boolean;
  referrer: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const SESSION_KEY_PREFIX = "_hm_session_";
const VISITOR_KEY = "_hm_visitor";

function getSessionId(scope: Scope): string {
  const k = SESSION_KEY_PREFIX + scope;
  let id = sessionStorage.getItem(k);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(k, id);
  }
  return id;
}

function detectDevice(): string {
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

function getSelector(el: Element | null): string {
  if (!el) return "";
  const tag = el.tagName.toLowerCase();
  const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : "";
  const cls = (el as HTMLElement).className
    ? "." + String((el as HTMLElement).className).trim().split(/\s+/).slice(0, 2).join(".")
    : "";
  return `${tag}${id}${cls}`.slice(0, 200);
}

/**
 * Unified interaction tracker — captures click (incl. rage/dead), move (throttled),
 * scroll depth, quick back navigation. Batches inserts every ~5s.
 */
interface HeatmapConfig {
  enabled: boolean;
  track_click: boolean;
  track_move: boolean;
  track_scroll: boolean;
  track_rage_click: boolean;
  track_dead_click: boolean;
  track_quick_back: boolean;
  track_form_field: boolean;
}

const DEFAULT_CFG: HeatmapConfig = {
  enabled: true,
  track_click: true,
  track_move: true,
  track_scroll: true,
  track_rage_click: true,
  track_dead_click: true,
  track_quick_back: true,
  track_form_field: true,
};

export function useInteractionTracker(scope: Scope, estabelecimentoIdHint?: string | null) {
  const location = useLocation();
  const bufferRef = useRef<Buffered[]>([]);
  const ctxRef = useRef<{ usuario_id: string | null; estabelecimento_id: string | null }>({
    usuario_id: null,
    estabelecimento_id: estabelecimentoIdHint ?? null,
  });
  const cfgRef = useRef<HeatmapConfig>(DEFAULT_CFG);
  const enterAtRef = useRef<number>(Date.now());
  const currentRouteRef = useRef<string>(location.pathname);
  const maxScrollRef = useRef<number>(0);
  const lastClickRef = useRef<{ sel: string; t: number; count: number } | null>(null);
  const isNewVisitorRef = useRef<boolean>(false);

  const loadConfig = async (estabId: string) => {
    const { data } = await supabase
      .from("heatmap_config" as any)
      .select("*")
      .eq("estabelecimento_id", estabId)
      .eq("scope", scope)
      .maybeSingle();
    if (data) cfgRef.current = { ...DEFAULT_CFG, ...(data as any) };
  };

  // load context once
  useEffect(() => {
    let mounted = true;
    if (!localStorage.getItem(VISITOR_KEY)) {
      isNewVisitorRef.current = true;
      localStorage.setItem(VISITOR_KEY, "1");
    }
    (async () => {
      if (scope === "sistema") {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user || !mounted) return;
        const { data: u } = await supabase
          .from("usuarios")
          .select("id, estabelecimento_id")
          .eq("auth_user_id", auth.user.id)
          .maybeSingle();
        if (!mounted || !u) return;
        ctxRef.current = { usuario_id: u.id, estabelecimento_id: u.estabelecimento_id };
        await loadConfig(u.estabelecimento_id);
      } else if (estabelecimentoIdHint) {
        ctxRef.current = { usuario_id: null, estabelecimento_id: estabelecimentoIdHint };
        await loadConfig(estabelecimentoIdHint);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [scope, estabelecimentoIdHint]);

  const push = (
    type: EventType,
    extra: Partial<Pick<Buffered, "x" | "y" | "scroll_depth" | "element_selector" | "element_text" | "metadata">> = {}
  ) => {
    const estab = ctxRef.current.estabelecimento_id;
    if (!estab) return;
    const c = cfgRef.current;
    if (!c.enabled) return;
    const allowed: Record<EventType, boolean> = {
      click: c.track_click,
      move: c.track_move,
      scroll: c.track_scroll,
      rage_click: c.track_rage_click,
      dead_click: c.track_dead_click,
      quick_back: c.track_quick_back,
      form_field: c.track_form_field,
    };
    if (!allowed[type]) return;
    bufferRef.current.push({
      scope,
      session_id: getSessionId(scope),
      usuario_id: ctxRef.current.usuario_id,
      estabelecimento_id: estab,
      route: currentRouteRef.current,
      event_type: type,
      x: extra.x ?? null,
      y: extra.y ?? null,
      vw: window.innerWidth,
      vh: window.innerHeight,
      scroll_depth: extra.scroll_depth ?? null,
      element_selector: extra.element_selector ?? null,
      element_text: extra.element_text ?? null,
      device: detectDevice(),
      browser: detectBrowser(),
      is_new_visitor: isNewVisitorRef.current,
      referrer: document.referrer || null,
      metadata: extra.metadata ?? {},
      created_at: new Date().toISOString(),
    });
    if (bufferRef.current.length > 80) flush();
  };

  const flush = async () => {
    if (bufferRef.current.length === 0) return;
    const batch = bufferRef.current.splice(0, bufferRef.current.length);
    try {
      await supabase.from("interaction_events" as any).insert(batch as any);
    } catch {
      // discard on failure to avoid memory growth
    }
  };

  // Listeners
  useEffect(() => {
    // Click + rage detection
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const sel = getSelector(target);
      const text = (target as HTMLElement)?.innerText?.slice(0, 100) || "";
      push("click", {
        x: e.clientX,
        y: e.clientY + window.scrollY,
        element_selector: sel,
        element_text: text,
      });
      // rage
      const now = Date.now();
      if (lastClickRef.current && lastClickRef.current.sel === sel && now - lastClickRef.current.t < 800) {
        lastClickRef.current.count += 1;
        if (lastClickRef.current.count >= 3) {
          push("rage_click", { x: e.clientX, y: e.clientY + window.scrollY, element_selector: sel, element_text: text });
          lastClickRef.current.count = 0;
        }
        lastClickRef.current.t = now;
      } else {
        lastClickRef.current = { sel, t: now, count: 1 };
      }
      // dead click: check if any DOM mutation or navigation within 300ms
      const beforeHref = location.pathname;
      const observer = new MutationObserver(() => {
        observer.disconnect();
        clearTimeout(timer);
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      const timer = window.setTimeout(() => {
        observer.disconnect();
        if (window.location.pathname === beforeHref) {
          push("dead_click", { x: e.clientX, y: e.clientY + window.scrollY, element_selector: sel, element_text: text });
        }
      }, 300);
    };

    // Move (sampled)
    let lastMove = 0;
    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMove < 250) return;
      lastMove = now;
      push("move", { x: e.clientX, y: e.clientY + window.scrollY });
    };

    // Scroll depth
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docH > 0 ? Math.min(100, Math.round(((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100)) : 0;
      if (pct > maxScrollRef.current) maxScrollRef.current = pct;
    };

    // Form field tracking
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        push("form_field", {
          element_selector: getSelector(target),
          metadata: { action: "focus", name: (target as HTMLInputElement).name || (target as HTMLElement).id },
        });
      }
    };

    document.addEventListener("click", onClick, { passive: true, capture: true });
    document.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn, true);

    const flushTimer = setInterval(flush, 5000);

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn, true);
      clearInterval(flushTimer);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route change → scroll event + quick back detection
  useEffect(() => {
    if (currentRouteRef.current !== location.pathname) {
      const elapsed = Date.now() - enterAtRef.current;
      // emit scroll depth max for previous route
      if (maxScrollRef.current > 0) {
        push("scroll", { scroll_depth: maxScrollRef.current });
      }
      // quick back: leave within 3s
      if (elapsed < 3000) {
        push("quick_back", { metadata: { from: currentRouteRef.current, to: location.pathname, ms: elapsed } });
      }
      currentRouteRef.current = location.pathname;
      enterAtRef.current = Date.now();
      maxScrollRef.current = 0;
    }
  }, [location.pathname]);

  // On unload
  useEffect(() => {
    const onUnload = () => {
      if (maxScrollRef.current > 0) push("scroll", { scroll_depth: maxScrollRef.current });
      // best effort flush
      flush();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
