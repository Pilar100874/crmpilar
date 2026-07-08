import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Play, Plus, Trash2, Search, Image as ImageIcon, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { evalCalculados, type CampoCalculado } from "@/lib/editores/mergeEngine";

export interface MergeConfigFiltro {
  campo: string;
  op: "eq" | "ilike" | "gt" | "lt" | "gte" | "lte" | "neq";
  valor: string;
}

export interface MergeConfig {
  tabela: string;
  alias: string;
  filtros: MergeConfigFiltro[];
  limite: number;
  calculados?: CampoCalculado[];
}

interface Props {
  value?: MergeConfig | null;
  onChange: (cfg: MergeConfig, sampleRows: any[]) => void;
  onInsertField?: (chave: string) => void;
}

const TABELAS = [
  { value: "customers", label: "Clientes" },
  { value: "empresas", label: "Empresas / Fornecedores" },
  { value: "ponto_funcionarios", label: "Funcionários" },
  { value: "pedidos_ecommerce", label: "Pedidos" },
  { value: "orcamentos", label: "Orçamentos" },
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

export function MergeBuilderDialog({ value, onChange, onInsertField }: Props) {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<MergeConfig>(value ?? {
    tabela: "customers",
    alias: "reg",
    filtros: [],
    limite: 50,
    calculados: [],
  });
  const [rows, setRows] = useState<any[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");

  const executar = async () => {
    setLoading(true);
    try {
      let q = supabase.from(cfg.tabela as any).select("*").limit(Math.min(cfg.limite || 50, 500));
      for (const f of cfg.filtros) {
        if (!f.campo || !f.valor) continue;
        if (f.op === "ilike") q = q.ilike(f.campo, `%${f.valor}%`);
        else q = (q as any)[f.op](f.campo, f.valor);
      }
      const { data, error } = await q;
      if (error) throw error;
      const calcs = cfg.calculados ?? [];
      const list = ((data ?? []) as any[]).map(r => calcs.length ? evalCalculados(r, calcs) : r);
      setRows(list);
      const cols = list[0] ? Object.keys(list[0]) : [];
      setColunas(cols);
      onChange(cfg, list);
      toast.success(`${list.length} registro(s) carregado(s)`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao consultar");
    } finally {
      setLoading(false);
    }
  };

  const addCalc = () => setCfg({ ...cfg, calculados: [...(cfg.calculados ?? []), { nome: "", expressao: "" }] });
  const rmCalc = (i: number) => setCfg({ ...cfg, calculados: (cfg.calculados ?? []).filter((_, k) => k !== i) });

  const addFiltro = () => setCfg({ ...cfg, filtros: [...cfg.filtros, { campo: "", op: "eq", valor: "" }] });
  const rmFiltro = (i: number) => setCfg({ ...cfg, filtros: cfg.filtros.filter((_, k) => k !== i) });

  const colunasFiltradas = colunas.filter(c => !busca || c.toLowerCase().includes(busca.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Database className="h-3.5 w-3.5 mr-1" /> Vincular dados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Merge Builder — Vincular tabela</DialogTitle>
          <DialogDescription>Escolha uma tabela, aplique filtros e insira as variáveis no documento.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4 overflow-hidden flex-1">
          <div className="space-y-3 overflow-auto pr-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Tabela</label>
                <Select value={cfg.tabela} onValueChange={v => setCfg({ ...cfg, tabela: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TABELAS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Prefixo (alias)</label>
                <Input value={cfg.alias} onChange={e => setCfg({ ...cfg, alias: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() || "reg" })} className="h-8" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Filtros</label>
                <Button size="sm" variant="ghost" onClick={addFiltro} className="h-6 text-xs"><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
              </div>
              <div className="space-y-1">
                {cfg.filtros.map((f, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <Input value={f.campo} onChange={e => { const n = [...cfg.filtros]; n[i] = { ...f, campo: e.target.value }; setCfg({ ...cfg, filtros: n }); }} placeholder="campo" className="h-7 text-xs flex-1" />
                    <Select value={f.op} onValueChange={(v: any) => { const n = [...cfg.filtros]; n[i] = { ...f, op: v }; setCfg({ ...cfg, filtros: n }); }}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{OPS.map(o => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={f.valor} onChange={e => { const n = [...cfg.filtros]; n[i] = { ...f, valor: e.target.value }; setCfg({ ...cfg, filtros: n }); }} placeholder="valor" className="h-7 text-xs flex-1" />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => rmFiltro(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                {cfg.filtros.length === 0 && <p className="text-[11px] text-muted-foreground">Sem filtros — retorna primeiros registros.</p>}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Limite</label>
              <Input type="number" value={cfg.limite} onChange={e => setCfg({ ...cfg, limite: Number(e.target.value) })} className="h-8 w-24" />
            </div>

            <div className="border-t pt-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Calculator className="h-3 w-3" /> Campos calculados</label>
                <Button size="sm" variant="ghost" onClick={addCalc} className="h-6 text-xs"><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
              </div>
              <div className="space-y-1">
                {(cfg.calculados ?? []).map((c, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <Input value={c.nome} onChange={e => { const n = [...(cfg.calculados ?? [])]; n[i] = { ...c, nome: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() }; setCfg({ ...cfg, calculados: n }); }} placeholder="nome" className="h-7 text-xs w-24" />
                    <span className="text-xs">=</span>
                    <Input value={c.expressao} onChange={e => { const n = [...(cfg.calculados ?? [])]; n[i] = { ...c, expressao: e.target.value }; setCfg({ ...cfg, calculados: n }); }} placeholder="preco * quantidade" className="h-7 text-xs flex-1 font-mono" />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => rmCalc(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                {(cfg.calculados ?? []).length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Ex: <code>total = preco * quantidade</code>, <code>desc = valor * 0.1</code>. Use Math.round(), Number(), etc.</p>
                )}
              </div>
            </div>

            <Button onClick={executar} disabled={loading} className="w-full">
              <Play className="h-4 w-4 mr-1" /> {loading ? "Executando…" : "Executar consulta"}
            </Button>
          </div>

          <div className="flex flex-col overflow-hidden border rounded">
            <div className="p-2 border-b bg-muted/30 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-3 w-3 absolute left-2 top-2 text-muted-foreground" />
                <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar variável…" className="pl-6 h-7 text-xs" />
              </div>
              <Badge variant="secondary" className="text-[10px]">{rows.length} reg.</Badge>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {colunasFiltradas.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {rows.length === 0 ? "Execute a consulta para listar as variáveis." : "Nenhuma coluna."}
                  </p>
                )}
                {colunasFiltradas.map(col => {
                  const chave = `${cfg.alias}.${col}`;
                  const preview = rows[0]?.[col];
                  const previewStr = preview == null ? "" : String(preview);
                  const looksImage = /url|foto|imagem|image|photo|thumb/i.test(col)
                    || /^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)/i.test(previewStr)
                    || previewStr.startsWith("data:image/");
                  return (
                    <div key={col} className="flex items-stretch gap-1">
                      <button
                        onClick={() => onInsertField?.(chave)}
                        className="flex-1 text-left px-2 py-1.5 rounded border border-primary/20 bg-primary/5 hover:bg-primary/15 text-xs"
                      >
                        <div className="font-mono text-primary">{`{{${chave}}}`}</div>
                        {previewStr && (
                          <div className="text-[10px] text-muted-foreground truncate">ex: {previewStr.slice(0, 60)}</div>
                        )}
                      </button>
                      {looksImage && (
                        <Button size="icon" variant="ghost" className="h-auto w-7" title="Inserir como imagem"
                          onClick={() => onInsertField?.(`__IMG__${chave}`)}>
                          <ImageIcon className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
