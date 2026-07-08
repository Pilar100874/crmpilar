import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TiptapEditor } from "@/components/editores/TiptapEditor";
import { EditorToolbar } from "@/components/editores/EditorToolbar";
import { CamposSidebar } from "@/components/editores/CamposSidebar";
import { PreviewModal } from "@/components/editores/PreviewModal";
import { ArrowLeft, Eye, Save, GitBranch, Send, Pencil, FlaskConical, Lock, Unlock } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SimuladorInline } from "@/components/editores/SimuladorInline";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
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
  const [versoesOpen, setVersoesOpen] = useState(false);
  const [versoes, setVersoes] = useState<any[]>([]);

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

  const publicarVersao = async () => {
    if (!id || !estabId || !modelo) return;
    await salvar();
    const novaVersao = (modelo.versao_atual ?? 0) + 1;
    const { error } = await supabase.from("doc_modelo_versoes").insert({
      modelo_id: id,
      estabelecimento_id: estabId,
      versao: novaVersao,
      content_html: html,
      content_json: json,
      header_html: modelo.header_html,
      footer_html: modelo.footer_html,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("doc_modelos").update({ versao_atual: novaVersao }).eq("id", id);
    setModelo({ ...modelo, versao_atual: novaVersao });
    toast.success(`Versão ${novaVersao} publicada`);
  };

  const abrirVersoes = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("doc_modelo_versoes")
      .select("*")
      .eq("modelo_id", id)
      .order("versao", { ascending: false });
    setVersoes(data ?? []);
    setVersoesOpen(true);
  };

  const restaurarVersao = (v: any) => {
    setHtml(v.content_html || "");
    setJson(v.content_json || {});
    setDirty(true);
    setVersoesOpen(false);
    toast.success(`Versão ${v.versao} carregada — salve para aplicar.`);
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
        <Input
          value={modelo.titulo}
          onChange={e => { setModelo({ ...modelo, titulo: e.target.value }); setDirty(true); }}
          className="max-w-md font-semibold"
          disabled={modelo.bloqueado}
        />
        <span className="text-xs text-muted-foreground">
          v{modelo.versao_atual} {dirty && "· não salvo"} {saving && "· salvando…"}
          {modelo.bloqueado && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700">🔒 bloqueado</span>}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant={modelo.bloqueado ? "secondary" : "outline"} onClick={alternarBloqueio}
            title={modelo.bloqueado ? "Desbloquear edição" : "Bloquear edição (somente-leitura)"}>
            {modelo.bloqueado ? <><Unlock className="h-4 w-4 mr-1" /> Desbloquear</> : <><Lock className="h-4 w-4 mr-1" /> Bloquear</>}
          </Button>
          <Button size="sm" variant="outline" onClick={abrirVersoes}><GitBranch className="h-4 w-4 mr-1" /> Versões</Button>
          <Button size="sm" variant="outline" onClick={abrirPreview}><Eye className="h-4 w-4 mr-1" /> Visualizar</Button>
          <Button size="sm" variant="outline" onClick={() => nav(`/editores/gerar?modelo=${id}`)}><Send className="h-4 w-4 mr-1" /> Gerar</Button>
          <Button size="sm" variant="secondary" onClick={publicarVersao} disabled={modelo.bloqueado}>Publicar versão</Button>
          <Button size="sm" onClick={() => salvar()} disabled={modelo.bloqueado}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
        </div>
      </div>


      <Tabs defaultValue="editar" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2 self-start">
          <TabsTrigger value="editar"><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</TabsTrigger>
          <TabsTrigger value="simular"><FlaskConical className="h-3.5 w-3.5 mr-1" /> Simular / Preencher</TabsTrigger>
        </TabsList>
        <TabsContent value="editar" className="flex-1 overflow-hidden mt-0">
          <div className="h-full flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
              <EditorToolbar editor={editorRef.current} zoom={zoom} setZoom={setZoom} onFullscreen={() => setFullscreen(f => !f)} />
              <div className="flex-1 overflow-auto">
                <TiptapEditor
                  initialContent={html}
                  onChange={(h, j) => { setHtml(h); setJson(j); setDirty(true); }}
                  editorRef={(e) => { editorRef.current = e; }}
                  zoom={zoom}
                  editable={!modelo.bloqueado}
                />

              </div>
            </div>
            <CamposSidebar estabelecimentoId={estabId} onInsert={inserirCampo} currentHtml={html} />
          </div>
        </TabsContent>
        <TabsContent value="simular" className="flex-1 overflow-hidden mt-0">
          <SimuladorInline
            html={html}
            titulo={modelo.titulo}
            mergeConfig={modelo.merge_config ?? null}
            onMergeConfigChange={(cfg) => { setModelo({ ...modelo, merge_config: cfg }); setDirty(true); }}
          />
        </TabsContent>
      </Tabs>

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

      <Sheet open={versoesOpen} onOpenChange={setVersoesOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>Histórico de versões</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-2">
            {versoes.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há versões publicadas.</p>}
            {versoes.map(v => (
              <div key={v.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <div className="font-medium text-sm">Versão {v.versao}</div>
                  <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("pt-BR")}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => restaurarVersao(v)}>Restaurar</Button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
