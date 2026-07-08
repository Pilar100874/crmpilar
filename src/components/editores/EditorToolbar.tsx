import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Pilcrow,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Undo, Redo, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Rows, Columns, Trash2, Eraser, Maximize2, ZoomIn, ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ImagePickerDialog } from "./ImagePickerDialog";

interface Props {
  editor: Editor | null;
  onFullscreen?: () => void;
  zoom: number;
  setZoom: (z: number) => void;
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

export function EditorToolbar({ editor, onFullscreen, zoom, setZoom }: Props) {
  const [color, setColor] = useState("#111111");
  const [bgColor, setBgColor] = useState("#fff59d");
  if (!editor) return <div className="h-12 border-b bg-card" />;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-card px-2 py-1 sticky top-0 z-10">
      <TB onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer">
        <Undo className="h-4 w-4" />
      </TB>
      <TB onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer">
        <Redo className="h-4 w-4" />
      </TB>
      <Separator orientation="vertical" className="h-6 mx-1" />

      <Select value="" onValueChange={(v) => editor.chain().focus().setFontFamily(v).run()}>
        <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Fonte" /></SelectTrigger>
        <SelectContent>{FONTS.map(f => <SelectItem key={f} value={f} style={{fontFamily:f}}>{f}</SelectItem>)}</SelectContent>
      </Select>
      <Select value="" onValueChange={(v) => editor.chain().focus().setMark("textStyle", { fontSize: v } as any).run()}>
        <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue placeholder="Tam." /></SelectTrigger>
        <SelectContent>{SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6 mx-1" />
      <TB active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito"><Bold className="h-4 w-4" /></TB>
      <TB active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico"><Italic className="h-4 w-4" /></TB>
      <TB active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado"><UnderlineIcon className="h-4 w-4" /></TB>
      <TB active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Tachado"><Strikethrough className="h-4 w-4" /></TB>

      <Separator orientation="vertical" className="h-6 mx-1" />
      <TB active={editor.isActive("heading",{level:1})} onClick={() => editor.chain().focus().toggleHeading({level:1}).run()} title="H1"><Heading1 className="h-4 w-4" /></TB>
      <TB active={editor.isActive("heading",{level:2})} onClick={() => editor.chain().focus().toggleHeading({level:2}).run()} title="H2"><Heading2 className="h-4 w-4" /></TB>
      <TB active={editor.isActive("heading",{level:3})} onClick={() => editor.chain().focus().toggleHeading({level:3}).run()} title="H3"><Heading3 className="h-4 w-4" /></TB>
      <TB active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} title="Parágrafo"><Pilcrow className="h-4 w-4" /></TB>

      <Separator orientation="vertical" className="h-6 mx-1" />
      <TB active={editor.isActive({textAlign:"left"})} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Esquerda"><AlignLeft className="h-4 w-4" /></TB>
      <TB active={editor.isActive({textAlign:"center"})} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centro"><AlignCenter className="h-4 w-4" /></TB>
      <TB active={editor.isActive({textAlign:"right"})} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Direita"><AlignRight className="h-4 w-4" /></TB>
      <TB active={editor.isActive({textAlign:"justify"})} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justificado"><AlignJustify className="h-4 w-4" /></TB>

      <Separator orientation="vertical" className="h-6 mx-1" />
      <TB active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista"><List className="h-4 w-4" /></TB>
      <TB active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada"><ListOrdered className="h-4 w-4" /></TB>

      <Separator orientation="vertical" className="h-6 mx-1" />
      <div className="flex items-center gap-1" title="Cor do texto">
        <Input type="color" value={color} onChange={(e) => { setColor(e.target.value); editor.chain().focus().setColor(e.target.value).run(); }} className="h-8 w-8 p-0.5 cursor-pointer" />
      </div>
      <div className="flex items-center gap-1" title="Cor de fundo">
        <Input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); editor.chain().focus().toggleHighlight({ color: e.target.value }).run(); }} className="h-8 w-8 p-0.5 cursor-pointer" />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />
      <TB onClick={() => {
        const url = window.prompt("URL do link");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      }} title="Link"><LinkIcon className="h-4 w-4" /></TB>
      <ImagePickerDialog onInsert={(url, w) => {
        editor.chain().focus().setImage({ src: url } as any).updateAttributes("image", { width: w } as any).run();
      }} />
      {editor.isActive("image") && (
        <Select value="" onValueChange={(v) => editor.chain().focus().updateAttributes("image", { width: v } as any).run()}>
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue placeholder="Tam. img" /></SelectTrigger>
          <SelectContent>
            {["25%","50%","75%","100%","200px","400px","auto"].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
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

      <div className="ml-auto flex items-center gap-1">
        <TB onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} title="Diminuir zoom"><ZoomOut className="h-4 w-4" /></TB>
        <span className="text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
        <TB onClick={() => setZoom(Math.min(2, zoom + 0.1))} title="Aumentar zoom"><ZoomIn className="h-4 w-4" /></TB>
        <TB onClick={onFullscreen} title="Tela cheia"><Maximize2 className="h-4 w-4" /></TB>
      </div>
    </div>
  );
}
