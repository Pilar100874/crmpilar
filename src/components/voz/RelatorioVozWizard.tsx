import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, Save, RotateCcw, ChevronRight, Database, FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


export type FiltroSchema = {
  chave: string;
  rotulo: string;
  coluna: string;
  tipo: "text" | "number" | "date" | "date_range" | "enum" | "boolean";
  operador?: "eq" | "ilike" | "gte" | "lte" | "in";
  obrigatorio?: boolean;
  opcoes?: string[];
};

type Relatorio = {
  id: string; nome: string; grupo: string; tipo_saida: string;
  tabela_base: string | null;
  filtros_disponiveis: FiltroSchema[];
  campos_exibicao: any[];
};

interface Props {
  relatorio: Relatorio;
  onFechar: () => void;
  onFalar?: (texto: string) => void;
}

export default function RelatorioVozWizard({ relatorio, onFechar, onFalar }: Props) {
  const filtros = useMemo<FiltroSchema[]>(
    () => Array.isArray(relatorio.filtros_disponiveis) ? relatorio.filtros_disponiveis : [],
    [relatorio.filtros_disponiveis],
  );
  const [step, setStep] = useState<"filtros" | "executando" | "resultado">("filtros");
  const [valores, setValores] = useState<Record<string, any>>({});
  const [dados, setDados] = useState<any[]>([]);
  const [nomeSnapshot, setNomeSnapshot] = useState("");
  const [permanente, setPermanente] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    // Inicia com defaults vazios
    const init: Record<string, any> = {};
    for (const f of filtros) if (f.tipo === "date_range") init[f.chave] = { de: "", ate: "" };
    setValores(init);
  }, [filtros]);

  const executar = async (opts?: { salvarNome?: string; permanente?: boolean }) => {
    // Valida obrigatórios
    const faltando = filtros.filter(f => {
      if (!f.obrigatorio) return false;
      const v = valores[f.chave];
      if (v === undefined || v === null || v === "") return true;
      if (f.tipo === "date_range") return !v?.de && !v?.ate;
      return false;
    });
    if (faltando.length) {
      const msg = `Preciso do filtro: ${faltando[0].rotulo}`;
      toast.error(msg);
      onFalar?.(msg);
      return;
    }
    setStep("executando");
    onFalar?.(`Gerando ${relatorio.nome}.`);
    try {
      const { data, error } = await supabase.functions.invoke("relatorio-voz-executor", {
        body: {
          relatorio_id: relatorio.id,
          filtros: valores,
          salvar_nome: opts?.salvarNome ?? null,
          permanente: !!opts?.permanente,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setDados((data as any)?.dados ?? []);
      setStep("resultado");
      onFalar?.(`Pronto. ${(data as any)?.total ?? 0} registros.`);
    } catch (e: any) {
      toast.error(e.message);
      setStep("filtros");
    }
  };

  const salvarSnapshot = async () => {
    if (!nomeSnapshot.trim()) { toast.error("Digite um nome"); return; }
    setSalvando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("relatorio_snapshots").insert({
        usuario_id: userData.user!.id,
        relatorio_voz_id: relatorio.id,
        nome: nomeSnapshot.trim(),
        filtros_aplicados: valores,
        dados,
        total_registros: dados.length,
        permanente,
      });
      if (error) throw error;
      toast.success(permanente ? "Snapshot salvo (permanente)" : "Snapshot salvo (7 dias)");
      setNomeSnapshot("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const colunas = dados.length ? Object.keys(dados[0]) : [];

  const gerarPdf = useCallback((opts?: { titulo?: string; nomeArquivo?: string }) => {
    if (!dados.length) { toast.error("Nenhum dado para exportar"); return; }
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const cols = Object.keys(dados[0]);
      const titulo = (opts?.titulo && opts.titulo.trim()) || relatorio.nome;
      doc.setFontSize(14);
      doc.text(titulo, 14, 15);
      doc.setFontSize(9);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} · ${dados.length} registro(s)`, 14, 21);
      autoTable(doc, {
        startY: 26,
        head: [cols],
        body: dados.map(r => cols.map(c => r[c] != null ? String(r[c]) : "-")),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
      });
      const base = (opts?.nomeArquivo && opts.nomeArquivo.trim())
        || `${relatorio.nome.replace(/[^a-z0-9]+/gi, "_")}_${Date.now()}`;
      const nome = base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
      doc.save(nome);
      toast.success(`PDF gerado: ${nome}`);
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar PDF");
    }
  }, [dados, relatorio.nome]);

  // Escuta comando de voz "gerar pdf" (com título/arquivo opcionais)
  useEffect(() => {
    const handler = (e: Event) => {
      if (step !== "resultado") return;
      const detail = (e as CustomEvent).detail as { titulo?: string; nomeArquivo?: string } | undefined;
      gerarPdf(detail);
    };
    window.addEventListener("voz:gerar-pdf-relatorio", handler);
    return () => window.removeEventListener("voz:gerar-pdf-relatorio", handler);
  }, [step, gerarPdf]);

  if (step === "executando") {

    return (
      <div className="p-6 flex flex-col items-center gap-3 text-sm">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Consultando dados reais…</span>
      </div>
    );
  }

  if (step === "resultado") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{dados.length} registro(s)</div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={gerarPdf} disabled={!dados.length}>
              <FileDown className="h-3 w-3 mr-1" /> PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStep("filtros")}>
              <RotateCcw className="h-3 w-3 mr-1" /> Mudar filtros
            </Button>
          </div>
        </div>

        {dados.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">Nenhum dado encontrado.</div>
        ) : (
          <ScrollArea className="h-[240px] border rounded">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>{colunas.map(c => <th key={c} className="px-2 py-1 text-left whitespace-nowrap">{c}</th>)}</tr>
              </thead>
              <tbody>
                {dados.slice(0, 200).map((row, i) => (
                  <tr key={i} className="border-t">
                    {colunas.map(c => (
                      <td key={c} className="px-2 py-1 max-w-[160px] truncate">
                        {row[c] != null ? String(row[c]) : "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
        <div className="border-t pt-3 space-y-2">
          <Label className="text-xs">Salvar como snapshot (reutilizar depois)</Label>
          <div className="flex gap-2">
            <Input value={nomeSnapshot} onChange={e => setNomeSnapshot(e.target.value)}
              placeholder="Ex.: Vendas jan/2026" className="h-8 text-xs" />
            <Button size="sm" onClick={salvarSnapshot} disabled={salvando || !nomeSnapshot.trim()}>
              <Save className="h-3 w-3 mr-1" /> Salvar
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Switch checked={permanente} onCheckedChange={setPermanente} />
            <span>{permanente ? "Permanente (não expira)" : "Temporário (expira em 7 dias)"}</span>
          </div>
        </div>
      </div>
    );
  }

  // step === "filtros"
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Database className="h-3 w-3" />
        <span>Fonte: <b>{relatorio.tabela_base || "API"}</b> · {filtros.length} filtro(s)</span>
      </div>

      {filtros.length === 0 && (
        <div className="text-xs text-muted-foreground italic">
          Sem filtros configurados — o relatório será executado direto.
        </div>
      )}

      {filtros.map(f => (
        <div key={f.chave} className="space-y-1">
          <Label className="text-xs">
            {f.rotulo}
            {f.obrigatorio && <span className="text-destructive"> *</span>}
          </Label>
          {f.tipo === "text" && (
            <Input className="h-8 text-xs" value={valores[f.chave] ?? ""}
              onChange={e => setValores(v => ({ ...v, [f.chave]: e.target.value }))} />
          )}
          {f.tipo === "number" && (
            <Input type="number" className="h-8 text-xs" value={valores[f.chave] ?? ""}
              onChange={e => setValores(v => ({ ...v, [f.chave]: e.target.value ? Number(e.target.value) : "" }))} />
          )}
          {f.tipo === "date" && (
            <Input type="date" className="h-8 text-xs" value={valores[f.chave] ?? ""}
              onChange={e => setValores(v => ({ ...v, [f.chave]: e.target.value }))} />
          )}
          {f.tipo === "date_range" && (
            <div className="flex gap-2">
              <Input type="date" className="h-8 text-xs" value={valores[f.chave]?.de ?? ""}
                onChange={e => setValores(v => ({ ...v, [f.chave]: { ...(v[f.chave] || {}), de: e.target.value } }))} />
              <Input type="date" className="h-8 text-xs" value={valores[f.chave]?.ate ?? ""}
                onChange={e => setValores(v => ({ ...v, [f.chave]: { ...(v[f.chave] || {}), ate: e.target.value } }))} />
            </div>
          )}
          {f.tipo === "boolean" && (
            <Switch checked={!!valores[f.chave]}
              onCheckedChange={c => setValores(v => ({ ...v, [f.chave]: c }))} />
          )}
          {f.tipo === "enum" && (
            <Select value={valores[f.chave] ?? ""} onValueChange={val => setValores(v => ({ ...v, [f.chave]: val }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Escolher…" /></SelectTrigger>
              <SelectContent>
                {(f.opcoes || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="ghost" onClick={onFechar}>Cancelar</Button>
        <Button size="sm" className="flex-1" onClick={() => executar()}>
          <Play className="h-3 w-3 mr-1" /> Gerar relatório
          <ChevronRight className="h-3 w-3 ml-auto" />
        </Button>
      </div>
    </div>
  );
}
