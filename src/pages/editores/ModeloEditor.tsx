import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TiptapEditor } from "@/components/editores/TiptapEditor";
import { EditorToolbar } from "@/components/editores/EditorToolbar";
import { CamposSidebar } from "@/components/editores/CamposSidebar";
import { PreviewModal } from "@/components/editores/PreviewModal";
import { ArrowLeft, Eye, Save, Pencil, FlaskConical, Lock, Unlock, ShieldCheck, Copy } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { SimuladorInline } from "@/components/editores/SimuladorInline";
import { renderTemplate } from "@/lib/editores/mergeEngine";
import { resolveMergeData } from "@/lib/editores/dataResolvers";

export default function ModeloEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [estabId, setEstabId] = useState<string | null>(null);
  const [modelo, setModelo] = useState<any>(null);
  const [html, setHtml] = useState<string>("");
  const [json, setJson] = useState<any>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewMissing, setPreviewMissing] = useState<string[]>([]);
  const editorRef = useRef<Editor | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [modo, setModo] = useState<"editar" | "simular">("editar");

  useEffect(() => {
    getEstabelecimentoId().then(setEstabId);
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("doc_modelos").select("*").eq("id", id).single();
      if (!data) { toast.error("Modelo não encontrado"); nav("/editores"); return; }
      setModelo(data);
      setHtml((data as any).content_html || "");
      setJson((data as any).content_json || {});
    })();
  }, [id, nav]);

  // Autosave (2s debounce)
  useEffect(() => {
    if (!dirty || !id) return;
    const t = setTimeout(() => { void salvar(true); }, 2000);
    return () => clearTimeout(t);
  }, [html, dirty]);

  const salvar = async (auto = false) => {
    if (!id || !modelo) return;
    if (modelo.bloqueado && !auto) { toast.error("Modelo bloqueado — desbloqueie para editar."); return; }
    setSaving(true);
    const { error } = await supabase.from("doc_modelos").update({
      titulo: modelo.titulo,
      descricao: modelo.descricao,
      content_html: html,
      content_json: json,
      header_html: modelo.header_html,
      footer_html: modelo.footer_html,
      merge_config: modelo.merge_config ?? {},
      bloqueado: modelo.bloqueado ?? false,
      campos_bloqueados: modelo.campos_bloqueados ?? false,
    } as any).eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDirty(false);
    if (!auto) toast.success("Salvo");
  };

  const alternarBloqueio = async () => {
    if (!id || !modelo) return;
    const novo = !modelo.bloqueado;
    const { error } = await supabase.from("doc_modelos").update({ bloqueado: novo } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setModelo({ ...modelo, bloqueado: novo });
    toast.success(novo ? "Modelo bloqueado para edição" : "Modelo desbloqueado");
  };

  const alternarCamposBloqueados = async () => {
    if (!id || !modelo) return;
    const novo = !modelo.campos_bloqueados;
    const { error } = await supabase.from("doc_modelos").update({ campos_bloqueados: novo } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setModelo({ ...modelo, campos_bloqueados: novo });
    toast.success(novo ? "Estrutura travada — apenas campos de formulário podem ser preenchidos" : "Estrutura liberada");
  };

  const salvarComo = async () => {
    if (!modelo || !estabId) return;
    const novoTitulo = window.prompt("Nome do novo modelo:", `${modelo.titulo} (cópia)`);
    if (!novoTitulo) return;
    const { data, error } = await supabase.from("doc_modelos").insert({
      estabelecimento_id: estabId,
      titulo: novoTitulo,
      descricao: modelo.descricao,
      content_html: html,
      content_json: json,
      header_html: modelo.header_html,
      footer_html: modelo.footer_html,
      merge_config: modelo.merge_config ?? {},
      categoria_id: modelo.categoria_id,
      bloqueado: false,
      campos_bloqueados: false,
    } as any).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Cópia criada");
    if (data?.id) nav(`/editores/modelo/${data.id}`);
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
    const token = `{{${chave}}}`;
    ed.chain().focus().insertContent({ type: "mergeField", attrs: { token, label: chave } }).insertContent(" ").run();
  };

  const abrirPreview = async () => {
    if (dirty) await salvar(true);
    const data = await resolveMergeData("livre", null);
    const { html: rendered, missing } = renderTemplate(html || "<p><em>Documento vazio</em></p>", data, { highlightMissing: true });
    setPreviewHtml(rendered);
    setPreviewMissing(missing);
    setShowPreview(true);
  };

  if (!modelo) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background flex flex-col" : "h-full flex flex-col"}>
      <div className="flex items-center gap-2 border-b bg-card p-3">
        <Button variant="ghost" size="sm" onClick={() => nav("/editores")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        {/* Toggle Editar / Simular no topo, estilo ícone */}
        <div className="flex items-center border rounded-md overflow-hidden">
          <Button
            size="sm"
            variant={modo === "editar" ? "default" : "ghost"}
            onClick={() => setModo("editar")}
            className="rounded-none h-8"
            title="Modo edição"
          >
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
          <Button
            size="sm"
            variant={modo === "simular" ? "default" : "ghost"}
            onClick={() => setModo("simular")}
            className="rounded-none h-8"
            title="Modo simular / preencher"
          >
            <FlaskConical className="h-4 w-4 mr-1" /> Simular
          </Button>
        </div>

        <Input
          value={modelo.titulo}
          onChange={e => { setModelo({ ...modelo, titulo: e.target.value }); setDirty(true); }}
          className="max-w-md font-semibold"
          disabled={modelo.bloqueado}
        />
        <span className="text-xs text-muted-foreground">
          {dirty && "· não salvo"} {saving && "· salvando…"}
          {modelo.bloqueado && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700">🔒 bloqueado</span>}
          {modelo.campos_bloqueados && <span className="ml-2 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-700">🛡 estrutura travada</span>}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant={modelo.bloqueado ? "secondary" : "outline"} onClick={alternarBloqueio}
            title={modelo.bloqueado ? "Desbloquear edição" : "Bloquear edição (somente-leitura)"}>
            {modelo.bloqueado ? <><Unlock className="h-4 w-4 mr-1" /> Desbloquear</> : <><Lock className="h-4 w-4 mr-1" /> Bloquear</>}
          </Button>
          <Button size="sm" variant={modelo.campos_bloqueados ? "secondary" : "outline"} onClick={alternarCamposBloqueados}
            title="Travar estrutura (só permite preencher campos de formulário)">
            <ShieldCheck className="h-4 w-4 mr-1" /> Travar estrutura
          </Button>
          <Button size="sm" variant="outline" onClick={abrirPreview}><Eye className="h-4 w-4 mr-1" /> Visualizar</Button>
          <Button size="sm" variant="outline" onClick={salvarComo}><Copy className="h-4 w-4 mr-1" /> Salvar como</Button>
          <Button size="sm" onClick={() => salvar()} disabled={modelo.bloqueado}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {modo === "editar" ? (
          <div className="h-full flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
              <EditorToolbar editor={editorRef.current} zoom={zoom} setZoom={setZoom} onFullscreen={() => setFullscreen(f => !f)} onPreviewMerge={abrirPreview} />
              <div className="flex-1 overflow-auto">
                <TiptapEditor
                  initialContent={html}
                  onChange={(h, j) => { setHtml(h); setJson(j); setDirty(true); }}
                  editorRef={(e) => { editorRef.current = e; }}
                  zoom={zoom}
                  editable={!modelo.bloqueado && !modelo.campos_bloqueados}
                />
              </div>
            </div>
            <CamposSidebar estabelecimentoId={estabId} onInsert={inserirCampo} currentHtml={html} />
          </div>
        ) : (
          <SimuladorInline
            html={html}
            titulo={modelo.titulo}
            mergeConfig={modelo.merge_config ?? null}
            onMergeConfigChange={(cfg) => { setModelo({ ...modelo, merge_config: cfg }); setDirty(true); }}
          />
        )}
      </div>

      <PreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        templateHtml={html}
        html={previewHtml}
        titulo={modelo.titulo}
        missing={previewMissing}
        mergeConfig={modelo.merge_config ?? null}
        onSave={async () => { await salvar(); toast.success("Rascunho salvo"); }}
      />
    </div>
  );
}

