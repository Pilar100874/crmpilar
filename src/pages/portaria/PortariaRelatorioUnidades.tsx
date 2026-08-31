import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Car, Loader2, Package, RefreshCw, Truck, Users, FileWarning, Radio } from "lucide-react";
import { usePortariaRealtime } from "@/lib/portaria/realtime";

type StatusFiltro = "todos" | "abertos" | "concluidos";

interface Unidade {
  id: string;
  nome: string;
}

interface Linha {
  unidadeId: string | null;
  entradasVeiculos: number;
  saidasVeiculos: number;
  entradasTransp: number;
  saidasTransp: number;
  visitantesEntrada: number;
  visitantesSaida: number;
  ocorrenciasAbertas: number;
  ocorrenciasFinalizadas: number;
  encomendasPendentes: number;
  encomendasRetiradas: number;
}

const linhaVazia = (unidadeId: string | null): Linha => ({
  unidadeId,
  entradasVeiculos: 0,
  saidasVeiculos: 0,
  entradasTransp: 0,
  saidasTransp: 0,
  visitantesEntrada: 0,
  visitantesSaida: 0,
  ocorrenciasAbertas: 0,
  ocorrenciasFinalizadas: 0,
  encomendasPendentes: 0,
  encomendasRetiradas: 0,
});

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function primeiroDiaMes() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function PortariaRelatorioUnidades() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeId, setUnidadeId] = useState<string>("todas");
  const [inicio, setInicio] = useState<string>(primeiroDiaMes());
  const [fim, setFim] = useState<string>(hoje());
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [carregando, setCarregando] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("unidades").select("id, nome").order("nome");
      setUnidades((data ?? []) as Unidade[]);
    })();
  }, []);

  const nomeUnidade = useCallback(
    (id: string | null) => unidades.find((u) => u.id === id)?.nome ?? "Sem unidade",
    [unidades],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    const de = `${inicio}T00:00:00`;
    const ate = `${fim}T23:59:59`;

    const [movimentos, transp, visitas, ocorrencias, encomendas] = await Promise.all([
      supabase
        .from("cv_vehicle_movements")
        .select("unidade_id, exit_time, entry_time, status")
        .gte("exit_time", de)
        .lte("exit_time", ate),
      supabase
        .from("transp_movimentos")
        .select("unidade_id, entrada_time, saida_time, status")
        .gte("entrada_time", de)
        .lte("entrada_time", ate),
      supabase
        .from("vis_access_records")
        .select("unidade_id, entry_date, exit_date, status")
        .gte("entry_date", de)
        .lte("entry_date", ate),
      supabase
        .from("livro_ocorrencias")
        .select("unidade_id, data_hora, status")
        .gte("data_hora", de)
        .lte("data_hora", ate),
      supabase
        .from("livro_encomendas")
        .select("unidade_id, created_at, status")
        .gte("created_at", de)
        .lte("created_at", ate),
    ]);

    const mapa = new Map<string, Linha>();
    const linha = (uid: string | null) => {
      const key = uid ?? "sem-unidade";
      if (!mapa.has(key)) mapa.set(key, linhaVazia(uid));
      return mapa.get(key)!;
    };

    const passaStatus = (aberto: boolean) =>
      status === "todos" || (status === "abertos" ? aberto : !aberto);

    (movimentos.data ?? []).forEach((m: any) => {
      const aberto = m.status === "out";
      if (!passaStatus(aberto)) return;
      const l = linha(m.unidade_id ?? null);
      l.saidasVeiculos += 1;
      if (m.entry_time) l.entradasVeiculos += 1;
    });

    (transp.data ?? []).forEach((m: any) => {
      const aberto = m.status !== "saiu" && !m.saida_time;
      if (!passaStatus(aberto)) return;
      const l = linha(m.unidade_id ?? null);
      l.entradasTransp += 1;
      if (m.saida_time) l.saidasTransp += 1;
    });

    (visitas.data ?? []).forEach((v: any) => {
      const aberto = v.status === "inside";
      if (!passaStatus(aberto)) return;
      const l = linha(v.unidade_id ?? null);
      l.visitantesEntrada += 1;
      if (v.exit_date) l.visitantesSaida += 1;
    });

    (ocorrencias.data ?? []).forEach((o: any) => {
      const aberto = o.status !== "finalizada" && o.status !== "resolvida";
      if (!passaStatus(aberto)) return;
      const l = linha(o.unidade_id ?? null);
      if (aberto) l.ocorrenciasAbertas += 1;
      else l.ocorrenciasFinalizadas += 1;
    });

    (encomendas.data ?? []).forEach((e: any) => {
      const aberto = e.status !== "retirada" && e.status !== "entregue";
      if (!passaStatus(aberto)) return;
      const l = linha(e.unidade_id ?? null);
      if (aberto) l.encomendasPendentes += 1;
      else l.encomendasRetiradas += 1;
    });

    let resultado = Array.from(mapa.values());
    if (unidadeId !== "todas") resultado = resultado.filter((l) => l.unidadeId === unidadeId);
    resultado.sort((a, b) => nomeUnidade(a.unidadeId).localeCompare(nomeUnidade(b.unidadeId)));
    setLinhas(resultado);
    setCarregando(false);
  }, [inicio, fim, status, unidadeId, nomeUnidade]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Sincronização automática: qualquer entrada/saída/ocorrência registrada
  // na portaria recarrega o relatório sem precisar atualizar a tela.
  usePortariaRealtime(carregar);

  const totais = useMemo(
    () =>
      linhas.reduce((acc, l) => {
        (Object.keys(acc) as (keyof Omit<Linha, "unidadeId">)[]).forEach((k) => {
          acc[k] += l[k];
        });
        return acc;
      }, linhaVazia(null) as any as Omit<Linha, "unidadeId">),
    [linhas],
  );

  const exportarCsv = () => {
    const cab = [
      "Unidade",
      "Saídas veículos",
      "Entradas veículos",
      "Entradas transportadoras",
      "Saídas transportadoras",
      "Visitantes entrada",
      "Visitantes saída",
      "Ocorrências abertas",
      "Ocorrências finalizadas",
      "Encomendas pendentes",
      "Encomendas retiradas",
    ];
    const linhasCsv = linhas.map((l) =>
      [
        nomeUnidade(l.unidadeId),
        l.saidasVeiculos,
        l.entradasVeiculos,
        l.entradasTransp,
        l.saidasTransp,
        l.visitantesEntrada,
        l.visitantesSaida,
        l.ocorrenciasAbertas,
        l.ocorrenciasFinalizadas,
        l.encomendasPendentes,
        l.encomendasRetiradas,
      ].join(";"),
    );
    const blob = new Blob([[cab.join(";"), ...linhasCsv].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-portaria-${inicio}-a-${fim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { icon: Car, label: "Saídas de veículos", valor: totais.saidasVeiculos },
    { icon: Truck, label: "Transportadoras", valor: totais.entradasTransp },
    { icon: Users, label: "Visitantes", valor: totais.visitantesEntrada },
    { icon: FileWarning, label: "Ocorrências", valor: totais.ocorrenciasAbertas + totais.ocorrenciasFinalizadas },
    { icon: Package, label: "Encomendas", valor: totais.encomendasPendentes + totais.encomendasRetiradas },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold">Relatório por Unidade</h2>
        <Badge variant="secondary" className="gap-1">
          <Building2 className="h-3 w-3" />
          {unidadeId === "todas" ? "Todas as unidades" : nomeUnidade(unidadeId)}
        </Badge>
        <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600/40">
          <Radio className="h-3 w-3" />
          Sincronização automática
        </Badge>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">Início</Label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fim</Label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Unidade</Label>
            <Select value={unidadeId} onValueChange={setUnidadeId}>
              <SelectTrigger>
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as unidades</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFiltro)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="abertos">Em aberto</SelectItem>
                <SelectItem value="concluidos">Concluídos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={carregar} disabled={carregando} className="flex-1">
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Atualizar</span>
            </Button>
            <Button variant="outline" onClick={exportarCsv} disabled={!linhas.length}>
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{c.valor}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalhamento por unidade</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-4 sm:pt-0">
          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Saídas veíc.</TableHead>
                  <TableHead className="text-right">Entradas veíc.</TableHead>
                  <TableHead className="text-right">Transp. entrada</TableHead>
                  <TableHead className="text-right">Transp. saída</TableHead>
                  <TableHead className="text-right">Visit. entrada</TableHead>
                  <TableHead className="text-right">Visit. saída</TableHead>
                  <TableHead className="text-right">Ocor. abertas</TableHead>
                  <TableHead className="text-right">Ocor. final.</TableHead>
                  <TableHead className="text-right">Encom. pend.</TableHead>
                  <TableHead className="text-right">Encom. retir.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.unidadeId ?? "sem"}>
                    <TableCell className="font-medium">{nomeUnidade(l.unidadeId)}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.saidasVeiculos}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.entradasVeiculos}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.entradasTransp}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.saidasTransp}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.visitantesEntrada}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.visitantesSaida}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.ocorrenciasAbertas}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.ocorrenciasFinalizadas}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.encomendasPendentes}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.encomendasRetiradas}</TableCell>
                  </TableRow>
                ))}
                {!linhas.length && (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum registro no período selecionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile / tablet */}
          <div className="space-y-3 p-3 md:hidden">
            {linhas.map((l) => (
              <div key={l.unidadeId ?? "sem"} className="rounded-lg border p-3">
                <p className="mb-2 font-semibold text-primary">{nomeUnidade(l.unidadeId)}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Saídas veículos</span>
                  <span className="text-right tabular-nums">{l.saidasVeiculos}</span>
                  <span className="text-muted-foreground">Entradas veículos</span>
                  <span className="text-right tabular-nums">{l.entradasVeiculos}</span>
                  <span className="text-muted-foreground">Transportadoras</span>
                  <span className="text-right tabular-nums">
                    {l.entradasTransp} / {l.saidasTransp}
                  </span>
                  <span className="text-muted-foreground">Visitantes</span>
                  <span className="text-right tabular-nums">
                    {l.visitantesEntrada} / {l.visitantesSaida}
                  </span>
                  <span className="text-muted-foreground">Ocorrências</span>
                  <span className="text-right tabular-nums">
                    {l.ocorrenciasAbertas} abertas / {l.ocorrenciasFinalizadas} final.
                  </span>
                  <span className="text-muted-foreground">Encomendas</span>
                  <span className="text-right tabular-nums">
                    {l.encomendasPendentes} pend. / {l.encomendasRetiradas} retir.
                  </span>
                </div>
              </div>
            ))}
            {!linhas.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum registro no período selecionado
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
