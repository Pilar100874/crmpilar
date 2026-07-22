import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertTriangle, ShieldCheck, Settings, Trash2, Unlock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

export default function PontoExportacao() {
  const { empresaId } = usePontoEmpresa();
  const navigate = useNavigate();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [inicio, setInicio] = useState(firstDay);
  const [fim, setFim] = useState(lastDay);
  const [layoutId, setLayoutId] = useState<string>("");
  const [layouts, setLayouts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [validando, setValidando] = useState(false);
  const [erros, setErros] = useState<any[]>([]);
  const [delTarget, setDelTarget] = useState<any | null>(null);
  const [reabrirTarget, setReabrirTarget] = useState<any | null>(null);

  const loadLayouts = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("ponto_export_layouts").select("*")
      .eq("empresa_id", empresaId).eq("ativo", true).order("descricao");
    setLayouts(data || []);
    if (data?.length && !layoutId) setLayoutId(data[0].id);
  };
  const loadLogs = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("ponto_export_logs").select("*")
      .eq("empresa_id", empresaId).order("created_at", { ascending: false }).limit(20);
    setLogs(data || []);
  };
  useEffect(() => { loadLayouts(); loadLogs(); }, [empresaId]);

  const layoutSelecionado = layouts.find(l => l.id === layoutId);

  const validar = async () => {
    if (!empresaId || !layoutId) return toast.error("Selecione um layout");
    setValidando(true); setErros([]);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-exportar-folha", {
        body: { empresa_id: empresaId, inicio, fim, layout_id: layoutId, validar_apenas: true },
      });
      if (error) throw error;
      setErros(data.erros || []);
      if ((data.erros || []).length === 0) toast.success("Tudo validado, pronto para exportar");
      else toast.warning(`${data.erros.length} problema(s) encontrado(s)`);
    } catch (e: any) { toast.error(e.message); }
    finally { setValidando(false); }
  };

  const gerar = async () => {
    if (!empresaId || !layoutId) return toast.error("Selecione um layout");
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-exportar-folha", {
        body: { empresa_id: empresaId, inicio, fim, layout_id: layoutId },
      });
      if (error) throw error;
      const blob = new Blob([data.conteudo], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = layoutSelecionado?.descricao?.replace(/\W+/g, "_") || layoutSelecionado?.software || "layout";
      a.href = url; a.download = `${slug}_${inicio}_${fim}.txt`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Arquivo gerado");
      loadLogs();
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  const baixar = async (log: any) => {
    if (!log.arquivo_url) return toast.error("Arquivo indisponível");
    const { data } = await supabase.storage.from("ponto-exports").createSignedUrl(log.arquivo_url, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const excluirExport = async (log: any) => {
    try {
      if (log.arquivo_url) {
        await supabase.storage.from("ponto-exports").remove([log.arquivo_url]);
      }
      const { error } = await supabase.from("ponto_export_logs").delete().eq("id", log.id);
      if (error) throw error;
      toast.success("Exportação excluída");
      setDelTarget(null);
      loadLogs();
    } catch (e: any) { toast.error(e.message); }
  };

  const reabrirPeriodo = async (log: any) => {
    if (!empresaId) return;
    try {
      // Remove fechamentos que se sobrepõem ao período do export
      const { data: fechs, error: fErr } = await supabase
        .from("ponto_periodos_fechamento")
        .select("id, mes_referencia")
        .eq("empresa_id", empresaId)
        .gte("mes_referencia", log.periodo_inicio)
        .lte("mes_referencia", log.periodo_fim);
      if (fErr) throw fErr;
      let removidos = 0;
      if (fechs?.length) {
        const { error: dErr } = await supabase
          .from("ponto_periodos_fechamento")
          .delete()
          .in("id", fechs.map((f) => f.id));
        if (dErr) throw dErr;
        removidos = fechs.length;
      }
      // Marca o log como reaberto
      await supabase.from("ponto_export_logs")
        .update({ status: "reaberto", observacao: `Reaberto em ${new Date().toLocaleString("pt-BR")}` })
        .eq("id", log.id);
      toast.success(`Período reaberto${removidos ? ` (${removidos} fechamento(s) removido(s))` : ""}`);
      setReabrirTarget(null);
      // Pré-popula faixa para nova geração
      setInicio(log.periodo_inicio);
      setFim(log.periodo_fim);
      loadLogs();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Exportação para Folha</h2>
        <p className="text-sm text-muted-foreground">
          Usa o layout cadastrado em <strong>Layouts de Exportação</strong> com rubricas, formato de horas e filtros configurados.
        </p>
      </div>

      {layouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum layout cadastrado ainda.</p>
            <Button onClick={() => navigate("/ponto/layouts-exportacao")}>
              <Settings className="mr-2 h-4 w-4" /> Cadastrar layouts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <div>
                <Label>Layout cadastrado</Label>
                <Select value={layoutId} onValueChange={setLayoutId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {layouts.map((l) => <SelectItem key={l.id} value={l.id}>{l.descricao || l.software}</SelectItem>)}
                  </SelectContent>
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

            <div className="rounded border border-primary/30 bg-primary/5 p-3 flex flex-wrap items-center gap-3 justify-between">
              <div className="text-xs">
                <p className="font-semibold">Exportação consolidada (multi-layout)</p>
                <p className="text-muted-foreground">
                  Gera um arquivo por layout numa única operação, respeitando o layout vinculado a cada funcionário
                  (cadastro → campo "Layout de exportação"). Funcionários sem layout caem no layout selecionado acima.
                </p>
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  if (!empresaId) return;
                  setGenerating(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("ponto-exportar-folha", {
                      body: { empresa_id: empresaId, inicio, fim, consolidado: true, layout_padrao_id: layoutId || null },
                    });
                    if (error) throw error;
                    if (!data.arquivos?.length) {
                      toast.warning("Nenhum arquivo gerado — verifique vínculos de layout");
                    } else {
                      for (const a of data.arquivos) {
                        const blob = new Blob([a.conteudo], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url; link.download = a.arquivo_nome; link.click();
                        URL.revokeObjectURL(url);
                        await new Promise((r) => setTimeout(r, 300));
                      }
                      toast.success(`${data.arquivos.length} arquivo(s) gerado(s)`);
                    }
                    if (data.erros?.length) setErros(data.erros);
                    loadLogs();
                  } catch (e: any) { toast.error(e.message); }
                  finally { setGenerating(false); }
                }}
                disabled={generating || !empresaId}
              >
                <Download className="mr-2 h-4 w-4" /> Exportar consolidado
              </Button>
            </div>


            {layoutSelecionado && (
              <div className="rounded border bg-muted/30 p-3 text-xs space-y-1">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{layoutSelecionado.software}</Badge>
                  <Badge variant="outline">Matrícula: {layoutSelecionado.tamanho_matricula}</Badge>
                  <Badge variant="outline">Horas: {layoutSelecionado.formato_horas}</Badge>
                  <Badge variant="outline">{(layoutSelecionado.eventos || []).length} rubrica(s)</Badge>
                </div>
                {(layoutSelecionado.eventos || []).length > 0 && (
                  <div className="text-muted-foreground">
                    Eventos: {layoutSelecionado.eventos.map((e: any) => `${e.evento}→${e.campo}`).join(", ")}
                  </div>
                )}
              </div>
            )}

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
      )}

      <div>
        <h3 className="mb-2 font-semibold">Exportações recentes</h3>
        {logs.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma exportação ainda.</p>
          </CardContent></Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border resp-table-wrap">
            <table className="w-full table-fixed text-sm resp-table">
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
                      <div className="flex items-center justify-end gap-1">
                        {l.arquivo_url && (
                          <Button size="sm" variant="ghost" onClick={() => baixar(l)} title="Baixar">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setReabrirTarget(l)} title="Reabrir período">
                          <Unlock className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDelTarget(l)} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        onConfirm={() => delTarget && excluirExport(delTarget)}
        title="Excluir exportação?"
        description={delTarget ? `O arquivo gerado em ${new Date(delTarget.created_at).toLocaleString("pt-BR")} para o período ${delTarget.periodo_inicio} → ${delTarget.periodo_fim} será removido permanentemente.` : ""}
      />

      <DeleteConfirmDialog
        open={!!reabrirTarget}
        onOpenChange={(o) => !o && setReabrirTarget(null)}
        onConfirm={() => reabrirTarget && reabrirPeriodo(reabrirTarget)}
        title="Reabrir período exportado?"
        description={reabrirTarget ? `O período ${reabrirTarget.periodo_inicio} → ${reabrirTarget.periodo_fim} ficará disponível para nova edição e geração. Fechamentos mensais sobrepostos serão removidos.` : ""}
      />

    </div>
  );
}
