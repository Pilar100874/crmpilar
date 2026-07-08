import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Tags, Database } from "lucide-react";

import { cn } from "@/lib/utils";
import { extractFieldKeys } from "@/lib/editores/mergeEngine";
import { FormFieldPicker } from "./FormFieldPicker";
import { MergeBuilderDialog } from "./MergeBuilderDialog";

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
}

const onDragToken = (e: React.DragEvent, chave: string) => {
  const token = chave.startsWith("__RAW__:") ? chave.slice("__RAW__:".length)
              : chave.startsWith("__LOOP__:") ? `{{#each ${chave.slice("__LOOP__:".length)}}}{{this}}{{/each}}`
              : `{{${chave}}}`;
  e.dataTransfer.setData("text/plain", token);
  e.dataTransfer.effectAllowed = "copy";
};

export function CamposSidebar({ estabelecimentoId, onInsert, currentHtml, mergeFields = [], onMergeFieldsChange }: Props) {
  const [campos, setCampos] = useState<Campo[]>([]);
  const [busca, setBusca] = useState("");

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
      sistema: filtered.filter(c => !c.personalizado),
      personalizado: filtered.filter(c => c.personalizado),
    };
  }, [campos, busca]);

  const usadas = useMemo(() => extractFieldKeys(currentHtml), [currentHtml]);
  const validKeys = new Set(campos.map(c => c.chave));
  const invalidUsed = usadas.filter(k => !validKeys.has(k.split(".")[0]) && !mergeFields.includes(k));

  const renderCampoBtn = (c: Campo, emerald = false) => (
    <button
      key={c.id}
      draggable
      onDragStart={(e) => onDragToken(e, c.chave)}
      onClick={() => onInsert(c.chave)}
      className={cn(
        "text-xs px-2 py-1 rounded border border-primary/20 bg-primary/5 hover:bg-primary/15 text-left cursor-grab active:cursor-grabbing",
        emerald && "border-emerald-500/40 bg-emerald-500/5"
      )}
      title={c.descricao ? `${c.descricao}\n\n{{${c.chave}}}` : `{{${c.chave}}}\n\nArraste ou clique para inserir`}
    >
      <span className="font-medium">{c.rotulo}</span>
      <span className="block text-[10px] text-muted-foreground font-mono">{`{{${c.chave}}}`}</span>
    </button>
  );

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
        <FormFieldPicker onInsert={(tok) => onInsert(tok)} triggerClassName="w-full h-8" triggerLabel="Campo de formulário" />
        <MergeBuilderDialog
          onChange={() => {}}
          onInsertField={(chave) => onInsert(chave)}
          onSelectFields={(chaves) => onMergeFieldsChange?.(chaves)}
          initialSelected={mergeFields}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Sistema */}
          <div>
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

          {/* Campos do Merge selecionados */}
          <div className="border-t pt-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Database className="h-3 w-3" /> Campos do Merge
            </div>
            {mergeFields.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Nenhum. Abra <b>Vincular dados</b>, vincule as tabelas, execute e selecione os campos.
              </p>
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
