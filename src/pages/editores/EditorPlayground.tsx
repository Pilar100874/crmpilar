import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Editor } from "@tiptap/react";
import { TiptapEditor } from "@/components/editores/TiptapEditor";
import { TiptapEditorV2 } from "@/components/editores/TiptapEditorV2";
import { EditorToolbar } from "@/components/editores/EditorToolbar";

/**
 * Playground para experimentar as variantes do editor (v1/v2) sem precisar
 * de um modelo salvo. Inclui a barra de ferramentas completa (EditorToolbar).
 */
export default function EditorPlayground() {
  const [params, setParams] = useSearchParams();
  const [variante, setVariante] = useState<"v1" | "v2">(
    () => (params.get("v") as "v1" | "v2") || (localStorage.getItem("editor_variant") as any) || "v1",
  );
  const [html, setHtml] = useState<string>("<h1>Rascunho</h1><p>Escreva aqui para testar o editor…</p>");
  const [titulo, setTitulo] = useState("Rascunho sem título");
  const [zoom, setZoom] = useState(1);
  const editorRef = useRef<Editor | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    localStorage.setItem("editor_variant", variante);
  }, [variante]);

  useEffect(() => {
    const v = params.get("v");
    if ((v === "v1" || v === "v2") && v !== variante) setVariante(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const trocar = (v: "v1" | "v2") => {
    setVariante(v);
    params.set("v", v);
    setParams(params, { replace: true });
  };

  const setEditor = (e: Editor | null) => {
    editorRef.current = e;
    force((n) => n + 1);
  };

  return (
    <div className="h-full flex flex-col">
      <EditorToolbar
        editor={editorRef.current}
        zoom={zoom}
        setZoom={setZoom}
        titulo={titulo}
        onTituloChange={setTitulo}
      />
      <div className="border-b bg-card px-4 py-1.5 flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-2">Variante:</span>
        <button
          onClick={() => trocar("v1")}
          className={`text-xs px-3 py-1 rounded ${variante === "v1" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          Clássico (A4)
        </button>
        <button
          onClick={() => trocar("v2")}
          className={`text-xs px-3 py-1 rounded ${variante === "v2" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          Moderno (Beta)
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {variante === "v1" ? (
          <TiptapEditor
            key="v1"
            initialContent={html}
            onChange={(h) => setHtml(h)}
            editorRef={setEditor}
            zoom={zoom}
          />
        ) : (
          <TiptapEditorV2
            key="v2"
            initialContent={html}
            onChange={(h) => setHtml(h)}
            editorRef={setEditor}
            zoom={zoom}
          />
        )}
      </div>
    </div>
  );
}
