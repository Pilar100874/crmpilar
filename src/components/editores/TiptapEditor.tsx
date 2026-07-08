import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

// Image estendida com atributos width/height para redimensionamento
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, parseHTML: e => (e as HTMLElement).style.width || (e as HTMLElement).getAttribute("width"), renderHTML: a => a.width ? { style: `width:${a.width}` } : {} },
      height: { default: null, parseHTML: e => (e as HTMLElement).style.height || (e as HTMLElement).getAttribute("height"), renderHTML: a => a.height ? { style: `height:${a.height}` } : {} },
    };
  },
});
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
      Placeholder.configure({ placeholder: "Comece a escrever seu documento…" }),
      CharacterCount,
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
        .doc-editor-content .ProseMirror .doc-field-chip {
          background: #dbeafe; color: #1e40af; padding: 1px 6px; border-radius: 4px;
          font-family: monospace; font-size: 0.9em;
        }
      `}</style>
    </div>
  );
}
