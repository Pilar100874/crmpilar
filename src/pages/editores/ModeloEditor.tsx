import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { toast } from "@/lib/toast-config";
import { TiptapEditor } from "@/components/editores/TiptapEditor";

import { EditorToolbar, type EditorMode } from "@/components/editores/EditorToolbar";
import { CamposSidebar } from "@/components/editores/CamposSidebar";
import { PreviewModal } from "@/components/editores/PreviewModal";
import type { Editor } from "@tiptap/react";
import { SimuladorInline } from "@/components/editores/SimuladorInline";
import { renderTemplate } from "@/lib/editores/mergeEngine";
import { resolveMergeData } from "@/lib/editores/dataResolvers";
import { runMergeConfig } from "@/lib/editores/runMergeConfig";
import { setPreviewValues } from "@/lib/editores/mergePreviewStore";
import { RegistroNavigator } from "@/components/editores/RegistroNavigator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [modo, setModo] = useState<EditorMode>("editar");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recordIndex, setRecordIndex] = useState(0);
  const [rowsByAlias, setRowsByAlias] = useState<Record<string, any[]>>({});
  const [primaryAlias, setPrimaryAlias] = useState<string | null>(null);

  // Normaliza merge_config para array de configs (aceita objeto legado)
  const configs = useMemo<any[]>(() => {
    const mc = modelo?.merge_config;
    if (Array.isArray(mc?.configs)) return mc.configs;
    if (mc && (mc.tabela || mc.sql)) return [mc];
    return [];
  }, [modelo?.merge_config]);

  const configsKey = JSON.stringify(configs);

  // Carrega registros de cada vínculo para o preview inline dos chips
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const acc: Record<string, any[]> = {};
      let primary: string | null = null;
      for (const c of configs) {
        if (!c?.alias) continue;
        try {
          const rows = await runMergeConfig(c);
          if (rows && rows.length) {
            acc[c.alias] = rows;
            if (!primary) primary = c.alias;
          }
        } catch {}
      }
      if (!cancelled) {
        setRowsByAlias(acc);
        setPrimaryAlias(primary);
        setRecordIndex(0);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configsKey]);

  // Publica valores no store para os chips renderizarem o valor real
  useEffect(() => {
    (async () => {
      const base = await resolveMergeData("livre", null);
      const merged: Record<string, any> = { ...base };
      for (const c of configs) {
        if (!c?.alias) continue;
        const rows = rowsByAlias[c.alias] || [];
        if (!rows.length) continue;
        const i = c.alias === primaryAlias ? recordIndex : 0;
        merged[c.alias] = rows[Math.min(i, rows.length - 1)];
      }
      setPreviewValues(merged);
    })();
  }, [rowsByAlias, primaryAlias, recordIndex, configsKey]);

  const primaryRows = primaryAlias ? (rowsByAlias[primaryAlias] || []) : [];
  const primaryLabel = primaryRows[recordIndex]
    ? String(primaryRows[recordIndex].nome ?? primaryRows[recordIndex].name ?? primaryRows[recordIndex].razao_social ?? "")
    : "";



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
    if (chave.startsWith("__FIELD__:")) {
      try {
        const attrs = JSON.parse(chave.slice("__FIELD__:".length));
        ed.chain().focus().insertContent({ type: "fillableField", attrs }).insertContent(" ").run();
      } catch (e) {
        console.error("[ModeloEditor] payload __FIELD__ inválido", e);
      }
      return;
    }
    if (chave.startsWith("__RAW__:")) {
      ed.chain().focus().insertContent(chave.slice("__RAW__:".length)).run();
      return;
    }
    if (chave.startsWith("__LOOP__:")) {
      const path = chave.slice("__LOOP__:".length);
      ed.chain().focus().insertContent(`{{#each ${path}}}{{this}}{{/each}}`).run();
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

  const mc = modelo.merge_config;
  const setConfigs = (list: any[]) => {
    setModelo({ ...modelo, merge_config: { ...(mc && !Array.isArray(mc?.configs) ? {} : mc), configs: list } });
    setDirty(true);
  };

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background flex flex-col" : "h-full flex flex-col"}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <EditorToolbar
          editor={editorInstance}
          zoom={zoom}
          setZoom={setZoom}
          onFullscreen={() => setFullscreen(f => !f)}
          onPreviewMerge={abrirPreview}
          estabelecimentoId={estabId}
          onBack={() => nav("/editores")}
          onSave={() => salvar()}
          onSalvarComo={salvarComo}
          onToggleLock={alternarBloqueio}
          locked={!!modelo.bloqueado}
          dirty={dirty}
          saving={saving}
          mode={modo}
          onModeChange={setModo}
          onInsertFormField={(tok) => inserirCampo(tok)}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          sidebarOpen={sidebarOpen}
        />

        <div className="flex-1 overflow-hidden">
          {modo !== "editar" ? (
            <div className="h-full flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 border-b bg-muted/40 text-xs flex items-center gap-2">
                <span className="font-semibold">
                  {modo === "form" ? "Simular Formulário — preencher campos" : "Simular Merge — navegar registros"}
                </span>
                <span className="text-muted-foreground">(inline)</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <SimuladorInline
                  html={html}
                  titulo={modelo.titulo}
                  soPreenchimento={modo === "form"}
                  mergeConfig={configs[0] ?? modelo.merge_config ?? null}
                  onMergeConfigChange={(cfg) => {
                    const next = [...configs];
                    if (next.length) next[0] = cfg; else next.push(cfg);
                    setConfigs(next);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex overflow-hidden">
              <div className="flex-1 overflow-auto">
                <TiptapEditor
                  initialContent={html}
                  onChange={(h, j) => { setHtml(h); setJson(j); setDirty(true); }}
                  editorRef={(e) => { editorRef.current = e; setEditorInstance(e); }}
                  zoom={zoom}
                  editable={!modelo.bloqueado && !modelo.campos_bloqueados}
                />
              </div>
              {sidebarOpen && (
                <CamposSidebar
                  estabelecimentoId={estabId}
                  onInsert={inserirCampo}
                  currentHtml={html}
                  configs={configs}
                  onConfigsChange={setConfigs}
                />
              )}
            </div>
          )}
        </div>


        {/* Barra inferior — nome do documento */}
        <div className="border-t bg-card px-3 py-2 flex items-center gap-2">
          <label className="text-xs text-muted-foreground shrink-0">Nome:</label>
          <Input
            value={modelo.titulo}
            onChange={(e) => { setModelo({ ...modelo, titulo: e.target.value }); setDirty(true); }}
            className="h-8 max-w-md font-semibold"
            disabled={modelo.bloqueado}
          />
          <span className="text-[11px] text-muted-foreground">
            {dirty && "não salvo"} {saving && "salvando…"}
            {modelo.bloqueado && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700">🔒 bloqueado</span>}
          </span>
        </div>
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


