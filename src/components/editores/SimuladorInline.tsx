import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, Printer, FileDown, Download } from "lucide-react";
import { REGISTRO_TIPOS, RegistroTipo, resolveMergeData } from "@/lib/editores/dataResolvers";
import {
  applyFillables,
  extractFieldKeys,
  extractFillables,
  renderTemplate,
} from "@/lib/editores/mergeEngine";
import { downloadHtml, downloadPdf, printHtml } from "@/lib/editores/pdfExport";
import { useRef } from "react";

const TABELA_POR_TIPO: Record<Exclude<RegistroTipo, "livre">, { tabela: string; label: string }> = {
  cliente: { tabela: "customers", label: "nome" },
  fornecedor: { tabela: "empresas", label: "nome_fantasia" },
  empresa: { tabela: "empresas", label: "nome_fantasia" },
  funcionario: { tabela: "ponto_funcionarios", label: "nome" },
  pedido: { tabela: "pedidos_ecommerce", label: "numero_pedido" },
  orcamento: { tabela: "orcamentos", label: "numero" },
};

interface Props {
  html: string;
  titulo?: string;
  /** Se true, só permite preencher lacunas ([[..]]) — texto fica travado. */
  soPreenchimento?: boolean;
}

export function SimuladorInline({ html, titulo = "documento", soPreenchimento = false }: Props) {
  const [tipo, setTipo] = useState<RegistroTipo>("livre");
  const [busca, setBusca] = useState("");
  const [registros, setRegistros] = useState<any[]>([]);
  const [registroId, setRegistroId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [fillables, setFillables] = useState<Record<string, string>>({});
  const [dados, setDados] = useState<Record<string, any>>({});
  const pageRef = useRef<HTMLDivElement>(null);

  const camposDinamicos = useMemo(
    () => extractFieldKeys(html).filter(k => !k.startsWith("#")),
    [html],
  );
  const camposFillable = useMemo(() => extractFillables(html), [html]);

  useEffect(() => {
    if (tipo === "livre") { setRegistros([]); return; }
    const cfg = TABELA_POR_TIPO[tipo as Exclude<RegistroTipo, "livre">];
    if (!cfg) return;
    const t = setTimeout(async () => {
      let q = supabase.from(cfg.tabela as any).select(`id, ${cfg.label}`).limit(20);
      if (busca) q = q.ilike(cfg.label, `%${busca}%`);
      const { data } = await q;
      setRegistros(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [tipo, busca]);

  useEffect(() => {
    (async () => {
      const d = await resolveMergeData(tipo, registroId);
      setDados({ ...d, ...overrides });
    })();
  }, [tipo, registroId, overrides]);

  const renderedHtml = useMemo(() => {
    const step1 = renderTemplate(html, dados, { highlightMissing: true }).html;
    return applyFillables(step1, fillables, { highlightEmpty: true });
  }, [html, dados, fillables]);

  const htmlFinalLimpo = () => {
    const step1 = renderTemplate(html, dados, { highlightMissing: false }).html;
    return applyFillables(step1, fillables, { highlightEmpty: false });
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 p-4 overflow-auto">
      <Card className="p-3 space-y-3 h-fit sticky top-0">
        <div>
          <label className="text-xs text-muted-foreground">Vincular tabela</label>
          <Select value={tipo} onValueChange={(v: RegistroTipo) => { setTipo(v); setRegistroId(null); }}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REGISTRO_TIPOS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {tipo !== "livre" && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Buscar registro</label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Digite…" className="pl-7 h-8" />
            </div>
            <div className="border rounded max-h-40 overflow-auto">
              {registros.map((r: any) => {
                const cfg = TABELA_POR_TIPO[tipo as Exclude<RegistroTipo, "livre">];
                return (
                  <button key={r.id} onClick={() => setRegistroId(r.id)}
                    className={`block w-full text-left text-xs px-2 py-1.5 hover:bg-muted/50 ${registroId === r.id ? "bg-primary/10" : ""}`}>
                    {r[cfg.label] || r.id}
                  </button>
                );
              })}
              {registros.length === 0 && <div className="text-xs text-muted-foreground p-2">Nenhum registro.</div>}
            </div>
          </div>
        )}

        {camposFillable.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-semibold text-primary">📝 Lacunas preenchíveis</div>
            {camposFillable.map(k => (
              <div key={k}>
                <label className="text-[11px] text-muted-foreground">{k}</label>
                <Input value={fillables[k] ?? ""} onChange={e => setFillables({ ...fillables, [k]: e.target.value })} className="h-8 text-xs" />
              </div>
            ))}
          </div>
        )}

        {!soPreenchimento && camposDinamicos.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-semibold">Sobrescrever campos {"{{..}}"}</div>
            {camposDinamicos.map(k => (
              <div key={k}>
                <label className="text-[11px] text-muted-foreground font-mono">{`{{${k}}}`}</label>
                <Input value={overrides[k] ?? String(dados[k] ?? "")} onChange={e => setOverrides({ ...overrides, [k]: e.target.value })} className="h-8 text-xs" />
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-3 space-y-2">
          <Button size="sm" className="w-full" onClick={() => pageRef.current && downloadPdf(pageRef.current, { filename: titulo })}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" className="w-full" onClick={() => printHtml(htmlFinalLimpo())}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
          <Button size="sm" variant="outline" className="w-full" onClick={() => downloadHtml(htmlFinalLimpo(), titulo)}>
            <Download className="h-4 w-4 mr-1" /> HTML
          </Button>
        </div>
      </Card>

      <div className="bg-muted/20 rounded overflow-auto">
        <div
          ref={pageRef}
          className="bg-white text-black shadow-xl mx-auto my-2"
          style={{ width: "210mm", minHeight: "297mm", padding: "20mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif", fontSize: "12pt", lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </div>
    </div>
  );
}
