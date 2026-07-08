import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, Tags, Database, Plus, Pencil, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { extractFieldKeys } from "@/lib/editores/mergeEngine";
import { MergeBuilderDialog, type MergeConfig } from "./MergeBuilderDialog";
import { runMergeConfig } from "@/lib/editores/runMergeConfig";
import { resolveMergeData } from "@/lib/editores/dataResolvers";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface Campo {
  id: string;
  chave: string;
  rotulo: string;
  categoria: string;
  tipo: string;
  personalizado: boolean;
  descricao?: string | null;
}

interface Props {
  estabelecimentoId: string | null;
  onInsert: (chave: string) => void;
  currentHtml: string;
  mergeFields?: string[];
  onMergeFieldsChange?: (chaves: string[]) => void;
  configs?: MergeConfig[];
  onConfigsChange?: (configs: MergeConfig[]) => void;
  savedTables?: { name: string; alias: string; cols: string[] }[];
  onSavedTablesChange?: (list: { name: string; alias: string; cols: string[] }[]) => void;
}

// Resolve caminho "a.b.c" em objeto aninhado
function getPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function formatValue(v: any): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const makeDragHandler =
  (_values: Record<string, any>) =>
  (e: React.DragEvent, chave: string) => {
    // NUNCA colar o valor resolvido no drag. Sempre inserir a variável;
    // a exibição de valor vs. variável é controlada pelo botão de preview.
    let token: string;
    if (chave.startsWith("__RAW__:")) token = chave.slice("__RAW__:".length);
    else if (chave.startsWith("__LOOP__:"))
      token = `{{#each ${chave.slice("__LOOP__:".length)}}}{{this}}{{/each}}`;
    else token = `{{${chave}}}`;
    // Payload custom para o editor converter em nó mergeField no drop.
    if (!chave.startsWith("__RAW__:") && !chave.startsWith("__LOOP__:") && !chave.startsWith("__TABLE__:")) {
      e.dataTransfer.setData("application/x-merge-field", chave);
    }
    e.dataTransfer.setData("text/plain", token);
    e.dataTransfer.effectAllowed = "copy";
  };

export function CamposSidebar({ estabelecimentoId, onInsert, currentHtml, mergeFields: mergeFieldsProp, onMergeFieldsChange, configs: configsProp, onConfigsChange, savedTables: savedTablesProp, onSavedTablesChange }: Props) {
  const [mergeFieldsInternal, setMergeFieldsInternal] = useState<string[]>([]);
  const mergeFields = mergeFieldsProp ?? mergeFieldsInternal;
  const setMergeFields = (chaves: string[]) => {
    setMergeFieldsInternal(chaves);
    onMergeFieldsChange?.(chaves);
  };
  const [configsInternal, setConfigsInternal] = useState<MergeConfig[]>([]);
  const configs = configsProp ?? configsInternal;
  const setConfigs = (list: MergeConfig[]) => {
    setConfigsInternal(list);
    onConfigsChange?.(list);
  };
  const [savedTablesInternal, setSavedTablesInternal] = useState<{ name: string; alias: string; cols: string[] }[]>([]);
  const savedTables = savedTablesProp ?? savedTablesInternal;
  const setSavedTables = (list: { name: string; alias: string; cols: string[] }[]) => {
    setSavedTablesInternal(list);
    onSavedTablesChange?.(list);
  };
  const addSavedTable = (name: string, meta: { alias: string; cols: string[] }) => {
    setSavedTables([...savedTables.filter(t => t.name !== name), { name, ...meta }]);
  };
  const removeSavedTable = (name: string) => setSavedTables(savedTables.filter(t => t.name !== name));
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const [campos, setCampos] = useState<Campo[]>([]);
  const [busca, setBusca] = useState("");
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

  // Carrega valores de preview (primeira linha de cada vínculo + base)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const base = await resolveMergeData("livre", null);
      const acc: Record<string, any> = { ...base };
      for (const c of configs) {
        if (!c?.alias) continue;
        try {
          const rows = await runMergeConfig(c);
          if (rows && rows[0]) acc[c.alias] = rows[0];
        } catch {}
      }
      if (!cancelled) setPreviewValues(acc);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(configs)]);

  const onDragToken = useMemo(() => makeDragHandler(previewValues), [previewValues]);

  const load = async () => {
    if (!estabelecimentoId) return;
    const { data } = await supabase
      .from("doc_campos")
      .select("id, chave, rotulo, categoria, tipo, personalizado, descricao")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("categoria")
      .order("rotulo");
    setCampos((data ?? []) as Campo[]);
  };
  useEffect(() => { void load(); }, [estabelecimentoId]);

  useEffect(() => {
    const h = () => void load();
    window.addEventListener("doc-campos:changed", h);
    return () => window.removeEventListener("doc-campos:changed", h);
  }, [estabelecimentoId]);

  // Apenas Sistema + Personalizado
  const { sistema, personalizado } = useMemo(() => {
    const q = busca.toLowerCase();
    const filtered = campos.filter(c =>
      !busca || c.rotulo.toLowerCase().includes(q) || c.chave.toLowerCase().includes(q)
    );
    return {
      sistema: filtered.filter(c => !c.personalizado && c.chave === "data_atual"),
      personalizado: filtered.filter(c => c.personalizado),
    };
  }, [campos, busca]);

  const usadas = useMemo(() => extractFieldKeys(currentHtml), [currentHtml]);
  const validKeys = new Set(campos.map(c => c.chave));
  const invalidUsed = usadas.filter(k => !validKeys.has(k.split(".")[0]) && !mergeFields.includes(k));

  const excluirCampo = async (c: Campo) => {
    if (!confirm(`Excluir o campo personalizado "${c.rotulo}"?\n\nOs documentos que usarem {{${c.chave}}} ficarão sem valor.`)) return;
    const { error } = await supabase.from("doc_campos").delete().eq("id", c.id);
    if (error) { console.error(error); return; }
    window.dispatchEvent(new CustomEvent("doc-campos:changed"));
  };

  const renderCampoBtn = (c: Campo, emerald = false) => (
    <div key={c.id} className="relative group">
      <button
        draggable
        onDragStart={(e) => onDragToken(e, c.chave)}
        onClick={() => onInsert(c.chave)}
        className={cn(
          "text-xs px-2 py-1 rounded border border-primary/20 bg-primary/5 hover:bg-primary/15 text-left cursor-grab active:cursor-grabbing w-full",
          emerald && "border-emerald-500/40 bg-emerald-500/5",
        )}
        title={c.descricao ? `${c.descricao}\n\n{{${c.chave}}}` : `{{${c.chave}}}\n\nArraste ou clique para inserir`}
      >
        <span className="font-medium">{c.rotulo}</span>
        <span className="block text-[10px] text-muted-foreground font-mono">{`{{${c.chave}}}`}</span>
      </button>
      {c.personalizado && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void excluirCampo(c); }}
          className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] shadow"
          title="Excluir campo personalizado"
        >
          ×
        </button>
      )}
    </div>
  );

  const addConfig = () => {
    setConfigs([...configs, { mode: "visual", tabela: "", alias: `reg${configs.length + 1}`, filtros: [], limite: 50, calculados: [], relations: [], camposSelecionados: {} }]);
    setEditIdx(configs.length);
  };
  const removeConfig = (i: number) => {
    const removed = configs[i];
    setConfigs(configs.filter((_, k) => k !== i));
    // remove campos ligados a esse alias
    if (removed?.alias) setMergeFields(mergeFields.filter(k => !k.startsWith(`${removed.alias}.`)));
  };
  const updateConfig = (i: number, cfg: MergeConfig) => {
    const n = [...configs];
    n[i] = cfg;
    setConfigs(n);
  };

  return (
    <aside className="w-72 border-l bg-card flex flex-col">
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Tags className="h-4 w-4" /> Campos
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar campo…" className="pl-7 h-8 text-xs" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Vínculos de dados (múltiplos) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Database className="h-3 w-3" /> Vínculos de dados
              </div>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={addConfig}>
                <Plus className="h-3 w-3 mr-1" /> Novo
              </Button>
            </div>
            {configs.length === 0 && (
              <p className="text-[11px] text-muted-foreground">Nenhum vínculo. Clique em <b>Novo</b> para vincular uma tabela ou API.</p>
            )}
            <div className="space-y-1">
              {configs.map((c, i) => (
                <div key={i} className="flex items-center gap-1 border rounded px-2 py-1 bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate">{c.tabela || <span className="italic text-muted-foreground">sem tabela</span>}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">alias: {c.alias}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditIdx(i)} title="Editar">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeConfig(i)} title="Remover">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            {/* Diálogos controlados dos configs */}
            {configs.map((c, i) => (
              <MergeBuilderDialog
                key={`dlg-${i}`}
                hideTrigger
                open={editIdx === i}
                onOpenChange={(o) => { if (!o) setEditIdx(null); }}
                value={c}
                onChange={(cfg) => updateConfig(i, cfg)}
                onInsertField={(chave) => onInsert(chave)}
                onSelectFields={(chaves) => {
                  // mantém campos de outros aliases + acrescenta os novos deste alias
                  const alias = configs[i]?.alias;
                  const outros = alias ? mergeFields.filter(k => !k.startsWith(`${alias}.`)) : mergeFields;
                  setMergeFields([...outros, ...chaves]);
                }}
                initialSelected={mergeFields.filter(k => c.alias && k.startsWith(`${c.alias}.`))}
                onSaveTable={addSavedTable}
              />
            ))}
          </div>

          {/* Tabelas salvas — subgrupo */}
          <div className="border-t pt-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Database className="h-3 w-3" /> Tabelas
            </div>
            {savedTables.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhuma tabela gerada. Use "Inserir tabela" no vínculo para criar.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {savedTables.map(t => (
                  <div key={t.name} className="flex items-center gap-1 border rounded px-2 py-1 bg-violet-500/5 border-violet-500/40">
                    <button
                      draggable
                      onDragStart={(e) => {
                        const payload = `__TABLE__:${JSON.stringify({ alias: t.alias, cols: t.cols })}`;
                        e.dataTransfer.setData("text/plain", payload);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => onInsert(`__TABLE__:${JSON.stringify({ alias: t.alias, cols: t.cols })}`)}
                      className="text-[11px] font-medium cursor-grab active:cursor-grabbing"
                      title="Arraste ou clique para inserir a tabela (será perguntado o intervalo de linhas)"
                    >
                      📊 {t.name}
                    </button>
                    <button onClick={() => removeSavedTable(t.name)} className="text-destructive/70 hover:text-destructive" title="Remover">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Campos do Merge selecionados */}
          <div className="border-t pt-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Campos do Merge</div>
            {mergeFields.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum campo selecionado nos vínculos.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {mergeFields.map(chave => (
                  <button
                    key={chave}
                    draggable
                    onDragStart={(e) => onDragToken(e, chave)}
                    onClick={() => onInsert(chave)}
                    className="text-xs px-2 py-1 rounded border border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/15 text-left cursor-grab active:cursor-grabbing"
                    title={`{{${chave}}}\n\nArraste ou clique para inserir`}
                  >
                    <span className="font-mono text-[11px] text-sky-700 dark:text-sky-300">{`{{${chave}}}`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>


          {/* Sistema — somente Data atual */}
          <div className="border-t pt-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Sistema</div>
            {sistema.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum campo.</p>
            ) : (
              <div className="flex flex-wrap gap-1">{sistema.map(c => renderCampoBtn(c))}</div>
            )}
          </div>

          {/* Personalizado */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Personalizado</div>
            {personalizado.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum campo personalizado.</p>
            ) : (
              <div className="flex flex-wrap gap-1">{personalizado.map(c => renderCampoBtn(c, true))}</div>
            )}
          </div>

          {/* Blocos avançados — draggable */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Blocos avançados</div>
            <div className="flex flex-wrap gap-1">
              {[
                { label: "Condição {{#if}}", token: "{{#if campo}}Texto{{/if}}" },
                { label: "Loop {{#each}}", token: "{{#each lista}}{{this}}{{/each}}" },
                { label: "Fórmula {{= }}", token: "{{= preco * qtd }}" },
                { label: "Soma", token: "{{sum lista.valor}}" },
                { label: "Média", token: "{{avg lista.valor}}" },
                { label: "Contar", token: "{{count lista}}" },
                { label: "Moeda", token: "{{moeda valor}}" },
                { label: "Data", token: "{{data campo}}" },
              ].map((b) => (
                <button
                  key={b.label}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", b.token); e.dataTransfer.effectAllowed = "copy"; }}
                  onClick={() => onInsert(`__RAW__:${b.token}`)}
                  className="text-xs px-2 py-1 rounded border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-left cursor-grab active:cursor-grabbing"
                  title={`${b.token}\n\nArraste ou clique para inserir`}
                >
                  <span className="font-medium">{b.label}</span>
                  <span className="block text-[10px] text-muted-foreground font-mono truncate max-w-[220px]">{b.token}</span>
                </button>
              ))}
            </div>
          </div>


          {/* Usados no documento */}
          <div className="border-t pt-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Usados no documento</div>
            {usadas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum campo inserido ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {usadas.map(k => (
                  <Badge key={k} variant={validKeys.has(k.split(".")[0]) || mergeFields.includes(k) ? "secondary" : "destructive"} className="text-[10px] font-mono">
                    {k}
                  </Badge>
                ))}
              </div>
            )}
            {invalidUsed.length > 0 && (
              <p className="text-[11px] text-destructive mt-1">
                Campos inválidos: {invalidUsed.join(", ")}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
