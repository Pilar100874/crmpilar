import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Download, MessageSquare, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface Row {
  id: string;
  empresa_id: string | null;
  contato_telefone: string;
  flow_nome: string | null;
  block_id: string | null;
  enviado_em: string;
  respondido_em: string | null;
  resposta_texto: string | null;
  timeout_horas: number;
  expira_em: string;
  status: "aguardando" | "respondeu" | "sem_resposta";
  empresa?: { id: string; nome: string | null; nome_fantasia: string | null } | null;
}

export default function BotResponseMonitor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [fluxoFiltro, setFluxoFiltro] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  const carregar = async () => {
    setLoading(true);
    try {
      const eid = await getEstabelecimentoId();
      if (!eid) return;
      const { data } = await supabase
        .from("bot_response_tracking" as any)
        .select("id, empresa_id, contato_telefone, flow_nome, block_id, enviado_em, respondido_em, resposta_texto, timeout_horas, expira_em, status, empresa:empresas(id,nome,nome_fantasia)")
        .eq("estabelecimento_id", eid)
        .order("enviado_em", { ascending: false })
        .limit(1000);
      setRows((data as any) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const stats = useMemo(() => {
    const s = { total: rows.length, respondeu: 0, aguardando: 0, sem_resposta: 0 };
    for (const r of rows) s[r.status]++;
    return s;
  }, [rows]);

  const fluxos = useMemo(() => Array.from(new Set(rows.map((r) => r.flow_nome).filter(Boolean))) as string[], [rows]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFiltro !== "todos" && r.status !== statusFiltro) return false;
      if (fluxoFiltro !== "todos" && r.flow_nome !== fluxoFiltro) return false;
      if (q) {
        const nome = (r.empresa?.nome_fantasia || r.empresa?.nome || "").toLowerCase();
        if (!nome.includes(q) && !r.contato_telefone.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFiltro, fluxoFiltro, busca]);

  const exportarCsv = () => {
    const header = ["Empresa", "Telefone", "Fluxo", "Enviado em", "Respondido em", "Status", "Resposta"];
    const linhas = filtrados.map((r) => [
      r.empresa?.nome_fantasia || r.empresa?.nome || "",
      r.contato_telefone,
      r.flow_nome || "",
      new Date(r.enviado_em).toLocaleString("pt-BR"),
      r.respondido_em ? new Date(r.respondido_em).toLocaleString("pt-BR") : "",
      r.status,
      (r.resposta_texto || "").replace(/\n/g, " ").replace(/"/g, '""'),
    ]);
    const csv = [header, ...linhas].map((l) => l.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `monitor-respostas-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const badgeStatus = (s: Row["status"]) => {
    if (s === "respondeu") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300"><CheckCircle2 className="h-3 w-3 mr-1" />Respondeu</Badge>;
    if (s === "sem_resposta") return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" />Sem resposta</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-amber-300"><Clock className="h-3 w-3 mr-1" />Aguardando</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Monitor de Respostas
          </h1>
          <p className="text-sm text-muted-foreground">Acompanhe quem respondeu ou não aos envios do bot no WhatsApp.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCsv}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-emerald-700">Respondeu</div><div className="text-2xl font-bold text-emerald-700">{stats.respondeu}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-amber-700">Aguardando</div><div className="text-2xl font-bold text-amber-700">{stats.aguardando}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-red-700">Sem resposta</div><div className="text-2xl font-bold text-red-700">{stats.sem_resposta}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Envios</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <Input placeholder="Buscar empresa ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs h-9" />
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="respondeu">Respondeu</SelectItem>
                <SelectItem value="sem_resposta">Sem resposta</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fluxoFiltro} onValueChange={setFluxoFiltro}>
              <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os fluxos</SelectItem>
                {fluxos.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Fluxo</TableHead>
                  <TableHead>Enviado</TableHead>
                  <TableHead>Respondido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resposta</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.empresa?.nome_fantasia || r.empresa?.nome || "—"}</TableCell>
                    <TableCell className="text-xs">{r.contato_telefone}</TableCell>
                    <TableCell className="text-xs">{r.flow_nome || "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(r.enviado_em).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">{r.respondido_em ? new Date(r.respondido_em).toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell>{badgeStatus(r.status)}</TableCell>
                    <TableCell className="text-xs max-w-[240px] truncate" title={r.resposta_texto || ""}>{r.resposta_texto || "—"}</TableCell>
                    <TableCell>
                      {r.empresa_id && (
                        <Link to={`/empresas?id=${r.empresa_id}`} title="Abrir empresa">
                          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtrados.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Nenhum envio no filtro atual.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
