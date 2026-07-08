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
  ScanSearch, ArrowLeft, Save, Eye, Lock, Unlock, Copy,
  Database, ClipboardList, Pencil, PanelRightOpen, PanelRightClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ImagePickerDialog } from "./ImagePickerDialog";
import { AssinaturaPickerDialog } from "./AssinaturaPickerDialog";
import { NovoCampoDialog } from "./NovoCampoDialog";
import { FormFieldPicker } from "./FormFieldPicker";

export type EditorMode = "editar" | "merge" | "form";

interface Props {
  editor: Editor | null;
  onFullscreen?: () => void;
  zoom: number;
  setZoom: (z: number) => void;
  onPreviewMerge?: () => void;
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
}


function TB({ active, onClick, disabled, title, children }: any) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
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
  editor, onFullscreen, zoom, setZoom, onPreviewMerge, estabelecimentoId,
  onBack, onSave, onSalvarComo, onToggleLock, locked, dirty, saving,
  titulo, onTituloChange, mode = "editar", onModeChange,
  onInsertFormField, onToggleSidebar, sidebarOpen,
}: Props) {

  const [color, setColor] = useState("#111111");
  const [bgColor, setBgColor] = useState("#fff59d");
  const isEdit = mode === "editar";

  return (
    <div className="sticky top-0 z-20 border-b bg-card">
      <div className={cn("flex flex-wrap items-center gap-1 px-2 py-1")}>
        {onBack && <TB onClick={onBack} title="Voltar"><ArrowLeft className="h-4 w-4" /></TB>}
        {onSave && <TB onClick={onSave} disabled={locked} title="Salvar"><Save className="h-4 w-4" /></TB>}
        {onSalvarComo && <TB onClick={onSalvarComo} title="Salvar como"><Copy className="h-4 w-4" /></TB>}
        {onPreviewMerge && <TB onClick={onPreviewMerge} title="Visualizar"><Eye className="h-4 w-4" /></TB>}
        {onToggleLock && (
          <TB onClick={onToggleLock} active={locked} title={locked ? "Desbloquear" : "Bloquear edição"}>
            {locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </TB>
        )}
        {onInsertFormField && (
          <FormFieldPicker asIcon onInsert={onInsertFormField} />
        )}
        {onToggleSidebar && (
          <TB onClick={onToggleSidebar} active={!!sidebarOpen} title={sidebarOpen ? "Fechar campos" : "Abrir campos e vínculos"}>
            {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </TB>
        )}

        {onModeChange && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <TB onClick={() => onModeChange("editar")} active={mode === "editar"} title="Editar"><Pencil className="h-4 w-4" /></TB>
            <TB onClick={() => onModeChange("merge")} active={mode === "merge"} title="Simular Merge"><Database className="h-4 w-4" /></TB>
            <TB onClick={() => onModeChange("form")} active={mode === "form"} title="Simular Formulário"><ClipboardList className="h-4 w-4" /></TB>
          </>
        )}

        {editor && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <TB onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer"><Undo className="h-4 w-4" /></TB>
            <TB onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer"><Redo className="h-4 w-4" /></TB>
            <Separator orientation="vertical" className="h-6 mx-1" />

            <Select value="" onValueChange={(v) => editor.chain().focus().setFontFamily(v).run()}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Fonte" /></SelectTrigger>
              <SelectContent>{FONTS.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}</SelectContent>
            </Select>
            <Select value="" onValueChange={(v) => editor.chain().focus().setMark("textStyle", { fontSize: v } as any).run()}>
              <SelectTrigger className="h-8 w-[70px] text-xs"><SelectValue placeholder="Tam." /></SelectTrigger>
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
            <Input type="color" title="Cor do texto" value={color} onChange={(e) => { setColor(e.target.value); editor.chain().focus().setColor(e.target.value).run(); }} className="h-8 w-8 p-0.5 cursor-pointer" />
            <Input type="color" title="Cor de fundo" value={bgColor} onChange={(e) => { setBgColor(e.target.value); editor.chain().focus().toggleHighlight({ color: e.target.value }).run(); }} className="h-8 w-8 p-0.5 cursor-pointer" />

            <Separator orientation="vertical" className="h-6 mx-1" />
            <TB onClick={() => {
              const url = window.prompt("URL do link");
              if (url) editor.chain().focus().setLink({ href: url }).run();
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
    </div>
  );
}

