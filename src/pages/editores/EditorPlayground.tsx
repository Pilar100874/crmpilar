import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Editor } from "@tiptap/react";
import { TiptapEditor } from "@/components/editores/TiptapEditor";
import { TiptapEditorV2 } from "@/components/editores/TiptapEditorV2";
import { EditorToolbar, type EditorMode } from "@/components/editores/EditorToolbar";
import { CamposSidebar } from "@/components/editores/CamposSidebar";
import { PreviewModal } from "@/components/editores/PreviewModal";
import { SimuladorInline } from "@/components/editores/SimuladorInline";
import { renderTemplate } from "@/lib/editores/mergeEngine";
import { resolveMergeData } from "@/lib/editores/dataResolvers";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast-config";

/**
 * Playground das variantes v1/v2 — mesma UX do ModeloEditor (toolbar, sidebar de
 * campos, preview merge, simuladores), porém sem persistência em banco.
 */
export default function EditorPlayground() {
  const [params, setParams] = useSearchParams();
  const [variante, setVariante] = useState<"v1" | "v2">(
    () => (params.get("v") as "v1" | "v2") || (localStorage.getItem("editor_variant") as any) || "v1",
  );
  const [html, setHtml] = useState<string>("<h1>Rascunho</h1><p>Escreva aqui…</p>");
  const [titulo, setTitulo] = useState("Rascunho sem título");
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [modo, setModo] = useState<EditorMode>("editar");
  const [locked, setLocked] = useState(false);
  const [estabId, setEstabId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewMissing, setPreviewMissing] = useState<string[]>([]);
  const [mergeConfig, setMergeConfig] = useState<any>(null);
  const editorRef = useRef<Editor | null>(null);
  const [, force] = useState(0);

  useEffect(() => { getEstabelecimentoId().then(setEstabId); }, []);
  useEffect(() => { localStorage.setItem("editor_variant", variante); }, [variante]);

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

  const inserirCampo = (chave: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    // Prefixos especiais vindos do MergeBuilder:
    //   __LOOP__:alias   -> insere bloco {{#each alias}}...{{/each}}
    //   __RAW__:texto    -> insere texto bruto (ex: {{sum itens.valor}})
    if (chave.startsWith("__LOOP__:")) {
      const alias = chave.slice("__LOOP__:".length);
      const snippet = `<p>{{#each ${alias}}}• {{this.nome}} — {{this.valor}}<br/>{{/each}}</p>`;
      ed.chain().focus().insertContent(snippet).run();
      return;
    }
    if (chave.startsWith("__RAW__:")) {
      ed.chain().focus().insertContent(chave.slice("__RAW__:".length)).run();
      return;
    }
    const token = `{{${chave}}}`;
    ed.chain().focus().insertContent({ type: "mergeField", attrs: { token, label: chave } }).insertContent(" ").run();
  };

  const abrirPreview = async () => {
    const data = await resolveMergeData("livre", null);
    const { html: rendered, missing } = renderTemplate(html || "<p><em>Documento vazio</em></p>", data, { highlightMissing: true });
    setPreviewHtml(rendered);
    setPreviewMissing(missing);
    setShowPreview(true);
  };

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background flex flex-col" : "h-full flex flex-col"}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorToolbar
          editor={editorRef.current}
          zoom={zoom}
          setZoom={setZoom}
          onFullscreen={() => setFullscreen((f) => !f)}
          onPreviewMerge={abrirPreview}
          estabelecimentoId={estabId}
          onSave={() => toast.info("Playground — salvamento desativado")}
          onToggleLock={() => setLocked((l) => !l)}
          locked={locked}
          mode={modo}
          onModeChange={setModo}
          titulo={titulo}
          onTituloChange={setTitulo}
        />

        <div className="flex-1 overflow-hidden">
          <div className="h-full flex overflow-hidden">
            <div className="flex-1 overflow-auto">
              {variante === "v1" ? (
                <TiptapEditor
                  key="v1"
                  initialContent={html}
                  onChange={(h) => setHtml(h)}
                  editorRef={setEditor}
                  zoom={zoom}
                  editable={!locked}
                />
              ) : (
                <TiptapEditorV2
                  key="v2"
                  initialContent={html}
                  onChange={(h) => setHtml(h)}
                  editorRef={setEditor}
                  zoom={zoom}
                  editable={!locked}
                />
              )}
            </div>
            <CamposSidebar estabelecimentoId={estabId} onInsert={inserirCampo} currentHtml={html} />
          </div>
        </div>

        <div className="border-t bg-card px-3 py-2 flex items-center gap-2">
          <label className="text-xs text-muted-foreground shrink-0">Nome:</label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-8 max-w-md font-semibold" />
          <div className="ml-auto flex items-center gap-1 rounded border p-0.5 bg-muted/40">
            <button
              type="button"
              onClick={() => trocar("v1")}
              className={`text-[11px] px-2 py-1 rounded ${variante === "v1" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >Clássico A4</button>
            <button
              type="button"
              onClick={() => trocar("v2")}
              className={`text-[11px] px-2 py-1 rounded ${variante === "v2" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >Moderno</button>
          </div>
        </div>
      </div>

      <Dialog open={modo !== "editar"} onOpenChange={(o) => { if (!o) setModo("editar"); }}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 flex flex-col gap-0">
          <DialogHeader className="p-3 border-b">
            <DialogTitle className="text-sm">
              {modo === "form" ? "Simular Formulário — preencher campos" : "Simular Merge — navegar registros"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {modo !== "editar" && (
              <SimuladorInline
                html={html}
                titulo={titulo}
                soPreenchimento={modo === "form"}
                mergeConfig={mergeConfig}
                onMergeConfigChange={setMergeConfig}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        templateHtml={html}
        html={previewHtml}
        titulo={titulo}
        missing={previewMissing}
        mergeConfig={mergeConfig}
      />
    </div>
  );
}
