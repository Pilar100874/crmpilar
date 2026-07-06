import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Download, RefreshCw, ClipboardEdit, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { VisitaFormularioSheet } from "@/components/visitas/VisitaFormularioSheet";

interface Ocor {
  id: string;
  data_prevista: string;
  janela_inicio: string;
  janela_fim: string;
  status: string;
  usuario_id: string | null;
  hora_chegada: string | null;
  duracao_min: number | null;
  distancia_metros: number | null;
  fonte_deteccao: string | null;
  programacao_id: string;
  origem?: string;
  formulario_status?: string;
  customer_id?: string | null;
}

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; variant?: any }> = {
    pendente: { label: "Pendente", variant: "secondary" },
    realizada: { label: "Realizada" },
    nao_realizada: { label: "Não realizada", variant: "destructive" },
    fora_horario: { label: "Fora do horário", variant: "outline" },
    atrasada: { label: "Atrasada", variant: "destructive" },
  };
  const s2 = map[s] || { label: s };
  return <Badge variant={s2.variant}>{s2.label}</Badge>;
};

const AcompanhamentoVisitas: React.FC = () => {
  const [estabId, setEstabId] = useState<string | null>(null);
  const hoje = new Date().toISOString().slice(0, 10);
  const ha30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(ha30);
  const [dataFim, setDataFim] = useState(hoje);
  const [usuarioId, setUsuarioId] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [ocorrencias, setOcorrencias] = useState<Ocor[]>([]);
  const [programacoes, setProgramacoes] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => { (async () => setEstabId(await getEstabelecimentoId()))(); }, []);
  useEffect(() => { if (estabId) { loadStatics(); load(); } }, [estabId]);
  useEffect(() => { if (estabId) load(); }, [dataInicio, dataFim, usuarioId, statusFiltro, estabId]);

  async function loadStatics() {
    const [{ data: us }, { data: ps }] = await Promise.all([
      supabase.from("usuarios").select("id, nome").order("nome"),
      supabase.from("visita_programacoes").select("id, cliente_nome, endereco"),
    ]);
    setUsuarios(us || []);
    setProgramacoes(ps || []);
  }

  async function load() {
    setLoading(true);
    let q = supabase.from("visita_ocorrencias")
      .select("*")
      .gte("data_prevista", dataInicio)
      .lte("data_prevista", dataFim)
      .order("data_prevista", { ascending: false });
    if (usuarioId !== "todos") q = q.eq("usuario_id", usuarioId);
    if (statusFiltro !== "todos") q = q.eq("status", statusFiltro);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setOcorrencias((data as Ocor[]) || []);
    setLoading(false);
  }

  async function verificarAgora() {
    setVerificando(true);
    const { error } = await supabase.functions.invoke("verificar-visitas", { body: {} });
    setVerificando(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Verificação concluída");
    load();
  }

  const progMap = useMemo(() => new Map(programacoes.map((p: any) => [p.id, p])), [programacoes]);
  const userMap = useMemo(() => new Map(usuarios.map((u: any) => [u.id, u])), [usuarios]);

  const kpis = useMemo(() => {
    const total = ocorrencias.length;
    const realizadas = ocorrencias.filter(o => o.status === "realizada").length;
    const naoReal = ocorrencias.filter(o => o.status === "nao_realizada").length;
    const fora = ocorrencias.filter(o => o.status === "fora_horario").length;
    const pct = total ? Math.round((realizadas / total) * 100) : 0;
    return { total, realizadas, naoReal, fora, pct };
  }, [ocorrencias]);

  function exportCSV() {
    const header = ["Data", "Cliente", "Usuário", "Status", "Chegada", "Duração (min)", "Distância (m)", "Fonte"].join(";");
    const linhas = ocorrencias.map(o => [
      o.data_prevista,
      progMap.get(o.programacao_id)?.cliente_nome || "",
      userMap.get(o.usuario_id ?? "")?.nome || "—",
      o.status,
      o.hora_chegada || "",
      o.duracao_min ?? "",
      o.distancia_metros?.toFixed(0) ?? "",
      o.fonte_deteccao || "",
    ].join(";"));
    const csv = [header, ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "visitas.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" /> Acompanhamento de Visitas
          </h1>
          <p className="text-sm text-muted-foreground">Verifique visitas planejadas, realizadas e não realizadas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={verificarAgora} disabled={verificando}>
            <RefreshCw className={`h-4 w-4 mr-2 ${verificando ? "animate-spin" : ""}`} /> Verificar agora
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{kpis.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Realizadas</div><div className="text-2xl font-bold text-green-600">{kpis.realizadas}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Não realizadas</div><div className="text-2xl font-bold text-red-600">{kpis.naoReal}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Fora do horário</div><div className="text-2xl font-bold text-amber-600">{kpis.fora}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">% Cumprimento</div><div className="text-2xl font-bold">{kpis.pct}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><Label>De</Label><Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
            <div><Label>Até</Label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
            <div>
              <Label>Usuário</Label>
              <Select value={usuarioId} onValueChange={setUsuarioId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                  <SelectItem value="nao_realizada">Não realizada</SelectItem>
                  <SelectItem value="fora_horario">Fora do horário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Visitas</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-muted-foreground">Carregando...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Chegada</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Distância</TableHead>
                  <TableHead>Fonte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ocorrencias.map(o => (
                  <TableRow key={o.id}>
                    <TableCell>{o.data_prevista}</TableCell>
                    <TableCell>{progMap.get(o.programacao_id)?.cliente_nome || "—"}</TableCell>
                    <TableCell>{userMap.get(o.usuario_id ?? "")?.nome || "—"}</TableCell>
                    <TableCell>{statusBadge(o.status)}</TableCell>
                    <TableCell>{o.hora_chegada ? new Date(o.hora_chegada).toLocaleTimeString("pt-BR") : "—"}</TableCell>
                    <TableCell>{o.duracao_min ? `${o.duracao_min} min` : "—"}</TableCell>
                    <TableCell>{o.distancia_metros != null ? `${o.distancia_metros.toFixed(0)} m` : "—"}</TableCell>
                    <TableCell>{o.fonte_deteccao || "—"}</TableCell>
                  </TableRow>
                ))}
                {ocorrencias.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhuma visita no período
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcompanhamentoVisitas;
