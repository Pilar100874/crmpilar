// Painel de pendências da portaria por unidade:
// veículos em rota, transportadoras no pátio, visitantes presentes e ocorrências abertas.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Car,
  FileWarning,
  Loader2,
  Radio,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
import { usePortariaRealtime } from "@/lib/portaria/realtime";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { useNavigate } from "react-router-dom";

interface Unidade {
  id: string;
  nome: string;
}

interface Item {
  id: string;
  unidadeId: string | null;
  titulo: string;
  detalhe: string;
  desde: string | null;
}

function tempoDesde(iso: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "agora";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h ${min % 60}min`;
  return `há ${Math.floor(h / 24)}d`;
}

export default function PortariaPendencias() {
  const navigate = useNavigate();
  const { unidadeId: minhaUnidade, isAdmin } = useUnidadeAtual();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeId, setUnidadeId] = useState<string>("todas");
  const [carregando, setCarregando] = useState(false);
  const [veiculos, setVeiculos] = useState<Item[]>([]);
  const [transportadoras, setTransportadoras] = useState<Item[]>([]);
  const [visitantes, setVisitantes] = useState<Item[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("unidades").select("id, nome").order("nome");
      setUnidades((data ?? []) as Unidade[]);
    })();
  }, []);

  useEffect(() => {
    if (!isAdmin && minhaUnidade) setUnidadeId(minhaUnidade);
  }, [isAdmin, minhaUnidade]);

  const nomeUnidade = useCallback(
    (id: string | null) => unidades.find((u) => u.id === id)?.nome ?? "Sem unidade",
    [unidades],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [mov, transp, visitas, ocor] = await Promise.all([
      supabase
        .from("cv_vehicle_movements")
        .select(
          "id, unidade_id, exit_time, status, helper_name, cv_vehicles(name, plate), cv_drivers(name, phone)",
        )
        .eq("status", "out")
        .order("exit_time", { ascending: true }),
      supabase
        .from("transp_movimentos")
        .select("id, unidade_id, entrada_time, saida_time, status, placa, motorista_nome, motivo, tipo_operacao")
        .is("saida_time", null)
        .order("entrada_time", { ascending: true }),
      supabase
        .from("vis_access_records")
        .select("id, unidade_id, entry_date, status, contact_person_name, vehicle_plate, purpose, vis_visitors(name, company)")
        .is("exit_date", null)
        .order("entry_date", { ascending: true }),
      supabase
        .from("livro_ocorrencias")
        .select("id, unidade_id, data_hora, status, tipo, gravidade, local, descricao, numero")
        .not("status", "in", '("finalizada","resolvida")')
        .order("data_hora", { ascending: true }),
    ]);

    setVeiculos(
      (mov.data ?? []).map((m: any) => ({
        id: m.id,
        unidadeId: m.unidade_id ?? null,
        titulo: `${m.cv_vehicles?.plate ?? "Sem placa"} · ${m.cv_vehicles?.name ?? "Veículo"}`,
        detalhe: [
          m.cv_drivers?.name ? `Motorista: ${m.cv_drivers.name}` : null,
          m.cv_drivers?.phone ? `WhatsApp: ${m.cv_drivers.phone}` : null,
          m.helper_name ? `Ajudante: ${m.helper_name}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        desde: m.exit_time,
      })),
    );

    setTransportadoras(
      (transp.data ?? []).map((t: any) => ({
        id: t.id,
        unidadeId: t.unidade_id ?? null,
        titulo: `${t.placa ?? "Sem placa"} · ${t.motorista_nome ?? "Motorista"}`,
        detalhe: [t.tipo_operacao, t.motivo].filter(Boolean).join(" · ") || "No pátio",
        desde: t.entrada_time,
      })),
    );

    setVisitantes(
      (visitas.data ?? []).map((v: any) => ({
        id: v.id,
        unidadeId: v.unidade_id ?? null,
        titulo: v.vis_visitors?.name ?? "Visitante",
        detalhe: [
          v.vis_visitors?.company,
          v.contact_person_name ? `Visita: ${v.contact_person_name}` : null,
          v.vehicle_plate,
          v.purpose,
        ]
          .filter(Boolean)
          .join(" · "),
        desde: v.entry_date,
      })),
    );

    setOcorrencias(
      (ocor.data ?? []).map((o: any) => ({
        id: o.id,
        unidadeId: o.unidade_id ?? null,
        titulo: `${o.numero ? `#${o.numero} · ` : ""}${o.tipo ?? "Ocorrência"}${o.gravidade ? ` (${o.gravidade})` : ""}`,
        detalhe: [o.local, o.descricao].filter(Boolean).join(" · "),
        desde: o.data_hora,
      })),
    );

    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  usePortariaRealtime(carregar);

  const filtrar = useCallback(
    (itens: Item[]) => (unidadeId === "todas" ? itens : itens.filter((i) => i.unidadeId === unidadeId)),
    [unidadeId],
  );

  const blocos = useMemo(
    () => [
      {
        chave: "veiculos",
        titulo: "Veículos em rota",
        icon: Car,
        cor: "text-sky-500 bg-sky-500/10",
        itens: filtrar(veiculos),
        acao: () => navigate("/controle-veiculos/entrada"),
        acaoLabel: "Registrar entrada",
      },
      {
        chave: "transp",
        titulo: "Transportadoras no pátio",
        icon: Truck,
        cor: "text-amber-500 bg-amber-500/10",
        itens: filtrar(transportadoras),
        acao: () => navigate("/portaria/transportadoras/saida"),
        acaoLabel: "Registrar saída",
      },
      {
        chave: "visitantes",
        titulo: "Visitantes presentes",
        icon: Users,
        cor: "text-emerald-500 bg-emerald-500/10",
        itens: filtrar(visitantes),
        acao: () => navigate("/visitantes"),
        acaoLabel: "Abrir visitantes",
      },
      {
        chave: "ocorrencias",
        titulo: "Ocorrências não finalizadas",
        icon: FileWarning,
        cor: "text-rose-500 bg-rose-500/10",
        itens: filtrar(ocorrencias),
        acao: () => navigate("/portaria/livro"),
        acaoLabel: "Abrir livro",
      },
    ],
    [filtrar, veiculos, transportadoras, visitantes, ocorrencias, navigate],
  );

  const total = blocos.reduce((n, b) => n + b.itens.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold">Pendências da Portaria</h2>
        <Badge variant="secondary" className="gap-1">
          <Building2 className="h-3 w-3" />
          {unidadeId === "todas" ? "Todas as unidades" : nomeUnidade(unidadeId)}
        </Badge>
        <Badge variant="outline" className="gap-1 border-emerald-600/40 text-emerald-600">
          <Radio className="h-3 w-3" />
          Tempo real
        </Badge>
        <Badge variant="outline">{total} em aberto</Badge>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground">Unidade</p>
            <Select value={unidadeId} onValueChange={setUnidadeId}>
              <SelectTrigger>
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="todas">Todas as unidades</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={carregar} disabled={carregando} variant="outline">
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Atualizar</span>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {blocos.map((b) => (
          <Card key={b.chave}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${b.cor}`}>
                  <b.icon className="h-4 w-4" />
                </span>
                {b.titulo}
                <Badge variant="secondary">{b.itens.length}</Badge>
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={b.acao}>
                {b.acaoLabel}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {b.itens.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma pendência</p>
              ) : (
                b.itens.map((i) => (
                  <div
                    key={i.id}
                    className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{i.titulo}</p>
                      {i.detalhe && (
                        <p className="truncate text-xs text-muted-foreground">{i.detalhe}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {unidadeId === "todas" && (
                        <Badge variant="outline" className="text-[10px]">
                          {nomeUnidade(i.unidadeId)}
                        </Badge>
                      )}
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {tempoDesde(i.desde)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
