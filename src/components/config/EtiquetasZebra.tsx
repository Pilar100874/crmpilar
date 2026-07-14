import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast-config";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Trash2, Type, Image as ImageIcon, Barcode, QrCode, Printer, Save, Copy, Star, FilePlus2 } from "lucide-react";
import {
  LAYOUTS,
  PRODUCT_VARS,
  type LayoutPreset,
  type ElementType,
  type EtiquetaElement,
  type SavedTemplate,
  type TemplateDefaults,
  uid,
  loadTemplates,
  saveTemplates,
  loadDefaults,
  saveDefaults,
  defaultTemplate,
  interpolate,
  renderBarcodeDataURL,
  renderQRDataURL,
  buildPrintHTML,
} from "@/lib/zebraTemplates";

interface Props {
  estabelecimentoId: string;
}

const MM_TO_PX = 3.78;

export function EtiquetasZebra({ estabelecimentoId }: Props) {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [defaults, setDefaults] = useState<TemplateDefaults>({});
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [layoutId, setLayoutId] = useState<string>(LAYOUTS[0].id);
  const [elements, setElements] = useState<EtiquetaElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [qtyPerProduct, setQtyPerProduct] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [previewScale, setPreviewScale] = useState(MM_TO_PX * 2);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const layout = LAYOUTS.find(l => l.id === layoutId)!;

  // Carregar produtos + templates
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("produtos")
        .select("id,nome,codigo,descricao,preco_tabela,preco_minimo,ean_13,ean_14_1,ean_14_2,gtin,marca,cor,tamanho,material,ncm,peso_unitario,estoque,foto_url")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativo", true)
        .order("nome")
        .limit(500);
      setProducts(data || []);
    })();

    const tpls = loadTemplates(estabelecimentoId);
    setTemplates(tpls);
    setDefaults(loadDefaults(estabelecimentoId));

    if (tpls.length > 0) {
      const first = tpls[0];
      setCurrentTemplateId(first.id);
      setNome(first.nome);
      setLayoutId(first.layoutId);
      setElements(first.elements);
    } else {
      // Novo em branco
      setCurrentTemplateId(null);
      setNome("Novo template");
      setLayoutId(LAYOUTS[0].id);
      setElements(defaultTemplate(LAYOUTS[0]));
    }
  }, [estabelecimentoId]);

  // Escala responsiva
  useEffect(() => {
    function update() {
      const wrapper = previewRef.current;
      if (!wrapper) return;
      const totalW = layout.largura_mm * layout.colunas + layout.gap_mm * (layout.colunas - 1);
      const desired = totalW * MM_TO_PX * 2;
      const max = wrapper.clientWidth - 24;
      const s = desired <= max ? MM_TO_PX * 2 : Math.max(2, max / totalW);
      setPreviewScale(s);
    }
    update();
    const ro = new ResizeObserver(update);
    if (previewRef.current) ro.observe(previewRef.current);
    return () => ro.disconnect();
  }, [layoutId, layout.largura_mm, layout.colunas, layout.gap_mm]);

  const selected = elements.find(e => e.id === selectedId) || null;

  function newTemplate() {
    setCurrentTemplateId(null);
    setNome("Novo template");
    setLayoutId(LAYOUTS[0].id);
    setElements(defaultTemplate(LAYOUTS[0]));
    setSelectedId(null);
  }

  function loadTemplate(id: string) {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    setCurrentTemplateId(t.id);
    setNome(t.nome);
    setLayoutId(t.layoutId);
    setElements(t.elements);
    setSelectedId(null);
  }

  function saveCurrent() {
    if (!nome.trim()) { toast.error("Informe um nome para o template"); return; }
    const now = Date.now();
    let list = [...templates];
    let id = currentTemplateId;
    if (id && list.find(t => t.id === id)) {
      list = list.map(t => t.id === id ? { ...t, nome, layoutId, elements, updatedAt: now } : t);
    } else {
      id = uid();
      list.push({ id, nome, layoutId, elements, updatedAt: now });
    }
    saveTemplates(estabelecimentoId, list);
    setTemplates(list);
    setCurrentTemplateId(id);
    toast.success("Template salvo!");
  }

  function confirmDelete() {
    if (!currentTemplateId) return;
    const list = templates.filter(t => t.id !== currentTemplateId);
    saveTemplates(estabelecimentoId, list);
    const newDefs: TemplateDefaults = { ...defaults };
    if (newDefs.ean13 === currentTemplateId) delete newDefs.ean13;
    if (newDefs.ean14 === currentTemplateId) delete newDefs.ean14;
    saveDefaults(estabelecimentoId, newDefs);
    setDefaults(newDefs);
    setTemplates(list);
    if (list[0]) loadTemplate(list[0].id);
    else newTemplate();
    setDeleteOpen(false);
    toast.success("Template excluído");
  }

  function toggleDefault(kind: "ean13" | "ean14") {
    if (!currentTemplateId) { toast.error("Salve o template antes de marcar como padrão"); return; }
    const newDefs = { ...defaults };
    if (newDefs[kind] === currentTemplateId) delete newDefs[kind];
    else newDefs[kind] = currentTemplateId;
    saveDefaults(estabelecimentoId, newDefs);
    setDefaults(newDefs);
    toast.success(`Padrão para ${kind.toUpperCase()} atualizado`);
  }

  function addElement(type: ElementType) {
    const base: EtiquetaElement = {
      id: uid(),
      type,
      x: 2,
      y: 2,
      w: type === "qrcode" ? 15 : type.startsWith("barcode") ? 40 : 30,
      h: type === "qrcode" ? 15 : type.startsWith("barcode") ? 12 : 5,
      content:
        type === "text" ? "{{nome}}" :
        type === "image" ? "{{foto_url}}" :
        type === "barcode_ean13" ? "{{ean_13}}" :
        type === "barcode_ean14" ? "{{ean_14_1}}" :
        "{{codigo}}",
      fontSize: 8,
      bold: false,
      align: "left",
    };
    setElements(prev => [...prev, base]);
    setSelectedId(base.id);
  }

  function updateSelected(patch: Partial<EtiquetaElement>) {
    if (!selectedId) return;
    setElements(prev => prev.map(e => e.id === selectedId ? { ...e, ...patch } : e));
  }

  function removeSelected() {
    if (!selectedId) return;
    setElements(prev => prev.filter(e => e.id !== selectedId));
    setSelectedId(null);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !selected || selected.type !== "image") return;
    const reader = new FileReader();
    reader.onload = () => updateSelected({ content: String(reader.result || "") });
    reader.readAsDataURL(f);
  }

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      (p.nome || "").toLowerCase().includes(q) ||
      (p.codigo || "").toLowerCase().includes(q) ||
      (p.ean_13 || "").includes(q)
    );
  }, [products, search]);

  async function handlePrint() {
    if (selectedProductIds.length === 0) { toast.error("Selecione ao menos um produto"); return; }
    const chosen = products.filter(p => selectedProductIds.includes(p.id));
    const items: any[] = [];
    chosen.forEach(p => { for (let i = 0; i < qtyPerProduct; i++) items.push(p); });
    const html = await buildPrintHTML(layout, elements, items);
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { toast.error("Bloqueado pelo navegador"); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  }

  const isDefaultEan13 = currentTemplateId && defaults.ean13 === currentTemplateId;
  const isDefaultEan14 = currentTemplateId && defaults.ean14 === currentTemplateId;

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold leading-tight">Impressão de Etiquetas Zebra</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Modelo TLP 2844 · {layout.nome}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={newTemplate} className="gap-1.5">
              <FilePlus2 className="h-3.5 w-3.5" /> Novo
            </Button>
            <Button size="sm" variant="outline" onClick={saveCurrent} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> Salvar
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Imprimir ({selectedProductIds.length * qtyPerProduct * layout.colunas})
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[260px_280px_minmax(0,1fr)_300px] gap-4">
        {/* COLUNA 1 — Templates + Layout */}
        <div className="space-y-4 order-2 md:order-1">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} className="h-9" placeholder="Ex: Prateleira PDV" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Templates salvos</Label>
                <Select value={currentTemplateId || ""} onValueChange={loadTemplate}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="— não salvo —" /></SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 && <div className="text-xs text-muted-foreground p-2">Nenhum salvo</div>}
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                        {defaults.ean13 === t.id && " · ★13"}
                        {defaults.ean14 === t.id && " · ★14"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {currentTemplateId && (
                <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="w-full text-destructive h-8">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir template
                </Button>
              )}
              <div className="border-t pt-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Marcar como padrão para:</Label>
                <div className="flex gap-1.5">
                  <Button
                    type="button" size="sm"
                    variant={isDefaultEan13 ? "default" : "outline"}
                    className="flex-1 h-8 gap-1"
                    onClick={() => toggleDefault("ean13")}
                  >
                    <Star className={`h-3.5 w-3.5 ${isDefaultEan13 ? "fill-current" : ""}`} /> EAN-13
                  </Button>
                  <Button
                    type="button" size="sm"
                    variant={isDefaultEan14 ? "default" : "outline"}
                    className="flex-1 h-8 gap-1"
                    onClick={() => toggleDefault("ean14")}
                  >
                    <Star className={`h-3.5 w-3.5 ${isDefaultEan14 ? "fill-current" : ""}`} /> EAN-14
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  O template padrão é usado ao imprimir direto do cadastro do produto.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select value={layoutId} onValueChange={setLayoutId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LAYOUTS.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                Zebra TLP 2844 (203dpi). Ajuste o tamanho de papel na caixa de impressão.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA 2 — Produtos */}
        <div className="space-y-4 order-3 md:order-2">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Produtos
                </span>
                {selectedProductIds.length > 0 && (
                  <span className="text-[10px] font-normal rounded-full bg-primary/15 text-primary px-2 py-0.5">
                    {selectedProductIds.length} selecionado(s)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Buscar produto, código, EAN..." value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
              <div className="max-h-56 lg:max-h-72 overflow-auto border rounded-md p-1 space-y-0.5 bg-muted/20">
                {filteredProducts.map(p => {
                  const checked = selectedProductIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer transition-colors ${
                        checked ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => setSelectedProductIds(prev =>
                          e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                        )}
                        className="accent-primary"
                      />
                      <span className="truncate flex-1">{p.nome}</span>
                      {p.codigo && <span className="text-[10px] text-muted-foreground shrink-0">{p.codigo}</span>}
                    </label>
                  );
                })}
                {filteredProducts.length === 0 && <div className="text-xs text-muted-foreground p-3 text-center">Nenhum produto</div>}
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <Label className="text-xs">Qtd por produto</Label>
                <Input
                  type="number"
                  min={1}
                  value={qtyPerProduct}
                  onChange={e => setQtyPerProduct(Math.max(1, +e.target.value || 1))}
                  className="w-20 h-8"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA 3 — Preview */}
        <div className="space-y-3 order-1 md:order-3 md:col-span-2 xl:col-span-1">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Pré-visualização</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {layout.largura_mm} × {layout.altura_mm} mm
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-1.5 flex-wrap p-2 rounded-lg border bg-muted/20">
                <span className="text-[11px] font-medium text-muted-foreground px-2 self-center">Adicionar:</span>
                <Button size="sm" variant="outline" onClick={() => addElement("text")} className="h-8"><Type className="h-3.5 w-3.5 mr-1" />Texto</Button>
                <Button size="sm" variant="outline" onClick={() => addElement("image")} className="h-8"><ImageIcon className="h-3.5 w-3.5 mr-1" />Imagem</Button>
                <Button size="sm" variant="outline" onClick={() => addElement("barcode_ean13")} className="h-8"><Barcode className="h-3.5 w-3.5 mr-1" />EAN-13</Button>
                <Button size="sm" variant="outline" onClick={() => addElement("barcode_ean14")} className="h-8"><Barcode className="h-3.5 w-3.5 mr-1" />EAN-14</Button>
                <Button size="sm" variant="outline" onClick={() => addElement("qrcode")} className="h-8"><QrCode className="h-3.5 w-3.5 mr-1" />QR</Button>
              </div>
              <div
                ref={previewRef}
                className="flex justify-center p-3 sm:p-6 rounded-md overflow-hidden bg-[linear-gradient(135deg,hsl(var(--muted))_25%,transparent_25%,transparent_50%,hsl(var(--muted))_50%,hsl(var(--muted))_75%,transparent_75%,transparent)] bg-[length:16px_16px] bg-muted/20"
              >
                <div
                  className="flex items-start"
                  style={{ gap: layout.gap_mm * previewScale }}
                >
                  {Array.from({ length: layout.colunas }).map((_, col) => (
                    <div
                      key={col}
                      className="relative bg-white border-2 border-dashed border-primary/40 shadow-md shrink-0 rounded-sm"
                      style={{
                        width: layout.largura_mm * previewScale,
                        height: layout.altura_mm * previewScale,
                      }}
                      onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setSelectedId(null);
                      }}
                    >
                      {elements.map(el => (
                        <PreviewElement
                          key={`${col}-${el.id}`}
                          el={el}
                          selected={el.id === selectedId}
                          scale={previewScale}
                          onSelect={() => setSelectedId(el.id)}
                          onMove={(x, y) => setElements(prev => prev.map(e => e.id === el.id ? { ...e, x, y } : e))}
                          sample={products[0]}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground text-center">
                Arraste os elementos para posicionar. Amostra usa o 1º produto do catálogo.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA 4 — Propriedades */}
        <div className="order-4 md:order-4">
          <Card className="border-border/60 shadow-sm lg:sticky lg:top-2">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-primary" : "bg-muted-foreground/40"}`} />
                {selected ? `Propriedades — ${labelForType(selected.type)}` : "Selecione um elemento"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selected && (
                <div className="text-xs text-muted-foreground border border-dashed rounded-md p-4 text-center">
                  Adicione elementos usando a barra de ferramentas acima e clique para editar.
                </div>
              )}
              {selected && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">X (mm)</Label>
                      <Input type="number" step="0.5" value={selected.x} onChange={e => updateSelected({ x: +e.target.value })} className="h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Y (mm)</Label>
                      <Input type="number" step="0.5" value={selected.y} onChange={e => updateSelected({ y: +e.target.value })} className="h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Largura (mm)</Label>
                      <Input type="number" step="0.5" value={selected.w} onChange={e => updateSelected({ w: +e.target.value })} className="h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Altura (mm)</Label>
                      <Input type="number" step="0.5" value={selected.h} onChange={e => updateSelected({ h: +e.target.value })} className="h-8" />
                    </div>
                  </div>

                  {selected.type === "text" && (
                    <>
                      <div>
                        <Label className="text-xs">Conteúdo (use variáveis)</Label>
                        <Textarea rows={3} value={selected.content} onChange={e => updateSelected({ content: e.target.value })} className="text-xs font-mono" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Tam. (pt)</Label>
                          <Input type="number" value={selected.fontSize || 8} onChange={e => updateSelected({ fontSize: +e.target.value })} className="h-8" />
                        </div>
                        <div>
                          <Label className="text-xs">Alinhar</Label>
                          <Select value={selected.align || "left"} onValueChange={(v: any) => updateSelected({ align: v })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Esquerda</SelectItem>
                              <SelectItem value="center">Centro</SelectItem>
                              <SelectItem value="right">Direita</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Negrito</Label>
                          <Button variant={selected.bold ? "default" : "outline"} size="sm" className="w-full h-8" onClick={() => updateSelected({ bold: !selected.bold })}>
                            {selected.bold ? "B" : "b"}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Inserir variável</Label>
                        <div className="flex flex-wrap gap-1 max-h-36 overflow-auto border rounded-md p-2 bg-muted/20">
                          {PRODUCT_VARS.map(v => (
                            <Button key={v.key} type="button" size="sm" variant="secondary" className="h-6 text-[10px] px-2"
                              onClick={() => updateSelected({ content: (selected.content || "") + `{{${v.key}}}` })}>
                              <Copy className="h-2.5 w-2.5 mr-1" />{v.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {selected.type === "image" && (
                    <>
                      <div>
                        <Label className="text-xs">URL ou variável (ex: {`{{foto_url}}`})</Label>
                        <Input value={selected.content} onChange={e => updateSelected({ content: e.target.value })} className="h-8 text-xs font-mono" />
                      </div>
                      <div>
                        <Label className="text-xs">Ou fazer upload</Label>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="text-xs w-full" />
                      </div>
                    </>
                  )}

                  {(selected.type === "barcode_ean13" || selected.type === "barcode_ean14" || selected.type === "qrcode") && (
                    <div>
                      <Label className="text-xs">Valor / Variável</Label>
                      <Input value={selected.content} onChange={e => updateSelected({ content: e.target.value })} className="h-8 text-xs font-mono" />
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {selected.type === "barcode_ean13" && "EAN-13: 12 ou 13 dígitos"}
                        {selected.type === "barcode_ean14" && "EAN-14 / ITF-14: 13 ou 14 dígitos"}
                        {selected.type === "qrcode" && "Qualquer texto ou URL"}
                      </div>
                    </div>
                  )}

                  <Button variant="destructive" size="sm" className="w-full" onClick={removeSelected}>
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover elemento
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function labelForType(t: ElementType): string {
  return t === "text" ? "Texto" : t === "image" ? "Imagem" : t === "barcode_ean13" ? "EAN-13" : t === "barcode_ean14" ? "EAN-14" : "QR Code";
}

function PreviewElement({
  el, selected, scale, onSelect, onMove, sample,
}: {
  el: EtiquetaElement; selected: boolean; scale: number;
  onSelect: () => void; onMove: (x: number, y: number) => void; sample: any;
}) {
  const [dataURL, setDataURL] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const value = interpolate(el.content, sample || {});
    if (el.type === "barcode_ean13") {
      renderBarcodeDataURL(value.replace(/\D/g, "").slice(0, 13) || "0000000000000", "EAN13").then(d => { if (!cancelled) setDataURL(d); });
    } else if (el.type === "barcode_ean14") {
      renderBarcodeDataURL(value.replace(/\D/g, "").slice(0, 14) || "00000000000000", "ITF14").then(d => { if (!cancelled) setDataURL(d); });
    } else if (el.type === "qrcode") {
      renderQRDataURL(value || " ").then(d => { if (!cancelled) setDataURL(d); });
    } else if (el.type === "image") {
      setDataURL(value);
    }
    return () => { cancelled = true; };
  }, [el.content, el.type, sample]);

  function startDrag(clientX: number, clientY: number, isTouch: boolean) {
    onSelect();
    const startX = clientX, startY = clientY, origX = el.x, origY = el.y;
    function move(ev: MouseEvent | TouchEvent) {
      const p = "touches" in ev ? ev.touches[0] : (ev as MouseEvent);
      if (!p) return;
      const dx = (p.clientX - startX) / scale;
      const dy = (p.clientY - startY) / scale;
      onMove(Math.max(0, origX + dx), Math.max(0, origY + dy));
      if ("touches" in ev) ev.preventDefault();
    }
    function up() {
      window.removeEventListener("mousemove", move as any);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move as any);
      window.removeEventListener("touchend", up);
    }
    if (isTouch) {
      window.addEventListener("touchmove", move as any, { passive: false });
      window.addEventListener("touchend", up);
    } else {
      window.addEventListener("mousemove", move as any);
      window.addEventListener("mouseup", up);
    }
  }

  const style: React.CSSProperties = {
    position: "absolute",
    left: el.x * scale,
    top: el.y * scale,
    width: el.w * scale,
    height: el.h * scale,
    outline: selected ? "2px solid hsl(var(--primary))" : "1px dashed hsl(var(--border))",
    cursor: "move",
    overflow: "hidden",
    fontSize: (el.fontSize || 8) * 1.2,
    fontWeight: el.bold ? 700 : 400,
    textAlign: el.align || "left",
    lineHeight: 1.05,
    background: "white",
    touchAction: "none",
  };

  return (
    <div
      style={style}
      onMouseDown={(e) => { e.stopPropagation(); startDrag(e.clientX, e.clientY, false); }}
      onTouchStart={(e) => { e.stopPropagation(); const t = e.touches[0]; if (t) startDrag(t.clientX, t.clientY, true); }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {el.type === "text" && <div className="w-full h-full">{interpolate(el.content, sample || {}) || <span className="text-muted-foreground/40">texto</span>}</div>}
      {(el.type === "image" || el.type === "barcode_ean13" || el.type === "barcode_ean14" || el.type === "qrcode") && (
        dataURL
          ? <img src={dataURL} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} draggable={false} />
          : <div className="text-[10px] text-muted-foreground w-full h-full flex items-center justify-center">{labelForType(el.type)}</div>
      )}
    </div>
  );
}

export default EtiquetasZebra;
