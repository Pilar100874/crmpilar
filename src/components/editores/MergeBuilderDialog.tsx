import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Play, Plus, Trash2, Search, Image as ImageIcon, Calculator, Link2, Repeat, Sigma } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { evalCalculados, type CampoCalculado } from "@/lib/editores/mergeEngine";

export interface MergeConfigFiltro {
  campo: string;
  op: "eq" | "ilike" | "gt" | "lt" | "gte" | "lte" | "neq";
  valor: string;
}

export interface MergeRelation {
  alias: string;         // ex: "itens"
  tabela: string;        // ex: "pedidos_ecommerce_itens"
  localKey: string;      // campo da tabela principal (ex: "id")
  foreignKey: string;    // campo da tabela relacionada (ex: "pedido_id")
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

export function MergeBuilderDialog({ value, onChange, onInsertField }: Props) {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<MergeConfig>(() => ({
    mode: value?.mode || "visual",
    tabela: value?.tabela || "customers",
    alias: value?.alias || "reg",
    filtros: Array.isArray(value?.filtros) ? value!.filtros : [],
    limite: value?.limite ?? 50,
    calculados: Array.isArray(value?.calculados) ? value!.calculados : [],
    relations: Array.isArray(value?.relations) ? value!.relations : [],
    sql: value?.sql || "",
  }));
  const [rows, setRows] = useState<any[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");

  const executar = async () => {
    setLoading(true);
    try {
      let list: any[] = [];

      if (cfg.mode === "sql") {
        if (!cfg.sql?.trim()) throw new Error("Digite um SELECT");
        const { data, error } = await supabase.functions.invoke("execute-merge-sql", { body: { sql: cfg.sql } });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        list = Array.isArray((data as any)?.rows) ? (data as any).rows : [];
      } else {
        let q = supabase.from(cfg.tabela as any).select("*").limit(Math.min(cfg.limite || 50, 500));
        for (const f of cfg.filtros) {
          if (!f.campo || !f.valor) continue;
          if (f.op === "ilike") q = q.ilike(f.campo, `%${f.valor}%`);
          else q = (q as any)[f.op](f.campo, f.valor);
        }
        const { data, error } = await q;
        if (error) throw error;
        list = ((data ?? []) as any[]);

        // Resolve relações
        for (const rel of cfg.relations ?? []) {
          if (!rel.tabela || !rel.localKey || !rel.foreignKey || !rel.alias) continue;
          const ids = Array.from(new Set(list.map((r) => r?.[rel.localKey]).filter((v) => v != null)));
          if (ids.length === 0) { list.forEach((r) => (r[rel.alias] = rel.cardinality === "1:N" ? [] : null)); continue; }
          const { data: relData, error: relErr } = await supabase.from(rel.tabela as any).select("*").in(rel.foreignKey, ids as any);
          if (relErr) throw relErr;
          const groups = new Map<any, any[]>();
          for (const r of (relData ?? []) as any[]) {
            const k = r?.[rel.foreignKey];
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k)!.push(r);
          }
          list.forEach((r) => {
            const g = groups.get(r?.[rel.localKey]) ?? [];
            r[rel.alias] = rel.cardinality === "1:N" ? g : (g[0] ?? null);
          });
        }
      }

      const calcs = cfg.calculados ?? [];
      list = calcs.length ? list.map((r) => evalCalculados(r, calcs)) : list;

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
  const addRel = () => setCfg({ ...cfg, relations: [...(cfg.relations ?? []), { alias: "", tabela: "", localKey: "id", foreignKey: "", cardinality: "1:N" }] });
  const rmRel = (i: number) => setCfg({ ...cfg, relations: (cfg.relations ?? []).filter((_, k) => k !== i) });

  const colunasFiltradas = colunas.filter(c => !busca || c.toLowerCase().includes(busca.toLowerCase()));

  const insertLoop = (relAlias: string) => {
    onInsertField?.(`__LOOP__:${relAlias}`);
  };
  const insertAgg = (fn: string, path: string) => {
    onInsertField?.(`__RAW__:{{${fn} ${path}}}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Database className="h-3.5 w-3.5 mr-1" /> Vincular dados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Merge Builder — Vincular dados</DialogTitle>
          <DialogDescription>
            Modo Visual: escolha tabela e relações. Modo SQL: escreva um SELECT livre.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={cfg.mode} onValueChange={(v) => setCfg({ ...cfg, mode: v as any })} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-2 w-64">
            <TabsTrigger value="visual">Visual</TabsTrigger>
            <TabsTrigger value="sql">SQL avançado</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4 overflow-hidden flex-1 mt-3">
            <div className="space-y-3 overflow-auto pr-2">
              <TabsContent value="visual" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Tabela principal</label>
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
                    {cfg.filtros.length === 0 && <p className="text-[11px] text-muted-foreground">Sem filtros.</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Limite</label>
                  <Input type="number" value={cfg.limite} onChange={e => setCfg({ ...cfg, limite: Number(e.target.value) })} className="h-8 w-24" />
                </div>

                {/* Relações */}
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> Relações (JOIN)
                    </label>
                    <Button size="sm" variant="ghost" onClick={addRel} className="h-6 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(cfg.relations ?? []).map((rel, i) => (
                      <div key={i} className="border rounded p-2 space-y-1 bg-muted/20">
                        <div className="grid grid-cols-2 gap-1">
                          <Input value={rel.alias} onChange={e => { const n = [...(cfg.relations ?? [])]; n[i] = { ...rel, alias: e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase() }; setCfg({ ...cfg, relations: n }); }} placeholder="alias (ex: itens)" className="h-7 text-xs" />
                          <Select value={rel.tabela} onValueChange={v => { const n = [...(cfg.relations ?? [])]; n[i] = { ...rel, tabela: v }; setCfg({ ...cfg, relations: n }); }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="tabela relacionada" /></SelectTrigger>
                            <SelectContent>{TABELAS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-1 items-center">
                          <Input value={rel.localKey} onChange={e => { const n = [...(cfg.relations ?? [])]; n[i] = { ...rel, localKey: e.target.value }; setCfg({ ...cfg, relations: n }); }} placeholder="campo local (id)" className="h-7 text-xs" />
                          <Input value={rel.foreignKey} onChange={e => { const n = [...(cfg.relations ?? [])]; n[i] = { ...rel, foreignKey: e.target.value }; setCfg({ ...cfg, relations: n }); }} placeholder="campo remoto (pedido_id)" className="h-7 text-xs" />
                          <Select value={rel.cardinality} onValueChange={(v: any) => { const n = [...(cfg.relations ?? [])]; n[i] = { ...rel, cardinality: v }; setCfg({ ...cfg, relations: n }); }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1:1">1:1 (único)</SelectItem>
                              <SelectItem value="1:N">1:N (lista)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          {rel.cardinality === "1:N" && rel.alias && (
                            <Button size="sm" variant="secondary" className="h-6 text-[11px]" onClick={() => insertLoop(rel.alias)}>
                              <Repeat className="h-3 w-3 mr-1" /> Inserir loop
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={() => rmRel(i)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                    {(cfg.relations ?? []).length === 0 && (
                      <p className="text-[11px] text-muted-foreground">Ex: alias <code>itens</code>, tabela <code>pedidos_ecommerce_itens</code>, local <code>id</code>, remoto <code>pedido_id</code>, cardinalidade 1:N.</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sql" className="space-y-2 mt-0">
                <label className="text-xs text-muted-foreground">SQL (apenas SELECT / WITH)</label>
                <Textarea
                  value={cfg.sql || ""}
                  onChange={e => setCfg({ ...cfg, sql: e.target.value })}
                  placeholder={`SELECT p.numero_pedido, c.nome, p.valor_total\nFROM pedidos_ecommerce p\nLEFT JOIN customers c ON c.id = p.customer_id\nLIMIT 50`}
                  className="font-mono text-xs min-h-[240px]"
                />
                <p className="text-[11px] text-muted-foreground">
                  Executado em transação read-only. Ponto-e-vírgula final é aceito. Apenas 1 instrução por vez. RLS é respeitada.
                </p>
                <div>
                  <label className="text-xs text-muted-foreground">Alias para o registro (usado nos loops)</label>
                  <Input value={cfg.alias} onChange={e => setCfg({ ...cfg, alias: e.target.value })} className="h-8" />
                </div>
              </TabsContent>

              {/* Campos calculados — comum aos dois modos */}
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
                    <p className="text-[11px] text-muted-foreground">Ex: <code>total = preco * quantidade</code></p>
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
                    const preview = rows[0]?.[col];
                    const previewStr = preview == null ? "" : (typeof preview === "object" ? JSON.stringify(preview).slice(0, 60) : String(preview));
                    const isArray = Array.isArray(preview);
                    const chave = cfg.mode === "sql" ? col : `${cfg.alias}.${col}`;
                    const looksImage = /url|foto|imagem|image|photo|thumb/i.test(col)
                      || /^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)/i.test(previewStr)
                      || previewStr.startsWith("data:image/");
                    return (
                      <div key={col} className="flex items-stretch gap-1">
                        <button
                          onClick={() => onInsertField?.(chave)}
                          className="flex-1 text-left px-2 py-1.5 rounded border border-primary/20 bg-primary/5 hover:bg-primary/15 text-xs"
                        >
                          <div className="font-mono text-primary flex items-center gap-1">
                            {`{{${chave}}}`}
                            {isArray && <Badge variant="outline" className="text-[9px] h-4">lista</Badge>}
                          </div>
                          {previewStr && (
                            <div className="text-[10px] text-muted-foreground truncate">ex: {previewStr.slice(0, 60)}</div>
                          )}
                        </button>
                        {isArray && (
                          <>
                            <Button size="icon" variant="ghost" className="h-auto w-7" title="Inserir loop"
                              onClick={() => insertLoop(chave)}>
                              <Repeat className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-auto w-7" title="Inserir soma"
                              onClick={() => insertAgg("sum", chave)}>
                              <Sigma className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          </>
                        )}
                        {looksImage && !isArray && (
                          <Button size="icon" variant="ghost" className="h-auto w-7" title="Inserir como imagem"
                            onClick={() => onInsertField?.(`__RAW__:{{img:${chave}}}`)}>
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
        </Tabs>

        <DialogFooter>
          <div className="flex-1 text-[11px] text-muted-foreground">
            Sintaxe suportada no documento: <code>{"{{campo}}"}</code>, <code>{"{{#each alias}}...{{/each}}"}</code>,
            {" "}<code>{"{{sum alias.campo}}"}</code>, <code>{"{{= preco*qtd }}"}</code>,
            {" "}<code>{"{{moeda valor}}"}</code>, <code>{"{{data campo}}"}</code>.
          </div>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
