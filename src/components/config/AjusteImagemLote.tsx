import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Upload, Image as ImageIcon, Wand2, Loader2,
  Check, RefreshCw, X, Trash2, Filter, Sparkles, Pause, Play, Eye, Save,
} from "lucide-react";
import { normalizeImageToSquare, dataUrlToFile } from "@/lib/imageNormalize";

interface Produto {
  id: string;
  nome: string;
  codigo: string | null;
  foto_url: string | null;
  categoria_id: string | null;
  grupo_id: string | null;
  categoria?: { id: string; nome: string } | null;
  grupo?: { id: string; nome: string } | null;
}

type Metodo = "upload" | "existente" | "ia";

interface IaItem {
  produtoId: string;
  nome: string;
  status: "pending" | "generating" | "ready" | "approved" | "error";
  imageDataUrl?: string;
  prompt: string;
  error?: string;
  currentPhotoUrl?: string | null;
}

const TEMPLATES_STORAGE_KEY = "ajuste-img-lote:templates";

interface Props {
  estabelecimentoId: string;
}

export function AjusteImagemLote({ estabelecimentoId }: Props) {
  const [step, setStep] = useState<1 | 2 | "prompts" | 3>(1);

  // ---- textos extras para IA (por produto + filtro local + aplicação em lote)
  const [iaExtras, setIaExtras] = useState<Record<string, string>>({});
  const [bulkExtra, setBulkExtra] = useState("");
  const [promptsFilterNome, setPromptsFilterNome] = useState("");
  const [promptsFilterCategoria, setPromptsFilterCategoria] = useState<string>("all");
  const [promptsFilterGrupo, setPromptsFilterGrupo] = useState<string>("all");

  // ---- dados base
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- filtros
  const [filterNome, setFilterNome] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterGrupo, setFilterGrupo] = useState<string>("all");
  const [filterFoto, setFilterFoto] = useState<"all" | "com" | "sem">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ---- método
  const [metodo, setMetodo] = useState<Metodo>("upload");
  const [removerSecundarias, setRemoverSecundarias] = useState(true);

  // upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // existente
  const [sourceProdutoId, setSourceProdutoId] = useState<string>("");
  const [searchSource, setSearchSource] = useState("");

  // ia
  const [iaItems, setIaItems] = useState<IaItem[]>([]);
  const [iaModel, setIaModel] = useState<string>("google/gemini-2.5-flash-image");
  const [useVisualIdentity, setUseVisualIdentity] = useState(false);
  const [visualIdentityPrompt, setVisualIdentityPrompt] = useState<string>("");
  const [hasVisualIdentity, setHasVisualIdentity] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showPromptPreviewDialog, setShowPromptPreviewDialog] = useState(false);

  // pausa/retomar geração
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const cancelGenRef = useRef(false);
  const [genStartedAt, setGenStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // templates de textos extras (localStorage)
  const [templates, setTemplates] = useState<{ id: string; nome: string; texto: string }[]>([]);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [newTemplateNome, setNewTemplateNome] = useState("");

  // execução
  const [processing, setProcessing] = useState(false);

  // catálogo de modelos disponíveis no Lovable AI Gateway
  const IMAGE_MODELS: { value: string; label: string; cost: number; supportsRef: boolean }[] = [
    { value: "google/gemini-2.5-flash-image", label: "🟦 Gemini 2.5 Flash Image (Nano Banana) — rápido", cost: 0.04, supportsRef: true },
    { value: "google/gemini-3.1-flash-image-preview", label: "🟦 Gemini 3.1 Flash Image (Nano Banana 2) — rápido + alta qualidade", cost: 0.06, supportsRef: true },
    { value: "google/gemini-3-pro-image-preview", label: "🟦 Gemini 3 Pro Image — máxima qualidade", cost: 0.20, supportsRef: true },
    { value: "openai/gpt-image-2", label: "🟢 OpenAI GPT Image 2 — fotorrealismo premium", cost: 0.15, supportsRef: false },
    { value: "openai/gpt-image-1-mini", label: "🟢 OpenAI GPT Image 1 Mini — econômico", cost: 0.05, supportsRef: false },
  ];
  const COST_PER_IMAGE: Record<string, number> = Object.fromEntries(IMAGE_MODELS.map((m) => [m.value, m.cost]));
  const estimatedCost = (COST_PER_IMAGE[iaModel] ?? 0.05) * selectedIds.size;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [pRes, cRes, gRes, viRes] = await Promise.all([
          supabase
            .from("produtos")
            .select("id, nome, codigo, foto_url, categoria_id, grupo_id, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)")
            .eq("estabelecimento_id", estabelecimentoId)
            .order("nome"),
          supabase.from("produto_categorias").select("id, nome").eq("estabelecimento_id", estabelecimentoId).order("nome"),
          supabase.from("produto_grupos").select("id, nome").eq("estabelecimento_id", estabelecimentoId).order("nome"),
          supabase.from("studio_visual_identity").select("prompt, is_active, use_prompt").eq("estabelecimento_id", estabelecimentoId).maybeSingle(),
        ]);
        setProdutos((pRes.data as any) || []);
        setCategorias(cRes.data || []);
        setGrupos(gRes.data || []);
        const vi: any = viRes.data;
        if (vi?.prompt) {
          setHasVisualIdentity(true);
          setVisualIdentityPrompt(vi.prompt);
          setUseVisualIdentity(!!vi.is_active && !!vi.use_prompt);
        }
      } catch (e: any) {
        toast.error("Erro ao carregar produtos");
      } finally {
        setLoading(false);
      }
    })();
  }, [estabelecimentoId]);

  // carrega templates do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (raw) setTemplates(JSON.parse(raw));
    } catch {}
  }, []);

  // tick para atualizar ETA enquanto gera
  useEffect(() => {
    if (genStartedAt === null) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [genStartedAt]);

  const persistTemplates = (next: { id: string; nome: string; texto: string }[]) => {
    setTemplates(next);
    try { localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const saveBulkAsTemplate = () => {
    const txt = bulkExtra.trim();
    const nome = newTemplateNome.trim();
    if (!txt || !nome) { toast.error("Informe nome e texto do template"); return; }
    const next = [...templates, { id: crypto.randomUUID(), nome, texto: txt }];
    persistTemplates(next);
    setNewTemplateNome("");
    toast.success("Template salvo");
  };

  const removeTemplate = (id: string) => persistTemplates(templates.filter((t) => t.id !== id));

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      if (filterNome && !p.nome.toLowerCase().includes(filterNome.toLowerCase())) return false;
      if (filterCategoria !== "all" && p.categoria_id !== filterCategoria) return false;
      if (filterGrupo !== "all" && p.grupo_id !== filterGrupo) return false;
      if (filterFoto === "com" && !p.foto_url) return false;
      if (filterFoto === "sem" && p.foto_url) return false;
      return true;
    });
  }, [produtos, filterNome, filterCategoria, filterGrupo, filterFoto]);

  const selectedProdutos = useMemo(
    () => produtos.filter((p) => selectedIds.has(p.id)),
    [produtos, selectedIds]
  );

  const promptsFilteredProdutos = useMemo(() => {
    return selectedProdutos.filter((p) => {
      if (promptsFilterNome && !p.nome.toLowerCase().includes(promptsFilterNome.toLowerCase())) return false;
      if (promptsFilterCategoria !== "all" && p.categoria_id !== promptsFilterCategoria) return false;
      if (promptsFilterGrupo !== "all" && p.grupo_id !== promptsFilterGrupo) return false;
      return true;
    });
  }, [selectedProdutos, promptsFilterNome, promptsFilterCategoria, promptsFilterGrupo]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAllFiltered = () => {
    const allSelected = produtosFiltrados.every((p) => selectedIds.has(p.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) produtosFiltrados.forEach((p) => next.delete(p.id));
      else produtosFiltrados.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const onSelectFile = async (file: File | null) => {
    if (!file) {
      setUploadFile(null);
      setUploadPreview(null);
      return;
    }
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  };

  const goToStep2 = () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um produto");
      return;
    }
    setStep(2);
  };

  const goToStep3 = async () => {
    if (metodo === "upload" && !uploadFile) {
      toast.error("Envie uma imagem");
      return;
    }
    if (metodo === "existente" && !sourceProdutoId) {
      toast.error("Selecione um produto de origem");
      return;
    }
    if (metodo === "ia") {
      // antes de gerar, abre a etapa de prompts (textos extras)
      setStep("prompts");
      return;
    }
    setStep(3);
  };

  const goToCostFromPrompts = () => {
    setShowCostDialog(true);
  };

  const buildPromptFor = (p: Produto) => {
    const extra = (iaExtras[p.id] || "").trim();
    // Substitui as variáveis {nome} / {produto} pelo nome do produto.
    // Se o texto extra existir, ele é usado como prompt completo (não anexamos mais o nome automaticamente).
    if (extra) {
      return extra.replace(/\{nome\}/gi, p.nome).replace(/\{produto\}/gi, p.nome);
    }
    return p.nome;
  };

  const startIaGeneration = async () => {
    setShowCostDialog(false);
    const items: IaItem[] = selectedProdutos.map((p) => ({
      produtoId: p.id,
      nome: p.nome,
      status: "pending",
      prompt: buildPromptFor(p),
      currentPhotoUrl: p.foto_url,
    }));
    setIaItems(items);
    setStep(3);
    pausedRef.current = false;
    cancelGenRef.current = false;
    setPaused(false);
    setGenStartedAt(Date.now());
    setNowTick(Date.now());
    await runQueue(items);
    setGenStartedAt(null);
  };

  const runQueue = async (items: IaItem[]) => {
    for (const it of items) {
      // espera enquanto pausado
      while (pausedRef.current && !cancelGenRef.current) {
        await new Promise((r) => setTimeout(r, 300));
      }
      if (cancelGenRef.current) break;
      await generateIaImage(it.produtoId, it.prompt);
    }
  };

  const resumeQueue = async () => {
    const pendentes = iaItems.filter((i) => i.status === "pending" || i.status === "error");
    if (pendentes.length === 0) { toast.info("Nada a retomar"); return; }
    pausedRef.current = false;
    cancelGenRef.current = false;
    setPaused(false);
    setGenStartedAt(Date.now());
    setNowTick(Date.now());
    await runQueue(pendentes);
    setGenStartedAt(null);
  };

  const generateIaImage = async (produtoId: string, promptText: string) => {
    setIaItems((prev) =>
      prev.map((i) => (i.produtoId === produtoId ? { ...i, status: "generating", error: undefined } : i))
    );
    try {
      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: {
          prompt: promptText,
          productName: promptText,
          model: iaModel,
          visualIdentityPrompt: useVisualIdentity && hasVisualIdentity ? visualIdentityPrompt : undefined,
        },
      });
      if (error) throw error;
      const img: string | undefined = data?.image;
      // valida formato mínimo (data URL base64 ou http(s))
      const isValid = typeof img === "string" && (img.startsWith("data:image/") || img.startsWith("http"));
      if (!isValid) throw new Error(data?.error || "Resposta da IA sem imagem válida");
      setIaItems((prev) =>
        prev.map((i) =>
          i.produtoId === produtoId ? { ...i, status: "ready", imageDataUrl: img } : i
        )
      );
    } catch (e: any) {
      console.error("[generateIaImage] erro:", e);
      setIaItems((prev) =>
        prev.map((i) =>
          i.produtoId === produtoId
            ? { ...i, status: "error", error: e?.message || "Erro ao gerar imagem" }
            : i
        )
      );
    }
  };

  // utilitário: upload normalizado para o bucket e retorno de { url, path }
  const uploadNormalized = async (file: File): Promise<{ url: string; path: string }> => {
    const normalized = await normalizeImageToSquare(file, 1024);
    const path = `${estabelecimentoId}/lote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage.from("produtos").upload(path, normalized, { contentType: "image/jpeg" });
    if (error) throw error;
    const { data } = supabase.storage.from("produtos").getPublicUrl(path);
    return { url: data.publicUrl, path };
  };

  const fetchAsFile = async (url: string): Promise<File> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], `src-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
  };

  // aplica uma URL/path como principal em um produto, opcionalmente apagando secundárias
  const applyImageToProduto = async (
    produtoId: string,
    url: string,
    path: string,
  ) => {
    // 1) opcionalmente apaga TODAS as imagens existentes (e arquivos do storage)
    const { data: existentes } = await supabase
      .from("produto_imagens")
      .select("id, storage_path")
      .eq("produto_id", produtoId);

    if (removerSecundarias && existentes && existentes.length > 0) {
      const ids = existentes.map((e: any) => e.id);
      const paths = existentes.map((e: any) => e.storage_path).filter(Boolean);
      await supabase.from("produto_imagens").delete().in("id", ids);
      if (paths.length > 0) await supabase.storage.from("produtos").remove(paths);
    } else {
      // zera principal das existentes p/ evitar colisão de unique
      await supabase.from("produto_imagens").update({ is_principal: false }).eq("produto_id", produtoId);
    }

    // 2) insere a nova como principal
    await supabase.from("produto_imagens").insert({
      produto_id: produtoId,
      estabelecimento_id: estabelecimentoId,
      url,
      storage_path: path,
      is_principal: true,
      ordem: 0,
    });

    // 3) atualiza foto_url do produto
    await supabase.from("produtos").update({ foto_url: url }).eq("id", produtoId);
  };

  const executarLote = async () => {
    if (selectedProdutos.length === 0) return;
    if (removerSecundarias) {
      setShowDeleteConfirmDialog(true);
      return;
    }
    await doExecutarLote();
  };

  const doExecutarLote = async () => {
    if (selectedProdutos.length === 0) return;
    setProcessing(true);
    let ok = 0;
    let fail = 0;
    try {
      if (metodo === "upload" && uploadFile) {
        // upload uma única vez e reusa URL/path para todos
        const { url, path } = await uploadNormalized(uploadFile);
        for (const p of selectedProdutos) {
          try {
            await applyImageToProduto(p.id, url, path);
            ok++;
          } catch {
            fail++;
          }
        }
      } else if (metodo === "existente") {
        const src = produtos.find((p) => p.id === sourceProdutoId);
        if (!src?.foto_url) {
          toast.error("Produto de origem não possui imagem");
          setProcessing(false);
          return;
        }
        const file = await fetchAsFile(src.foto_url);
        const { url, path } = await uploadNormalized(file);
        for (const p of selectedProdutos) {
          try {
            await applyImageToProduto(p.id, url, path);
            ok++;
          } catch {
            fail++;
          }
        }
      } else if (metodo === "ia") {
        const aprovados = iaItems.filter((i) => i.status === "approved" && i.imageDataUrl);
        for (const item of aprovados) {
          try {
            const file = dataUrlToFile(item.imageDataUrl!, `ia-${item.produtoId}.png`);
            const { url, path } = await uploadNormalized(file);
            await applyImageToProduto(item.produtoId, url, path);
            ok++;
          } catch {
            fail++;
          }
        }
      }
      toast.success(`Atualizados: ${ok}${fail ? ` • Falhas: ${fail}` : ""}`);
      // reset
      setStep(1);
      setSelectedIds(new Set());
      setUploadFile(null);
      setUploadPreview(null);
      setSourceProdutoId("");
      setIaItems([]);
      // recarrega produtos para refletir novas fotos
      const { data } = await supabase
        .from("produtos")
        .select("id, nome, codigo, foto_url, categoria_id, grupo_id, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");
      setProdutos((data as any) || []);
    } finally {
      setProcessing(false);
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs ${step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1. Filtrar</div>
          <div className={`px-3 py-1 rounded-full text-xs ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2. Escolher método</div>
          {metodo === "ia" && (
            <div className={`px-3 py-1 rounded-full text-xs ${step === "prompts" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>3. Textos extras</div>
          )}
          <div className={`px-3 py-1 rounded-full text-xs ${step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{metodo === "ia" ? "4" : "3"}. Revisar e aplicar</div>
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedIds.size} produto(s) selecionado(s)
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" /> Filtrar produtos
            </CardTitle>
            <CardDescription>Refine por nome, categoria e grupo, e marque os produtos que deseja ajustar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Nome do produto</Label>
                <Input value={filterNome} onChange={(e) => setFilterNome(e.target.value)} placeholder="Buscar por nome..." />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grupo</Label>
                <Select value={filterGrupo} onValueChange={setFilterGrupo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Foto</Label>
                <Select value={filterFoto} onValueChange={(v) => setFilterFoto(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="com">Com foto</SelectItem>
                    <SelectItem value="sem">Sem foto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-md">
              <div className="flex items-center justify-between p-2 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={produtosFiltrados.length > 0 && produtosFiltrados.every((p) => selectedIds.has(p.id))}
                    onCheckedChange={toggleSelectAllFiltered}
                  />
                  <span className="text-sm">Selecionar todos os filtrados ({produtosFiltrados.length})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Limpar seleção</Button>
              </div>
              <div className="max-h-96 overflow-auto divide-y">
                {loading && <div className="p-4 text-sm text-muted-foreground">Carregando...</div>}
                {!loading && produtosFiltrados.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">Nenhum produto encontrado</div>
                )}
                {produtosFiltrados.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 cursor-pointer">
                    <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                    <div className="w-10 h-10 rounded bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.nome}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.codigo || "—"} • {p.categoria?.nome || "Sem categoria"} • {p.grupo?.nome || "Sem grupo"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={goToStep2} disabled={selectedIds.size === 0}>
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Escolha o método de atualização</CardTitle>
            <CardDescription>{selectedIds.size} produto(s) serão atualizados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={metodo} onValueChange={(v) => setMetodo(v as Metodo)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="upload" className="gap-2"><Upload className="h-4 w-4" /> Enviar imagem</TabsTrigger>
                <TabsTrigger value="existente" className="gap-2"><ImageIcon className="h-4 w-4" /> De outro produto</TabsTrigger>
                <TabsTrigger value="ia" className="gap-2"><Sparkles className="h-4 w-4" /> Gerar por IA</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-3 pt-4">
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onSelectFile(e.target.files?.[0] || null)} />
                    <div className="px-4 py-2 border rounded-md hover:bg-muted text-sm flex items-center gap-2">
                      <Upload className="h-4 w-4" /> Selecionar imagem
                    </div>
                  </label>
                  {uploadPreview && (
                    <div className="relative w-24 h-24 rounded-md overflow-hidden border">
                      <img src={uploadPreview} className="w-full h-full object-cover" alt="preview" />
                      <button
                        onClick={() => onSelectFile(null)}
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  A imagem será normalizada para 1024x1024 (formato e resolução padrão do sistema) e aplicada como principal em todos os produtos selecionados.
                </p>
              </TabsContent>

              <TabsContent value="existente" className="space-y-3 pt-4">
                <Label>Produto de origem</Label>
                <Input value={searchSource} onChange={(e) => setSearchSource(e.target.value)} placeholder="Buscar produto..." />
                <div className="max-h-72 overflow-auto border rounded-md divide-y">
                  {produtos
                    .filter((p) => p.foto_url && (!searchSource || p.nome.toLowerCase().includes(searchSource.toLowerCase())))
                    .slice(0, 200)
                    .map((p) => (
                      <label key={p.id} className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/30 ${sourceProdutoId === p.id ? "bg-primary/10" : ""}`}>
                        <input type="radio" name="src-product" checked={sourceProdutoId === p.id} onChange={() => setSourceProdutoId(p.id)} />
                        <img src={p.foto_url!} alt={p.nome} className="w-10 h-10 object-cover rounded" />
                        <span className="text-sm">{p.nome}</span>
                      </label>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">A imagem principal deste produto será copiada (1024x1024) para todos os selecionados.</p>
              </TabsContent>

              <TabsContent value="ia" className="space-y-3 pt-4">
                <p className="text-sm text-muted-foreground">
                  Será gerada uma imagem para cada produto selecionado, usando o nome como base. Você poderá revisar, regerar ou aprovar antes de aplicar.
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Modelo de geração de imagem</Label>
                    <Select value={iaModel} onValueChange={setIaModel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {IMAGE_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Modelos Pro consomem mais créditos.</p>
                  </div>

                  <div className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer" htmlFor="vi-toggle">Aplicar Identidade Visual</Label>
                      <Switch
                        id="vi-toggle"
                        checked={useVisualIdentity}
                        onCheckedChange={setUseVisualIdentity}
                        disabled={!hasVisualIdentity}
                      />
                    </div>
                    {hasVisualIdentity ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {useVisualIdentity ? "Ativa — o prompt da identidade visual será incluído nas gerações." : "Desativada — as imagens serão geradas sem regras de marca."}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma identidade visual cadastrada. Configure em Marketing → AI Studio para ativar.
                      </p>
                    )}
                  </div>
                </div>

                <div className="border rounded-md p-3 bg-muted/30 text-sm">
                  {selectedProdutos.length} imagens serão geradas ao avançar.
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-3">
                <Switch checked={removerSecundarias} onCheckedChange={setRemoverSecundarias} id="rm-sec" />
                <Label htmlFor="rm-sec" className="cursor-pointer">
                  Apagar imagens secundárias existentes ao aplicar
                </Label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={goToStep3}>
                {metodo === "ia" ? "Continuar" : "Continuar"} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP PROMPTS (apenas IA) */}
      {step === "prompts" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Textos extras para a geração
            </CardTitle>
            <CardDescription>
              Adicione descrições/contexto extra para cada produto. Você pode filtrar para localizar itens e aplicar um texto em lote — todos os produtos serão gerados ao avançar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Filtrar por nome</Label>
                <Input
                  value={promptsFilterNome}
                  onChange={(e) => setPromptsFilterNome(e.target.value)}
                  placeholder="Buscar nos selecionados..."
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={promptsFilterCategoria} onValueChange={setPromptsFilterCategoria}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grupo</Label>
                <Select value={promptsFilterGrupo} onValueChange={setPromptsFilterGrupo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPromptsFilterNome("");
                    setPromptsFilterCategoria("all");
                    setPromptsFilterGrupo("all");
                  }}
                >
                  <X className="h-3 w-3 mr-1" /> Limpar filtros
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedProdutos.length} produto(s) selecionado(s) — {promptsFilteredProdutos.length} visível(is) — todos serão gerados
            </div>

            <div className="border rounded-md p-3 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Aplicar texto extra em lote</Label>
                <Button variant="outline" size="sm" onClick={() => setShowTemplatesDialog(true)}>
                  <Save className="h-3 w-3 mr-1" /> Templates
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={bulkExtra}
                  onChange={(e) => setBulkExtra(e.target.value)}
                  placeholder="Ex.: foto profissional de {nome}, fundo branco, vista frontal..."
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkExtra((v) => `${v}{nome}`)}
                  title="Inserir variável do nome do produto"
                >
                  + {"{nome}"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Use <code className="px-1 rounded bg-muted">{"{nome}"}</code> dentro do texto para inserir o nome do produto. Sem essa variável, o nome do produto NÃO será enviado para a IA — apenas o texto que você escrever.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIaExtras((prev) => {
                      const next = { ...prev };
                      promptsFilteredProdutos.forEach((p) => { next[p.id] = bulkExtra; });
                      return next;
                    });
                    toast.success(`Texto aplicado em ${promptsFilteredProdutos.length} produto(s)`);
                  }}
                  disabled={!bulkExtra.trim()}
                >
                  Aplicar aos filtrados
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIaExtras((prev) => {
                      const next = { ...prev };
                      promptsFilteredProdutos.forEach((p) => { delete next[p.id]; });
                      return next;
                    });
                  }}
                >
                  Limpar
                </Button>
              </div>
              {templates.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-xs text-muted-foreground self-center mr-1">Rápido:</span>
                  {templates.map((t) => (
                    <Badge
                      key={t.id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                      onClick={() => setBulkExtra(t.texto)}
                      title={t.texto}
                    >
                      {t.nome}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                O filtro afeta apenas a visualização e a aplicação em lote. Todos os {selectedProdutos.length} produto(s) selecionados terão imagem gerada.
              </p>
            </div>


            <div className="border rounded-md divide-y max-h-[28rem] overflow-auto">
              {promptsFilteredProdutos.map((p) => (
                <div key={p.id} className="flex items-start gap-3 p-2">
                  <div className="w-10 h-10 rounded bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {p.foto_url ? (
                      <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.categoria?.nome || "Sem categoria"} • {p.grupo?.nome || "Sem grupo"}
                    </div>
                    <Input
                      className="h-8 text-xs mt-1"
                      placeholder="Texto extra para este produto (opcional)"
                      value={iaExtras[p.id] || ""}
                      onChange={(e) =>
                        setIaExtras((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                    />
                  </div>
                </div>
              ))}
              {promptsFilteredProdutos.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">Nenhum produto corresponde ao filtro</div>
              )}
            </div>

            <div className="flex justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPromptPreviewDialog(true)}>
                  <Eye className="h-4 w-4 mr-1" /> Preview do prompt
                </Button>
                <Button onClick={goToCostFromPrompts}>
                  <Sparkles className="h-4 w-4 mr-1" /> Gerar imagens
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revisar e aplicar</CardTitle>
            <CardDescription>
              {metodo === "ia"
                ? "Aprove ou regere as imagens geradas. Apenas as aprovadas serão aplicadas."
                : "Confirme a aplicação em massa nos produtos selecionados."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metodo !== "ia" && (
              <div className="grid gap-4 md:grid-cols-[200px_1fr] items-start">
                <div className="aspect-square rounded-md border overflow-hidden bg-muted">
                  {metodo === "upload" && uploadPreview && (
                    <img src={uploadPreview} className="w-full h-full object-cover" alt="preview" />
                  )}
                  {metodo === "existente" && (
                    <img src={produtos.find((p) => p.id === sourceProdutoId)?.foto_url || ""} className="w-full h-full object-cover" alt="origem" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">{selectedProdutos.length} produtos serão atualizados:</p>
                  <div className="max-h-72 overflow-auto text-sm border rounded-md p-2">
                    {selectedProdutos.map((p) => (
                      <div key={p.id} className="py-1">• {p.nome}</div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {removerSecundarias
                      ? "As imagens secundárias existentes serão removidas."
                      : "As imagens secundárias existentes serão preservadas."}
                  </p>
                </div>
              </div>
            )}

            {metodo === "ia" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setIaItems((prev) =>
                        prev.map((i) => (i.status === "ready" && i.imageDataUrl ? { ...i, status: "approved" } : i))
                      )
                    }
                  >
                    <Check className="h-3 w-3 mr-1" /> Aprovar todas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setIaItems((prev) =>
                        prev.map((i) => (i.status === "approved" ? { ...i, status: "ready" } : i))
                      )
                    }
                  >
                    <X className="h-3 w-3 mr-1" /> Desaprovar todas
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    {!paused ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { pausedRef.current = true; setPaused(true); toast.info("Fila pausada após a geração atual"); }}
                        disabled={iaItems.every((i) => i.status !== "pending" && i.status !== "generating")}
                      >
                        <Pause className="h-3 w-3 mr-1" /> Pausar fila
                      </Button>
                    ) : (
                      <Button size="sm" variant="default" onClick={resumeQueue}>
                        <Play className="h-3 w-3 mr-1" /> Retomar
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {iaItems.filter((i) => i.status === "ready" || i.status === "approved").length}/{iaItems.length} prontas
                    </span>
                  </div>
                </div>
                {(() => {
                  const total = iaItems.length;
                  const done = iaItems.filter((i) => i.status === "ready" || i.status === "approved" || i.status === "error").length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const isRunning = genStartedAt !== null && done < total;
                  const elapsed = genStartedAt ? Math.max(1, (nowTick - genStartedAt) / 1000) : 0;
                  const avg = done > 0 && genStartedAt ? elapsed / done : 0;
                  const remaining = total - done;
                  const etaSec = avg > 0 ? Math.round(avg * remaining) : 0;
                  const fmt = (s: number) => {
                    if (s <= 0) return "—";
                    const m = Math.floor(s / 60);
                    const r = s % 60;
                    return m > 0 ? `${m}m ${r}s` : `${r}s`;
                  };
                  if (total === 0) return null;
                  return (
                    <div className="space-y-1">
                      <Progress value={pct} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{done}/{total} concluídas ({pct}%)</span>
                        <span>
                          {isRunning
                            ? `Tempo restante estimado: ${fmt(etaSec)} • decorrido ${fmt(Math.round(elapsed))}`
                            : paused
                              ? "Pausado"
                              : done === total
                                ? `Concluído em ${fmt(Math.round(elapsed))}`
                                : "Aguardando..."}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {iaItems.map((item) => (
                  <div key={item.produtoId} className={`border rounded-md p-3 space-y-2 ${item.status === "approved" ? "border-primary bg-primary/5" : ""}`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase text-muted-foreground text-center">Atual</div>
                        <div className="aspect-square rounded bg-muted overflow-hidden flex items-center justify-center">
                          {item.currentPhotoUrl ? (
                            <img src={item.currentPhotoUrl} className="w-full h-full object-cover" alt="atual" />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase text-muted-foreground text-center">Nova</div>
                        <div className="aspect-square rounded bg-muted overflow-hidden flex items-center justify-center">
                          {item.status === "generating" && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                          {(item.status === "ready" || item.status === "approved") && item.imageDataUrl && (
                            <img src={item.imageDataUrl} className="w-full h-full object-cover" alt={item.nome} />
                          )}
                          {item.status === "error" && <div className="text-[10px] text-destructive p-1 text-center">{item.error}</div>}
                          {item.status === "pending" && <ImageIcon className="h-6 w-6 text-muted-foreground/40" />}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium truncate">{item.nome}</div>
                    <Input
                      value={item.prompt}
                      onChange={(e) =>
                        setIaItems((prev) => prev.map((i) => (i.produtoId === item.produtoId ? { ...i, prompt: e.target.value } : i)))
                      }
                      className="h-8 text-xs"
                      placeholder="Ajustar prompt..."
                    />

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={item.status === "generating"}
                        onClick={() => generateIaImage(item.produtoId, item.prompt)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Regerar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={item.status !== "ready" && item.status !== "approved"}
                        variant={item.status === "approved" ? "default" : "secondary"}
                        onClick={() =>
                          setIaItems((prev) =>
                            prev.map((i) =>
                              i.produtoId === item.produtoId
                                ? { ...i, status: i.status === "approved" ? "ready" : "approved" }
                                : i
                            )
                          )
                        }
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {item.status === "approved" ? "Aprovado" : "Aprovar"}
                      </Button>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}

            <div className="flex justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setStep(2)} disabled={processing}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button
                onClick={executarLote}
                disabled={
                  processing ||
                  (metodo === "ia" && iaItems.filter((i) => i.status === "approved").length === 0)
                }
              >
                {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Aplicando...</> : <><Wand2 className="h-4 w-4 mr-1" /> Aplicar em massa</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showCostDialog} onOpenChange={setShowCostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar geração por IA</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Serão geradas <strong>{selectedIds.size}</strong> imagens com o modelo{" "}
                  <strong>{iaModel.split("/").pop()}</strong>.
                </p>
                <p>
                  Custo estimado: <strong>~{estimatedCost.toFixed(2)} créditos</strong>{" "}
                  <span className="text-muted-foreground">
                    (aprox. {(COST_PER_IMAGE[iaModel] ?? 0.05).toFixed(2)} por imagem)
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Valor aproximado — o custo real pode variar conforme o provedor. Regerar imagens consome créditos adicionais.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { setShowCostDialog(false); setShowPromptPreviewDialog(true); }}>
              <Eye className="h-4 w-4 mr-1" /> Ver prompts
            </Button>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={startIaGeneration}>Confirmar e gerar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar imagens secundárias?</AlertDialogTitle>
            <AlertDialogDescription>
              A opção "Apagar imagens secundárias existentes ao aplicar" está ativada.
              Todas as imagens secundárias dos produtos selecionados serão removidas antes de aplicar a nova imagem principal.
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirmDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteConfirmDialog(false);
                doExecutarLote();
              }}
            >
              Confirmar e aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview do prompt final */}
      <Dialog open={showPromptPreviewDialog} onOpenChange={setShowPromptPreviewDialog}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Preview do prompt final</DialogTitle>
            <DialogDescription>
              Texto extra do produto (use <code className="px-1 rounded bg-muted">{"{nome}"}</code> para inserir o nome){useVisualIdentity && hasVisualIdentity ? " + identidade visual" : ""}.
              {selectedProdutos.length > 50 && (
                <span className="block mt-1 text-xs">
                  Exibindo os primeiros 50 de {selectedProdutos.length} produtos selecionados.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto space-y-2 text-sm pr-1">
            {selectedProdutos.slice(0, 50).map((p) => {
              const base = buildPromptFor(p);
              const final = useVisualIdentity && hasVisualIdentity
                ? `${base}\n\n[Identidade Visual]: ${visualIdentityPrompt}`
                : base;
              return (
                <div key={p.id} className="border rounded-md p-2 min-w-0">
                  <div className="text-xs font-medium text-muted-foreground break-words">{p.nome}</div>
                  <pre className="text-xs whitespace-pre-wrap break-words mt-1 font-mono max-w-full">{final}</pre>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromptPreviewDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates de textos extras */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-md w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Templates de textos extras</DialogTitle>
            <DialogDescription>
              Salve frases reutilizáveis e aplique rapidamente na geração em lote.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto space-y-3 pr-1">
            <div className="space-y-2 border rounded-md p-3 bg-muted/30">
              <Label className="text-xs">Salvar texto atual como template</Label>
              <Input
                value={newTemplateNome}
                onChange={(e) => setNewTemplateNome(e.target.value)}
                placeholder="Nome do template (ex.: Fundo branco)"
              />
              <div className="text-xs text-muted-foreground break-words line-clamp-2">
                Texto: <em>{bulkExtra || "(vazio — preencha o campo de texto extra antes)"}</em>
              </div>
              <Button size="sm" onClick={saveBulkAsTemplate} disabled={!bulkExtra.trim() || !newTemplateNome.trim()}>
                <Save className="h-3 w-3 mr-1" /> Salvar template
              </Button>
            </div>
            <div className="space-y-1">
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum template salvo ainda.</p>
              )}
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-2 border rounded-md p-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.texto}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setBulkExtra(t.texto); toast.success("Carregado"); }}>
                    Usar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeTemplate(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplatesDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
