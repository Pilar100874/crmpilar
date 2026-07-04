import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Monitor, Smartphone } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Health = { at: string | null; ago: number | null };

function classify(ago: number | null): "online" | "warn" | "offline" {
  if (ago == null) return "offline";
  if (ago < 3 * 60_000) return "online";
  if (ago < 15 * 60_000) return "warn";
  return "offline";
}

function dotClass(state: "online" | "warn" | "offline") {
  if (state === "online") return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]";
  if (state === "warn") return "bg-amber-400";
  return "bg-muted-foreground/40";
}

function label(state: "online" | "warn" | "offline", at: string | null) {
  const when = at ? new Date(at).toLocaleString("pt-BR") : "nunca";
  if (state === "online") return `Online · último ping ${when}`;
  if (state === "warn") return `Instável · último ping ${when}`;
  return at ? `Offline · último ping ${when}` : "Offline · nunca comunicou";
}

async function fetchHealth(): Promise<{ win: Health; and: Health }> {
  const [{ data: eq }, { data: dv }] = await Promise.all([
    supabase
      .from("ponto_equipamentos")
      .select("ultima_sync")
      .eq("ativo", true)
      .not("ultima_sync", "is", null)
      .order("ultima_sync", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sms_devices")
      .select("ultimo_heartbeat, ultimo_ping")
      .eq("ativo", true)
      .order("ultimo_heartbeat", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const winAt = (eq as any)?.ultima_sync ?? null;
  const andAt = (dv as any)?.ultimo_heartbeat ?? (dv as any)?.ultimo_ping ?? null;
  const now = Date.now();
  return {
    win: { at: winAt, ago: winAt ? now - new Date(winAt).getTime() : null },
    and: { at: andAt, ago: andAt ? now - new Date(andAt).getTime() : null },
  };
}

export function AppsHealthIndicator({ compact = false }: { compact?: boolean }) {
  const [win, setWin] = useState<Health>({ at: null, ago: null });
  const [and, setAnd] = useState<Health>({ at: null, ago: null });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { win: w, and: a } = await fetchHealth();
        if (!alive) return;
        setWin(w);
        setAnd(a);
      } catch { /* silencioso */ }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const winState = classify(win.ago);
  const andState = classify(and.ago);

  return (
    <TooltipProvider delayDuration={200}>
      <NavLink
        to="/admin/apps"
        className={`group flex items-center rounded-md px-2 py-1.5 hover:bg-sidebar-accent/40 transition-colors ${
          compact ? "justify-center gap-1.5" : "justify-between gap-2"
        }`}
        title="Status dos aplicativos"
      >
        {!compact && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Apps
          </span>
        )}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="relative inline-flex items-center gap-1">
                <Monitor className="h-3.5 w-3.5 text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80" />
                <span className={`h-1.5 w-1.5 rounded-full ${dotClass(winState)}`} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <div className="font-semibold">Coletor Windows</div>
              <div className="text-muted-foreground">{label(winState, win.at)}</div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="relative inline-flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5 text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80" />
                <span className={`h-1.5 w-1.5 rounded-full ${dotClass(andState)}`} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <div className="font-semibold">Pilar Hub (Android)</div>
              <div className="text-muted-foreground">{label(andState, and.at)}</div>
            </TooltipContent>
          </Tooltip>
        </div>
      </NavLink>
    </TooltipProvider>
  );
}
