import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Play, Plus, Trash2, Search, Image as ImageIcon, Link2, Repeat, Sigma, Check, ChevronRight, ChevronLeft, Table2, Filter, Calculator, GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { evalCalculados, type CampoCalculado } from "@/lib/editores/mergeEngine";
import { ImportSpreadsheetWizard } from "./ImportSpreadsheetWizard";
import {
  getAllDatasets, getDataset, registerDataset, subscribeDatasets,
  type ImportedDataset,
} from "@/lib/editores/importedDatasetStore";
import { FileSpreadsheet } from "lucide-react";
import { useSyncExternalStore } from "react";

export interface MergeConfigFiltro {
  campo: string;
  op: "eq" | "ilike" | "gt" | "lt" | "gte" | "lte" | "neq";
  valor: string;
}

export interface MergeRelation {
  alias: string;
  tabela: string;
  localKey: string;
  foreignKey: string;
  cardinality: "1:1" | "1:N";
}

export interface MergeConfig {
  mode?: "visual" | "sql";
  tabela: string;
  alias: string;
  filtros: MergeConfigFiltro[];
  limite: number;
  calculados?: CampoCalculado[];
  relations?: MergeRelation[];
  sql?: string;
  camposSelecionados?: Record<string, string[]>; // tabela -> campos
}

interface Props {
  value?: MergeConfig | null;
  onChange: (cfg: MergeConfig, sampleRows: any[]) => void;
  onInsertField?: (chave: string) => void;
  onSelectFields?: (chaves: string[]) => void;
  onSaveTable?: (name: string, meta: { alias: string; cols: string[] }) => void;
  initialSelected?: string[];
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  triggerLabel?: string;
  triggerAsIcon?: boolean;
  onImportedDataset?: (ds: ImportedDataset) => void;
}


const TABELAS = [
  { value: "customers", label: "Clientes" },
  { value: "empresas", label: "Empresas / Fornecedores" },
  { value: "ponto_funcionarios", label: "Funcionários" },
  { value: "pedidos_ecommerce", label: "Pedidos" },
  { value: "pedidos_ecommerce_itens", label: "Itens de Pedidos" },
  { value: "orcamentos", label: "Orçamentos" },
  { value: "orcamento_itens", label: "Itens de Orçamento" },
  { value: "produtos", label: "Produtos" },
  { value: "vis_visitors", label: "Visitantes" },
  { value: "veiculos", label: "Veículos" },
];

const OPS: { v: MergeConfigFiltro["op"]; label: string }[] = [
  { v: "eq", label: "igual a" },
  { v: "neq", label: "diferente de" },
  { v: "ilike", label: "contém" },
  { v: "gt", label: "maior que" },
  { v: "gte", label: "maior ou igual" },
  { v: "lt", label: "menor que" },
  { v: "lte", label: "menor ou igual" },
];

const STEPS = [
  { id: 0, label: "Tabelas & Campos", icon: Table2 },
  { id: 1, label: "Filtros & Cálculos", icon: Filter },
  { id: 2, label: "Consultar", icon: Play },
  { id: 3, label: "Inserir campos", icon: Check },
];

async function fetchApiEndpointRows(endpointId: string, limit = 5): Promise<any[]> {
  // IMPORTANT: a edge function encaminha TODO o body (exceto endpoint_id/endpoint_path)
  // como parâmetros do SQL Server. Enviar `params`/`limit` faz o proxy rejeitar com
  // "Validation failed for parameter 'params'". Portanto só mandamos endpoint_id.
  const { data, error } = await supabase.functions.invoke("execute-dynamic-query", {
    body: { endpoint_id: endpointId },
  });
  if (error) {
    const msg = (data as any)?.error || (error as any)?.message || "Falha ao chamar execute-dynamic-query";
    throw new Error(`API endpoint: ${msg}`);
  }
  if ((data as any)?.success === false) {
    throw new Error(`API endpoint: ${(data as any)?.error ?? "erro desconhecido"}`);
  }
  const rowsAll = (data as any)?.data ?? (data as any)?.rows ?? (Array.isArray(data) ? data : []);
  const rows = Array.isArray(rowsAll) ? rowsAll : [];
  return typeof limit === "number" && limit > 0 ? rows.slice(0, limit) : rows;
}

// Extrai nomes de colunas da cláusula SELECT ... FROM (fallback quando não há linhas)
function parseSelectColumns(sql: string): string[] {
  try {
    const m = sql.match(/select\s+([\s\S]+?)\s+from\s/i);
    if (!m) return [];
    return m[1]
      .split(",")
      .map(part => {
        const p = part.trim().replace(/\s+/g, " ");
        const asMatch = p.match(/\s+as\s+["`\[]?([a-z0-9_]+)["`\]]?$/i);
        if (asMatch) return asMatch[1];
        const last = p.split(".").pop() || p;
        return last.replace(/["`\[\]]/g, "").trim();
      })
      .filter(c => c && c !== "*" && /^[a-z_][a-z0-9_]*$/i.test(c));
  } catch { return []; }
}

async function fetchColumns(tabela: string): Promise<string[]> {
  try {
    if (tabela.startsWith("xlsx:")) {
      const ds = getDataset(tabela);
      return ds?.columns ?? [];
    }
    if (tabela.startsWith("api:")) {
      const id = tabela.slice(4);
      try {
        const rows = await fetchApiEndpointRows(id, 1);
        if (rows.length) return Object.keys(rows[0]);
      } catch (e) {
        console.warn("[MergeBuilder] execute-dynamic-query falhou, tentando parsear SELECT:", e);
      }
      const { data: ep } = await supabase.from("api_endpoints").select("query").eq("id", id).maybeSingle();
      return ep?.query ? parseSelectColumns(ep.query) : [];
    }
    const { data, error } = await supabase.from(tabela as any).select("*").limit(1);
    if (error) throw error;
    if (data && data.length > 0) return Object.keys(data[0] as any);
    const { data: sqlData } = await supabase.functions.invoke("execute-merge-sql", {
      body: { sql: `SELECT * FROM ${tabela} LIMIT 0` },
    });
    return (sqlData as any)?.columns ?? [];
  } catch {
    return [];
  }
}


export function MergeBuilderDialog({ value, onChange, onInsertField, onSelectFields, onSaveTable, initialSelected, hideTrigger, open: openProp, onOpenChange, triggerLabel = "Vincular dados", triggerAsIcon, onImportedDataset }: Props) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (o: boolean) => { onOpenChange?.(o); if (openProp === undefined) setOpenInternal(o); };

  const [step, setStep] = useState(0);
  const [cfg, setCfg] = useState<MergeConfig>(() => ({
    mode: "visual",
    tabela: value?.tabela || "",
    alias: value?.alias || "reg",
    filtros: Array.isArray(value?.filtros) ? value!.filtros : [],
    limite: value?.limite ?? 0,
    calculados: Array.isArray(value?.calculados) ? value!.calculados : [],
    relations: Array.isArray(value?.relations) ? value!.relations : [],
    camposSelecionados: value?.camposSelecionados || {},
  }));

  // Colunas descobertas por tabela
  const [colsByTable, setColsByTable] = useState<Record<string, string[]>>({});
  const [loadingCols, setLoadingCols] = useState<string>("");
  const [apiEndpoints, setApiEndpoints] = useState<{ value: string; label: string }[]>([]);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set(initialSelected ?? []));
  const [importOpen, setImportOpen] = useState(false);

  const importedDatasets = useSyncExternalStore(subscribeDatasets, getAllDatasets, getAllDatasets);

  // Load API endpoints on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("api_endpoints").select("id,name,description").eq("active", true).order("name");
      setApiEndpoints((data ?? []).map((e: any) => ({ value: `api:${e.id}`, label: `🔌 ${e.name}` })));
    })();
  }, []);

  const tabelasDisponiveis = useMemo(
    () => [
      ...TABELAS,
      ...apiEndpoints,
      ...importedDatasets.map((d) => ({ value: d.id, label: `📄 ${d.name}` })),
    ],
    [apiEndpoints, importedDatasets],
  );

  const todasTabelas = useMemo(() => {
    const arr: { tabela: string; alias: string; isMain: boolean }[] = [];
    if (cfg.tabela) arr.push({ tabela: cfg.tabela, alias: cfg.alias, isMain: true });
    (cfg.relations ?? []).forEach(r => { if (r.tabela) arr.push({ tabela: r.tabela, alias: r.alias || r.tabela, isMain: false }); });
    return arr;
  }, [cfg.tabela, cfg.alias, cfg.relations]);

  // Carrega colunas de qualquer tabela nova selecionada
  useEffect(() => {
    todasTabelas.forEach(async ({ tabela }) => {
      if (!tabela || colsByTable[tabela]) return;
      setLoadingCols(tabela);
      const cols = await fetchColumns(tabela);
      setColsByTable(prev => ({ ...prev, [tabela]: cols }));
      setLoadingCols("");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todasTabelas.map(t => t.tabela).join(",")]);

  const getSel = (tabela: string) => cfg.camposSelecionados?.[tabela] ?? [];
  const toggleCampo = (tabela: string, campo: string) => {
    const atual = new Set(getSel(tabela));
    atual.has(campo) ? atual.delete(campo) : atual.add(campo);
    setCfg({ ...cfg, camposSelecionados: { ...(cfg.camposSelecionados ?? {}), [tabela]: Array.from(atual) } });
  };

  const addRelation = () => setCfg({ ...cfg, relations: [...(cfg.relations ?? []), { alias: "", tabela: "", localKey: "", foreignKey: "", cardinality: "1:N" }] });
  const rmRelation = (i: number) => {
    const rel = (cfg.relations ?? [])[i];
    const novo = { ...(cfg.camposSelecionados ?? {}) };
    if (rel?.tabela) delete novo[rel.tabela];
    setCfg({ ...cfg, relations: (cfg.relations ?? []).filter((_, k) => k !== i), camposSelecionados: novo });
  };
  const updRelation = (i: number, patch: Partial<MergeRelation>) => {
    const n = [...(cfg.relations ?? [])];
    n[i] = { ...n[i], ...patch };
    setCfg({ ...cfg, relations: n });
  };

  const addCalc = () => setCfg({ ...cfg, calculados: [...(cfg.calculados ?? []), { nome: "", expressao: "" }] });
  const rmCalc = (i: number) => setCfg({ ...cfg, calculados: (cfg.calculados ?? []).filter((_, k) => k !== i) });
  const addFiltro = () => setCfg({ ...cfg, filtros: [...cfg.filtros, { campo: "", op: "eq", valor: "" }] });
  const rmFiltro = (i: number) => setCfg({ ...cfg, filtros: cfg.filtros.filter((_, k) => k !== i) });

  // Todos os campos selecionados no formato "alias.campo"
  const camposDisponiveis = useMemo(() => {
    const list: { chave: string; tabela: string; alias: string; campo: string }[] = [];
    todasTabelas.forEach(({ tabela, alias }) => {
      getSel(tabela).forEach(campo => list.push({ chave: `${alias}.${campo}`, tabela, alias, campo }));
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todasTabelas, cfg.camposSelecionados]);

  const executar = async () => {
    setLoading(true);
    try {
      if (!cfg.tabela) throw new Error("Selecione a tabela principal");
      const camposMain = getSel(cfg.tabela);
      let list: any[] = [];
      const applyFilter = (r: any, f: MergeConfigFiltro) => {
        if (!f.campo || !f.valor) return true;
        const rawCampo = f.campo.includes(".") ? f.campo.split(".").slice(1).join(".") : f.campo;
        const v = r?.[rawCampo];
        const val = f.valor;
        switch (f.op) {
          case "eq": return String(v) === val;
          case "neq": return String(v) !== val;
          case "ilike": return String(v ?? "").toLowerCase().includes(val.toLowerCase());
          case "gt": return Number(v) > Number(val);
          case "gte": return Number(v) >= Number(val);
          case "lt": return Number(v) < Number(val);
          case "lte": return Number(v) <= Number(val);
          default: return true;
        }
      };
      if (cfg.tabela.startsWith("xlsx:")) {
        const ds = getDataset(cfg.tabela);
        const src = ds?.rows ?? [];
        let all = src.filter((r) => cfg.filtros.every((f) => applyFilter(r, f)));
        if (cfg.limite && cfg.limite > 0) all = all.slice(0, Math.min(cfg.limite, 500));
        list = camposMain.length ? all.map((r) => Object.fromEntries(camposMain.map((c) => [c, r?.[c]]))) : all;
      } else if (cfg.tabela.startsWith("api:")) {
        // Fonte é uma API do sistema
        const all = await fetchApiEndpointRows(cfg.tabela.slice(4), cfg.limite && cfg.limite > 0 ? Math.min(cfg.limite, 500) : 0);
        list = all.filter((r) => cfg.filtros.every((f) => applyFilter(r, f)));
        if (camposMain.length) list = list.map(r => Object.fromEntries(camposMain.map(c => [c, r?.[c]])));
      } else {
        const selectCols = camposMain.length ? camposMain.join(",") : "*";
        let q = supabase.from(cfg.tabela as any).select(selectCols);
        if (cfg.limite && cfg.limite > 0) q = q.limit(Math.min(cfg.limite, 500));
        for (const f of cfg.filtros) {
          if (!f.campo || !f.valor) continue;
          const rawCampo = f.campo.includes(".") ? f.campo.split(".").slice(1).join(".") : f.campo;
          if (f.op === "ilike") q = q.ilike(rawCampo, `%${f.valor}%`);
          else q = (q as any)[f.op](rawCampo, f.valor);
        }
        const { data, error } = await q;
        if (error) throw error;
        list = ((data ?? []) as any[]);
      }

      for (const rel of cfg.relations ?? []) {
        if (!rel.tabela || !rel.localKey || !rel.foreignKey || !rel.alias) continue;
        const relCols = getSel(rel.tabela);
        const relSelect = relCols.length ? Array.from(new Set([rel.foreignKey, ...relCols])).join(",") : "*";
        const ids = Array.from(new Set(list.map(r => r?.[rel.localKey]).filter(v => v != null)));
        if (!ids.length) { list.forEach(r => (r[rel.alias] = rel.cardinality === "1:N" ? [] : null)); continue; }
        const { data: relData, error: relErr } = await supabase.from(rel.tabela as any).select(relSelect).in(rel.foreignKey, ids as any);
        if (relErr) throw relErr;
        const groups = new Map<any, any[]>();
        for (const r of (relData ?? []) as any[]) {
          const k = r?.[rel.foreignKey];
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k)!.push(r);
        }
        list.forEach(r => {
          const g = groups.get(r?.[rel.localKey]) ?? [];
          r[rel.alias] = rel.cardinality === "1:N" ? g : (g[0] ?? null);
        });
      }

      const calcs = cfg.calculados ?? [];
      list = calcs.length ? list.map(r => evalCalculados(r, calcs)) : list;
      setRows(list);
      onChange(cfg, list);
      toast.success(`${list.length} registro(s) carregado(s)`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao consultar");
    } finally {
      setLoading(false);
    }
  };

  const chavesFinais = useMemo(() => {
    const list: { chave: string; preview?: any; isArray?: boolean }[] = [];
    const main = rows[0];
    todasTabelas.forEach(({ tabela, alias, isMain }) => {
      getSel(tabela).forEach(campo => {
        const chave = `${alias}.${campo}`;
        let preview: any;
        if (main) {
          if (isMain) preview = main?.[campo];
          else {
            const rel = main?.[alias];
            preview = Array.isArray(rel) ? rel[0]?.[campo] : rel?.[campo];
          }
        }
        const isArray = !isMain && Array.isArray(main?.[alias]);
        list.push({ chave, preview, isArray });
      });
    });
    (cfg.calculados ?? []).forEach(c => {
      if (c.nome) list.push({ chave: `${cfg.alias}.${c.nome}`, preview: main?.[c.nome] });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, todasTabelas, cfg.camposSelecionados, cfg.calculados, cfg.alias]);

  const chavesFiltradas = chavesFinais.filter(k => !busca || k.chave.toLowerCase().includes(busca.toLowerCase()));

  const toggleSel = (chave: string) => {
    setSelecionados(prev => { const n = new Set(prev); n.has(chave) ? n.delete(chave) : n.add(chave); return n; });
  };
  const aprovarSelecao = () => {
    onSelectFields?.(Array.from(selecionados));
    toast.success(`${selecionados.size} campo(s) disponível(is) na sidebar`);
    setOpen(false);
  };

  // Drag & drop de tokens para dentro de fórmulas / valores
  const onDragToken = (e: React.DragEvent, token: string) => {
    e.dataTransfer.setData("text/plain", token);
    e.dataTransfer.effectAllowed = "copy";
  };
  const onDropInto = (e: React.DragEvent, current: string, apply: (novo: string) => void) => {
    e.preventDefault();
    const tok = e.dataTransfer.getData("text/plain");
    if (!tok) return;
    apply((current || "") + (current && !current.endsWith(" ") ? " " : "") + `{{${tok}}}`);
  };

  const canNext = () => {
    if (step === 0) return !!cfg.tabela && camposDisponiveis.length > 0 && (cfg.relations ?? []).every(r => !r.tabela || (r.alias && r.localKey && r.foreignKey));
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setStep(0); }}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {triggerAsIcon ? (
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title={triggerLabel}>
              <Database className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" variant="outline">
              <Database className="h-3.5 w-3.5 mr-1" /> {triggerLabel}
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Merge Builder — Assistente</DialogTitle>
          <DialogDescription>Configure o merge em 4 passos.</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 border-b pb-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition
                    ${active ? "bg-primary text-primary-foreground border-primary" : done ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="font-medium">{i + 1}. {s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto py-3">
          {/* STEP 0 — Tabelas & Campos */}
          {step === 0 && (
            <div className="space-y-4">
              {/* Tabela principal */}
              <div className="border rounded p-3 bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">Principal</Badge>
                  <Select value={cfg.tabela} onValueChange={v => {
                    let novoAlias = cfg.alias;
                    if (v.startsWith("api:") || v.startsWith("xlsx:")) {
                      const found = tabelasDisponiveis.find(t => t.value === v);
                      const nome = (found?.label ?? "").replace(/^(🔌|📄)\s*/, "").trim();
                      const sane = nome.replace(/[^a-z0-9_]/gi, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").toLowerCase();
                      if (sane) novoAlias = sane;
                    }
                    setCfg({ ...cfg, tabela: v, alias: novoAlias, camposSelecionados: { ...(cfg.camposSelecionados ?? {}), [v]: [] } });
                  }}>
                    <SelectTrigger className="h-8 max-w-xs"><SelectValue placeholder="Escolha a tabela principal" /></SelectTrigger>
                    <SelectContent>{tabelasDisponiveis.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} title="Importar dados de um arquivo Excel ou CSV">
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Importar Excel/CSV
                  </Button>
                  {cfg.tabela && (
                    <>
                      <span className="text-xs text-muted-foreground">alias:</span>
                      <Input value={cfg.alias} onChange={e => setCfg({ ...cfg, alias: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() || "reg" })} className="h-7 w-24 text-xs" />
                    </>
                  )}
                </div>
                {cfg.tabela && <CamposCheckList tabela={cfg.tabela} colunas={colsByTable[cfg.tabela] ?? []} loading={loadingCols === cfg.tabela} selecionados={getSel(cfg.tabela)} onToggle={c => toggleCampo(cfg.tabela, c)} />}
              </div>

              {/* Relações */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1"><Link2 className="h-4 w-4" /> Tabelas relacionadas (JOIN)</label>
                  <Button size="sm" variant="outline" onClick={addRelation}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar tabela</Button>
                </div>
                {(cfg.relations ?? []).map((rel, i) => {
                  const relCampos = rel.tabela ? getSel(rel.tabela) : [];
                  const mainCampos = getSel(cfg.tabela);
                  return (
                    <div key={i} className="border rounded p-3 space-y-2 bg-card">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">JOIN #{i + 1}</Badge>
                        <Select value={rel.tabela} onValueChange={v => updRelation(i, { tabela: v, alias: rel.alias || v.slice(0, 8) })}>
                          <SelectTrigger className="h-8 max-w-xs"><SelectValue placeholder="Tabela relacionada" /></SelectTrigger>
                          <SelectContent>{tabelasDisponiveis.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">alias:</span>
                        <Input value={rel.alias} onChange={e => updRelation(i, { alias: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() })} className="h-7 w-24 text-xs" />
                        <Select value={rel.cardinality} onValueChange={(v: any) => updRelation(i, { cardinality: v })}>
                          <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1:1">1:1</SelectItem>
                            <SelectItem value="1:N">1:N</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => rmRelation(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>

                      {rel.tabela && (
                        <CamposCheckList tabela={rel.tabela} colunas={colsByTable[rel.tabela] ?? []} loading={loadingCols === rel.tabela} selecionados={relCampos} onToggle={c => toggleCampo(rel.tabela, c)} />
                      )}

                      {/* JOIN visual: seleciona campos das duas tabelas */}
                      {rel.tabela && (mainCampos.length > 0 || relCampos.length > 0) && (
                        <div className="border-t pt-2 mt-2">
                          <div className="text-[11px] text-muted-foreground mb-1">Vincular campos (JOIN)</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs">{cfg.alias}.</span>
                            <Select value={rel.localKey} onValueChange={v => updRelation(i, { localKey: v })}>
                              <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="campo principal" /></SelectTrigger>
                              <SelectContent>
                                {(colsByTable[cfg.tabela] ?? []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <span className="text-xs font-bold text-primary">=</span>
                            <span className="text-xs">{rel.alias}.</span>
                            <Select value={rel.foreignKey} onValueChange={v => updRelation(i, { foreignKey: v })}>
                              <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="campo relacionado" /></SelectTrigger>
                              <SelectContent>
                                {(colsByTable[rel.tabela] ?? []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {(cfg.relations ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhuma tabela relacionada. Adicione uma para fazer JOIN.</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 1 — Filtros & Calculados */}
          {step === 1 && (
            <div className="grid grid-cols-[220px_1fr] gap-4">
              {/* Palheta de campos arrastáveis */}
              <div className="border rounded p-2 bg-muted/20 h-fit sticky top-0">
                <div className="text-xs font-medium mb-2 flex items-center gap-1"><GripVertical className="h-3 w-3" /> Arraste os campos</div>
                <ScrollArea className="max-h-[420px]">
                  <div className="space-y-1">
                    {camposDisponiveis.map(c => (
                      <div key={c.chave} draggable onDragStart={e => onDragToken(e, c.chave)}
                        className="px-2 py-1 rounded border border-primary/30 bg-primary/5 text-[11px] font-mono cursor-grab active:cursor-grabbing hover:bg-primary/15">
                        {c.chave}
                      </div>
                    ))}
                    {camposDisponiveis.length === 0 && <p className="text-[11px] text-muted-foreground">Volte ao passo 1 e selecione campos.</p>}
                  </div>
                </ScrollArea>
                <div className="border-t mt-2 pt-2">
                  <div className="text-[11px] font-medium mb-1">Operadores</div>
                  <div className="flex flex-wrap gap-1">
                    {["+", "-", "*", "/", "(", ")"].map(op => (
                      <button key={op} draggable onDragStart={e => onDragToken(e, `__OP__${op}`)}
                        onClick={e => e.currentTarget.blur()}
                        className="w-7 h-7 rounded border bg-card text-xs font-mono hover:bg-accent cursor-grab">
                        {op}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] font-medium mb-1 mt-2">Funções</div>
                  <div className="flex flex-wrap gap-1">
                    {["sum", "avg", "count", "min", "max"].map(fn => (
                      <button key={fn} draggable onDragStart={e => onDragToken(e, `__FN__${fn}`)}
                        className="px-2 h-6 rounded border bg-card text-[11px] font-mono hover:bg-accent cursor-grab">
                        {fn}()
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filtros + Calculados */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium flex items-center gap-1"><Filter className="h-4 w-4" /> Filtros</label>
                    <Button size="sm" variant="outline" onClick={addFiltro}><Plus className="h-3.5 w-3.5 mr-1" /> Filtro</Button>
                  </div>
                  <div className="space-y-1">
                    {cfg.filtros.map((f, i) => (
                      <div key={i} className="flex gap-1 items-center">
                        <Select value={f.campo} onValueChange={v => { const n = [...cfg.filtros]; n[i] = { ...f, campo: v }; setCfg({ ...cfg, filtros: n }); }}>
                          <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Escolha o campo" /></SelectTrigger>
                          <SelectContent>{camposDisponiveis.map(c => <SelectItem key={c.chave} value={c.chave}>{c.chave}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={f.op} onValueChange={(v: any) => { const n = [...cfg.filtros]; n[i] = { ...f, op: v }; setCfg({ ...cfg, filtros: n }); }}>
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{OPS.map(o => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input value={f.valor} onChange={e => { const n = [...cfg.filtros]; n[i] = { ...f, valor: e.target.value }; setCfg({ ...cfg, filtros: n }); }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => onDropInto(e, f.valor, novo => { const n = [...cfg.filtros]; n[i] = { ...f, valor: novo }; setCfg({ ...cfg, filtros: n }); })}
                          placeholder="valor (ou arraste um campo)" className="h-8 text-xs flex-1" />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => rmFiltro(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                    {cfg.filtros.length === 0 && <p className="text-[11px] text-muted-foreground italic">Sem filtros. Todos os registros serão retornados{cfg.limite && cfg.limite > 0 ? ` (limite ${cfg.limite})` : " (sem limite)"}.</p>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Limite:</label>
                    <Input type="number" min={0} value={cfg.limite} onChange={e => setCfg({ ...cfg, limite: Number(e.target.value) })} className="h-7 w-20 text-xs" placeholder="0 = sem limite" />
                    <span className="text-[11px] text-muted-foreground">0 = sem limite</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium flex items-center gap-1"><Calculator className="h-4 w-4" /> Campos calculados</label>
                    <Button size="sm" variant="outline" onClick={addCalc}><Plus className="h-3.5 w-3.5 mr-1" /> Fórmula</Button>
                  </div>
                  <div className="space-y-1">
                    {(cfg.calculados ?? []).map((c, i) => {
                      const applyExpr = (novo: string) => { const n = [...(cfg.calculados ?? [])]; n[i] = { ...c, expressao: novo }; setCfg({ ...cfg, calculados: n }); };
                      return (
                        <div key={i} className="flex gap-1 items-center">
                          <Input value={c.nome} onChange={e => { const n = [...(cfg.calculados ?? [])]; n[i] = { ...c, nome: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() }; setCfg({ ...cfg, calculados: n }); }}
                            placeholder="nome" className="h-8 text-xs w-32" />
                          <span className="text-xs">=</span>
                          <Input value={c.expressao} onChange={e => applyExpr(e.target.value)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              e.preventDefault();
                              const tok = e.dataTransfer.getData("text/plain");
                              if (!tok) return;
                              let insert = "";
                              if (tok.startsWith("__OP__")) insert = ` ${tok.slice(6)} `;
                              else if (tok.startsWith("__FN__")) insert = `${tok.slice(6)}()`;
                              else insert = `{{${tok}}}`;
                              applyExpr((c.expressao || "") + insert);
                            }}
                            placeholder="arraste campos e operadores aqui" className="h-8 text-xs flex-1 font-mono" />
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => rmCalc(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      );
                    })}
                    {(cfg.calculados ?? []).length === 0 && <p className="text-[11px] text-muted-foreground italic">Ex: <code>total</code> = <code>{`{{itens.preco}} * {{itens.quantidade}}`}</code></p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Consulta */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="border rounded p-4 bg-muted/20">
                <h3 className="text-sm font-medium mb-2">Revisão da consulta</h3>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Tabela principal: <b>{cfg.tabela}</b> (alias <code>{cfg.alias}</code>) — {getSel(cfg.tabela).length} campo(s) selecionado(s)</li>
                  {(cfg.relations ?? []).map((r, i) => (
                    <li key={i}>• JOIN <b>{r.tabela}</b> (alias <code>{r.alias}</code>) em <code>{cfg.alias}.{r.localKey}</code> = <code>{r.alias}.{r.foreignKey}</code> ({r.cardinality}) — {getSel(r.tabela).length} campo(s)</li>
                  ))}
                  <li>• Filtros: {cfg.filtros.length}</li>
                  <li>• Calculados: {(cfg.calculados ?? []).length}</li>
                  <li>• Limite: {cfg.limite}</li>
                </ul>
              </div>
              {rows.length === 0 && (
                <Button onClick={executar} disabled={loading} className="w-full" size="lg">
                  <Play className="h-4 w-4 mr-1" /> {loading ? "Executando…" : "Executar consulta"}
                </Button>
              )}
              {rows.length > 0 && (
                <div className="border rounded overflow-auto max-h-[300px]">
                  <table className="text-[11px] w-full">
                    <thead className="bg-muted sticky top-0"><tr>{Object.keys(rows[0]).slice(0, 8).map(k => <th key={k} className="px-2 py-1 text-left border-b">{k}</th>)}</tr></thead>
                    <tbody>
                      {rows.slice(0, 20).map((r, i) => (
                        <tr key={i} className="border-b hover:bg-muted/40">
                          {Object.keys(rows[0]).slice(0, 8).map(k => {
                            const v = r[k];
                            const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v).slice(0, 40) : String(v).slice(0, 40);
                            return <td key={k} className="px-2 py-1">{s}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Inserir */}
          {step === 3 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar campo…" className="pl-6 h-8 text-xs" />
                </div>
                <Badge variant="secondary">{selecionados.size} selecionado(s)</Badge>
                <Button size="sm" variant="ghost" onClick={() => {
                  const all = chavesFiltradas.every(c => selecionados.has(c.chave));
                  setSelecionados(prev => { const n = new Set(prev); chavesFiltradas.forEach(c => all ? n.delete(c.chave) : n.add(c.chave)); return n; });
                }}>Marcar todos</Button>
              </div>
              <ScrollArea className="h-[380px] border rounded">
                <div className="p-2 space-y-1">
                  {chavesFiltradas.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Execute a consulta no passo anterior.</p>}
                  {chavesFiltradas.map(({ chave, preview, isArray }) => {
                    const previewStr = preview == null ? "" : (typeof preview === "object" ? JSON.stringify(preview).slice(0, 60) : String(preview));
                    const isSel = selecionados.has(chave);
                    const looksImage = /url|foto|imagem|image|photo|thumb/i.test(chave) || /^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)/i.test(previewStr);
                    return (
                      <div key={chave} className={`flex items-stretch gap-1 rounded ${isSel ? "ring-1 ring-sky-500/50" : ""}`}>
                        <label className="flex items-center px-2 cursor-pointer"><Checkbox checked={isSel} onCheckedChange={() => toggleSel(chave)} /></label>
                        <button onClick={() => onInsertField?.(chave)}
                          className="flex-1 text-left px-2 py-1.5 rounded border border-primary/20 bg-primary/5 hover:bg-primary/15 text-xs">
                          <div className="font-mono text-primary flex items-center gap-1">
                            {`{{${chave}}}`}
                            {isArray && <Badge variant="outline" className="text-[9px] h-4">lista</Badge>}
                          </div>
                          {previewStr && <div className="text-[10px] text-muted-foreground truncate">ex: {previewStr}</div>}
                        </button>
                        {isArray && (
                          <>
                            <Button size="icon" variant="ghost" className="h-auto w-7" title="Inserir loop"
                              onClick={() => onInsertField?.(`__LOOP__:${chave}`)}><Repeat className="h-3.5 w-3.5 text-primary" /></Button>
                            <Button size="icon" variant="ghost" className="h-auto w-7" title="Inserir soma"
                              onClick={() => onInsertField?.(`__RAW__:{{sum ${chave}}}`)}><Sigma className="h-3.5 w-3.5 text-primary" /></Button>
                          </>
                        )}
                        {looksImage && !isArray && (
                          <Button size="icon" variant="ghost" className="h-auto w-7" title="Inserir imagem"
                            onClick={() => onInsertField?.(`__RAW__:{{img:${chave}}}`)}><ImageIcon className="h-3.5 w-3.5 text-primary" /></Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Inserir lista/tabela */}
              <InserirListaTabela
                todasTabelas={todasTabelas}
                camposSelecionados={cfg.camposSelecionados ?? {}}
                rows={rows}
                onInsert={(payload) => onInsertField?.(payload)}
                onSaveTable={onSaveTable}
                onInserted={() => setOpen(false)}
              />



            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          {step < 2 && <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>Próximo <ChevronRight className="h-4 w-4 ml-1" /></Button>}
          {step === 2 && <Button onClick={() => setStep(3)} disabled={rows.length === 0}>Próximo <ChevronRight className="h-4 w-4 ml-1" /></Button>}
          {step === 3 && <Button onClick={aprovarSelecao} disabled={selecionados.size === 0}><Check className="h-4 w-4 mr-1" /> Aprovar ({selecionados.size})</Button>}
        </DialogFooter>
      </DialogContent>
      <ImportSpreadsheetWizard
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={(ds) => {
          registerDataset(ds);
          onImportedDataset?.(ds);
          // Pre-seleciona como tabela principal
          setCfg((prev) => ({
            ...prev,
            tabela: ds.id,
            alias: ds.id.replace(/^xlsx:/, "").slice(0, 20) || "planilha",
            camposSelecionados: { ...(prev.camposSelecionados ?? {}), [ds.id]: [...ds.columns] },
          }));
        }}
      />
    </Dialog>
  );
}

// ============ Componente auxiliar ============
function CamposCheckList({ tabela, colunas, loading, selecionados, onToggle }: {
  tabela: string; colunas: string[]; loading: boolean; selecionados: string[]; onToggle: (c: string) => void;
}) {
  const [q, setQ] = useState("");
  const filt = colunas.filter(c => !q || c.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder={`Buscar campo em ${tabela}…`} className="h-7 text-xs max-w-xs" />
        <span className="text-[11px] text-muted-foreground">{selecionados.length}/{colunas.length} selecionado(s)</span>
        <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => {
          const all = filt.every(c => selecionados.includes(c));
          filt.forEach(c => { if (all) { if (selecionados.includes(c)) onToggle(c); } else { if (!selecionados.includes(c)) onToggle(c); } });
        }}>Todos</Button>
      </div>
      {loading && <p className="text-[11px] text-muted-foreground">Carregando colunas…</p>}
      {!loading && (
        <ScrollArea className="max-h-[180px] border rounded bg-background p-2">
          <div className="grid grid-cols-3 gap-1">
            {filt.map(c => (
              <label key={c} className={`flex items-center gap-1 text-[11px] px-1.5 py-1 rounded cursor-pointer hover:bg-accent ${selecionados.includes(c) ? "bg-primary/10 font-medium" : ""}`}>
                <Checkbox checked={selecionados.includes(c)} onCheckedChange={() => onToggle(c)} className="h-3.5 w-3.5" />
                <span className="font-mono truncate">{c}</span>
              </label>
            ))}
            {filt.length === 0 && <p className="text-[11px] text-muted-foreground col-span-3">Nenhum campo.</p>}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ============ Salvar tabela como chip na sidebar (não insere no editor) ============
function InserirListaTabela({ todasTabelas, camposSelecionados, onInsert, onSaveTable, onInserted }: {
  todasTabelas: { tabela: string; alias: string; isMain: boolean }[];
  camposSelecionados: Record<string, string[]>;
  rows: any[];
  onInsert: (payload: string) => void;
  onSaveTable?: (name: string, meta: { alias: string; cols: string[] }) => void;
  onInserted?: () => void;
}) {
  const opcoes = todasTabelas.filter(t => (camposSelecionados[t.tabela] ?? []).length > 0);
  const [alias, setAlias] = useState<string>("");
  const [cols, setCols] = useState<string[]>([]);

  const sel = opcoes.find(o => o.alias === alias);
  const camposDoAlias = sel ? (camposSelecionados[sel.tabela] ?? []) : [];

  const toggleCol = (c: string) => setCols(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const salvar = () => {
    if (!sel || cols.length === 0 || !onSaveTable) return;
    onSaveTable(sel.alias, { alias: sel.alias, cols: [...cols] });
    toast.success(`Tabela "${sel.alias}" adicionada à barra lateral. Arraste para o documento para inserir.`);
  };

  const inserirAgora = () => {
    if (!sel || cols.length === 0) return;
    onSaveTable?.(sel.alias, { alias: sel.alias, cols: [...cols] });
    onInsert(`__TABLE__:${JSON.stringify({ alias: sel.alias, cols: [...cols] })}`);
    onInserted?.();
  };

  if (opcoes.length === 0) return null;

  return (
    <div className="border-t pt-3 mt-2 space-y-2">
      <div className="text-xs font-medium flex items-center gap-1"><Table2 className="h-3.5 w-3.5" /> Criar tabela vinculada</div>
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={alias} onValueChange={(v) => { setAlias(v); setCols([]); }}>
          <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="Escolha a tabela/relação" /></SelectTrigger>
          <SelectContent>
            {opcoes.map(o => (
              <SelectItem key={o.alias} value={o.alias}>
                {o.tabela} ({o.alias}){o.isMain ? " — principal" : " — lista relacionada"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={salvar} disabled={!sel || cols.length === 0}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar à sidebar
        </Button>
        <Button size="sm" onClick={inserirAgora} disabled={!sel || cols.length === 0}>
          <Table2 className="h-3.5 w-3.5 mr-1" /> Inserir tabela no documento
        </Button>
      </div>

      {sel && (
        <div className="flex flex-wrap gap-1 pl-1">
          {camposDoAlias.map(c => (
            <label key={c} className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border cursor-pointer ${cols.includes(c) ? "bg-primary/10 border-primary" : "bg-card"}`}>
              <Checkbox checked={cols.includes(c)} onCheckedChange={() => toggleCol(c)} className="h-3 w-3" />
              <span className="font-mono">{c}</span>
            </label>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Nada é inserido agora. A tabela vai para o grupo <b>Tabelas</b> da sidebar. Ao arrastar/clicar lá, será perguntado o intervalo de linhas (ex. <code>1-10</code>). Você pode inserir a mesma tabela várias vezes com intervalos diferentes.
      </p>
    </div>
  );
}


