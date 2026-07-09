import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
const TextStyleWithFontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...(this.parent?.() || {}),
      fontSize: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
        renderHTML: (attrs) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
    };
  },
});
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import Link from "@tiptap/extension-link";
import { ResizableImage } from "./ResizableImageNode";
import { MergeField } from "./MergeFieldNode";
import { MergeTable } from "./MergeTableNode";
import { promptTableRows } from "@/lib/editores/tableRowsPrompt";
import { FillableField } from "./FillableFieldNode";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  initialContent?: string;
  onChange?: (html: string, json: any) => void;
  editorRef?: (editor: Editor | null) => void;
  className?: string;
  editable?: boolean;
  zoom?: number; // 0.5 - 2
}

export function TiptapEditor({
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
      TextStyleWithFontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "Comece a escrever seu documento…" }),
      CharacterCount,
      MergeField,
      MergeTable,
      FillableField,
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: initialContent || "<p></p>",
    editable,
    editorProps: {
      handleDrop: (view, event) => {
        const dt = (event as DragEvent).dataTransfer;
        if (!dt) return false;
        const coords = { left: (event as DragEvent).clientX, top: (event as DragEvent).clientY };
        const pos = view.posAtCoords(coords)?.pos;
        if (pos == null) return false;

        const chave = dt.getData("application/x-merge-field");
        if (chave) {
          event.preventDefault();
          const token = `{{${chave}}}`;
          const node = view.state.schema.nodes.mergeField?.create({ token, label: chave });
          if (!node) return false;
          view.dispatch(view.state.tr.insert(pos, node));
          return true;
        }

        const text = dt.getData("text/plain");
        if (text && text.startsWith("__TABLE__:")) {
          event.preventDefault();
          try {
            const meta = JSON.parse(text.slice("__TABLE__:".length)) as { alias: string; cols: string[] };
            promptTableRows(meta.alias).then((res) => {
              if (!res) return;
              const node = view.state.schema.nodes.mergeTable?.create({
                alias: meta.alias,
                cols: meta.cols,
                from: res.from,
                to: res.to,
              });
              if (!node) return;
              view.dispatch(view.state.tr.insert(pos, node));
            });
          } catch (e) {
            console.error("[TiptapEditor] payload __TABLE__ inválido", e);
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML(), editor.getJSON());
    },
  });

  useEffect(() => {
    editorRef?.(editor);
    return () => editorRef?.(null);
  }, [editor, editorRef]);

  // Atualiza conteúdo se initialContent mudar externamente (troca de modelo)
  useEffect(() => {
    if (!editor) return;
    if (initialContent && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [initialContent, editor]);

  return (
    <div
      className={cn("bg-muted/30 flex justify-center p-6 overflow-auto", className)}
      style={{ minHeight: "100%" }}
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "top center",
          transition: "transform 0.15s ease",
        }}
      >
        <div
          className="doc-a4 bg-white text-black shadow-xl mx-auto"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "20mm 20mm",
            boxSizing: "border-box",
          }}
        >
          <EditorContent editor={editor} className="doc-editor-content" />
        </div>
      </div>
      <style>{`
        .doc-editor-content .ProseMirror {
          min-height: calc(297mm - 40mm);
          outline: none;
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #111;
        }
        .doc-editor-content .ProseMirror h1 { font-size: 24pt; font-weight: 700; margin: 12pt 0 8pt; }
        .doc-editor-content .ProseMirror h2 { font-size: 18pt; font-weight: 700; margin: 10pt 0 6pt; }
        .doc-editor-content .ProseMirror h3 { font-size: 14pt; font-weight: 700; margin: 8pt 0 4pt; }
        .doc-editor-content .ProseMirror p { margin: 0 0 8pt; }
        .doc-editor-content .ProseMirror ul, .doc-editor-content .ProseMirror ol { padding-left: 24pt; margin: 0 0 8pt; }
        .doc-editor-content .ProseMirror table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
        .doc-editor-content .ProseMirror th, .doc-editor-content .ProseMirror td { border: 1px solid #ccc; padding: 4pt 6pt; }
        .doc-editor-content .ProseMirror th { background: #f3f4f6; font-weight: 600; }
        .doc-editor-content .ProseMirror img { max-width: 100%; height: auto; }
        .doc-editor-content .ProseMirror a { color: #2563eb; text-decoration: underline; }
        .doc-editor-content .ProseMirror .doc-img-wrap { position: relative; display: inline-block; line-height: 0; }
        .doc-editor-content .ProseMirror .doc-img-wrap.doc-img-selected,
        .doc-editor-content .ProseMirror .doc-img-wrap:hover { outline: 2px solid #2563eb; }
        .doc-editor-content .ProseMirror .doc-img-handle {
          position: absolute; width: 12px; height: 12px; background: #2563eb;
          border: 2px solid #fff; border-radius: 2px; z-index: 5; opacity: 0;
          transition: opacity 0.1s;
        }
        .doc-editor-content .ProseMirror .doc-img-wrap:hover .doc-img-handle,
        .doc-editor-content .ProseMirror .doc-img-wrap.doc-img-selected .doc-img-handle { opacity: 1; }
        .doc-editor-content .ProseMirror .doc-img-handle-nw { top: -6px; left: -6px; cursor: nwse-resize; }
        .doc-editor-content .ProseMirror .doc-img-handle-ne { top: -6px; right: -6px; cursor: nesw-resize; }
        .doc-editor-content .ProseMirror .doc-img-handle-sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
        .doc-editor-content .ProseMirror .doc-img-handle-se { bottom: -6px; right: -6px; cursor: nwse-resize; }
        .doc-editor-content .ProseMirror .doc-field-chip {
          display: inline-block;
          background: #dbeafe;
          color: inherit;
          border: 1px solid #93c5fd;
          padding: 1px 8px;
          margin: 0 1px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
          user-select: all;
          cursor: default;
        }
        .doc-editor-content .ProseMirror .doc-field-chip.doc-field-chip-live {
          background: #dcfce7;
          color: inherit;
          border-color: #86efac;
          font-family: inherit;
        }
        .doc-editor-content .ProseMirror .doc-fillable,
        .doc-editor-content .ProseMirror .doc-fillable input,
        .doc-editor-content .ProseMirror .doc-fillable select,
        .doc-editor-content .ProseMirror .doc-fillable textarea {
          color: inherit;
          font-family: inherit;
        }
        .doc-editor-content .ProseMirror .doc-field-chip.ProseMirror-selectednode {
          outline: 2px solid #2563eb;
        }
      `}</style>
    </div>
  );
}
