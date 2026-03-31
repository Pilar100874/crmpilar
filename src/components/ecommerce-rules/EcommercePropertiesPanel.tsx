import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Search, Plus, Trash2, ImageIcon, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as Icons from "lucide-react";
import { Node } from "@xyflow/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ECOMMERCE_RULE_BLOCKS } from "@/types/ecommerceRules";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface EcommercePropertiesPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

const DIAS_SEMANA = [
  { value: "seg", label: "Segunda" },
  { value: "ter", label: "Terça" },
  { value: "qua", label: "Quarta" },
  { value: "qui", label: "Quinta" },
  { value: "sex", label: "Sexta" },
  { value: "sab", label: "Sábado" },
  { value: "dom", label: "Domingo" },
];

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

// ── Hooks para buscar dados do sistema ──────────────────────────

function useProducts() {
  const [products, setProducts] = useState<{ id: string; nome: string; codigo?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const estabId = localStorage.getItem("estabelecimentoId");
      let query = supabase.from("produtos").select("id, nome, codigo").eq("ativo", true).order("nome");
      if (estabId) query = query.eq("estabelecimento_id", estabId);
      const { data } = await query.limit(500);
      setProducts(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return { products, loading };
}

function useCategories() {
  const [categories, setCategories] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const estabId = localStorage.getItem("estabelecimentoId");
      let query = supabase.from("produto_categorias").select("id, nome").order("nome");
      if (estabId) query = query.eq("estabelecimento_id", estabId);
      const { data } = await query;
      setCategories(data || []);
    };
    load();
  }, []);

  return { categories };
}

function useGroups() {
  const [groups, setGroups] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const estabId = localStorage.getItem("estabelecimentoId");
      let query = supabase.from("produto_grupos").select("id, nome").order("nome");
      if (estabId) query = query.eq("estabelecimento_id", estabId);
      const { data } = await query;
      setGroups(data || []);
    };
    load();
  }, []);

  return { groups };
}

// ── Hook para buscar imagens da galeria ─────────────────────────

function useGalleryImages() {
  const [images, setImages] = useState<{ id: string; public_url: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const estabId = localStorage.getItem("estabelecimentoId");
      
      // Busca media_gallery (imagens)
      let q1 = supabase.from("media_gallery").select("id, public_url, nome").eq("tipo", "image").order("created_at", { ascending: false });
      if (estabId) q1 = q1.eq("estabelecimento_id", estabId);
      const { data: galleryData } = await q1.limit(200);

      // Busca catalog_ai_images
      let q2 = supabase.from("catalog_ai_images").select("id, public_url, prompt").order("created_at", { ascending: false });
      if (estabId) q2 = q2.eq("estabelecimento_id", estabId);
      const { data: aiData } = await q2.limit(100);

      const combined = [
        ...(galleryData || []).map(i => ({ id: i.id, public_url: i.public_url, nome: i.nome || "Imagem" })),
        ...(aiData || []).map(i => ({ id: i.id, public_url: i.public_url, nome: i.prompt || "Imagem IA" })),
      ];
      setImages(combined);
      setLoading(false);
    };
    load();
  }, []);

  return { images, loading };
}

// ── Seletor de imagem da galeria ────────────────────────────────

function GalleryImageSelector({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { images, loading } = useGalleryImages();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = images.filter(i => i.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-2">
      <Label className="text-xs">Imagem</Label>
      {value && (
        <div className="relative rounded-md overflow-hidden border border-border">
          <img src={value} alt="Preview" className="w-full h-24 object-cover" />
          <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => onChange("")}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <ImageIcon className="h-3 w-3 mr-1" /> Galeria
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[70vh]">
            <DialogHeader>
              <DialogTitle>Selecionar da Galeria</DialogTitle>
            </DialogHeader>
            <div className="relative mb-3">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar imagem..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma imagem encontrada</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[40vh] overflow-y-auto">
                {filtered.map(img => (
                  <button
                    key={img.id}
                    onClick={() => { onChange(img.public_url); setOpen(false); }}
                    className="relative rounded-md overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all aspect-square"
                  >
                    <img src={img.public_url} alt={img.nome} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate">{img.nome}</span>
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
        <Input value={value || ""} onChange={e => onChange(e.target.value)} placeholder="Ou cole uma URL..." className="flex-1 text-xs" />
      </div>
    </div>
  );
}

// ── Componente de seletor de produto ────────────────────────────

function ProductSelector({ value, onChange, label: fieldLabel }: { value: { id: string; nome: string } | null; onChange: (v: { id: string; nome: string } | null) => void; label?: string }) {
  const { products, loading } = useProducts();
  const [search, setSearch] = useState("");

  const filtered = products.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.codigo && p.codigo.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-1">
      <Label className="text-xs">{fieldLabel || "Produto"}</Label>
      {value?.id ? (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-accent/20">
          <span className="text-xs flex-1 truncate">{value.nome}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onChange(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={loading ? "Carregando..." : "Buscar produto..."}
              className="pl-7 h-8 text-xs"
            />
          </div>
          {search && (
            <div className="max-h-32 overflow-y-auto border rounded-md">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">Nenhum produto encontrado</p>
              ) : filtered.slice(0, 20).map(p => (
                <button
                  key={p.id}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent/50 truncate"
                  onClick={() => { onChange({ id: p.id, nome: p.nome }); setSearch(""); }}
                >
                  {p.codigo ? `[${p.codigo}] ` : ""}{p.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente de seletor múltiplo de produtos ──────────────────

function MultiProductSelector({ value, onChange }: { value: { id: string; nome: string }[]; onChange: (v: { id: string; nome: string }[]) => void }) {
  const { products, loading } = useProducts();
  const [search, setSearch] = useState("");

  const filtered = products.filter(p =>
    !value.some(v => v.id === p.id) &&
    (p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.codigo && p.codigo.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="space-y-1">
      <Label className="text-xs">Produtos</Label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {value.map(p => (
            <Badge key={p.id} variant="secondary" className="text-[10px] gap-1">
              {p.nome}
              <button onClick={() => onChange(value.filter(v => v.id !== p.id))}>
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={loading ? "Carregando..." : "Adicionar produto..."}
          className="pl-7 h-8 text-xs"
        />
      </div>
      {search && (
        <div className="max-h-32 overflow-y-auto border rounded-md">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">Nenhum produto encontrado</p>
          ) : filtered.slice(0, 20).map(p => (
            <button
              key={p.id}
              className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent/50 truncate"
              onClick={() => { onChange([...value, { id: p.id, nome: p.nome }]); setSearch(""); }}
            >
              {p.codigo ? `[${p.codigo}] ` : ""}{p.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente de seletor de categoria ──────────────────────────

function CategorySelector({ value, onChange }: { value: { id: string; nome: string } | null; onChange: (v: { id: string; nome: string } | null) => void }) {
  const { categories } = useCategories();

  return (
    <div className="space-y-1">
      <Label className="text-xs">Categoria</Label>
      <Select
        value={value?.id || "__none__"}
        onValueChange={v => {
          if (v === "__none__") { onChange(null); return; }
          const cat = categories.find(c => c.id === v);
          if (cat) onChange({ id: cat.id, nome: cat.nome });
        }}
      >
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Nenhuma</SelectItem>
          {categories.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Componente de seletor de grupo ──────────────────────────────

function GroupSelector({ value, onChange }: { value: { id: string; nome: string } | null; onChange: (v: { id: string; nome: string } | null) => void }) {
  const { groups } = useGroups();

  return (
    <div className="space-y-1">
      <Label className="text-xs">Grupo</Label>
      <Select
        value={value?.id || "__none__"}
        onValueChange={v => {
          if (v === "__none__") { onChange(null); return; }
          const grp = groups.find(g => g.id === v);
          if (grp) onChange({ id: grp.id, nome: grp.nome });
        }}
      >
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Nenhum</SelectItem>
          {groups.map(g => (
            <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Componente de faixas do desconto progressivo ────────────────

function ProgressiveDiscountEditor({ faixas, onChange }: { faixas: { quantidade: number; percentual: number }[]; onChange: (f: { quantidade: number; percentual: number }[]) => void }) {
  const addFaixa = () => onChange([...faixas, { quantidade: faixas.length + 1, percentual: 0 }]);
  const removeFaixa = (i: number) => onChange(faixas.filter((_, idx) => idx !== i));
  const updateFaixa = (i: number, key: string, val: number) => {
    const updated = [...faixas];
    (updated[i] as any)[key] = val;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Faixas de Desconto</Label>
      {faixas.map((f, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input type="number" value={f.quantidade} onChange={e => updateFaixa(i, "quantidade", Number(e.target.value))} className="h-7 text-xs w-16" placeholder="Qtd" min={1} />
          <span className="text-xs text-muted-foreground">un →</span>
          <Input type="number" value={f.percentual} onChange={e => updateFaixa(i, "percentual", Number(e.target.value))} className="h-7 text-xs w-16" placeholder="%" min={0} max={100} />
          <span className="text-xs text-muted-foreground">%</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFaixa(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={addFaixa}>
        <Plus className="h-3 w-3 mr-1" /> Adicionar Faixa
      </Button>
    </div>
  );
}

// ── Painel principal ────────────────────────────────────────────

export const EcommercePropertiesPanel = ({ node, onUpdate, onDelete, onClose }: EcommercePropertiesPanelProps) => {
  const nodeData = node.data as any;
  const blockDef = ECOMMERCE_RULE_BLOCKS.find(b => b.type === nodeData.type);
  const [label, setLabel] = useState(nodeData.label || "");
  const [note, setNote] = useState(nodeData.note || "");
  const [config, setConfig] = useState<Record<string, any>>(nodeData.config || {});

  useEffect(() => {
    setLabel(nodeData.label || "");
    setNote(nodeData.note || "");
    setConfig(nodeData.config || {});
  }, [node.id]);

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(node.id, { ...nodeData, config: newConfig });
  };

  const saveLabel = () => {
    onUpdate(node.id, { ...nodeData, label, note, config });
  };

  useEffect(() => {
    const timeout = setTimeout(saveLabel, 300);
    return () => clearTimeout(timeout);
  }, [label, note]);

  const renderConfigFields = () => {
    const type = nodeData.type;

    switch (type) {
      // ── Condições - Carrinho ────────────────────────────────
      case "condicao_valor_carrinho":
      case "condicao_quantidade_itens":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Operador</Label>
              <Select value={config.operador || ">"} onValueChange={v => updateConfig("operador", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">Maior que</SelectItem>
                  <SelectItem value=">=">Maior ou igual</SelectItem>
                  <SelectItem value="=">Igual a</SelectItem>
                  <SelectItem value="<">Menor que</SelectItem>
                  <SelectItem value="<=">Menor ou igual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor</Label>
              <Input type="number" value={config.valor || 0} onChange={e => updateConfig("valor", Number(e.target.value))} />
            </div>
          </div>
        );

      case "condicao_produto_especifico":
        return (
          <div className="space-y-3">
            <ProductSelector
              value={config.produtoId ? { id: config.produtoId, nome: config.produtoNome || "" } : null}
              onChange={v => {
                updateConfig("produtoId", v?.id || "");
                updateConfig("produtoNome", v?.nome || "");
              }}
            />
            <div className="space-y-1">
              <Label className="text-xs">Quantidade mínima</Label>
              <Input type="number" value={config.quantidadeMinima || 1} onChange={e => updateConfig("quantidadeMinima", Number(e.target.value))} min={1} />
            </div>
          </div>
        );

      case "condicao_categoria_produto":
        return (
          <div className="space-y-3">
            <CategorySelector
              value={config.categoriaId ? { id: config.categoriaId, nome: config.categoriaNome || "" } : null}
              onChange={v => {
                updateConfig("categoriaId", v?.id || "");
                updateConfig("categoriaNome", v?.nome || "");
              }}
            />
            <div className="space-y-1">
              <Label className="text-xs">Quantidade mínima de itens da categoria</Label>
              <Input type="number" value={config.quantidadeMinima || 1} onChange={e => updateConfig("quantidadeMinima", Number(e.target.value))} min={1} />
            </div>
          </div>
        );

      case "condicao_grupo_produto":
        return (
          <div className="space-y-3">
            <GroupSelector
              value={config.grupoId ? { id: config.grupoId, nome: config.grupoNome || "" } : null}
              onChange={v => {
                updateConfig("grupoId", v?.id || "");
                updateConfig("grupoNome", v?.nome || "");
              }}
            />
            <div className="space-y-1">
              <Label className="text-xs">Quantidade mínima de itens do grupo</Label>
              <Input type="number" value={config.quantidadeMinima || 1} onChange={e => updateConfig("quantidadeMinima", Number(e.target.value))} min={1} />
            </div>
          </div>
        );

      // ── Condições - Cliente ─────────────────────────────────
      case "condicao_tipo_cliente":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={config.tipo || "b2c"} onValueChange={v => updateConfig("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="b2c">B2C (Pessoa Física)</SelectItem>
                <SelectItem value="b2b">B2B (Pessoa Jurídica)</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "condicao_cliente_recorrente":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Mín. compras anteriores</Label>
            <Input type="number" value={config.minCompras || 3} onChange={e => updateConfig("minCompras", Number(e.target.value))} />
          </div>
        );

      case "condicao_regiao_entrega":
        return (
          <div className="space-y-3">
            <Label className="text-xs">UFs permitidas</Label>
            <div className="grid grid-cols-5 gap-1">
              {UFS.map(uf => (
                <label key={uf} className="flex items-center gap-1 text-xs">
                  <Checkbox
                    checked={(config.ufs || []).includes(uf)}
                    onCheckedChange={(checked) => {
                      const current = config.ufs || [];
                      updateConfig("ufs", checked ? [...current, uf] : current.filter((u: string) => u !== uf));
                    }}
                  />
                  {uf}
                </label>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CEPs específicos (separados por vírgula)</Label>
              <Input value={config.ceps || ""} onChange={e => updateConfig("ceps", e.target.value)} placeholder="01000-000, 02000-000" />
            </div>
          </div>
        );

      // ── Condições - Temporal ────────────────────────────────
      case "condicao_periodo":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={config.dataInicio || ""} onChange={e => updateConfig("dataInicio", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={config.dataFim || ""} onChange={e => updateConfig("dataFim", e.target.value)} />
            </div>
          </div>
        );

      case "condicao_dia_semana":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Dias da semana</Label>
            {DIAS_SEMANA.map(dia => (
              <label key={dia.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={(config.dias || []).includes(dia.value)}
                  onCheckedChange={(checked) => {
                    const current = config.dias || [];
                    updateConfig("dias", checked ? [...current, dia.value] : current.filter((d: string) => d !== dia.value));
                  }}
                />
                {dia.label}
              </label>
            ))}
          </div>
        );

      case "condicao_horario":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Hora Início</Label>
              <Input type="time" value={config.horaInicio || "18:00"} onChange={e => updateConfig("horaInicio", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hora Fim</Label>
              <Input type="time" value={config.horaFim || "23:59"} onChange={e => updateConfig("horaFim", e.target.value)} />
            </div>
          </div>
        );

      // ── Condição - Cupom ────────────────────────────────────
      case "condicao_cupom":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Código do Cupom</Label>
              <Input value={config.codigo || ""} onChange={e => updateConfig("codigo", e.target.value.toUpperCase())} placeholder="EX: PROMO10" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Usos Máximos</Label>
              <Input type="number" value={config.usosMaximos || 100} onChange={e => updateConfig("usosMaximos", Number(e.target.value))} />
            </div>
          </div>
        );

      // ── Ações - Desconto ────────────────────────────────────
      case "acao_desconto_percentual":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Percentual (%)</Label>
              <Input type="number" value={config.percentual || 0} onChange={e => updateConfig("percentual", Number(e.target.value))} min={0} max={100} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Aplicar em</Label>
              <Select value={config.aplicarEm || "carrinho"} onValueChange={v => updateConfig("aplicarEm", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="carrinho">Todo o Carrinho</SelectItem>
                  <SelectItem value="produto">Produto Específico</SelectItem>
                  <SelectItem value="categoria">Categoria</SelectItem>
                  <SelectItem value="grupo">Grupo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.aplicarEm === "produto" && (
              <ProductSelector
                value={config.produtoId ? { id: config.produtoId, nome: config.produtoNome || "" } : null}
                onChange={v => {
                  updateConfig("produtoId", v?.id || "");
                  updateConfig("produtoNome", v?.nome || "");
                }}
              />
            )}
            {config.aplicarEm === "categoria" && (
              <CategorySelector
                value={config.categoriaId ? { id: config.categoriaId, nome: config.categoriaNome || "" } : null}
                onChange={v => {
                  updateConfig("categoriaId", v?.id || "");
                  updateConfig("categoriaNome", v?.nome || "");
                }}
              />
            )}
            {config.aplicarEm === "grupo" && (
              <GroupSelector
                value={config.grupoId ? { id: config.grupoId, nome: config.grupoNome || "" } : null}
                onChange={v => {
                  updateConfig("grupoId", v?.id || "");
                  updateConfig("grupoNome", v?.nome || "");
                }}
              />
            )}
          </div>
        );

      case "acao_desconto_pix":
      case "acao_desconto_boleto":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Percentual (%)</Label>
            <Input type="number" value={config.percentual || 0} onChange={e => updateConfig("percentual", Number(e.target.value))} min={0} max={100} />
          </div>
        );

      case "acao_desconto_frete":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Percentual de Desconto no Frete (%)</Label>
            <Input type="number" value={config.percentual || 0} onChange={e => updateConfig("percentual", Number(e.target.value))} min={0} max={100} />
          </div>
        );

      case "acao_desconto_fixo":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" value={config.valor || 0} onChange={e => updateConfig("valor", Number(e.target.value))} step="0.01" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Aplicar em</Label>
              <Select value={config.aplicarEm || "carrinho"} onValueChange={v => updateConfig("aplicarEm", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="carrinho">Todo o Carrinho</SelectItem>
                  <SelectItem value="produto">Produto Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.aplicarEm === "produto" && (
              <ProductSelector
                value={config.produtoId ? { id: config.produtoId, nome: config.produtoNome || "" } : null}
                onChange={v => {
                  updateConfig("produtoId", v?.id || "");
                  updateConfig("produtoNome", v?.nome || "");
                }}
              />
            )}
          </div>
        );

      case "acao_frete_fixo":
        return (
          <div className="space-y-1">
            <Label className="text-xs">Valor (R$)</Label>
            <Input type="number" value={config.valor || 0} onChange={e => updateConfig("valor", Number(e.target.value))} step="0.01" />
          </div>
        );

      case "acao_desconto_progressivo":
        return (
          <div className="space-y-3">
            <ProgressiveDiscountEditor
              faixas={config.faixas || [{ quantidade: 1, percentual: 5 }, { quantidade: 3, percentual: 10 }, { quantidade: 5, percentual: 15 }]}
              onChange={f => updateConfig("faixas", f)}
            />
            <div className="space-y-1">
              <Label className="text-xs">Aplicar em</Label>
              <Select value={config.aplicarEm || "carrinho"} onValueChange={v => updateConfig("aplicarEm", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="carrinho">Todo o Carrinho</SelectItem>
                  <SelectItem value="produto">Produto Específico</SelectItem>
                  <SelectItem value="categoria">Categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.aplicarEm === "produto" && (
              <ProductSelector
                value={config.produtoId ? { id: config.produtoId, nome: config.produtoNome || "" } : null}
                onChange={v => {
                  updateConfig("produtoId", v?.id || "");
                  updateConfig("produtoNome", v?.nome || "");
                }}
              />
            )}
            {config.aplicarEm === "categoria" && (
              <CategorySelector
                value={config.categoriaId ? { id: config.categoriaId, nome: config.categoriaNome || "" } : null}
                onChange={v => {
                  updateConfig("categoriaId", v?.id || "");
                  updateConfig("categoriaNome", v?.nome || "");
                }}
              />
            )}
          </div>
        );

      case "acao_compre_x_leve_y":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Compre (quantidade)</Label>
              <Input type="number" value={config.compre || 2} onChange={e => updateConfig("compre", Number(e.target.value))} min={1} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Leve (quantidade)</Label>
              <Input type="number" value={config.leve || 3} onChange={e => updateConfig("leve", Number(e.target.value))} min={1} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Aplicar em</Label>
              <Select value={config.aplicarEm || "qualquer"} onValueChange={v => updateConfig("aplicarEm", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="qualquer">Qualquer Produto</SelectItem>
                  <SelectItem value="produto">Produto Específico</SelectItem>
                  <SelectItem value="categoria">Categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.aplicarEm === "produto" && (
              <ProductSelector
                value={config.produtoId ? { id: config.produtoId, nome: config.produtoNome || "" } : null}
                onChange={v => {
                  updateConfig("produtoId", v?.id || "");
                  updateConfig("produtoNome", v?.nome || "");
                }}
              />
            )}
            {config.aplicarEm === "categoria" && (
              <CategorySelector
                value={config.categoriaId ? { id: config.categoriaId, nome: config.categoriaNome || "" } : null}
                onChange={v => {
                  updateConfig("categoriaId", v?.id || "");
                  updateConfig("categoriaNome", v?.nome || "");
                }}
              />
            )}
          </div>
        );

      // ── Ações - Frete ───────────────────────────────────────
      case "acao_frete_gratis":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Aplicar para</Label>
              <Select value={config.regioes || "todas"} onValueChange={v => updateConfig("regioes", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as regiões</SelectItem>
                  <SelectItem value="sudeste">Sudeste</SelectItem>
                  <SelectItem value="sul">Sul</SelectItem>
                  <SelectItem value="nordeste">Nordeste</SelectItem>
                  <SelectItem value="norte">Norte</SelectItem>
                  <SelectItem value="centro-oeste">Centro-Oeste</SelectItem>
                  <SelectItem value="personalizado">UFs Específicas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.regioes === "personalizado" && (
              <div className="space-y-1">
                <Label className="text-xs">UFs</Label>
                <div className="grid grid-cols-5 gap-1">
                  {UFS.map(uf => (
                    <label key={uf} className="flex items-center gap-1 text-xs">
                      <Checkbox
                        checked={(config.ufs || []).includes(uf)}
                        onCheckedChange={(checked) => {
                          const current = config.ufs || [];
                          updateConfig("ufs", checked ? [...current, uf] : current.filter((u: string) => u !== uf));
                        }}
                      />
                      {uf}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Valor mínimo do pedido (R$) - opcional</Label>
              <Input type="number" value={config.valorMinimo || ""} onChange={e => updateConfig("valorMinimo", e.target.value ? Number(e.target.value) : null)} step="0.01" placeholder="Sem mínimo" />
            </div>
          </div>
        );

      // ── Ações - Pagamento ───────────────────────────────────
      case "acao_parcelas_extras":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Máx. Parcelas</Label>
              <Input type="number" value={config.maxParcelas || 12} onChange={e => updateConfig("maxParcelas", Number(e.target.value))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={config.semJuros !== false} onCheckedChange={v => updateConfig("semJuros", v)} />
              Sem juros
            </label>
            <div className="space-y-1">
              <Label className="text-xs">Valor mínimo da parcela (R$)</Label>
              <Input type="number" value={config.valorMinimoParcela || ""} onChange={e => updateConfig("valorMinimoParcela", e.target.value ? Number(e.target.value) : null)} step="0.01" placeholder="Sem mínimo" />
            </div>
          </div>
        );

      // ── Ações - Propaganda/Visual ───────────────────────────
      case "acao_banner_promocional":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input value={config.titulo || ""} onChange={e => updateConfig("titulo", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL da Imagem</Label>
              <Input value={config.imagem || ""} onChange={e => updateConfig("imagem", e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link de destino</Label>
              <Input value={config.link || ""} onChange={e => updateConfig("link", e.target.value)} placeholder="/ecommerce/catalogo" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Posição</Label>
              <Select value={config.posicao || "topo"} onValueChange={v => updateConfig("posicao", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="topo">Topo da Página</SelectItem>
                  <SelectItem value="meio">Meio da Home</SelectItem>
                  <SelectItem value="lateral">Lateral</SelectItem>
                  <SelectItem value="rodape">Rodapé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cor de fundo</Label>
              <Input type="color" value={config.corFundo || "#f59e0b"} onChange={e => updateConfig("corFundo", e.target.value)} className="h-8" />
            </div>
          </div>
        );

      case "acao_popup_promocional":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input value={config.titulo || ""} onChange={e => updateConfig("titulo", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mensagem</Label>
              <Textarea value={config.mensagem || ""} onChange={e => updateConfig("mensagem", e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">URL da Imagem (opcional)</Label>
              <Input value={config.imagem || ""} onChange={e => updateConfig("imagem", e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Texto do Botão</Label>
              <Input value={config.botaoTexto || "Aproveitar!"} onChange={e => updateConfig("botaoTexto", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link do Botão (opcional)</Label>
              <Input value={config.botaoLink || ""} onChange={e => updateConfig("botaoLink", e.target.value)} placeholder="/ecommerce/catalogo" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Delay (segundos)</Label>
              <Input type="number" value={config.delay || 3} onChange={e => updateConfig("delay", Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Exibir apenas uma vez por sessão</Label>
              <Checkbox checked={config.umaPorSessao !== false} onCheckedChange={v => updateConfig("umaPorSessao", v)} />
            </div>
          </div>
        );

      case "acao_destaque_vitrine":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título da Seção</Label>
              <Input value={config.titulo || "Oferta Especial"} onChange={e => updateConfig("titulo", e.target.value)} />
            </div>
            <MultiProductSelector
              value={config.produtos || []}
              onChange={v => updateConfig("produtos", v)}
            />
            <div className="space-y-1">
              <Label className="text-xs">Ou selecionar por Categoria</Label>
              <CategorySelector
                value={config.categoriaId ? { id: config.categoriaId, nome: config.categoriaNome || "" } : null}
                onChange={v => {
                  updateConfig("categoriaId", v?.id || "");
                  updateConfig("categoriaNome", v?.nome || "");
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Máx. produtos exibidos</Label>
              <Input type="number" value={config.maxProdutos || 8} onChange={e => updateConfig("maxProdutos", Number(e.target.value))} min={1} max={50} />
            </div>
          </div>
        );

      case "acao_mensagem_carrinho":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Mensagem (use {"{valor}"} para valor dinâmico)</Label>
              <Textarea value={config.mensagem || ""} onChange={e => updateConfig("mensagem", e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Mensagem</Label>
              <Select value={config.tipoMensagem || "info"} onValueChange={v => updateConfig("tipoMensagem", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Informação</SelectItem>
                  <SelectItem value="sucesso">Sucesso</SelectItem>
                  <SelectItem value="alerta">Alerta</SelectItem>
                  <SelectItem value="urgencia">Urgência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "acao_brinde":
        return (
          <div className="space-y-3">
            <ProductSelector
              label="Produto Brinde"
              value={config.produtoId ? { id: config.produtoId, nome: config.produtoNome || "" } : null}
              onChange={v => {
                updateConfig("produtoId", v?.id || "");
                updateConfig("produtoNome", v?.nome || "");
              }}
            />
            <div className="space-y-1">
              <Label className="text-xs">Quantidade</Label>
              <Input type="number" value={config.quantidade || 1} onChange={e => updateConfig("quantidade", Number(e.target.value))} min={1} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor mínimo do pedido (R$) - opcional</Label>
              <Input type="number" value={config.valorMinimo || ""} onChange={e => updateConfig("valorMinimo", e.target.value ? Number(e.target.value) : null)} step="0.01" placeholder="Sem mínimo" />
            </div>
          </div>
        );

      // ── Primeira compra (sem config extra) ──────────────────
      case "condicao_primeira_compra":
        return <p className="text-xs text-muted-foreground">Ativa quando o cliente nunca fez uma compra anterior. Sem configurações adicionais.</p>;

      default:
        return <p className="text-xs text-muted-foreground">Sem configurações adicionais para este bloco.</p>;
    }
  };

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">Propriedades</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {blockDef && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/30">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: blockDef.color + '20' }}>
                {(() => { const I = (Icons as any)[blockDef.icon]; return I ? <I className="w-4 h-4" style={{ color: blockDef.color }} /> : null; })()}
              </div>
              <div>
                <span className="text-sm font-medium">{blockDef.label}</span>
                <span className="text-xs text-muted-foreground block">{blockDef.description}</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Rótulo</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nome do bloco" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nota</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Anotação opcional..." />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Configurações</h4>
            {renderConfigFields()}
          </div>

          <div className="border-t pt-4">
            <Button variant="destructive" size="sm" className="w-full" onClick={() => onDelete(node.id)}>
              Excluir Bloco
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
