import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TiptapEditor } from "@/components/editores/TiptapEditor";
import { EditorToolbar } from "@/components/editores/EditorToolbar";
import { CamposSidebar } from "@/components/editores/CamposSidebar";
import { ArrowLeft, Save, FlaskConical, Pencil, Printer, FileDown } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SimuladorInline } from "@/components/editores/SimuladorInline";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { downloadPdf, printHtml } from "@/lib/editores/pdfExport";

export default function DocumentoEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [estabId, setEstabId] = useState<string | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [html, setHtml] = useState<string>("");
  const [json, setJson] = useState<any>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getEstabelecimentoId().then(setEstabId); }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("doc_gerados").select("*").eq("id", id).single();
      if (!data) { toast.error("Documento não encontrado"); nav("/editores"); return; }
      setDoc(data);
      setHtml((data as any).content_html || (data as any).content_html_final || "");
      setJson((data as any).content_json || {});
    })();
  }, [id, nav]);

  useEffect(() => {
    if (!dirty || !id) return;
    const t = setTimeout(() => { void salvar(true); }, 2000);
    return () => clearTimeout(t);
  }, [html, dirty]);

  const salvar = async (auto = false) => {
    if (!id || !doc) return;
    setSaving(true);
    const { error } = await supabase.from("doc_gerados").update({
      titulo: doc.titulo,
      content_html: html,
      content_html_final: html,
      content_json: json,
      merge_config: doc.merge_config ?? {},
    }).eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDirty(false);
    if (!auto) toast.success("Salvo");
  };

  const inserirCampo = (chave: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    if (chave.startsWith("__FILLABLE__")) {
      const rot = chave.replace("__FILLABLE__", "");
      const token = `[[${rot}]]`;
      ed.chain().focus().insertContent({ type: "mergeField", attrs: { token, label: rot } }).insertContent(" ").run();
      return;
    }
    if (chave.startsWith("[[") || chave.startsWith("{{")) {
      const label = chave.replace(/^\[\[|\]\]$|^\{\{|\}\}$/g, "");
      ed.chain().focus().insertContent({ type: "mergeField", attrs: { token: chave, label } }).insertContent(" ").run();
      return;
    }
    const token = `{{${chave}}}`;
    ed.chain().focus().insertContent({ type: "mergeField", attrs: { token, label: chave } }).insertContent(" ").run();
  };

  const gerarPdfDireto = async () => {
    if (previewRef.current) await downloadPdf(previewRef.current, { filename: doc.titulo });
  };

  if (!doc) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background flex flex-col" : "h-full flex flex-col"}>
      <div className="flex items-center gap-2 border-b bg-card p-3">
        <Button variant="ghost" size="sm" onClick={() => nav("/editores")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <Input
          value={doc.titulo ?? ""}
          onChange={e => { setDoc({ ...doc, titulo: e.target.value }); setDirty(true); }}
          className="max-w-md font-semibold"
        />
        <span className="text-xs text-muted-foreground">Documento avulso {dirty && "· não salvo"} {saving && "· salvando…"}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => printHtml(html)}><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
          <Button size="sm" variant="outline" onClick={gerarPdfDireto}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
          <Button size="sm" onClick={() => salvar()}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
        </div>
      </div>

      <Tabs defaultValue="editar" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2 self-start">
          <TabsTrigger value="editar"><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</TabsTrigger>
          <TabsTrigger value="simular"><FlaskConical className="h-3.5 w-3.5 mr-1" /> Preencher / PDF</TabsTrigger>
        </TabsList>
        <TabsContent value="editar" className="flex-1 overflow-hidden mt-0">
          <div className="h-full flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
              <EditorToolbar editor={editorRef.current} zoom={zoom} setZoom={setZoom} onFullscreen={() => setFullscreen(f => !f)} estabelecimentoId={estabId} />
              <div className="flex-1 overflow-auto">
                <TiptapEditor
                  initialContent={html}
                  onChange={(h, j) => { setHtml(h); setJson(j); setDirty(true); }}
                  editorRef={(e) => { editorRef.current = e; }}
                  zoom={zoom}
                />
                {/* preview escondido para PDF direto */}
                <div style={{ position: "absolute", left: -99999, top: 0 }}>
                  <div ref={previewRef} className="bg-white text-black" style={{ width: "210mm", minHeight: "297mm", padding: "20mm", fontFamily: "Arial, sans-serif", fontSize: "12pt" }} dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              </div>
            </div>
            <CamposSidebar estabelecimentoId={estabId} onInsert={inserirCampo} currentHtml={html} />
          </div>
        </TabsContent>
        <TabsContent value="simular" className="flex-1 overflow-hidden mt-0">
          <SimuladorInline
            html={html}
            titulo={doc.titulo}
            mergeConfig={doc.merge_config ?? null}
            onMergeConfigChange={(cfg) => { setDoc({ ...doc, merge_config: cfg }); setDirty(true); }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
