import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, RefreshCw, Filter } from "lucide-react";

const TIPOS: Record<string, string> = {
  he_acima_limite: "HE acima do limite",
  jornada_acima_limite: "Jornada acima do limite",
  intervalo_violado: "Intervalo violado",
  interjornada_violada: "Interjornada violada",
  dsr_violado: "DSR violado",
  batida_duplicada: "Batida duplicada",
  batida_simultanea: "Batida simultânea suspeita",
  padrao_suspeito: "Padrão suspeito",
  geofence_violado: "Geofence violado",
};

const SEV_CLASS: Record<string, string> = {
  baixa: "bg-blue-500/15 text-blue-700",
  media: "bg-yellow-500/15 text-yellow-700",
  alta: "bg-orange-500/15 text-orange-700",
  critica: "bg-red-500/15 text-red-700",
};

export default function PontoAnomalias() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<any[]>([]);
  const [filtroSev, setFiltroSev] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("nao_resolvidas");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    let q = supabase.from("ponto_anomalias")
      .select("*, ponto_funcionarios(nome)")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (filtroSev !== "todas") q = q.eq("severidade", filtroSev);
    if (filtroStatus === "nao_resolvidas") q = q.eq("resolvida", false);
    else if (filtroStatus === "resolvidas") q = q.eq("resolvida", true);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [empresaId, filtroSev, filtroStatus]);

  const detectar = async () => {
    if (!empresaId) return;
    const t = toast.loading("Detectando anomalias...");
    const { error, data } = await supabase.functions.invoke("ponto-detectar-anomalias", {
      body: { empresa_id: empresaId },
    });
    toast.dismiss(t);
    if (error) return toast.error(error.message);
    toast.success(`${data?.detectadas ?? 0} nova(s) anomalia(s)`);
    load();
  };

  const resolver = async (a: any) => {
    const { error } = await supabase.from("ponto_anomalias")
      .update({ resolvida: true, resolvida_em: new Date().toISOString() })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Marcada como resolvida");
    load();
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
            <AlertTriangle className="h-5 w-5" /> Anomalias de Ponto
          </h2>
          <p className="text-sm text-muted-foreground">Violações CLT, batidas duplicadas, padrões suspeitos e fraudes detectadas.</p>
        </div>
        <Button onClick={detectar}><RefreshCw className="mr-2 h-4 w-4" /> Executar detecção</Button>
      </div>

      <Card><CardContent className="flex flex-wrap items-end gap-3 p-3">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground"><Filter className="mr-1 inline h-3 w-3" />Severidade</label>
          <Select value={filtroSev} onValueChange={setFiltroSev}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="nao_resolvidas">Não resolvidas</SelectItem>
              <SelectItem value="resolvidas">Resolvidas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <div className="overflow-x-auto rounded-lg border resp-table-wrap">
        <table className="w-full table-fixed text-sm resp-table">
          <thead className="bg-muted/50"><tr className="text-left">
            <th className="p-3">Data</th><th className="p-3">Funcionário</th>
            <th className="p-3">Tipo</th><th className="p-3">Severidade</th>
            <th className="p-3">Descrição</th><th className="p-3">Status</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhuma anomalia 🎉</td></tr>
            ) : items.map(a => (
              <tr key={a.id} className="border-t">
                <td className="p-3 whitespace-nowrap">{new Date(a.data).toLocaleDateString("pt-BR")}</td>
                <td className="p-3">{a.ponto_funcionarios?.nome || "—"}</td>
                <td className="p-3">{TIPOS[a.tipo] || a.tipo}</td>
                <td className="p-3"><Badge className={SEV_CLASS[a.severidade]}>{a.severidade}</Badge></td>
                <td className="p-3 text-xs">{a.descricao}</td>
                <td className="p-3">
                  {a.resolvida
                    ? <Badge variant="outline" className="text-green-700"><CheckCircle2 className="mr-1 h-3 w-3" />Resolvida</Badge>
                    : <Badge variant="secondary">Pendente</Badge>}
                </td>
                <td className="p-3">
                  {!a.resolvida && (
                    <Button size="sm" variant="ghost" onClick={() => resolver(a)}>
                      <CheckCircle2 className="mr-1 h-4 w-4" />Resolver
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
