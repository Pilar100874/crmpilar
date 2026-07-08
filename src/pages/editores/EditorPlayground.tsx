import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TiptapEditor } from "@/components/editores/TiptapEditor";
import { TiptapEditorV2 } from "@/components/editores/TiptapEditorV2";

/**
 * Playground para experimentar as variantes do editor sem precisar de um
 * modelo salvo no banco. Usa ?v=v1|v2 (persistido em localStorage).
 */
export default function EditorPlayground() {
  const [params, setParams] = useSearchParams();
  const [variante, setVariante] = useState<"v1" | "v2">(
    () => (params.get("v") as "v1" | "v2") || (localStorage.getItem("editor_variant") as any) || "v1",
  );
  const [content, setContent] = useState<string>("<h1>Rascunho</h1><p>Escreva aqui para testar o editor…</p>");

  useEffect(() => {
    localStorage.setItem("editor_variant", variante);
  }, [variante]);

  useEffect(() => {
    const v = params.get("v");
    if (v === "v1" || v === "v2") setVariante(v);
  }, [params]);

  const trocar = (v: "v1" | "v2") => {
    setVariante(v);
    params.set("v", v);
    setParams(params, { replace: true });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card px-4 py-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-2">Variante:</span>
        <button
          onClick={() => trocar("v1")}
          className={`text-xs px-3 py-1.5 rounded ${variante === "v1" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          Clássico (A4)
        </button>
        <button
          onClick={() => trocar("v2")}
          className={`text-xs px-3 py-1.5 rounded ${variante === "v2" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
        >
          Moderno (Beta)
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {variante === "v1" ? (
          <TiptapEditor initialContent={content} onChange={(html) => setContent(html)} />
        ) : (
          <TiptapEditorV2 initialContent={content} onChange={(html) => setContent(html)} />
        )}
      </div>
    </div>
  );
}
