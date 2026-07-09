import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGISTRO_TIPOS, RegistroTipo, resolveMergeData } from "@/lib/editores/dataResolvers";
import { extractFieldKeys, extractFillables, renderTemplate, applyFillables } from "@/lib/editores/mergeEngine";
import { downloadPdf, downloadHtml, printHtml, downloadHtmlsPdf } from "@/lib/editores/pdfExport";
import { FileDown, Printer, Download, Save, Search, ArrowLeft, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Modelo {
  id: string; titulo: string; content_html: string; versao_atual: number;
}

const TABELA_POR_TIPO: Record<Exclude<RegistroTipo,"livre">, { tabela: string; label: string }> = {
  cliente:      { tabela: "customers",        label: "nome" },
  fornecedor:   { tabela: "empresas",         label: "nome_fantasia" },
  empresa:      { tabela: "empresas",         label: "nome_fantasia" },
  funcionario:  { tabela: "ponto_funcionarios", label: "nome" },
  pedido:       { tabela: "pedidos_ecommerce", label: "numero_pedido" },
  orcamento:    { tabela: "orcamentos",       label: "numero" },
};

export default function GerarDocumento() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const modeloIdInicial = sp.get("modelo");
  const [estabId, setEstabId] = useState<string | null>(null);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [modeloId, setModeloId] = useState<string>(modeloIdInicial ?? "");
  const [tipo, setTipo] = useState<RegistroTipo>("livre");
  const [registroBusca, setRegistroBusca] = useState("");
  const [registros, setRegistros] = useState<any[]>([]);
  const [registroIds, setRegistroIds] = useState<string[]>([]);
  const registroId = registroIds[0] ?? null;
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"pdf" | "print">("pdf");
  const [previewHtmls, setPreviewHtmls] = useState<string[]>([]);
  const [dados, setDados] = useState<Record<string, any>>({});
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [fillables, setFillables] = useState<Record<string, string>>({});
  const [soPreenchimento, setSoPreenchimento] = useState(false);
  const [rendered, setRendered] = useState<string>("");
  const [missing, setMissing] = useState<string[]>([]);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getEstabelecimentoId().then(setEstabId); }, []);
  useEffect(() => {
    if (!estabId) return;
    supabase.from("doc_modelos").select("id, titulo, content_html, versao_atual").eq("estabelecimento_id", estabId).eq("ativo", true).order("titulo").then(({ data }) => setModelos((data ?? []) as Modelo[]));
  }, [estabId]);

  useEffect(() => {
    if (tipo === "livre") { setRegistros([]); return; }
    const cfg = TABELA_POR_TIPO[tipo as Exclude<RegistroTipo,"livre">];
    if (!cfg) return;
    const t = setTimeout(async () => {
      let q = supabase.from(cfg.tabela as any).select(`id, ${cfg.label}`).limit(20);
      if (registroBusca) q = q.ilike(cfg.label, `%${registroBusca}%`);
      const { data } = await q;
      setRegistros(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [tipo, registroBusca]);

  const modelo = useMemo(() => modelos.find(m => m.id === modeloId), [modelos, modeloId]);
  const camposUsados = useMemo(() => modelo ? extractFieldKeys(modelo.content_html) : [], [modelo]);
  const lacunasUsadas = useMemo(() => modelo ? extractFillables(modelo.content_html) : [], [modelo]);

  useEffect(() => {
    (async () => {
      if (!modelo) { setRendered(""); return; }
      const d = await resolveMergeData(tipo, registroId);
      const merged = { ...d, ...overrides };
      setDados(merged);
      const step1 = renderTemplate(modelo.content_html, merged, { highlightMissing: true });
      const withFill = applyFillables(step1.html, fillables, { highlightEmpty: true });
      setRendered(withFill);
      setMissing(step1.missing);
    })();
  }, [modelo, tipo, registroId, overrides, fillables]);

  const salvarNoHistorico = async (): Promise<string | null> => {
    if (!estabId || !modelo) { toast.error("Escolha um modelo"); return null; }
    const step1 = renderTemplate(modelo.content_html, dados, { highlightMissing: false });
    const finalHtml = applyFillables(step1.html, fillables, { highlightEmpty: false });
    const { data, error } = await supabase.from("doc_gerados").insert({
      estabelecimento_id: estabId,
      modelo_id: modelo.id,
      modelo_versao: modelo.versao_atual,
      registro_tipo: tipo,
      registro_id: registroId,
      titulo: modelo.titulo,
      content_html_final: finalHtml,
      dados_merge: dados,
      status: "gerado",
    }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Documento salvo no histórico");
    return (data as any).id;
  };

  /** Renderiza o HTML final para um determinado registro. */
  const renderHtmlPara = async (rid: string | null): Promise<string> => {
    if (!modelo) return "";
    const d = await resolveMergeData(tipo, rid);
    const merged = { ...d, ...overrides };
    const step1 = renderTemplate(modelo.content_html, merged, { highlightMissing: false });
    return applyFillables(step1.html, fillables, { highlightEmpty: false });
  };

  const abrirPreview = async (mode: "pdf" | "print") => {
    if (!modelo) { toast.error("Escolha um modelo"); return; }
    const ids = registroIds.length > 0 ? registroIds : [null as any];
    setGerando(true);
    try {
      const htmls = await Promise.all(ids.map(id => renderHtmlPara(id)));
      setPreviewHtmls(htmls);
      setPreviewMode(mode);
      setPreviewOpen(true);
    } finally { setGerando(false); }
  };

  const confirmarPreview = async () => {
    if (previewMode === "print") {
      printHtml(previewHtmls.join('<div style="page-break-before:always"></div>'));
      setPreviewOpen(false);
      return;
    }
    // pdf
    if (previewHtmls.length > 1) {
      setPreviewOpen(false);
      setPdfDialogOpen(true);
      return;
    }
    setGerando(true);
    try {
      await downloadHtmlsPdf(previewHtmls, { filename: modelo?.titulo ?? "documento" });
      await salvarNoHistorico();
      setPreviewOpen(false);
    } finally { setGerando(false); }
  };

  const gerarPdf = async (modo: "unico" | "individual") => {
    if (!modelo) { toast.error("Escolha um modelo"); return; }
    setGerando(true);
    try {
      const htmls = previewHtmls.length ? previewHtmls
        : await Promise.all((registroIds.length ? registroIds : [null as any]).map(id => renderHtmlPara(id)));
      if (modo === "unico") {
        await downloadHtmlsPdf(htmls, { filename: modelo.titulo });
      } else {
        for (let i = 0; i < htmls.length; i++) {
          await downloadHtmlsPdf([htmls[i]], { filename: `${modelo.titulo}-${i + 1}` });
        }
      }
      await salvarNoHistorico();
    } finally {
      setGerando(false);
      setPdfDialogOpen(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <h2 className="text-lg font-semibold">Gerar Documento</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        <Card className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Modelo</label>
            <Select value={modeloId} onValueChange={setModeloId}>
              <SelectTrigger><SelectValue placeholder="Escolha um modelo" /></SelectTrigger>
              <SelectContent>
                {modelos.map(m => <SelectItem key={m.id} value={m.id}>{m.titulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Origem dos dados</label>
            <Select value={tipo} onValueChange={(v: RegistroTipo) => { setTipo(v); setRegistroIds([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGISTRO_TIPOS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {tipo !== "livre" && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Buscar registro</label>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                <Input value={registroBusca} onChange={e => setRegistroBusca(e.target.value)} placeholder="Digite para buscar…" className="pl-7" />
              </div>
              <div className="border rounded max-h-48 overflow-auto">
                {registros.map((r: any) => {
                  const cfg = TABELA_POR_TIPO[tipo as Exclude<RegistroTipo,"livre">];
                  const label = r[cfg.label] || r.id;
                  const checked = registroIds.includes(r.id);
                  return (
                    <label key={r.id}
                      className={`flex items-center gap-2 w-full text-left text-xs px-2 py-1.5 hover:bg-muted/50 cursor-pointer ${checked ? "bg-primary/10" : ""}`}>
                      <Checkbox checked={checked} onCheckedChange={(v) => {
                        setRegistroIds(prev => v ? [...prev, r.id] : prev.filter(x => x !== r.id));
                      }} />
                      <span className="flex-1">{label}</span>
                    </label>
                  );
                })}
                {registros.length === 0 && <div className="text-xs text-muted-foreground p-2">Nenhum registro.</div>}
              </div>
            </div>
          )}

          {lacunasUsadas.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <div className="text-xs font-semibold text-primary">📝 Lacunas a preencher</div>
              {lacunasUsadas.map(k => (
                <div key={k}>
                  <label className="text-[11px] text-muted-foreground">{k}</label>
                  <Input value={fillables[k] ?? ""} onChange={e => setFillables({ ...fillables, [k]: e.target.value })} className="h-8 text-xs" />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t pt-3">
            <Switch id="lock" checked={soPreenchimento} onCheckedChange={setSoPreenchimento} />
            <label htmlFor="lock" className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> Apenas preencher lacunas (travar textos)</label>
          </div>

          {!soPreenchimento && camposUsados.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <div className="text-xs font-semibold">Sobrescrever campos {"{{..}}"}</div>
              {camposUsados.filter(k => !k.startsWith("#")).map(k => {
                const val = overrides[k] ?? (dados[k] ?? "");
                return (
                  <div key={k}>
                    <label className="text-[11px] text-muted-foreground font-mono">{`{{${k}}}`}</label>
                    <Input value={String(val ?? "")} onChange={e => setOverrides({ ...overrides, [k]: e.target.value })} className="h-8 text-xs" />
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t pt-3 space-y-2">
            <Button className="w-full" disabled={gerando} onClick={async () => {
              if (registroIds.length > 1) { setPdfDialogOpen(true); return; }
              if (pageRef.current) {
                setGerando(true);
                try {
                  await downloadPdf(pageRef.current, { filename: modelo?.titulo ?? "documento" });
                  await salvarNoHistorico();
                } finally { setGerando(false); }
              }
            }}>
              <FileDown className="h-4 w-4 mr-1" /> {gerando ? "Gerando…" : `Gerar PDF e salvar${registroIds.length > 1 ? ` (${registroIds.length})` : ""}`}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => printHtml(renderTemplate(modelo?.content_html ?? "", dados).html)}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button variant="outline" className="w-full" onClick={() => downloadHtml(renderTemplate(modelo?.content_html ?? "", dados).html, modelo?.titulo ?? "documento")}>
              <Download className="h-4 w-4 mr-1" /> Baixar HTML
            </Button>
            <Button variant="secondary" className="w-full" onClick={salvarNoHistorico}>
              <Save className="h-4 w-4 mr-1" /> Salvar no histórico
            </Button>
            {missing.length > 0 && (
              <p className="text-xs text-amber-600">⚠ Campos vazios: {missing.join(", ")}</p>
            )}
          </div>
        </Card>

        <div className="bg-muted/20 p-4 rounded overflow-auto">
          {!modelo ? (
            <Card className="p-10 text-center text-muted-foreground">Selecione um modelo para começar.</Card>
          ) : (
            <div
              ref={pageRef}
              className="bg-white text-black shadow-xl mx-auto"
              style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: rendered }}
            />
          )}
        </div>
      </div>

      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar PDF de {registroIds.length} vínculos</DialogTitle>
            <DialogDescription>
              Você selecionou vários registros. Deseja um PDF único com todos ou um arquivo separado para cada vínculo?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" disabled={gerando} onClick={() => gerarPdf("individual")}>
              1 PDF por vínculo
            </Button>
            <Button disabled={gerando} onClick={() => gerarPdf("unico")}>
              PDF único
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
