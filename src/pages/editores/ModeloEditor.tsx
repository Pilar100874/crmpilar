import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { isEstabelecimentoAdmin, getUserIdFromAuth } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { TiptapEditor } from "@/components/editores/TiptapEditor";

import { EditorToolbar, type EditorMode } from "@/components/editores/EditorToolbar";
import { CamposSidebar } from "@/components/editores/CamposSidebar";
import { CamposFormularioSidebar } from "@/components/editores/CamposFormularioSidebar";
import { FloatingPanel } from "@/components/editores/FloatingPanel";
import { PreviewModal } from "@/components/editores/PreviewModal";
import type { Editor } from "@tiptap/react";
import { QuickFillDialog } from "@/components/editores/QuickFillDialog";
import { EmpresaSearchDialog } from "@/components/editores/EmpresaSearchDialog";
import { ConsultaEstoqueDialog } from "@/components/atendimento/ConsultaEstoqueDialog";
import { renderTemplate, applyFillables, extractFillableTokens } from "@/lib/editores/mergeEngine";
import { parseCnpjGroupPayload, buildCnpjGroupFields } from "@/lib/editores/cnpjGroup";
import { setFillableValues as setFillableStore } from "@/lib/editores/fillableValuesStore";
import { hydrateDatasets, registerDataset, getAllDatasets, type ImportedDataset } from "@/lib/editores/importedDatasetStore";
import { resolveMergeData } from "@/lib/editores/dataResolvers";
import { runMergeConfig } from "@/lib/editores/runMergeConfig";
import { setPreviewValues, setPreviewRows, setPreviewActive } from "@/lib/editores/mergePreviewStore";
import { RegistroNavigator } from "@/components/editores/RegistroNavigator";
import { downloadPdf, printHtml } from "@/lib/editores/pdfExport";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ModeloEditor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [estabId, setEstabId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
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
  const [formFieldsOpen, setFormFieldsOpen] = useState(false);
  const [recordIndex, setRecordIndex] = useState(0);
  const [rowsByAlias, setRowsByAlias] = useState<Record<string, any[]>>({});
  const [primaryAlias, setPrimaryAlias] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [quickFillOpen, setQuickFillOpen] = useState(false);
  const [empresaSearchOpen, setEmpresaSearchOpen] = useState(false);
  const [estoqueSearchOpen, setEstoqueSearchOpen] = useState(false);
  const [fillableValues, setFillableValues] = useState<Record<string, string>>({});

  // Normaliza merge_config para array de configs (aceita objeto legado)
  const configs = useMemo<any[]>(() => {
    const mc = modelo?.merge_config;
    if (Array.isArray(mc?.configs)) return mc.configs;
    if (mc && (mc.tabela || mc.sql)) return [mc];
    return [];
  }, [modelo?.merge_config]);

  const savedTables = useMemo<{ name: string; alias: string; cols: string[] }[]>(
    () => (Array.isArray(modelo?.merge_config?.savedTables) ? modelo.merge_config.savedTables : []),
    [modelo?.merge_config],
  );
  const mergeFields = useMemo<string[]>(
    () => (Array.isArray(modelo?.merge_config?.mergeFields) ? modelo.merge_config.mergeFields : []),
    [modelo?.merge_config],
  );

  const configsKey = JSON.stringify(configs);

  // Contagem de campos de formulário pendentes (sem valor preenchido)
  const fillablesInfo = useMemo(() => {
    const tokens = extractFillableTokens(html);
    const total = tokens.length;
    const pendentes = tokens.filter(t => {
      const v = fillableValues[t.raw] ?? fillableValues[t.label] ?? "";
      return !String(v).trim();
    }).length;
    return { total, pendentes };
  }, [html, fillableValues]);

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
    setPreviewActive(showResolved);
    if (!showResolved) {
      setPreviewValues({});
      setPreviewRows({});
      return;
    }
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
      setPreviewRows(rowsByAlias);
    })();
  }, [rowsByAlias, primaryAlias, recordIndex, configsKey, showResolved]);

  const primaryRows = primaryAlias ? (rowsByAlias[primaryAlias] || []) : [];
  const primaryLabel = primaryRows[recordIndex]
    ? String(primaryRows[recordIndex].nome ?? primaryRows[recordIndex].name ?? primaryRows[recordIndex].razao_social ?? "")
    : "";



  useEffect(() => {
    getEstabelecimentoId().then(setEstabId);
    isEstabelecimentoAdmin().then(setIsAdmin);
    getUserIdFromAuth().then(setUsuarioId);
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("doc_modelos").select("*").eq("id", id).single();
      if (!data) { toast.error("Modelo não encontrado"); nav("/editores"); return; }
      setModelo(data);
      setHtml((data as any).content_html || "");
      setJson((data as any).content_json || {});
      const imp = (data as any)?.merge_config?.importedDatasets;
      hydrateDatasets(Array.isArray(imp) ? imp : []);
    })();
  }, [id, nav]);

  // Autosave (2s debounce) — só quando o registro atual é editável pelo usuário
  useEffect(() => {
    if (!dirty || !id || !modelo) return;
    const podeEditar = modelo.is_modelo ? isAdmin : modelo.owner_user_id === usuarioId;
    if (!podeEditar) return; // não faz autosave em modelo de admin sendo visto por usuário comum
    const t = setTimeout(() => { void salvar(true); }, 2000);
    return () => clearTimeout(t);
  }, [html, dirty, isAdmin, usuarioId, modelo?.is_modelo, modelo?.owner_user_id]);

  const salvarComoArquivoPessoal = async () => {
    if (!modelo || !estabId || !usuarioId) return;
    setSaving(true);
    const { data, error } = await supabase.from("doc_modelos").insert({
      estabelecimento_id: estabId,
      titulo: `${modelo.titulo} (meu arquivo)`,
      descricao: modelo.descricao,
      content_html: html,
      content_json: json,
      header_html: modelo.header_html,
      footer_html: modelo.footer_html,
      merge_config: modelo.merge_config ?? {},
      categoria_id: modelo.categoria_id,
      bloqueado: false,
      campos_bloqueados: false,
      is_modelo: false,
      owner_user_id: usuarioId,
    } as any).select("id").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDirty(false);
    toast.success("Arquivo pessoal criado");
    if (data?.id) nav(`/editores/modelos/${data.id}`);
  };

  const salvar = async (auto = false) => {
    if (!id || !modelo) return;
    // Usuário comum vendo um modelo: salvar cria um arquivo pessoal
    if (modelo.is_modelo && !isAdmin) {
      if (auto) return; // não auto-cria cópias
      await salvarComoArquivoPessoal();
      return;
    }
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
    // Ao bloquear o modelo, desativa a trava de estrutura (campos_bloqueados)
    // para que os campos personalizados fiquem interativos no modo visualização.
    const patch: any = { bloqueado: novo };
    if (novo) patch.campos_bloqueados = false;
    const { error } = await supabase.from("doc_modelos").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setModelo({ ...modelo, ...patch });
    if (novo) setShowResolved(true);
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
    const label = isAdmin ? "modelo" : "arquivo";
    const novoTitulo = window.prompt(`Nome do novo ${label}:`, `${modelo.titulo} (cópia)`);
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
      is_modelo: isAdmin,
      owner_user_id: isAdmin ? null : usuarioId,
    } as any).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Cópia criada");
    if (data?.id) nav(`/editores/modelos/${data.id}`);
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
    if (chave.startsWith("__CNPJ_GROUP__:")) {
      try {
        const parsed = parseCnpjGroupPayload(chave);
        if (!parsed) return;
        const fields = buildCnpjGroupFields(parsed.group, parsed.keys);
        let chain = ed.chain().focus();
        for (const attrs of fields) {
          chain = chain.insertContent({ type: "fillableField", attrs }).insertContent(" ");
        }
        chain.run();
      } catch (e) {
        console.error("[ModeloEditor] payload __CNPJ_GROUP__ inválido", e);
      }
      return;
    }
    if (chave.startsWith("__RAW__:")) {
      ed.chain().focus().insertContent(chave.slice("__RAW__:".length)).run();
      return;
    }
    if (chave.startsWith("__TABLE__:")) {
      try {
        const meta = JSON.parse(chave.slice("__TABLE__:".length)) as { alias: string; cols: string[] };
        const resp = window.prompt(
          `Inserir tabela "${meta.alias}".\nQuais linhas? Ex: 1-10 · 5-20 · vazio = todas`,
          "",
        );
        if (resp === null) return; // cancelou
        let from = 1, to = 0;
        const m = resp.trim().match(/^(\d+)\s*[-\/]\s*(\d+)$/);
        if (m) { from = Number(m[1]); to = Number(m[2]); }
        else if (/^\d+$/.test(resp.trim())) { from = 1; to = Number(resp.trim()); }
        ed.chain().focus().insertContent({ type: "mergeTable", attrs: { alias: meta.alias, cols: meta.cols, from, to } }).run();
      } catch (e) {
        console.error("[ModeloEditor] payload __TABLE__ inválido", e);
      }
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
    // Toggle inline: mostra valores resolvidos direto no editor (não abre modal).
    // Com o modelo bloqueado, a visualização deve permanecer sempre ativa.
    if (modelo?.bloqueado && showResolved) {
      toast.info("Desbloqueie o modelo para desativar a visualização");
      return;
    }
    if (dirty) await salvar(true);
    setShowResolved((v) => !v);
  };

  // Gera o HTML final com dados do vínculo primário + valores dos fillables preenchidos.
  const buildFinalHtml = async (): Promise<string> => {
    let dados: Record<string, any> = { data_atual: new Date().toLocaleDateString("pt-BR") };
    try {
      const base = await resolveMergeData("livre", null);
      dados = { ...dados, ...base };
    } catch {}
    for (const c of configs) {
      if (!c?.alias) continue;
      const rows = rowsByAlias[c.alias] || [];
      if (!rows.length) continue;
      const i = c.alias === primaryAlias ? recordIndex : 0;
      const row = rows[Math.min(i, rows.length - 1)];
      dados[c.alias] = row;
      Object.assign(dados, row);
    }
    const step1 = renderTemplate(html, dados, { highlightMissing: false }).html;
    return applyFillables(step1, fillableValues, { highlightEmpty: false });
  };

  const renderToTemporaryPage = async (): Promise<HTMLDivElement> => {
    const finalHtml = await buildFinalHtml();
    const page = document.createElement("div");
    page.style.cssText = "width:210mm;min-height:297mm;padding:20mm;box-sizing:border-box;background:#fff;color:#000;font-family:Arial,sans-serif;font-size:12pt;line-height:1.5;position:fixed;left:-99999px;top:0;";
    page.innerHTML = finalHtml;
    document.body.appendChild(page);
    return page;
  };

  const gerarPdf = async () => {
    // Abre a prévia antes — o usuário confirma o PDF dentro do PreviewModal.
    await abrirPreview();
  };

  const imprimir = async () => {
    // Abre a prévia antes — o usuário confirma a impressão dentro do PreviewModal.
    await abrirPreview();
  };

  if (!modelo) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  const mc = modelo.merge_config;
  const baseMcFrom = (m: any) => (m && typeof m === "object" && !Array.isArray(m) ? { ...m } : {});
  const baseMc = () => baseMcFrom(mc);
  const setConfigs = (list: any[]) => {
    setModelo((prev: any) => ({ ...prev, merge_config: { ...baseMcFrom(prev?.merge_config), configs: list } }));
    setDirty(true);
  };
  const setSavedTables = (list: { name: string; alias: string; cols: string[] }[]) => {
    setModelo((prev: any) => ({ ...prev, merge_config: { ...baseMcFrom(prev?.merge_config), savedTables: list } }));
    setDirty(true);
  };
  const setMergeFields = (list: string[]) => {
    setModelo((prev: any) => ({ ...prev, merge_config: { ...baseMcFrom(prev?.merge_config), mergeFields: list } }));
    setDirty(true);
  };
  const handleImportedDataset = (_ds: ImportedDataset) => {
    setModelo((prev: any) => ({ ...prev, merge_config: { ...baseMcFrom(prev?.merge_config), importedDatasets: getAllDatasets() } }));
    setDirty(true);
  };

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background flex flex-col" : "absolute inset-0 flex flex-col bg-background"}>
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="sticky top-0 z-30 bg-card shadow-sm">
        <EditorToolbar
          editor={editorInstance}
          zoom={zoom}
          setZoom={setZoom}
          onFullscreen={() => setFullscreen(f => !f)}
          onPreviewMerge={abrirPreview}
          previewActive={showResolved}
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
          onToggleFormFields={() => setFormFieldsOpen(o => !o)}
          formFieldsOpen={formFieldsOpen}
          hasFormFields={/data-fillable-field=|data-fillable=/i.test(html)}
          onQuickFill={() => setQuickFillOpen(true)}
          onSearchEmpresa={() => setEmpresaSearchOpen(true)}
          onSearchEstoque={() => setEstoqueSearchOpen(true)}
          onGeneratePdf={gerarPdf}
          onPrint={imprimir}
        />
        </div>

        {primaryRows.length > 0 && (
          <div className="border-b bg-muted/30 px-3 py-1 flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Registro (vínculo <b>{primaryAlias}</b>):</span>
            <RegistroNavigator
              total={primaryRows.length}
              index={recordIndex}
              onChange={setRecordIndex}
              label={primaryLabel}
            />
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">

          {(
            <div className="h-full flex overflow-hidden">
              <div className="flex-1 overflow-auto">
                <TiptapEditor
                  initialContent={html}
                  onChange={(h, j) => { setHtml(h); setJson(j); setDirty(true); }}
                  editorRef={(e) => { editorRef.current = e; setEditorInstance(e); }}
                  zoom={zoom}
                  editable={!modelo.bloqueado}
                />
              </div>
              <FloatingPanel
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                title="Campos"
              >
                <CamposSidebar
                  estabelecimentoId={estabId}
                  onInsert={inserirCampo}
                  currentHtml={html}
                  configs={configs}
                  onConfigsChange={setConfigs}
                  savedTables={savedTables}
                  onSavedTablesChange={setSavedTables}
                  mergeFields={mergeFields}
                  onMergeFieldsChange={setMergeFields}
                  onImportedDataset={handleImportedDataset}
                />
              </FloatingPanel>
              <FloatingPanel
                open={formFieldsOpen}
                onClose={() => setFormFieldsOpen(false)}
                title="Campos personalizados"
                initialX={420}
                initialY={80}
              >
                <CamposFormularioSidebar
                  estabelecimentoId={estabId}
                  onInsert={inserirCampo}
                />
              </FloatingPanel>
            </div>
          )}
        </div>


        <QuickFillDialog
          open={quickFillOpen}
          onOpenChange={setQuickFillOpen}
          html={html}
          values={fillableValues}
          onApply={(v) => { setFillableValues(v); setFillableStore(v); }}
        />

        <EmpresaSearchDialog
          open={empresaSearchOpen}
          onOpenChange={setEmpresaSearchOpen}
          onInsert={(h) => {
            editorRef.current?.chain().focus().insertContent(h).run();
            setDirty(true);
          }}
        />

        {estabId && (
          <ConsultaEstoqueDialog
            open={estoqueSearchOpen}
            onOpenChange={setEstoqueSearchOpen}
            estabelecimentoId={estabId}
            actionLabel="Inserir no documento"
            actionLabelShort="Inserir"
            onInsertHtml={(html) => {
              const ed = editorRef.current;
              if (!ed) { console.warn("[estoque] editor não pronto"); return; }
              setTimeout(() => {
                ed.chain().focus().insertContent(html, {
                  parseOptions: { preserveWhitespace: "full" },
                }).run();
                setDirty(true);
              }, 50);
            }}
            onEnviarParaConversa={() => { /* editor usa onInsertHtml */ }}
          />
        )}


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
            {fillablesInfo.total > 0 && (
              <span
                className={`ml-2 px-1.5 py-0.5 rounded ${
                  fillablesInfo.pendentes > 0
                    ? "bg-orange-500/20 text-orange-700"
                    : "bg-emerald-500/20 text-emerald-700"
                }`}
                title="Campos de formulário pendentes"
              >
                {fillablesInfo.pendentes > 0
                  ? `${fillablesInfo.pendentes} de ${fillablesInfo.total} campo(s) a preencher`
                  : `Todos os ${fillablesInfo.total} campo(s) preenchidos`}
              </span>
            )}
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


