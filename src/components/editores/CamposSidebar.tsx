import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Tags } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

export function CamposSidebar({ estabelecimentoId, onInsert, currentHtml }: Props) {
  const [campos, setCampos] = useState<Campo[]>([]);
  const [busca, setBusca] = useState("");
  const [openNovo, setOpenNovo] = useState(false);
  const [novo, setNovo] = useState({ chave: "", rotulo: "", categoria: "Personalizado", tipo: "texto", descricao: "" });

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

  const grupos = useMemo(() => {
    const filtered = campos.filter(c =>
      !busca ||
      c.rotulo.toLowerCase().includes(busca.toLowerCase()) ||
      c.chave.toLowerCase().includes(busca.toLowerCase())
    );
    const map: Record<string, Campo[]> = {};
    for (const c of filtered) {
      (map[c.categoria || "Geral"] ??= []).push(c);
    }
    return map;
  }, [campos, busca]);

  const usadas = useMemo(() => extractFieldKeys(currentHtml), [currentHtml]);
  const validKeys = new Set(campos.map(c => c.chave));
  const invalidUsed = usadas.filter(k => !validKeys.has(k.split(".")[0]));

  const criarCampo = async () => {
    if (!estabelecimentoId) return;
    const chave = novo.chave.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!chave || !novo.rotulo.trim()) { toast.error("Informe chave e rótulo"); return; }
    const { error } = await supabase.from("doc_campos").insert({
      estabelecimento_id: estabelecimentoId,
      chave,
      rotulo: novo.rotulo.trim(),
      categoria: novo.categoria.trim() || "Personalizado",
      tipo: novo.tipo,
      descricao: novo.descricao.trim() || null,
      personalizado: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Campo criado");
    setOpenNovo(false);
    setNovo({ chave: "", rotulo: "", categoria: "Personalizado", tipo: "texto", descricao: "" });
    void load();
  };

  return (
    <aside className="w-72 border-l bg-card flex flex-col">
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Tags className="h-4 w-4" /> Campos do Sistema
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar campo…" className="pl-7 h-8 text-xs" />
        </div>
        <Button size="sm" variant="outline" className="w-full h-8" onClick={() => setOpenNovo(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Novo campo personalizado
        </Button>
        <FormFieldPicker onInsert={(tok) => onInsert(tok)} triggerClassName="w-full h-8" triggerLabel="Campo de formulário" />
        <MergeBuilderDialog
          onChange={() => {}}
          onInsertField={(chave) => onInsert(chave)}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {Object.entries(grupos).map(([grupo, list]) => (
            <div key={grupo}>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{grupo}</div>
              <div className="flex flex-wrap gap-1">
                {list.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onInsert(c.chave)}
                    className={cn(
                      "text-xs px-2 py-1 rounded border border-primary/20 bg-primary/5 hover:bg-primary/15 text-left",
                      c.personalizado && "border-emerald-500/40 bg-emerald-500/5"
                    )}
                    title={c.descricao ? `${c.descricao}\n\n{{${c.chave}}}` : `{{${c.chave}}}`}
                  >
                    <span className="font-medium">{c.rotulo}</span>
                    <span className="block text-[10px] text-muted-foreground font-mono">{`{{${c.chave}}}`}</span>
                    {c.descricao && (
                      <span className="block text-[10px] text-muted-foreground italic mt-0.5 line-clamp-2">{c.descricao}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t pt-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Campos usados no documento</div>
            {usadas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum campo inserido ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {usadas.map(k => (
                  <Badge key={k} variant={validKeys.has(k.split(".")[0]) ? "secondary" : "destructive"} className="text-[10px] font-mono">
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

          <div className="border-t pt-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Blocos avançados</p>
            <button
              className="block text-left hover:text-foreground font-mono"
              onClick={() => onInsert("#if possui_desconto}}Texto{{/if")}
            >
              {"{{#if chave}}…{{/if}}"}
            </button>
            <button
              className="block text-left hover:text-foreground font-mono"
              onClick={() => onInsert("#each itens}}{{descricao}}{{/each")}
            >
              {"{{#each lista}}…{{/each}}"}
            </button>
          </div>
        </div>
      </ScrollArea>

      <Dialog open={openNovo} onOpenChange={setOpenNovo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo campo personalizado</DialogTitle>
            <DialogDescription>Ficará disponível para todos os modelos deste estabelecimento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Chave (sem espaços)</label>
              <Input value={novo.chave} onChange={e => setNovo({ ...novo, chave: e.target.value })} placeholder="ex: numero_apolice" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rótulo</label>
              <Input value={novo.rotulo} onChange={e => setNovo({ ...novo, rotulo: e.target.value })} placeholder="ex: Número da apólice" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Categoria</label>
                <Input value={novo.categoria} onChange={e => setNovo({ ...novo, categoria: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tipo</label>
                <Select value={novo.tipo} onValueChange={v => setNovo({ ...novo, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="moeda">Moeda</SelectItem>
                    <SelectItem value="numero">Número</SelectItem>
                    <SelectItem value="booleano">Booleano</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Instrução de preenchimento (opcional)</label>
              <Input
                value={novo.descricao}
                onChange={e => setNovo({ ...novo, descricao: e.target.value })}
                placeholder="ex: Informar o número da apólice sem hífens"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Aparece como dica no editor e como placeholder no Simular/Preencher.</p>
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovo(false)}>Cancelar</Button>
            <Button onClick={criarCampo}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
