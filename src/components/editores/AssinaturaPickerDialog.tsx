import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { toast } from "@/lib/editores/editorPopup";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Signature, Plus, Trash2, Pencil, Star, StarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { TiptapEditor } from "./TiptapEditor";
import { EditorToolbar } from "./EditorToolbar";
import type { Editor } from "@tiptap/react";

interface Props {
  onInsert: (html: string) => void;
}

interface Assinatura {
  id: string;
  titulo: string;
  content_html: string;
  padrao: boolean;
}

const TEMPLATE_PADRAO = `
<p style="text-align:center;margin-top:60px;">_______________________________________</p>
<p style="text-align:center;"><strong>[[Nome]]</strong></p>
<p style="text-align:center;">[[Cargo]]</p>
<p style="text-align:center;">CPF/CNPJ: [[Documento]]</p>
`.trim();

export function AssinaturaPickerDialog({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [estabId, setEstabId] = useState<string | null>(null);
  const [items, setItems] = useState<Assinatura[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Assinatura | null>(null);
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => { getEstabelecimentoId().then(setEstabId); }, []);

  const carregar = async () => {
    if (!estabId) return;
    setLoading(true);
    const { data } = await supabase
      .from("doc_assinaturas" as any)
      .select("*")
      .eq("estabelecimento_id", estabId)
      .order("padrao", { ascending: false })
      .order("created_at", { ascending: false });
    setItems((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (open && estabId) void carregar(); }, [open, estabId]);

  const salvarEdicao = async () => {
    if (!editing || !estabId) return;
    if (!editing.titulo.trim()) { toast.error("Informe um título"); return; }
    if (editing.id) {
      const { error } = await supabase.from("doc_assinaturas" as any).update({
        titulo: editing.titulo, content_html: editing.content_html, padrao: editing.padrao,
      }).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("doc_assinaturas" as any).insert({
        estabelecimento_id: estabId,
        titulo: editing.titulo,
        content_html: editing.content_html,
        padrao: editing.padrao,
      });
      if (error) { toast.error(error.message); return; }
    }
    setEditing(null);
    void carregar();
    toast.success("Assinatura salva");
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir esta assinatura?")) return;
    await supabase.from("doc_assinaturas" as any).delete().eq("id", id);
    void carregar();
  };

  const alternarPadrao = async (a: Assinatura) => {
    await supabase.from("doc_assinaturas" as any).update({ padrao: !a.padrao }).eq("id", a.id);
    void carregar();
  };

  const inserir = () => {
    const a = items.find(i => i.id === selId);
    if (!a) return;
    onInsert(a.content_html);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Inserir assinatura">
          <Signature className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Modelos de assinatura</DialogTitle>
          <DialogDescription>
            Selecione uma assinatura para inserir no documento ou crie um novo modelo.
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="space-y-3 flex-1 overflow-auto flex flex-col">
            <Input
              value={editing.titulo}
              onChange={e => setEditing({ ...editing, titulo: e.target.value })}
              placeholder="Título (ex: Assinatura Diretor)"
            />
            <div className="border rounded flex flex-col overflow-hidden">
              <EditorToolbar editor={editorRef.current} zoom={zoom} setZoom={setZoom} />
              <div className="max-h-[45vh] overflow-auto bg-muted/20">
                <TiptapEditor
                  initialContent={editing.content_html || "<p></p>"}
                  onChange={(h) => setEditing((prev) => (prev ? { ...prev, content_html: h } : prev))}
                  editorRef={(e) => { editorRef.current = e; }}
                  zoom={zoom}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Dica: use <code className="bg-muted px-1 rounded">[[Nome]]</code>, <code className="bg-muted px-1 rounded">[[Cargo]]</code> etc. para campos preenchíveis. Insira imagens (assinatura escaneada, logo) pela toolbar.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="padrao"
                checked={editing.padrao}
                onChange={e => setEditing({ ...editing, padrao: e.target.checked })}
              />
              <label htmlFor="padrao" className="text-sm">Marcar como assinatura padrão</label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={salvarEdicao}>Salvar assinatura</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {loading ? "Carregando…" : `${items.length} modelo(s)`}
              </p>
              <Button size="sm" variant="outline" onClick={() => setEditing({
                id: "", titulo: "", content_html: TEMPLATE_PADRAO, padrao: false,
              })}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Nova assinatura
              </Button>
            </div>

            <ScrollArea className="flex-1 max-h-[420px] border rounded">
              {items.length === 0 && !loading && (
                <p className="text-center text-sm text-muted-foreground py-10">
                  Nenhuma assinatura cadastrada. Clique em "Nova assinatura".
                </p>
              )}
              <div className="divide-y">
                {items.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelId(a.id)}
                    className={cn(
                      "w-full text-left p-3 hover:bg-muted/50 flex gap-3 items-start",
                      selId === a.id && "bg-primary/10",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{a.titulo}</span>
                        {a.padrao && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">padrão</span>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2 [&_*]:!m-0"
                        dangerouslySetInnerHTML={{ __html: a.content_html }} />
                    </div>
                    <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => alternarPadrao(a)} title={a.padrao ? "Remover padrão" : "Definir padrão"}>
                        {a.padrao ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(a)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => excluir(a.id)} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            <Separator />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={inserir} disabled={!selId}>Inserir no documento</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
