import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Monitor, Smartphone, Bell } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type State = "online" | "warn" | "offline";
type Health = { at: string | null; ago: number | null };
type FilialHealth = { id: string; nome: string; at: string | null; ago: number | null; state: State; equipamentos: number };

function classify(ago: number | null): State {
  if (ago == null) return "offline";
  if (ago < 3 * 60_000) return "online";
  if (ago < 15 * 60_000) return "warn";
  return "offline";
}

function dotClass(state: State) {
  if (state === "online") return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]";
  if (state === "warn") return "bg-amber-400";
  return "bg-muted-foreground/40";
}

function label(state: State, at: string | null) {
  const when = at ? new Date(at).toLocaleString("pt-BR") : "nunca";
  if (state === "online") return `Online · último ping ${when}`;
  if (state === "warn") return `Instável · último ping ${when}`;
  return at ? `Offline · último ping ${when}` : "Offline · nunca comunicou";
}

function aggregate(states: State[]): State {
  if (states.some((s) => s === "online")) return "online";
  if (states.some((s) => s === "warn")) return "warn";
  return "offline";
}

async function fetchHealth(): Promise<{ win: Health; and: Health; filiais: FilialHealth[] }> {
  const [{ data: filiaisRaw }, { data: equipRaw }, { data: dv }] = await Promise.all([
    supabase.from("ponto_filiais").select("id, nome").order("nome", { ascending: true }),
    supabase
      .from("ponto_equipamentos")
      .select("filial_id, ultima_sync")
      .eq("ativo", true),
    supabase
      .from("sms_devices")
      .select("ultimo_heartbeat, ultimo_ping")
      .eq("ativo", true)
      .order("ultimo_heartbeat", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const now = Date.now();
  const filiais: FilialHealth[] = (filiaisRaw || []).map((f: any) => {
    const equips = (equipRaw || []).filter((e: any) => e.filial_id === f.id);
    const latest = equips
      .map((e: any) => e.ultima_sync)
      .filter(Boolean)
      .sort()
      .pop() as string | undefined;
    const at = latest || null;
    const ago = at ? now - new Date(at).getTime() : null;
    return {
      id: f.id,
      nome: f.nome,
      at,
      ago,
      state: equips.length === 0 ? "offline" : classify(ago),
      equipamentos: equips.length,
    };
  });

  // Equipamentos sem filial atribuída (fallback)
  const semFilial = (equipRaw || []).filter((e: any) => !e.filial_id);
  if (semFilial.length) {
    const latest = semFilial
      .map((e: any) => e.ultima_sync)
      .filter(Boolean)
      .sort()
      .pop() as string | undefined;
    const at = latest || null;
    const ago = at ? now - new Date(at).getTime() : null;
    filiais.push({
      id: "__sem_filial__",
      nome: "Sem filial atribuída",
      at,
      ago,
      state: classify(ago),
      equipamentos: semFilial.length,
    });
  }

  const winLatest = (equipRaw || [])
    .map((e: any) => e.ultima_sync)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;
  const winAt = winLatest || null;
  const andAt = (dv as any)?.ultimo_heartbeat ?? (dv as any)?.ultimo_ping ?? null;

  return {
    win: { at: winAt, ago: winAt ? now - new Date(winAt).getTime() : null },
    and: { at: andAt, ago: andAt ? now - new Date(andAt).getTime() : null },
    filiais,
  };
}

type PushState = "granted" | "denied" | "default" | "unsupported";

function pushDotClass(state: PushState) {
  if (state === "granted") return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]";
  if (state === "denied") return "bg-red-500";
  return "bg-muted-foreground/40";
}

function pushLabel(state: PushState) {
  if (state === "granted") return "Push ativo neste dispositivo";
  if (state === "denied") return "Push bloqueado neste dispositivo";
  if (state === "unsupported") return "Push não suportado neste navegador";
  return "Push não ativado neste dispositivo";
}

function getPushState(): PushState {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as PushState;
}

export function AppsHealthIndicator({ compact = false }: { compact?: boolean }) {
  const [win, setWin] = useState<Health>({ at: null, ago: null });
  const [and, setAnd] = useState<Health>({ at: null, ago: null });
  const [filiais, setFiliais] = useState<FilialHealth[]>([]);
  const [push, setPush] = useState<PushState>(getPushState());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { win: w, and: a, filiais: f } = await fetchHealth();
        if (!alive) return;
        setWin(w);
        setAnd(a);
        setFiliais(f);
      } catch { /* silencioso */ }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    setPush(getPushState());
    const handler = () => setPush(getPushState());
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, []);

  const winState = filiais.length
    ? aggregate(filiais.map((f) => f.state))
    : classify(win.ago);
  const andState = classify(and.ago);
  const filiaisOnline = filiais.filter((f) => f.state === "online").length;
  const filiaisComEquip = filiais.filter((f) => f.equipamentos > 0).length;

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
            <TooltipContent side="right" className="text-xs max-w-[280px]">
              <div className="font-semibold">Coletor Windows</div>
              {filiais.length > 0 ? (
                <>
                  <div className="text-muted-foreground mb-1.5">
                    {filiaisOnline} de {filiaisComEquip || filiais.length} filiais com coletor ativo
                  </div>
                  <div className="flex flex-col gap-1 max-h-56 overflow-auto">
                    {filiais.map((f) => (
                      <div key={f.id} className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass(f.state)}`} />
                        <span className="truncate">{f.nome}</span>
                        <span className="text-muted-foreground ml-auto text-[10px] whitespace-nowrap">
                          {f.equipamentos === 0
                            ? "sem equipamento"
                            : f.at
                            ? new Date(f.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                            : "nunca"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">{label(winState, win.at)}</div>
              )}
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
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="relative inline-flex items-center gap-1">
                <Bell className="h-3.5 w-3.5 text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80" />
                <span className={`h-1.5 w-1.5 rounded-full ${pushDotClass(push)}`} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <div className="font-semibold">Notificações Push</div>
              <div className="text-muted-foreground">{pushLabel(push)}</div>
            </TooltipContent>
          </Tooltip>
        </div>
      </NavLink>
    </TooltipProvider>
  );
}
