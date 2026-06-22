import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertTriangle, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";

const LAYOUTS = [
  { value: "dominio", label: "Domínio Sistemas (TXT)" },
  { value: "sage", label: "Sage (CSV)" },
  { value: "senior", label: "Senior (TXT posicional)" },
  { value: "folhamatic", label: "Folhamatic (Pipe)" },
];

export default function PontoExportacao() {
  const { empresaId } = usePontoEmpresa();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [inicio, setInicio] = useState(firstDay);
  const [fim, setFim] = useState(lastDay);
  const [layout, setLayout] = useState("dominio");
  const [logs, setLogs] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [validando, setValidando] = useState(false);
  const [erros, setErros] = useState<any[]>([]);

  const loadLogs = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("ponto_export_logs").select("*")
      .eq("empresa_id", empresaId).order("created_at", { ascending: false }).limit(20);
    setLogs(data || []);
  };
  useEffect(() => { loadLogs(); }, [empresaId]);

  const validar = async () => {
    if (!empresaId) return;
    setValidando(true); setErros([]);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-exportar-folha", {
        body: { empresa_id: empresaId, inicio, fim, layout, validar_apenas: true },
      });
      if (error) throw error;
      setErros(data.erros || []);
      if ((data.erros || []).length === 0) toast.success("Tudo validado, pronto para exportar");
      else toast.warning(`${data.erros.length} problema(s) encontrado(s)`);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setValidando(false); }
  };

  const gerar = async () => {
    if (!empresaId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-exportar-folha", {
        body: { empresa_id: empresaId, inicio, fim, layout },
      });
      if (error) throw error;
      const blob = new Blob([data.conteudo], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${layout}_${inicio}_${fim}.txt`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Arquivo gerado");
      loadLogs();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setGenerating(false); }
  };

  const baixar = async (log: any) => {
    if (!log.arquivo_url) return toast.error("Arquivo indisponível");
    const { data } = await supabase.storage.from("ponto-exports").createSignedUrl(log.arquivo_url, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Exportação para Folha</h2>
        <p className="text-sm text-muted-foreground">
          Gera arquivo no layout escolhido com validação prévia de CPF, matrícula e rubricas.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label>Layout</Label>
              <Select value={layout} onValueChange={setLayout}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LAYOUTS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Início</Label><Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
            <div><Label>Fim</Label><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={validar} disabled={validando || !empresaId}>
                <ShieldCheck className="mr-2 h-4 w-4" />{validando ? "..." : "Validar"}
              </Button>
              <Button onClick={gerar} disabled={generating || !empresaId} className="flex-1">
                <Download className="mr-2 h-4 w-4" />{generating ? "..." : "Gerar"}
              </Button>
            </div>
          </div>

          {erros.length > 0 && (
            <div className="rounded border border-destructive/50 bg-destructive/10 p-3">
              <div className="flex items-center gap-2 font-semibold text-destructive mb-2">
                <AlertTriangle className="h-4 w-4" /> {erros.length} erro(s) de cadastro
              </div>
              <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
                {erros.map((e, i) => (
                  <li key={i}>• <strong>{e.funcionario}</strong> — {e.motivo} {e.valor ? `(${e.valor})` : ""}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 font-semibold">Exportações recentes</h3>
        {logs.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma exportação ainda.</p>
          </CardContent></Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <div className="overflow-x-auto -mx-1 sm:mx-0"><table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50"><tr className="text-left">
                <th className="p-3">Quando</th><th className="p-3">Layout</th>
                <th className="p-3">Período</th><th className="p-3">Lançamentos</th>
                <th className="p-3">Status</th><th className="p-3"></th>
              </tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-3"><Badge variant="outline">{l.layout || l.formato}</Badge></td>
                    <td className="p-3">{l.periodo_inicio} → {l.periodo_fim}</td>
                    <td className="p-3">{l.total_registros}</td>
                    <td className="p-3">
                      <Badge variant={l.status === "gerado" ? "default" : "secondary"}>{l.status}</Badge>
                    </td>
                    <td className="p-3">
                      {l.arquivo_url && <Button size="sm" variant="ghost" onClick={() => baixar(l)}>
                        <Download className="h-4 w-4" />
                      </Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
      </div>
    </div>
  );
}
