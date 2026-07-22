import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Pilcrow,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo, Redo, Link as LinkIcon,
  Table as TableIcon, Rows, Columns, Trash2, Eraser, Maximize2, ZoomIn, ZoomOut,
  ScanSearch, ArrowLeft, Save, Eye, Lock, Unlock, Copy, Printer, FileDown, SaveAll,
  Database, ClipboardList, Pencil, PanelRightOpen, PanelRightClose,
  Building2, Package, FormInput, Sparkles, Loader2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ImagePickerDialog } from "./ImagePickerDialog";
import { AssinaturaPickerDialog } from "./AssinaturaPickerDialog";
import { NovoCampoDialog } from "./NovoCampoDialog";


export type EditorMode = "editar" | "merge" | "form";

interface Props {
  editor: Editor | null;
  onFullscreen?: () => void;
  zoom: number;
  setZoom: (z: number) => void;
  onPreviewMerge?: () => void;
  previewActive?: boolean;
  estabelecimentoId?: string | null;
  // Ações unificadas (barra única)
  onBack?: () => void;
  onSave?: () => void;
  onSalvarComo?: () => void;
  onToggleLock?: () => void;
  locked?: boolean;
  dirty?: boolean;
  saving?: boolean;
  titulo?: string;
  onTituloChange?: (v: string) => void;
  mode?: EditorMode;
  onModeChange?: (m: EditorMode) => void;
  onInsertFormField?: (token: string) => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  onToggleFormFields?: () => void;
  formFieldsOpen?: boolean;
  hasFormFields?: boolean;
  onQuickFill?: () => void;
  onGeneratePdf?: () => void;
  onPrint?: () => void;
  pendingFillables?: number;
  onSearchEmpresa?: () => void;
  onSearchEstoque?: () => void;
}


function TB({ active, onClick, disabled, title, children }: any) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      // Preserva a seleção do editor (Word-like): impede que o clique no botão
      // roube o foco antes de o comando de formatação ser aplicado.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn("h-8 w-8 p-0", active && "bg-primary/15")}
    >
      {children}
    </Button>
  );
}

const FONTS = ["Arial", "Times New Roman", "Georgia", "Courier New", "Verdana", "Tahoma", "Calibri"];
const SIZES = ["10px", "12px", "14px", "16px", "18px", "24px", "32px"];

export function EditorToolbar({
  editor, onFullscreen, zoom, setZoom, onPreviewMerge, previewActive, estabelecimentoId,
  onBack, onSave, onSalvarComo, onToggleLock, locked, dirty, saving,
  titulo, onTituloChange, mode = "editar", onModeChange,
  onInsertFormField, onToggleSidebar, sidebarOpen, onToggleFormFields, formFieldsOpen, hasFormFields = false,
  onQuickFill, onGeneratePdf, onPrint, pendingFillables = 0, onSearchEmpresa, onSearchEstoque,
}: Props) {

  const [color, setColor] = useState("#111111");
  const [bgColor, setBgColor] = useState("#fff59d");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiContexto, setAiContexto] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const isEdit = mode === "editar";

  async function gerarTextoIA() {
    if (!editor || !aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("editor-generate-text", {
        body: { prompt: aiPrompt.trim(), contexto: aiContexto.trim() },
      });
      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error ?? "Falha ao gerar");
      const html = String(data.html ?? "").trim();
      if (!html) throw new Error("IA retornou vazio");
      editor.chain().focus().insertContent(html).run();
      toast.success("Texto inserido no documento");
      setAiOpen(false);
      setAiPrompt("");
      setAiContexto("");
    } catch (e: any) {
      toast.error("Erro na IA: " + (e?.message ?? e));
    } finally {
      setAiLoading(false);
    }
  }


  return (
    <div className="sticky top-0 z-20 border-b bg-card">
      <div className={cn("flex flex-wrap items-center gap-1 px-2 py-1")}>
        {onBack && <TB onClick={onBack} title="Voltar"><ArrowLeft className="h-4 w-4" /></TB>}
        {onSave && <TB onClick={onSave} disabled={locked} title="Salvar"><Save className="h-4 w-4" /></TB>}
        {onSalvarComo && <TB onClick={onSalvarComo} title="Salvar como"><SaveAll className="h-4 w-4" /></TB>}
        {onPreviewMerge && (
          <TB onClick={onPreviewMerge} active={previewActive} title={previewActive ? "Visualização ATIVA — mostrando valores. Clique para ver variáveis." : "Visualização INATIVA — mostrando variáveis. Clique para ver valores."}>
            <Eye className={cn("h-4 w-4", previewActive && "text-emerald-600")} />
          </TB>
        )}
        {onToggleLock && (
          <TB onClick={onToggleLock} active={locked} title={locked ? "Desbloquear" : "Bloquear edição"}>
            {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </TB>
        )}
        {onToggleSidebar && !locked && (
          <TB onClick={onToggleSidebar} active={!!sidebarOpen} title={sidebarOpen ? "Fechar campos" : "Abrir campos e vínculos"}>
            {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </TB>
        )}
        {onToggleFormFields && !locked && (
          <TB onClick={onToggleFormFields} active={!!formFieldsOpen} title={formFieldsOpen ? "Fechar campos personalizados" : "Abrir campos personalizados"}>
            <FormInput className="h-4 w-4" />
          </TB>
        )}

        {(onQuickFill || onGeneratePdf || onPrint || onSearchEmpresa || onSearchEstoque) && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            {onSearchEmpresa && !locked && (
              <TB onClick={onSearchEmpresa} title="Buscar empresa e inserir dados no documento">
                <Building2 className="h-4 w-4" />
              </TB>
            )}
            {onSearchEstoque && !locked && (
              <TB onClick={onSearchEstoque} title="Consultar estoque e inserir tabela de produtos">
                <Package className="h-4 w-4" />
              </TB>
            )}
            {onQuickFill && (
              <TB
                onClick={onQuickFill}
                disabled={!hasFormFields}
                title={hasFormFields ? "Preenchimento rápido" : "Insira ao menos um campo de formulário para habilitar"}
              >
                <ClipboardList className="h-4 w-4" />
              </TB>
            )}
            {onGeneratePdf && (
              <TB
                onClick={onGeneratePdf}
                disabled={pendingFillables > 0}
                title={pendingFillables > 0 ? `Preencha ${pendingFillables} campo(s) pendente(s) para gerar o PDF` : "Gerar PDF"}
              >
                <FileDown className={cn("h-4 w-4", pendingFillables > 0 && "opacity-50")} />
              </TB>
            )}
            {onPrint && (
              <TB
                onClick={onPrint}
                disabled={pendingFillables > 0}
                title={pendingFillables > 0 ? `Preencha ${pendingFillables} campo(s) pendente(s) para imprimir` : "Imprimir"}
              >
                <Printer className={cn("h-4 w-4", pendingFillables > 0 && "opacity-50")} />
              </TB>
            )}
          </>
        )}

        {editor && !locked && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <TB onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer"><Undo className="h-4 w-4" /></TB>
            <TB onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer"><Redo className="h-4 w-4" /></TB>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setAiOpen(true)}
              className="h-8 gap-1 px-2 border-primary/40 text-primary hover:bg-primary/10"
              title="Gerar texto com IA a partir de uma descrição"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium">Texto por IA</span>
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <Select value="" onValueChange={(v) => editor.chain().focus().setFontFamily(v).run()}>
              <SelectTrigger onMouseDown={(e) => e.preventDefault()} className="h-8 w-[130px] text-xs"><SelectValue placeholder="Fonte" /></SelectTrigger>
              <SelectContent>{FONTS.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
            </Select>
            <Select value="" onValueChange={(v) => editor.chain().focus().setMark("textStyle", { fontSize: v } as any).run()}>
              <SelectTrigger onMouseDown={(e) => e.preventDefault()} className="h-8 w-[70px] text-xs"><SelectValue placeholder="Tam." /></SelectTrigger>
              <SelectContent>{SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6 mx-1" />
            <TB active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito"><Bold className="h-4 w-4" /></TB>
            <TB active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico"><Italic className="h-4 w-4" /></TB>
            <TB active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado"><UnderlineIcon className="h-4 w-4" /></TB>
            <TB active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado"><Strikethrough className="h-4 w-4" /></TB>

            <Separator orientation="vertical" className="h-6 mx-1" />
            <TB active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1"><Heading1 className="h-4 w-4" /></TB>
            <TB active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><Heading2 className="h-4 w-4" /></TB>
            <TB active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><Heading3 className="h-4 w-4" /></TB>
            <TB active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} title="Parágrafo"><Pilcrow className="h-4 w-4" /></TB>

            <Separator orientation="vertical" className="h-6 mx-1" />
            <TB active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Esquerda"><AlignLeft className="h-4 w-4" /></TB>
            <TB active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centro"><AlignCenter className="h-4 w-4" /></TB>
            <TB active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Direita"><AlignRight className="h-4 w-4" /></TB>
            <TB active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justificado"><AlignJustify className="h-4 w-4" /></TB>

            <Separator orientation="vertical" className="h-6 mx-1" />
            <TB active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista"><List className="h-4 w-4" /></TB>
            <TB active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada"><ListOrdered className="h-4 w-4" /></TB>

            <Separator orientation="vertical" className="h-6 mx-1" />
            <Input type="color" onMouseDown={(e) => e.preventDefault()} title="Cor do texto" value={color} onChange={(e) => { setColor(e.target.value); editor.chain().focus().setColor(e.target.value).run(); }} className="h-8 w-8 p-0.5 cursor-pointer" />
            <Input type="color" onMouseDown={(e) => e.preventDefault()} title="Cor de fundo" value={bgColor} onChange={(e) => { setBgColor(e.target.value); editor.chain().focus().toggleHighlight({ color: e.target.value }).run(); }} className="h-8 w-8 p-0.5 cursor-pointer" />

            <Separator orientation="vertical" className="h-6 mx-1" />
            <TB onClick={() => {
              const sel = editor.state.selection;
              const selectedText = editor.state.doc.textBetween(sel.from, sel.to, " ");
              const prev = editor.getAttributes("link")?.href || "";
              setLinkText(selectedText);
              setLinkUrl(prev);
              setLinkOpen(true);
            }} title="Link"><LinkIcon className="h-4 w-4" /></TB>
            <ImagePickerDialog onInsert={(url, w) => {
              editor.chain().focus().setImage({ src: url } as any).updateAttributes("image", { width: w } as any).run();
            }} />
            <AssinaturaPickerDialog onInsert={(html) => {
              editor.chain().focus().insertContent(html).run();
            }} />
            {estabelecimentoId !== undefined && (
              <NovoCampoDialog estabelecimentoId={estabelecimentoId ?? null} triggerAsIcon />
            )}
            {editor.isActive("image") && (
              <Select value="" onValueChange={(v) => editor.chain().focus().updateAttributes("image", { width: v } as any).run()}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue placeholder="Tam. img" /></SelectTrigger>
                <SelectContent>
                  {["25%", "50%", "75%", "100%", "200px", "400px", "auto"].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <Separator orientation="vertical" className="h-6 mx-1" />
            <TB onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Inserir tabela"><TableIcon className="h-4 w-4" /></TB>
            <TB onClick={() => editor.chain().focus().addRowAfter().run()} title="Adicionar linha"><Rows className="h-4 w-4" /></TB>
            <TB onClick={() => editor.chain().focus().addColumnAfter().run()} title="Adicionar coluna"><Columns className="h-4 w-4" /></TB>
            <TB onClick={() => editor.chain().focus().deleteTable().run()} title="Remover tabela"><Trash2 className="h-4 w-4" /></TB>

            <Separator orientation="vertical" className="h-6 mx-1" />
            <TB onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Limpar formatação"><Eraser className="h-4 w-4" /></TB>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          <TB onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} title="Diminuir zoom"><ZoomOut className="h-4 w-4" /></TB>
          <span className="text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
          <TB onClick={() => setZoom(Math.min(2, zoom + 0.1))} title="Aumentar zoom"><ZoomIn className="h-4 w-4" /></TB>
          <TB onClick={onFullscreen} title="Tela cheia"><Maximize2 className="h-4 w-4" /></TB>
        </div>
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="link-text">Texto</Label>
              <Input id="link-text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Texto exibido" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-url">URL</Label>
              <Input id="link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://exemplo.com" autoFocus />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editor?.isActive("link") && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  setLinkOpen(false);
                }}
              >
                Remover link
              </Button>
            )}
            <Button
              type="button"
              onClick={() => {
                if (!editor || !linkUrl) return;
                const url = linkUrl.trim();
                const chain = editor.chain().focus();
                const sel = editor.state.selection;
                const currentText = editor.state.doc.textBetween(sel.from, sel.to, " ");
                if (linkText && linkText !== currentText) {
                  chain.insertContent(`<a href="${url}">${linkText}</a>`).run();
                } else if (sel.empty) {
                  chain.insertContent(`<a href="${url}">${linkText || url}</a>`).run();
                } else {
                  chain.extendMarkRange("link").setLink({ href: url }).run();
                }
                setLinkOpen(false);
              }}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aiOpen} onOpenChange={(o) => !aiLoading && setAiOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Gerar texto por IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ai-prompt">O que deseja criar? *</Label>
              <Textarea
                id="ai-prompt"
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: Contrato de compra e venda de veículo entre pessoa física e jurídica"
                disabled={aiLoading}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-contexto">Contexto adicional (opcional)</Label>
              <Textarea
                id="ai-contexto"
                rows={3}
                value={aiContexto}
                onChange={(e) => setAiContexto(e.target.value)}
                placeholder="Ex: valor R$ 50.000, pagamento em 10x, garantia de 90 dias..."
                disabled={aiLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O texto será inserido na posição atual do cursor no documento.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setAiOpen(false)} disabled={aiLoading}>
              Cancelar
            </Button>
            <Button type="button" onClick={gerarTextoIA} disabled={aiLoading || !aiPrompt.trim()}>
              {aiLoading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" /> Gerar e inserir</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

