import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Printer, FileDown, Lock, Unlock } from "lucide-react";
import {
  applyFillables,
  extractFieldKeys,
  extractFillableTokens,
  renderTemplate,
} from "@/lib/editores/mergeEngine";
import { downloadPdf, printHtml } from "@/lib/editores/pdfExport";
import { MergeBuilderDialog, type MergeConfig } from "./MergeBuilderDialog";
import { RegistroNavigator } from "./RegistroNavigator";
import { runMergeConfig } from "@/lib/editores/runMergeConfig";

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

  useEffect(() => { setModoTravado(soPreenchimento); }, [soPreenchimento]);

  // Auto-carrega registros do merge_config salvo ao abrir a aba
  useEffect(() => {
    if (!mergeConfig?.tabela) return;
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
    return { ...base, ...overrides };
  }, [registroAtual, cfg?.alias, overrides]);

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
        <MergeBuilderDialog
          value={cfg}
          onChange={(c, sample) => {
            setCfg(c);
            setRows(sample);
            setIdx(0);
            onMergeConfigChange?.(c);
          }}
        />

        {rows.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-semibold">Simular registro</div>
            <RegistroNavigator total={rows.length} index={idx} onChange={setIdx} label={registroLabel(registroAtual)} />
          </div>
        )}

        <div className="border-t pt-3 flex items-center gap-2">
          <Switch id="modo-travado" checked={modoTravado} onCheckedChange={setModoTravado} />
          <label htmlFor="modo-travado" className="text-xs cursor-pointer flex items-center gap-1">
            {modoTravado ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            Modo formulário travado
          </label>
        </div>
        {modoTravado && (
          <p className="text-[11px] text-muted-foreground">
            Texto travado. Use <kbd className="bg-muted px-1 rounded">Tab</kbd> para navegar entre os {tokensFill.length} campo(s).
          </p>
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
    </div>
  );
}
