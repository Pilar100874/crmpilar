import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Upload, Image as ImageIcon, Wand2, Loader2,
  Check, RefreshCw, X, Trash2, Filter, Sparkles,
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
}

interface Props {
  estabelecimentoId: string;
}

export function AjusteImagemLote({ estabelecimentoId }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ---- dados base
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- filtros
  const [filterNome, setFilterNome] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterGrupo, setFilterGrupo] = useState<string>("all");
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

  // execução
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [pRes, cRes, gRes] = await Promise.all([
          supabase
            .from("produtos")
            .select("id, nome, codigo, foto_url, categoria_id, grupo_id, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)")
            .eq("estabelecimento_id", estabelecimentoId)
            .order("nome"),
          supabase.from("produto_categorias").select("id, nome").eq("estabelecimento_id", estabelecimentoId).order("nome"),
          supabase.from("produto_grupos").select("id, nome").eq("estabelecimento_id", estabelecimentoId).order("nome"),
        ]);
        setProdutos((pRes.data as any) || []);
        setCategorias(cRes.data || []);
        setGrupos(gRes.data || []);
      } catch (e: any) {
        toast.error("Erro ao carregar produtos");
      } finally {
        setLoading(false);
      }
    })();
  }, [estabelecimentoId]);

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      if (filterNome && !p.nome.toLowerCase().includes(filterNome.toLowerCase())) return false;
      if (filterCategoria !== "all" && p.categoria_id !== filterCategoria) return false;
      if (filterGrupo !== "all" && p.grupo_id !== filterGrupo) return false;
      return true;
    });
  }, [produtos, filterNome, filterCategoria, filterGrupo]);

  const selectedProdutos = useMemo(
    () => produtos.filter((p) => selectedIds.has(p.id)),
    [produtos, selectedIds]
  );

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
      // inicializa lista de revisão e dispara geração paralela controlada
      const items: IaItem[] = selectedProdutos.map((p) => ({
        produtoId: p.id,
        nome: p.nome,
        status: "pending",
        prompt: p.nome,
      }));
      setIaItems(items);
      setStep(3);
      // dispara geração inicial sequencial para evitar rate limit
      for (const it of items) {
        await generateIaImage(it.produtoId, it.prompt);
      }
      return;
    }
    setStep(3);
  };

  const generateIaImage = async (produtoId: string, promptText: string) => {
    setIaItems((prev) =>
      prev.map((i) => (i.produtoId === produtoId ? { ...i, status: "generating", error: undefined } : i))
    );
    try {
      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: { prompt: promptText, productName: promptText },
      });
      if (error) throw error;
      if (!data?.image) throw new Error(data?.error || "Falha ao gerar");
      setIaItems((prev) =>
        prev.map((i) =>
          i.produtoId === produtoId ? { ...i, status: "ready", imageDataUrl: data.image } : i
        )
      );
    } catch (e: any) {
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
          <div className={`px-3 py-1 rounded-full text-xs ${step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>3. Revisar e aplicar</div>
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
            <div className="grid gap-3 md:grid-cols-3">
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
                {metodo === "ia" ? "Gerar imagens" : "Continuar"} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
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
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {iaItems.map((item) => (
                  <div key={item.produtoId} className={`border rounded-md p-3 space-y-2 ${item.status === "approved" ? "border-primary bg-primary/5" : ""}`}>
                    <div className="aspect-square rounded bg-muted overflow-hidden flex items-center justify-center">
                      {item.status === "generating" && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                      {item.status === "ready" && item.imageDataUrl && <img src={item.imageDataUrl} className="w-full h-full object-cover" alt={item.nome} />}
                      {item.status === "approved" && item.imageDataUrl && <img src={item.imageDataUrl} className="w-full h-full object-cover" alt={item.nome} />}
                      {item.status === "error" && <div className="text-xs text-destructive p-2 text-center">{item.error}</div>}
                      {item.status === "pending" && <ImageIcon className="h-6 w-6 text-muted-foreground" />}
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
    </div>
  );
}
