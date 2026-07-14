import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast-config";
import { Plus, Trash2, Type, Image as ImageIcon, Barcode, QrCode, Printer, Save, Copy } from "lucide-react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

interface Props {
  estabelecimentoId: string;
}

interface LayoutPreset {
  id: string;
  nome: string;
  largura_mm: number;
  altura_mm: number;
  colunas: number;
  gap_mm: number;
}

const LAYOUTS: LayoutPreset[] = [
  { id: "100x30x1", nome: "100 x 30 mm (1 coluna)", largura_mm: 100, altura_mm: 30, colunas: 1, gap_mm: 2 },
  { id: "50x30x2",  nome: "50 x 30 mm (2 colunas)", largura_mm: 50,  altura_mm: 30, colunas: 2, gap_mm: 2 },
  { id: "100x25x1", nome: "100 x 25 mm (1 coluna)", largura_mm: 100, altura_mm: 25, colunas: 1, gap_mm: 2 },
  { id: "100x50x1", nome: "100 x 50 mm (1 coluna)", largura_mm: 100, altura_mm: 50, colunas: 1, gap_mm: 2 },
];

type ElementType = "text" | "image" | "barcode_ean13" | "barcode_ean14" | "qrcode";

interface EtiquetaElement {
  id: string;
  type: ElementType;
  x: number; // mm
  y: number; // mm
  w: number; // mm
  h: number; // mm
  content: string; // texto com {{variavel}} OU url da imagem OU campo da variável do código
  fontSize?: number; // pt
  bold?: boolean;
  align?: "left" | "center" | "right";
}

interface Template {
  layoutId: string;
  elements: EtiquetaElement[];
}

// Variáveis disponíveis do produto
const PRODUCT_VARS: { key: string; label: string }[] = [
  { key: "nome", label: "Nome" },
  { key: "codigo", label: "Código / SKU" },
  { key: "descricao", label: "Descrição" },
  { key: "preco_tabela", label: "Preço" },
  { key: "preco_minimo", label: "Preço Mínimo" },
  { key: "ean_13", label: "EAN 13" },
  { key: "ean_14_1", label: "EAN 14 (1)" },
  { key: "ean_14_2", label: "EAN 14 (2)" },
  { key: "gtin", label: "GTIN" },
  { key: "marca", label: "Marca" },
  { key: "cor", label: "Cor" },
  { key: "tamanho", label: "Tamanho" },
  { key: "material", label: "Material" },
  { key: "ncm", label: "NCM" },
  { key: "peso_unitario", label: "Peso" },
  { key: "estoque", label: "Estoque" },
];

const MM_TO_PX = 3.78; // preview scale (aprox 96dpi)

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function interpolate(text: string, product: any): string {
  return (text || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = product?.[key];
    if (v === null || v === undefined) return "";
    if (typeof v === "number" && (key === "preco_tabela" || key === "preco_minimo"))
      return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return String(v);
  });
}

async function renderBarcodeDataURL(value: string, format: "EAN13" | "ITF14"): Promise<string> {
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, value, {
      format,
      width: 2,
      height: 60,
      displayValue: true,
      margin: 0,
      fontSize: 14,
    });
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

async function renderQRDataURL(value: string): Promise<string> {
  try {
    return await QRCode.toDataURL(value || " ", { margin: 0, width: 200 });
  } catch {
    return "";
  }
}

export function EtiquetasZebra({ estabelecimentoId }: Props) {
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


  const layout = LAYOUTS.find(l => l.id === layoutId)!;
  const storageKey = `zebra_template_${estabelecimentoId}_${layoutId}`;

  // Carregar produtos
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
  }, [estabelecimentoId]);

  // Carregar template salvo do layout atual
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const t: Template = JSON.parse(saved);
        setElements(t.elements || []);
      } catch { setElements([]); }
    } else {
      // Template padrão inicial
      setElements(defaultTemplate(layout));
    }
    setSelectedId(null);
  }, [layoutId]);

  const selected = elements.find(e => e.id === selectedId) || null;

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

  function saveTemplate() {
    localStorage.setItem(storageKey, JSON.stringify({ layoutId, elements }));
    toast.success("Template salvo!");
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
    if (selectedProductIds.length === 0) {
      toast.error("Selecione ao menos um produto");
      return;
    }
    const chosen = products.filter(p => selectedProductIds.includes(p.id));
    // Gerar lista repetindo pela quantidade
    const items: any[] = [];
    chosen.forEach(p => {
      for (let i = 0; i < qtyPerProduct; i++) items.push(p);
    });

    // Pré-renderizar dataURLs dos códigos por elemento e produto
    const html = await buildPrintHTML(layout, elements, items);
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { toast.error("Bloqueado pelo navegador"); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  }

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
            <Button size="sm" variant="outline" onClick={saveTemplate} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> Salvar template
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Imprimir ({selectedProductIds.length * qtyPerProduct})
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[300px_minmax(0,1fr)_340px] gap-4">
        {/* COLUNA ESQUERDA — Produtos & Layout */}
        <div className="space-y-4 order-2 md:order-1">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Layout da Etiqueta
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

        {/* COLUNA CENTRAL — Preview */}
        <div className="space-y-3 order-1 md:order-2 md:col-span-1">
          <div className="flex gap-1.5 flex-wrap p-2 rounded-lg border bg-card sticky top-0 z-10 shadow-sm">
            <span className="text-[11px] font-medium text-muted-foreground px-2 self-center">Adicionar:</span>
            <Button size="sm" variant="outline" onClick={() => addElement("text")} className="h-8"><Type className="h-3.5 w-3.5 mr-1" />Texto</Button>
            <Button size="sm" variant="outline" onClick={() => addElement("image")} className="h-8"><ImageIcon className="h-3.5 w-3.5 mr-1" />Imagem</Button>
            <Button size="sm" variant="outline" onClick={() => addElement("barcode_ean13")} className="h-8"><Barcode className="h-3.5 w-3.5 mr-1" />EAN-13</Button>
            <Button size="sm" variant="outline" onClick={() => addElement("barcode_ean14")} className="h-8"><Barcode className="h-3.5 w-3.5 mr-1" />EAN-14</Button>
            <Button size="sm" variant="outline" onClick={() => addElement("qrcode")} className="h-8"><QrCode className="h-3.5 w-3.5 mr-1" />QR</Button>
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Pré-visualização</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {layout.largura_mm} × {layout.altura_mm} mm
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center p-3 sm:p-6 rounded-md overflow-auto bg-[linear-gradient(135deg,hsl(var(--muted))_25%,transparent_25%,transparent_50%,hsl(var(--muted))_50%,hsl(var(--muted))_75%,transparent_75%,transparent)] bg-[length:16px_16px] bg-muted/20">
                <div
                  className="relative bg-white border-2 border-dashed border-primary/40 shadow-md shrink-0 rounded-sm"
                  style={{
                    width: layout.largura_mm * MM_TO_PX * 2,
                    height: layout.altura_mm * MM_TO_PX * 2,
                  }}
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) setSelectedId(null);
                  }}
                >
                  {elements.map(el => (
                    <PreviewElement
                      key={el.id}
                      el={el}
                      selected={el.id === selectedId}
                      scale={MM_TO_PX * 2}
                      onSelect={() => setSelectedId(el.id)}
                      onMove={(x, y) => setElements(prev => prev.map(e => e.id === el.id ? { ...e, x, y } : e))}
                      sample={products[0]}
                    />
                  ))}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground mt-2 text-center">
                Arraste os elementos para posicionar. Amostra usa o 1º produto do catálogo.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA — Propriedades */}
        <div className="order-3 md:col-span-2 lg:col-span-1">
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

// ---------- Componentes/utilitários internos ----------

function labelForType(t: ElementType): string {
  return t === "text" ? "Texto" : t === "image" ? "Imagem" : t === "barcode_ean13" ? "EAN-13" : t === "barcode_ean14" ? "EAN-14" : "QR Code";
}

function defaultTemplate(layout: LayoutPreset): EtiquetaElement[] {
  return [
    { id: uid(), type: "text", x: 2, y: 1.5, w: layout.largura_mm - 4, h: 4, content: "{{nome}}", fontSize: 9, bold: true, align: "left" },
    { id: uid(), type: "text", x: 2, y: 6, w: layout.largura_mm - 4, h: 3.5, content: "Cód: {{codigo}}", fontSize: 7, align: "left" },
    { id: uid(), type: "barcode_ean13", x: 2, y: layout.altura_mm - 15, w: Math.min(50, layout.largura_mm - 4), h: 12, content: "{{ean_13}}" },
  ];
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

async function buildPrintHTML(layout: LayoutPreset, elements: EtiquetaElement[], items: any[]): Promise<string> {
  // Página = largura total (colunas + gaps), altura de UMA etiqueta
  const pageWidth = layout.largura_mm * layout.colunas + layout.gap_mm * (layout.colunas - 1);
  const pageHeight = layout.altura_mm;

  // Distribuir itens em "páginas" (linhas de N colunas). Cada página é impressa como uma etiqueta na Zebra.
  const pages: any[][] = [];
  for (let i = 0; i < items.length; i += layout.colunas) {
    pages.push(items.slice(i, i + layout.colunas));
  }

  // Pré-renderizar códigos para cada célula
  const renderCell = async (product: any) => {
    const parts: string[] = [];
    for (const el of elements) {
      const value = interpolate(el.content, product || {});
      let inner = "";
      if (el.type === "text") {
        inner = `<div style="width:100%;height:100%;font-size:${el.fontSize || 8}pt;font-weight:${el.bold ? 700 : 400};text-align:${el.align || "left"};line-height:1.05;overflow:hidden;">${escapeHtml(value)}</div>`;
      } else if (el.type === "image") {
        inner = value ? `<img src="${value}" style="width:100%;height:100%;object-fit:contain;"/>` : "";
      } else if (el.type === "barcode_ean13") {
        const d = await renderBarcodeDataURL(value.replace(/\D/g, "").slice(0, 13) || "0000000000000", "EAN13");
        inner = `<img src="${d}" style="width:100%;height:100%;object-fit:contain;"/>`;
      } else if (el.type === "barcode_ean14") {
        const d = await renderBarcodeDataURL(value.replace(/\D/g, "").slice(0, 14) || "00000000000000", "ITF14");
        inner = `<img src="${d}" style="width:100%;height:100%;object-fit:contain;"/>`;
      } else if (el.type === "qrcode") {
        const d = await renderQRDataURL(value || " ");
        inner = `<img src="${d}" style="width:100%;height:100%;object-fit:contain;"/>`;
      }
      parts.push(`<div style="position:absolute;left:${el.x}mm;top:${el.y}mm;width:${el.w}mm;height:${el.h}mm;overflow:hidden;">${inner}</div>`);
    }
    return `<div style="position:relative;width:${layout.largura_mm}mm;height:${layout.altura_mm}mm;box-sizing:border-box;">${parts.join("")}</div>`;
  };

  const pageHTMLs: string[] = [];
  for (const page of pages) {
    const cells: string[] = [];
    for (const prod of page) cells.push(await renderCell(prod));
    pageHTMLs.push(`<div class="page" style="display:flex;gap:${layout.gap_mm}mm;width:${pageWidth}mm;height:${pageHeight}mm;">${cells.join("")}</div>`);
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiquetas Zebra</title>
<style>
  @page { size: ${pageWidth}mm ${pageHeight}mm; margin: 0; }
  html,body { margin:0; padding:0; }
  body { font-family: Arial, sans-serif; }
  .page { page-break-after: always; overflow: hidden; }
  .page:last-child { page-break-after: auto; }
</style></head><body>${pageHTMLs.join("")}</body></html>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export default EtiquetasZebra;
