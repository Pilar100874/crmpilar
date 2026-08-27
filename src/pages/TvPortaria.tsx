import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTvMode } from "@/lib/tvMode";
import { useAutoReload } from "@/lib/tvAutoReload";
import { useSaidaOculta } from "@/lib/tvSaidaOculta";
import { SaidaOcultaOverlay } from "@/components/tv/SaidaOcultaOverlay";
import TvNotificationBarAuto from "@/components/tv/TvNotificationBarAuto";
import { Button } from "@/components/ui/button";
import {
  Truck, Users, Car, Package, AlertTriangle, ArrowLeft, RefreshCw, Clock, ShieldCheck,
  X, ExternalLink, Info,
} from "lucide-react";
import { labelOperacaoCurto } from "@/lib/transportadoras/dados";

type DetalheCampo = { rotulo: string; valor?: string | null };

type Item = {
  id: string;
  titulo: string;
  subtitulo?: string | null;
  desde?: string | null;
  status: string;
  tom: "amber" | "emerald" | "sky" | "rose" | "slate";
  painel: string;
  detalhes: DetalheCampo[];
  historico: DetalheCampo[];
  atualizadoEm?: string | null;
  rota?: string | null;
};

const TONS: Record<Item["tom"], string> = {
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  sky: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  rose: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  slate: "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

const hora = (v?: string | null) =>
  v ? new Date(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";

const decorrido = (v?: string | null) => {
  if (!v) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h${String(min % 60).padStart(2, "0")}`;
};

function Painel({
  icon: Icon, titulo, itens, cor,
}: { icon: any; titulo: string; itens: Item[]; cor: string }) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <header className={`flex items-center justify-between gap-2 px-4 py-2.5 ${cor}`}>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <h2 className="text-lg font-bold tracking-wide">{titulo}</h2>
        </div>
        <span className="rounded-full bg-black/30 px-3 py-0.5 text-lg font-bold tabular-nums">{itens.length}</span>
      </header>
      <div className="min-h-0 flex-1 divide-y divide-white/5 overflow-hidden">
        {itens.length === 0 ? (
          <p className="p-6 text-center text-sm text-white/40">Nada em andamento</p>
        ) : (
          itens.slice(0, 8).map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">{i.titulo}</p>
                {i.subtitulo && <p className="truncate text-xs text-white/50">{i.subtitulo}</p>}
              </div>
              {i.desde && (
                <span className="hidden shrink-0 items-center gap-1 text-xs text-white/50 sm:flex">
                  <Clock className="h-3 w-3" />
                  {hora(i.desde)} • {decorrido(i.desde)}
                </span>
              )}
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONS[i.tom]}`}>
                {i.status}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function TvPortaria() {
  const navigate = useNavigate();
  const modoTv = useTvMode();
  useAutoReload({ minutosPadrao: 0 });
  const { progresso: progressoSaida } = useSaidaOculta(() => {
    try { window.close(); } catch { /* ignore */ }
    navigate(-1);
  });

  const [transp, setTransp] = useState<Item[]>([]);
  const [visitantes, setVisitantes] = useState<Item[]>([]);
  const [veiculos, setVeiculos] = useState<Item[]>([]);
  const [encomendas, setEncomendas] = useState<Item[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Item[]>([]);
  const [atualizado, setAtualizado] = useState(new Date());
  const [relogio, setRelogio] = useState(new Date());

  const carregar = useCallback(async () => {
    const [t, v, cv, enc, oc] = await Promise.all([
      supabase.from("transp_movimentos").select("*").neq("status", "saiu").order("entrada_time", { ascending: false }).limit(20),
      supabase.from("vis_access_records").select("*, visitor:vis_visitors(name, company)").eq("status", "entered").order("entry_date", { ascending: false }).limit(20),
      supabase.from("cv_vehicle_movements").select("*, vehicle:cv_vehicles(name, plate), driver:cv_drivers(name)").eq("status", "out").order("exit_time", { ascending: false }).limit(20),
      supabase.from("livro_encomendas").select("*").eq("status", "aguardando_retirada").order("data_recebimento", { ascending: false }).limit(20),
      supabase.from("livro_ocorrencias").select("*").in("status", ["aberta", "em_andamento"]).order("data_hora", { ascending: false }).limit(20),
    ]);

    setTransp(((t.data ?? []) as any[]).map((m) => ({
      id: m.id,
      titulo: `${m.placa || "—"} • ${labelOperacaoCurto(m.tipo_operacao)}`,
      subtitulo: m.motorista_nome || null,
      desde: m.entrada_time,
      status: m.status === "liberado" ? "Liberado" : "No pátio",
      tom: m.status === "liberado" ? "emerald" : "amber",
    })));

    setVisitantes(((v.data ?? []) as any[]).map((r) => ({
      id: r.id,
      titulo: r.visitor?.name || "Visitante",
      subtitulo: [r.visitor?.company, r.contact_person_name && `→ ${r.contact_person_name}`, r.vehicle_plate]
        .filter(Boolean).join(" • ") || null,
      desde: r.entry_date,
      status: "Dentro",
      tom: "sky",
    })));

    setVeiculos(((cv.data ?? []) as any[]).map((m) => ({
      id: m.id,
      titulo: [m.vehicle?.name, m.vehicle?.plate].filter(Boolean).join(" • ") || "Veículo",
      subtitulo: [m.driver?.name, m.helper_name && `+ ${m.helper_name}`].filter(Boolean).join(" ") || null,
      desde: m.exit_time,
      status: "Em rota",
      tom: "amber",
    })));

    setEncomendas(((enc.data ?? []) as any[]).map((e) => ({
      id: e.id,
      titulo: e.destinatario || "Encomenda",
      subtitulo: [e.transportadora, e.codigo_rastreio].filter(Boolean).join(" • ") || null,
      desde: e.data_recebimento,
      status: "Aguardando retirada",
      tom: "amber",
    })));

    setOcorrencias(((oc.data ?? []) as any[]).map((o) => ({
      id: o.id,
      titulo: `#${o.numero} ${o.tipo}`,
      subtitulo: [o.local, o.responsavel].filter(Boolean).join(" • ") || null,
      desde: o.data_hora,
      status: o.status === "aberta" ? "Aberta" : "Em andamento",
      tom: o.gravidade === "critica" || o.gravidade === "alta" ? "rose" : "slate",
    })));

    setAtualizado(new Date());
  }, []);

  useEffect(() => {
    carregar();
    const i = setInterval(carregar, 30000);
    const c = setInterval(() => setRelogio(new Date()), 30000);
    return () => { clearInterval(i); clearInterval(c); };
  }, [carregar]);

  const total = transp.length + visitantes.length + veiculos.length + encomendas.length + ocorrencias.length;

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">TV Portaria</h1>
            <p className="text-sm text-white/50">
              {total} registros em andamento • atualizado {hora(atualizado.toISOString())}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold tabular-nums sm:text-4xl">
            {relogio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {!modoTv && (
            <>
              <Button variant="ghost" size="icon" onClick={carregar}><RefreshCw className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            </>
          )}
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <Painel icon={Truck} titulo="Transportadoras" itens={transp} cor="bg-amber-500/20 text-amber-200" />
        <Painel icon={Users} titulo="Visitantes" itens={visitantes} cor="bg-sky-500/20 text-sky-200" />
        <Painel icon={Car} titulo="Veículos Internos" itens={veiculos} cor="bg-emerald-500/20 text-emerald-200" />
        <Painel icon={Package} titulo="Encomendas" itens={encomendas} cor="bg-violet-500/20 text-violet-200" />
        <Painel icon={AlertTriangle} titulo="Ocorrências" itens={ocorrencias} cor="bg-rose-500/20 text-rose-200" />
      </div>

      <SaidaOcultaOverlay progresso={progressoSaida} />
      <TvNotificationBarAuto />
    </div>
  );
}
