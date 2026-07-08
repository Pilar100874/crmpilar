import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Printer, FileDown, Lock, Unlock, ListChecks } from "lucide-react";
import {
  applyFillables,
  extractFieldKeys,
  extractFillableTokens,
  renderTemplate,
} from "@/lib/editores/mergeEngine";
import { downloadPdf, printHtml } from "@/lib/editores/pdfExport";
import { type MergeConfig } from "./MergeBuilderDialog";
import { RegistroNavigator } from "./RegistroNavigator";
import { runMergeConfig } from "@/lib/editores/runMergeConfig";
import { applyCalculatedFields, type CampoCalc } from "@/lib/editores/calcFields";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

interface Props {
  html: string;
  titulo?: string;
  soPreenchimento?: boolean;
  mergeConfig?: MergeConfig | null;
  onMergeConfigChange?: (cfg: MergeConfig) => void;
}

export function SimuladorInline({
  html, titulo = "documento", soPreenchimento = false,
  mergeConfig = null, onMergeConfigChange,
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [cfg, setCfg] = useState<MergeConfig | null>(mergeConfig);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [fillables, setFillables] = useState<Record<string, string>>({});
  const [modoTravado, setModoTravado] = useState(soPreenchimento);
  const pageRef = useRef<HTMLDivElement>(null);
  const [camposCalc, setCamposCalc] = useState<CampoCalc[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDraft, setBulkDraft] = useState<Record<string, string>>({});

  useEffect(() => { setModoTravado(soPreenchimento); }, [soPreenchimento]);

  // Carrega definições de campos (para aplicar cálculos)
  useEffect(() => {
    (async () => {
      const eid = await getEstabelecimentoId();
      if (!eid) return;
      const load = async () => {
        const { data } = await supabase
          .from("doc_campos")
          .select("chave, tipo, formato")
          .eq("estabelecimento_id", eid);
        setCamposCalc((data ?? []) as CampoCalc[]);
      };
      void load();
      const h = () => void load();
      window.addEventListener("doc-campos:changed", h);
      return () => window.removeEventListener("doc-campos:changed", h);
    })();
  }, []);

  // Auto-carrega registros do merge_config salvo ao abrir a aba
  useEffect(() => {
    if (!mergeConfig?.tabela && !(mergeConfig?.mode === "sql" && mergeConfig?.sql)) return;
    setCfg(mergeConfig);
    runMergeConfig(mergeConfig)
      .then(r => { setRows(Array.isArray(r) ? r : []); setIdx(0); })
      .catch(err => { console.warn("[Simulador] falha ao carregar merge:", err); setRows([]); });
  }, [mergeConfig]);


  const registroAtual = rows[idx];
  const dados: Record<string, any> = useMemo(() => {
    const base: Record<string, any> = { data_atual: new Date().toLocaleDateString("pt-BR") };
    if (registroAtual && cfg?.alias) base[cfg.alias] = registroAtual;
    if (registroAtual) Object.assign(base, registroAtual);
    const merged = { ...base, ...overrides };
    return applyCalculatedFields(merged, camposCalc);
  }, [registroAtual, cfg?.alias, overrides, camposCalc]);

  const camposDinamicos = useMemo(() => extractFieldKeys(html).filter(k => !k.startsWith("#")), [html]);
  const tokensFill = useMemo(() => extractFillableTokens(html), [html]);

  const renderedHtml = useMemo(() => {
    try {
      const base = html && html.trim() ? html : "<p><em>Documento vazio</em></p>";
      const step1 = renderTemplate(base, dados, { highlightMissing: !modoTravado }).html;
      return applyFillables(step1, fillables, {
        highlightEmpty: !modoTravado,
        asInput: modoTravado,
      });
    } catch (err) {
      console.error("[Simulador] erro ao renderizar:", err);
      return `<p style="color:#b91c1c">Erro ao renderizar o documento. Verifique os campos.</p>`;
    }
  }, [html, dados, fillables, modoTravado]);

  const htmlFinalLimpo = () => {
    const step1 = renderTemplate(html, dados, { highlightMissing: false }).html;
    return applyFillables(step1, fillables, { highlightEmpty: false });
  };

  // Coleta valores dos inputs renderizados (modo travado) antes de imprimir/PDF
  const coletarFillables = () => {
    const el = pageRef.current;
    if (!el) return;
    const next = { ...fillables };
    el.querySelectorAll<HTMLElement>("[data-fillable]").forEach(node => {
      const key = node.getAttribute("data-fillable") || "";
      if (node instanceof HTMLInputElement) {
        if (node.type === "checkbox") next[key] = node.checked ? "true" : "";
        else if (node.type === "radio") { if (node.checked) next[key] = node.value; }
        else next[key] = node.value;
      } else if (node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) {
        next[key] = node.value;
      }
    });
    setFillables(next);
    return next;
  };

  const gerarPdf = async () => {
    coletarFillables();
    await new Promise(r => setTimeout(r, 100));
    if (pageRef.current) await downloadPdf(pageRef.current, { filename: titulo });
  };

  const imprimir = () => {
    coletarFillables();
    setTimeout(() => printHtml(htmlFinalLimpo()), 50);
  };

  const registroLabel = (r: any): string => {
    if (!r) return "";
    return r.nome || r.nome_fantasia || r.razao_social || r.titulo || r.numero_pedido || r.numero || r.id || "";
  };

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 p-4 overflow-auto">

      <Card className="p-3 space-y-3 h-fit sticky top-0">
        {!cfg?.tabela && !cfg?.sql && (
          <div className="text-[11px] text-muted-foreground border rounded p-2 bg-muted/30">
            Nenhum vínculo de dados configurado no modelo. Use "Vincular dados" no editor para configurar.
          </div>
        )}

        {/* Navegação de registros foi movida para a barra superior do editor. */}


        <div className="border-t pt-3 flex items-center gap-2">
          <Switch id="modo-travado" checked={modoTravado} onCheckedChange={setModoTravado} />
          <label htmlFor="modo-travado" className="text-xs cursor-pointer flex items-center gap-1">
            {modoTravado ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            Modo formulário travado
          </label>
        </div>
        {modoTravado && (
          <>
            <p className="text-[11px] text-muted-foreground">
              Texto travado. Use <kbd className="bg-muted px-1 rounded">Tab</kbd> para navegar entre os {tokensFill.length} campo(s).
            </p>
            {tokensFill.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  const draft: Record<string, string> = {};
                  tokensFill.forEach(t => {
                    draft[t.raw] = fillables[t.raw] ?? fillables[t.label] ?? "";
                  });
                  setBulkDraft(draft);
                  setBulkOpen(true);
                }}
              >
                <ListChecks className="h-4 w-4 mr-1" /> Preencher todos os campos
              </Button>
            )}
          </>
        )}

        {!modoTravado && camposDinamicos.length > 0 && (
          <div className="border-t pt-3 space-y-2 max-h-64 overflow-auto">
            <div className="text-xs font-semibold">Sobrescrever {"{{campos}}"}</div>
            {camposDinamicos.map(k => (
              <div key={k}>
                <label className="text-[11px] text-muted-foreground font-mono">{`{{${k}}}`}</label>
                <Input
                  value={overrides[k] ?? String(dados[k] ?? "")}
                  onChange={e => setOverrides({ ...overrides, [k]: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        )}

        {registroAtual && (
          <details className="border-t pt-3">
            <summary className="text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground">
              Ver dados brutos do registro (JSON)
            </summary>
            <pre className="mt-2 text-[10px] bg-muted/40 p-2 rounded max-h-64 overflow-auto font-mono">
              {JSON.stringify(dados, null, 2)}
            </pre>
          </details>
        )}


        <div className="border-t pt-3 space-y-2">
          <Button size="sm" className="w-full" onClick={gerarPdf}>
            <FileDown className="h-4 w-4 mr-1" /> Gerar PDF
          </Button>
          <Button size="sm" variant="outline" className="w-full" onClick={imprimir}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
        </div>
      </Card>

      <div className="bg-muted/20 rounded overflow-auto">
        <div
          ref={pageRef}
          className={modoTravado ? "doc-locked bg-white text-black shadow-xl mx-auto my-2" : "bg-white text-black shadow-xl mx-auto my-2"}
          style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
        <style>{`
          .doc-locked { user-select: none; -webkit-user-select: none; }
          .doc-locked [data-fillable] { user-select: text; -webkit-user-select: text; }
        `}</style>
      </div>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preencher campos do formulário</DialogTitle>
            <DialogDescription>
              Preencha todos os {tokensFill.length} campo(s) de uma vez. Os valores serão aplicados no documento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {tokensFill.map(tok => {
              const v = bulkDraft[tok.raw] ?? "";
              const setV = (nv: string) => setBulkDraft(d => ({ ...d, [tok.raw]: nv }));
              return (
                <div key={tok.raw} className="space-y-1">
                  <label className="text-xs font-medium">{tok.label}</label>
                  {tok.tipo === "textarea" ? (
                    <Textarea value={v} onChange={e => setV(e.target.value)} rows={3} />
                  ) : tok.tipo === "data" ? (
                    <Input type="date" value={v} onChange={e => setV(e.target.value)} />
                  ) : tok.tipo === "numero" ? (
                    <Input type="number" value={v} onChange={e => setV(e.target.value)} />
                  ) : tok.tipo === "check" ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={v === "true"}
                        onCheckedChange={ck => setV(ck ? "true" : "")}
                      />
                      <span className="text-xs text-muted-foreground">{v === "true" ? "Marcado" : "Desmarcado"}</span>
                    </div>
                  ) : tok.tipo === "lista" ? (
                    <Select value={v} onValueChange={setV}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(tok.opcoes || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : tok.tipo === "radio" ? (
                    <div className="flex flex-wrap gap-3">
                      {(tok.opcoes || []).map(o => (
                        <label key={o} className="flex items-center gap-1 text-sm">
                          <input type="radio" name={tok.raw} checked={v === o} onChange={() => setV(o)} />
                          {o}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Input value={v} onChange={e => setV(e.target.value)} />
                  )}
                </div>
              );
            })}
            {tokensFill.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum campo de formulário no documento.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancelar</Button>
            <Button onClick={() => { setFillables(f => ({ ...f, ...bulkDraft })); setBulkOpen(false); }}>
              Aplicar no documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
