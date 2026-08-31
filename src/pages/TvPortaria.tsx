import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { usePortariaRealtime } from "@/lib/portaria/realtime";
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

const dataHora = (v?: string | null) =>
  v
    ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

function Painel({
  icon: Icon, titulo, itens, cor, onSelecionar,
}: { icon: any; titulo: string; itens: Item[]; cor: string; onSelecionar: (i: Item) => void }) {
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
            <button
              key={i.id}
              type="button"
              onClick={() => onSelecionar(i)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-none"
            >
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
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function LinhaDetalhe({ rotulo, valor }: DetalheCampo) {
  if (!valor) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <span className="shrink-0 text-sm text-white/50">{rotulo}</span>
      <span className="text-right text-sm font-medium text-white">{valor}</span>
    </div>
  );
}

function PainelDetalhes({ item, onFechar, onAbrirModulo }: {
  item: Item;
  onFechar: () => void;
  onAbrirModulo: (rota: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-white/40">{item.painel}</p>
            <h3 className="truncate text-xl font-bold text-white">{item.titulo}</h3>
            {item.subtitulo && <p className="truncate text-sm text-white/60">{item.subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${TONS[item.tom]}`}>
              {item.status}
            </span>
            {item.atualizadoEm && (
              <span className="flex items-center gap-1 text-xs text-white/50">
                <Info className="h-3.5 w-3.5" />
                Última atualização: {dataHora(item.atualizadoEm)}
              </span>
            )}
          </div>

          {item.detalhes.length > 0 && (
            <div className="mb-4 rounded-xl bg-white/5 px-4 py-1">
              {item.detalhes.map((d) => <LinhaDetalhe key={d.rotulo} {...d} />)}
            </div>
          )}

          {item.historico.length > 0 && (
            <>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Histórico</p>
              <div className="rounded-xl bg-white/5 px-4 py-1">
                {item.historico.map((h) => <LinhaDetalhe key={h.rotulo} {...h} />)}
              </div>
            </>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3">
          {item.rota && (
            <Button size="sm" onClick={() => onAbrirModulo(item.rota!)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir no módulo
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onFechar}>Fechar</Button>
        </footer>
      </div>
    </div>
  );
}

export default function TvPortaria() {
  const { unidadeNome } = useUnidadeAtual();
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
  const [selecionado, setSelecionado] = useState<Item | null>(null);

  const carregar = useCallback(async () => {
    const [t, v, cv, enc, oc] = await Promise.all([
      supabase.from("transp_movimentos").select("*").neq("status", "saiu").order("entrada_time", { ascending: false }).limit(20),
      supabase.from("vis_access_records").select("*, visitor:vis_visitors(name, company)").in("status", ["entered", "inside"]).is("exit_date", null).order("entry_date", { ascending: false }).limit(20),
      supabase.from("cv_vehicle_movements").select("*, vehicle:cv_vehicles(name, plate), driver:cv_drivers(name, phone)").eq("status", "out").order("exit_time", { ascending: false }).limit(20),
      supabase.from("livro_encomendas").select("*").not("status", "in", '("retirada","entregue","cancelada")').order("created_at", { ascending: false }).limit(20),
      supabase.from("livro_ocorrencias").select("*").in("status", ["aberta", "em_andamento"]).order("data_hora", { ascending: false }).limit(20),
    ]);

    setTransp(((t.data ?? []) as any[]).map((m) => ({
      id: m.id,
      painel: "Transportadoras",
      titulo: `${m.placa || "—"} • ${labelOperacaoCurto(m.tipo_operacao)}`,
      subtitulo: m.motorista_nome || null,
      desde: m.entrada_time,
      status: m.status === "liberado" ? "Liberado" : "No pátio",
      tom: m.status === "liberado" ? "emerald" : "amber",
      atualizadoEm: m.updated_at || m.liberacao_time || m.entrada_time,
      detalhes: [
        { rotulo: "Placa", valor: m.placa },
        { rotulo: "Tipo de veículo", valor: m.tipo_veiculo },
        { rotulo: "Operação", valor: labelOperacaoCurto(m.tipo_operacao) },
        { rotulo: "Motorista", valor: m.motorista_nome },
        { rotulo: "CPF do motorista", valor: m.motorista_cpf },
        { rotulo: "NF-e", valor: m.nfe_chave ? `…${String(m.nfe_chave).slice(-12)}` : null },
        { rotulo: "Setor destino", valor: m.setor_nome },
        { rotulo: "Observações", valor: m.observacoes },
      ],
      historico: [
        { rotulo: "Entrada", valor: dataHora(m.entrada_time) },
        { rotulo: "Liberação", valor: dataHora(m.liberacao_time) },
      ],
      rota: `/transportadoras/saida?movimento=${m.id}`,
    })));

    setVisitantes(((v.data ?? []) as any[]).map((r) => ({
      id: r.id,
      painel: "Visitantes",
      titulo: r.visitor?.name || "Visitante",
      subtitulo: [r.visitor?.company, r.contact_person_name && `→ ${r.contact_person_name}`, r.vehicle_plate]
        .filter(Boolean).join(" • ") || null,
      desde: r.entry_date,
      status: "Dentro",
      tom: "sky",
      atualizadoEm: r.updated_at || r.entry_date,
      detalhes: [
        { rotulo: "Empresa", valor: r.visitor?.company },
        { rotulo: "Pessoa de contato", valor: r.contact_person_name },
        { rotulo: "Motivo da visita", valor: r.purpose },
        { rotulo: "Placa do veículo", valor: r.vehicle_plate },
        { rotulo: "Observações", valor: r.notes },
      ],
      historico: [
        { rotulo: "Entrada", valor: dataHora(r.entry_date) },
        { rotulo: "Saída", valor: dataHora(r.exit_date) },
      ],
      rota: `/controle-visitantes/presentes?saida=${r.id}`,
    })));

    setVeiculos(((cv.data ?? []) as any[]).map((m) => ({
      id: m.id,
      painel: "Veículos Internos",
      titulo: [m.vehicle?.name, m.vehicle?.plate].filter(Boolean).join(" • ") || "Veículo",
      subtitulo: [m.driver?.name, m.helper_name && `+ ${m.helper_name}`].filter(Boolean).join(" ") || null,
      desde: m.exit_time,
      status: "Em rota",
      tom: "amber",
      atualizadoEm: m.updated_at || m.exit_time,
      detalhes: [
        { rotulo: "Veículo", valor: m.vehicle?.name },
        { rotulo: "Placa", valor: m.vehicle?.plate },
        { rotulo: "Motorista", valor: m.driver?.name },
        { rotulo: "WhatsApp do motorista", valor: m.driver?.phone },
        { rotulo: "Ajudante", valor: m.helper_name },
        { rotulo: "KM na saída", valor: m.exit_km != null ? String(m.exit_km) : null },
        { rotulo: "Destino / motivo", valor: m.destination || m.reason },
      ],
      historico: [
        { rotulo: "Saída", valor: dataHora(m.exit_time) },
        { rotulo: "Retorno", valor: dataHora(m.return_time) },
      ],
      rota: `/controle-veiculos/entrada?movimento=${m.id}`,
    })));

    setEncomendas(((enc.data ?? []) as any[]).map((e) => ({
      id: e.id,
      painel: "Encomendas",
      titulo: e.destinatario || "Encomenda",
      subtitulo: [e.transportadora, e.codigo_rastreio].filter(Boolean).join(" • ") || null,
      desde: e.data_recebimento,
      status: "Aguardando retirada",
      tom: "amber",
      atualizadoEm: e.updated_at || e.data_recebimento,
      detalhes: [
        { rotulo: "Destinatário", valor: e.destinatario },
        { rotulo: "Transportadora", valor: e.transportadora },
        { rotulo: "Código de rastreio", valor: e.codigo_rastreio },
        { rotulo: "Tipo", valor: e.tipo },
        { rotulo: "Recebido por", valor: e.recebido_por },
        { rotulo: "Observações", valor: e.observacoes },
      ],
      historico: [
        { rotulo: "Recebimento", valor: dataHora(e.data_recebimento) },
        { rotulo: "Retirada", valor: dataHora(e.data_retirada) },
      ],
      rota: `/livro-ocorrencia/encomendas?retirar=${e.id}`,
    })));

    setOcorrencias(((oc.data ?? []) as any[]).map((o) => ({
      id: o.id,
      painel: "Ocorrências",
      titulo: `#${o.numero} ${o.tipo}`,
      subtitulo: [o.local, o.responsavel].filter(Boolean).join(" • ") || null,
      desde: o.data_hora,
      status: o.status === "aberta" ? "Aberta" : "Em andamento",
      tom: o.gravidade === "critica" || o.gravidade === "alta" ? "rose" : "slate",
      atualizadoEm: o.updated_at || o.data_hora,
      detalhes: [
        { rotulo: "Tipo", valor: o.tipo },
        { rotulo: "Gravidade", valor: o.gravidade },
        { rotulo: "Local", valor: o.local },
        { rotulo: "Responsável", valor: o.responsavel },
        { rotulo: "Descrição", valor: o.descricao },
      ],
      historico: [
        { rotulo: "Abertura", valor: dataHora(o.data_hora) },
        { rotulo: "Encerramento", valor: dataHora(o.data_encerramento) },
      ],
      rota: `/livro-ocorrencia/ocorrencias?finalizar=${o.id}`,
    })));

    setAtualizado(new Date());
  }, []);

  useEffect(() => {
    carregar();
    const i = setInterval(carregar, 30000);
    const c = setInterval(() => setRelogio(new Date()), 30000);
    return () => { clearInterval(i); clearInterval(c); };
  }, [carregar]);

  // Atualiza instantaneamente quando o porteiro registra algo em qualquer módulo
  usePortariaRealtime(carregar);

  const total = transp.length + visitantes.length + veiculos.length + encomendas.length + ocorrencias.length;

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">TV Portaria</h1>
              {unidadeNome && (
                <span className="rounded-md bg-primary/20 px-2 py-1 text-base font-semibold text-primary sm:text-lg">
                  {unidadeNome}
                </span>
              )}
            </div>
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
        <Painel icon={Truck} titulo="Transportadoras" itens={transp} cor="bg-amber-500/20 text-amber-200" onSelecionar={setSelecionado} />
        <Painel icon={Users} titulo="Visitantes" itens={visitantes} cor="bg-sky-500/20 text-sky-200" onSelecionar={setSelecionado} />
        <Painel icon={Car} titulo="Veículos Internos" itens={veiculos} cor="bg-emerald-500/20 text-emerald-200" onSelecionar={setSelecionado} />
        <Painel icon={Package} titulo="Encomendas" itens={encomendas} cor="bg-violet-500/20 text-violet-200" onSelecionar={setSelecionado} />
        <Painel icon={AlertTriangle} titulo="Ocorrências" itens={ocorrencias} cor="bg-rose-500/20 text-rose-200" onSelecionar={setSelecionado} />
      </div>

      {selecionado && (
        <PainelDetalhes
          item={selecionado}
          onFechar={() => setSelecionado(null)}
          onAbrirModulo={(rota) => navigate(rota)}
        />
      )}

      <SaidaOcultaOverlay progresso={progressoSaida} />
      <TvNotificationBarAuto />
    </div>
  );
}
