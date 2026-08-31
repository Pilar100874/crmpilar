// Painel único da portaria: indicador de unidade, pendências em aberto,
// entradas/saídas do dia e ocorrências — tudo em uma tela só, em tempo real.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car,
  Clock,
  FileWarning,
  Loader2,
  LogIn,
  LogOut,
  Package,
  Radio,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
import { usePortariaRealtime } from "@/lib/portaria/realtime";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import UnidadeAtualBadge from "@/components/UnidadeAtualBadge";

interface Registro {
  id: string;
  unidadeId: string | null;
  grupo: "veiculo" | "transportadora" | "visitante" | "ocorrencia" | "encomenda";
  titulo: string;
  detalhe: string;
  quando: string | null;
  tipo: "entrada" | "saida" | "aberto";
  rota: string;
}

const inicioDoDia = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";

function decorrido(iso: string | null) {
  if (!iso) return "—";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h ${min % 60}min` : `${Math.floor(h / 24)}d`;
}

export default function PortariaPainel() {
  const navigate = useNavigate();
  const { unidadeId } = useUnidadeAtual();
  const [carregando, setCarregando] = useState(true);
  const [pendencias, setPendencias] = useState<Registro[]>([]);
  const [movimentos, setMovimentos] = useState<Registro[]>([]);
  const [atualizado, setAtualizado] = useState<Date>(new Date());

  const carregar = useCallback(async () => {
    setCarregando(true);
    const de = inicioDoDia();

    const [mov, transp, visitas, ocor, enc] = await Promise.all([
      supabase
        .from("cv_vehicle_movements")
        .select(
          "id, unidade_id, exit_time, entry_time, status, helper_name, cv_vehicles(name, plate), cv_drivers(name, phone)",
        )
        .or(`status.eq.out,exit_time.gte.${de},entry_time.gte.${de}`)
        .order("exit_time", { ascending: false })
        .limit(80),
      supabase
        .from("transp_movimentos")
        .select("id, unidade_id, entrada_time, saida_time, status, placa, motorista_nome, motivo, tipo_operacao")
        .or(`saida_time.is.null,entrada_time.gte.${de},saida_time.gte.${de}`)
        .order("entrada_time", { ascending: false })
        .limit(80),
      supabase
        .from("vis_access_records")
        .select(
          "id, unidade_id, entry_date, exit_date, status, contact_person_name, vehicle_plate, purpose, vis_visitors(name, company)",
        )
        .or(`exit_date.is.null,entry_date.gte.${de},exit_date.gte.${de}`)
        .order("entry_date", { ascending: false })
        .limit(80),
      supabase
        .from("livro_ocorrencias")
        .select("id, unidade_id, numero, data_hora, status, tipo, gravidade, local, descricao")
        .or(`status.not.in.("finalizada","resolvida","cancelada"),data_hora.gte.${de}`)
        .order("data_hora", { ascending: false })
        .limit(80),
      supabase
        .from("livro_encomendas")
        .select("id, unidade_id, numero, data_recebimento, status, destinatario, remetente, transportadora")
        .not("status", "in", '("retirada","entregue","cancelada")')
        .order("data_recebimento", { ascending: false })
        .limit(50),
    ]);

    const pend: Registro[] = [];
    const movs: Registro[] = [];

    ((mov.data ?? []) as any[]).forEach((m) => {
      const base = {
        id: m.id,
        unidadeId: m.unidade_id ?? null,
        grupo: "veiculo" as const,
        titulo: `${m.cv_vehicles?.plate ?? "Sem placa"} · ${m.cv_vehicles?.name ?? "Veículo"}`,
        detalhe: [
          m.cv_drivers?.name ? `Motorista: ${m.cv_drivers.name}` : null,
          m.cv_drivers?.phone ? `WhatsApp: ${m.cv_drivers.phone}` : null,
          m.helper_name ? `Ajudante: ${m.helper_name}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        rota: "/controle-veiculos/entrada",
      };
      if (m.status === "out") pend.push({ ...base, quando: m.exit_time, tipo: "aberto" });
      if (m.exit_time >= de) movs.push({ ...base, quando: m.exit_time, tipo: "saida" });
      if (m.entry_time && m.entry_time >= de)
        movs.push({ ...base, id: `${m.id}-in`, quando: m.entry_time, tipo: "entrada" });
    });

    ((transp.data ?? []) as any[]).forEach((t) => {
      const base = {
        id: t.id,
        unidadeId: t.unidade_id ?? null,
        grupo: "transportadora" as const,
        titulo: `${t.placa ?? "Sem placa"} · ${t.motorista_nome ?? "Motorista"}`,
        detalhe: [t.tipo_operacao, t.motivo].filter(Boolean).join(" · ") || "No pátio",
        rota: `/transportadoras/saida?movimento=${t.id}`,
      };
      if (!t.saida_time) pend.push({ ...base, quando: t.entrada_time, tipo: "aberto" });
      if (t.entrada_time && t.entrada_time >= de)
        movs.push({ ...base, quando: t.entrada_time, tipo: "entrada" });
      if (t.saida_time && t.saida_time >= de)
        movs.push({ ...base, id: `${t.id}-out`, quando: t.saida_time, tipo: "saida" });
    });

    ((visitas.data ?? []) as any[]).forEach((v) => {
      const base = {
        id: v.id,
        unidadeId: v.unidade_id ?? null,
        grupo: "visitante" as const,
        titulo: v.vis_visitors?.name ?? "Visitante",
        detalhe: [
          v.vis_visitors?.company,
          v.contact_person_name ? `Visita: ${v.contact_person_name}` : null,
          v.vehicle_plate,
          v.purpose,
        ]
          .filter(Boolean)
          .join(" · "),
        rota: `/controle-visitantes/presentes?saida=${v.id}`,
      };
      if (!v.exit_date) pend.push({ ...base, quando: v.entry_date, tipo: "aberto" });
      if (v.entry_date && v.entry_date >= de)
        movs.push({ ...base, quando: v.entry_date, tipo: "entrada" });
      if (v.exit_date && v.exit_date >= de)
        movs.push({ ...base, id: `${v.id}-out`, quando: v.exit_date, tipo: "saida" });
    });

    const ocorrencias: Registro[] = ((ocor.data ?? []) as any[]).map((o) => ({
      id: o.id,
      unidadeId: o.unidade_id ?? null,
      grupo: "ocorrencia",
      titulo: `${o.numero ? `#${o.numero} · ` : ""}${o.tipo ?? "Ocorrência"}${o.gravidade ? ` (${o.gravidade})` : ""}`,
      detalhe: [o.local, o.descricao].filter(Boolean).join(" · "),
      quando: o.data_hora,
      tipo: ["finalizada", "resolvida", "cancelada"].includes(o.status) ? "entrada" : "aberto",
      rota: "/livro-ocorrencia/ocorrencias",
    }));
    ocorrencias.filter((o) => o.tipo === "aberto").forEach((o) => pend.push(o));

    ((enc.data ?? []) as any[]).forEach((e) =>
      pend.push({
        id: e.id,
        unidadeId: e.unidade_id ?? null,
        grupo: "encomenda",
        titulo: `${e.numero ? `#${e.numero} · ` : ""}${e.destinatario ?? "Encomenda"}`,
        detalhe: [e.transportadora, e.remetente].filter(Boolean).join(" · "),
        quando: e.data_recebimento,
        tipo: "aberto",
        rota: "/livro-ocorrencia/encomendas",
      }),
    );

    const daUnidade = (r: Registro) => !unidadeId || !r.unidadeId || r.unidadeId === unidadeId;

    setPendencias(
      pend.filter(daUnidade).sort((a, b) => (a.quando ?? "").localeCompare(b.quando ?? "")),
    );
    setMovimentos(
      [...movs, ...ocorrencias.filter((o) => o.tipo !== "aberto")]
        .filter(daUnidade)
        .sort((a, b) => (b.quando ?? "").localeCompare(a.quando ?? "")),
    );
    setAtualizado(new Date());
    setCarregando(false);
  }, [unidadeId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  usePortariaRealtime(carregar);

  const contar = (g: Registro["grupo"]) => pendencias.filter((p) => p.grupo === g).length;

  const cards = useMemo(
    () => [
      { icon: Car, label: "Veículos em rota", valor: contar("veiculo"), cor: "text-sky-500 bg-sky-500/10" },
      { icon: Truck, label: "Transportadoras no pátio", valor: contar("transportadora"), cor: "text-amber-500 bg-amber-500/10" },
      { icon: Users, label: "Visitantes presentes", valor: contar("visitante"), cor: "text-emerald-500 bg-emerald-500/10" },
      { icon: FileWarning, label: "Ocorrências abertas", valor: contar("ocorrencia"), cor: "text-rose-500 bg-rose-500/10" },
      { icon: Package, label: "Encomendas aguardando", valor: contar("encomenda"), cor: "text-violet-500 bg-violet-500/10" },
    ],
    [pendencias],
  );

  const entradas = movimentos.filter((m) => m.tipo === "entrada");
  const saidas = movimentos.filter((m) => m.tipo === "saida");

  const Lista = ({ itens, vazio }: { itens: Registro[]; vazio: string }) =>
    itens.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">{vazio}</p>
    ) : (
      <div className="space-y-2">
        {itens.map((i) => (
          <button
            key={`${i.grupo}-${i.id}`}
            onClick={() => navigate(i.rota)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{i.titulo}</p>
              {i.detalhe && <p className="truncate text-xs text-muted-foreground">{i.detalhe}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-xs font-medium tabular-nums">{hora(i.quando)}</span>
              <span className="text-[11px] text-muted-foreground">
                {i.tipo === "aberto" ? `há ${decorrido(i.quando)}` : i.tipo === "entrada" ? "entrada" : "saída"}
              </span>
            </div>
          </button>
        ))}
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold">Painel da Portaria</h2>
        <UnidadeAtualBadge />
        <Badge variant="outline" className="gap-1 border-emerald-600/40 text-emerald-600">
          <Radio className="h-3 w-3" />
          Tempo real
        </Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Atualizado {hora(atualizado.toISOString())}
        </span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={carregar} disabled={carregando}>
          {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.cor}`}>
                <c.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums">{c.valor}</p>
                <p className="truncate text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              Pendências agora
              <Badge variant="secondary">{pendencias.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Lista itens={pendencias} vazio="Nenhuma pendência em aberto" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Movimentação de hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="todos">
              <TabsList className="mb-3 grid w-full grid-cols-3">
                <TabsTrigger value="todos">Tudo ({movimentos.length})</TabsTrigger>
                <TabsTrigger value="entradas" className="gap-1">
                  <LogIn className="h-3 w-3" /> {entradas.length}
                </TabsTrigger>
                <TabsTrigger value="saidas" className="gap-1">
                  <LogOut className="h-3 w-3" /> {saidas.length}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="todos">
                <Lista itens={movimentos} vazio="Sem movimentação registrada hoje" />
              </TabsContent>
              <TabsContent value="entradas">
                <Lista itens={entradas} vazio="Nenhuma entrada hoje" />
              </TabsContent>
              <TabsContent value="saidas">
                <Lista itens={saidas} vazio="Nenhuma saída hoje" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
