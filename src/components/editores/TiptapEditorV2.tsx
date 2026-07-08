import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import Link from "@tiptap/extension-link";
import { ResizableImage } from "./ResizableImageNode";
import { MergeField } from "./MergeFieldNode";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Variante MODERNA (Notion-like) do editor Tiptap.
 * - Sem "folha A4": largura fluida centralizada
 * - Tipografia mais suave, com bom contraste no tema claro/escuro
 * - Mesmas extensões da v1 (base 100% Tiptap open-source, sem dependências pagas)
 * - Contador de palavras/caracteres no rodapé
 * Use este arquivo como BASE para futuras variações — a v1 permanece intacta.
 */

interface Props {
  initialContent?: string;
  onChange?: (html: string, json: any) => void;
  editorRef?: (editor: Editor | null) => void;
  className?: string;
  editable?: boolean;
  zoom?: number;
}

export function TiptapEditorV2({
  initialContent = "",
  onChange,
  editorRef,
  className,
  editable = true,
  zoom = 1,
}: Props) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "Escreva aqui… (variante moderna)" }),
      CharacterCount,
      MergeField,
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: initialContent || "<p></p>",
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML(), editor.getJSON());
    },
  });

  useEffect(() => {
    editorRef?.(editor);
    return () => editorRef?.(null);
  }, [editor, editorRef]);

  useEffect(() => {
    if (!editor) return;
    if (initialContent && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [initialContent, editor]);

  const words = editor?.storage.characterCount?.words?.() ?? 0;
  const chars = editor?.storage.characterCount?.characters?.() ?? 0;

  return (
    <div
      className={cn("bg-background flex flex-col p-4 md:p-8 overflow-auto", className)}
      style={{ minHeight: "100%" }}
    >
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: `${820 * zoom}px`,
          transform: `scale(${zoom})`,
          transformOrigin: "top center",
          transition: "transform 0.15s ease",
        }}
      >
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <EditorContent editor={editor} className="doc-editor-v2" />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>Variante: Moderno</span>
          <span>{words} palavras · {chars} caracteres</span>
        </div>
      </div>

      <style>{`
        .doc-editor-v2 .ProseMirror {
          min-height: 60vh;
          outline: none;
          padding: 32px 40px;
          font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 16px;
          line-height: 1.7;
          color: hsl(var(--foreground));
        }
        .doc-editor-v2 .ProseMirror h1 { font-size: 2rem; font-weight: 700; margin: 1.2em 0 .4em; letter-spacing: -0.02em; }
        .doc-editor-v2 .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; margin: 1em 0 .4em; letter-spacing: -0.01em; }
        .doc-editor-v2 .ProseMirror h3 { font-size: 1.2rem; font-weight: 600; margin: .8em 0 .3em; }
        .doc-editor-v2 .ProseMirror p { margin: 0 0 .7em; }
        .doc-editor-v2 .ProseMirror ul, .doc-editor-v2 .ProseMirror ol { padding-left: 1.5rem; margin: 0 0 .7em; }
        .doc-editor-v2 .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding: .2em 0 .2em 1rem; margin: .8em 0; color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        .doc-editor-v2 .ProseMirror code {
          background: hsl(var(--muted)); padding: 2px 5px; border-radius: 4px; font-size: 0.9em;
        }
        .doc-editor-v2 .ProseMirror pre {
          background: hsl(var(--muted)); padding: 12px 14px; border-radius: 8px; overflow-x: auto;
          font-size: 0.9em; margin: .8em 0;
        }
        .doc-editor-v2 .ProseMirror table { border-collapse: collapse; width: 100%; margin: .8em 0; }
        .doc-editor-v2 .ProseMirror th, .doc-editor-v2 .ProseMirror td {
          border: 1px solid hsl(var(--border)); padding: 6px 10px;
        }
        .doc-editor-v2 .ProseMirror th { background: hsl(var(--muted)); font-weight: 600; text-align: left; }
        .doc-editor-v2 .ProseMirror img { max-width: 100%; height: auto; border-radius: 6px; }
        .doc-editor-v2 .ProseMirror a { color: hsl(var(--primary)); text-decoration: underline; }
        .doc-editor-v2 .ProseMirror p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left; height: 0; pointer-events: none;
        }
        .doc-editor-v2 .ProseMirror .doc-field-chip {
          display: inline-block;
          background: hsl(var(--primary) / 0.15);
          color: hsl(var(--primary));
          border: 1px solid hsl(var(--primary) / 0.35);
          padding: 1px 8px; margin: 0 1px; border-radius: 999px;
          font-family: ui-monospace, monospace; font-size: 0.85em;
          user-select: all; cursor: default;
        }
        .doc-editor-v2 .ProseMirror .doc-field-chip.ProseMirror-selectednode {
          outline: 2px solid hsl(var(--primary));
        }
        .doc-editor-v2 .ProseMirror .doc-img-wrap { position: relative; display: inline-block; line-height: 0; }
        .doc-editor-v2 .ProseMirror .doc-img-wrap.doc-img-selected,
        .doc-editor-v2 .ProseMirror .doc-img-wrap:hover { outline: 2px solid hsl(var(--primary)); }
        .doc-editor-v2 .ProseMirror .doc-img-handle {
          position: absolute; width: 12px; height: 12px; background: hsl(var(--primary));
          border: 2px solid #fff; border-radius: 2px; z-index: 5; opacity: 0;
          transition: opacity 0.1s;
        }
        .doc-editor-v2 .ProseMirror .doc-img-wrap:hover .doc-img-handle,
        .doc-editor-v2 .ProseMirror .doc-img-wrap.doc-img-selected .doc-img-handle { opacity: 1; }
        .doc-editor-v2 .ProseMirror .doc-img-handle-nw { top: -6px; left: -6px; cursor: nwse-resize; }
        .doc-editor-v2 .ProseMirror .doc-img-handle-ne { top: -6px; right: -6px; cursor: nesw-resize; }
        .doc-editor-v2 .ProseMirror .doc-img-handle-sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
        .doc-editor-v2 .ProseMirror .doc-img-handle-se { bottom: -6px; right: -6px; cursor: nwse-resize; }
      `}</style>
    </div>
  );
}
