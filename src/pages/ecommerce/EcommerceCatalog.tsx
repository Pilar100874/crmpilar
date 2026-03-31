import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Grid3X3, List, Heart, ShoppingCart, X, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import EcommerceAdBanner from "@/components/ecommerce/EcommerceAdBanner";
import { resolveProductPricesBatch } from "@/hooks/useProductPrice";
import { useCart } from "@/contexts/CartContext";
import { useQuoteRequest } from "@/contexts/QuoteRequestContext";
import { useEcommerceBranding } from "@/hooks/useEcommerceBranding";
import FlyToAnimation from "@/components/ecommerce/FlyToAnimation";

interface Product {
  id: string;
  nome: string;
  descricao: string | null;
  foto_url: string | null;
  preco_tabela: number | null;
  preco_minimo: number | null;
  estoque: number | null;
  marca: string | null;
  categoria_nome: string | null;
  grupo_nome: string | null;
  grupo_id: string | null;
  campos_customizados: Record<string, any> | null;
}

interface CampoCustomizado {
  id: string;
  campo_key: string;
  nome: string;
  tipo: string;
  unidade?: string;
  opcoes?: any;
  pesquisa_faixa?: boolean;
}

type CustomFieldFilters = {
  range: Record<string, { min: string; max: string }>;
  text: Record<string, string>;
  select: Record<string, string>;
  checkbox: Record<string, boolean | null>;
  number: Record<string, string>;
};

const SORT_OPTIONS = [
  { value: "relevancia", label: "Relevância" },
  { value: "menor-preco", label: "Menor Preço" },
  { value: "maior-preco", label: "Maior Preço" },
  { value: "nome-az", label: "Nome A-Z" },
  { value: "mais-recente", label: "Mais Recente" },
];

export default function EcommerceCatalog() {
  const [searchParams] = useSearchParams();
  const categoriaParam = searchParams.get("categoria");
  const grupoParam = searchParams.get("grupo");
  const buscaParam = searchParams.get("busca");

  const { addItem } = useCart();
  const { addItem: addQuoteItem } = useQuoteRequest();
  const { branding } = useEcommerceBranding();
  const isCatalogMode = branding.modo_catalogo;
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, []);
  
  const showPrices = isLoggedIn || branding.mostrar_precos_visitante_b2c;
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(buscaParam || "");
  const [sortBy, setSortBy] = useState("relevancia");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [filterInStock, setFilterInStock] = useState(false);
  const [availableMarcas, setAvailableMarcas] = useState<string[]>([]);
  const [availableGrupos, setAvailableGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>("");
  const [camposCustomizados, setCamposCustomizados] = useState<CampoCustomizado[]>([]);
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilters>({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
  const [flyAnim, setFlyAnim] = useState<{ startRect: DOMRect; target: string; targetPos?: { x: number; y: number }; image?: string; icon?: "heart" | "cart" } | null>(null);

  const handleQuickAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isCatalogMode) {
      // In catalog mode, add to quote request (no stock check needed)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cartTarget = document.querySelector<HTMLElement>("[data-cart-target]");
      const cartRect = cartTarget?.getBoundingClientRect();
      const targetPos = cartRect ? { x: cartRect.left + cartRect.width / 2, y: cartRect.top + cartRect.height / 2 } : undefined;
      setFlyAnim({ startRect: rect, target: "[data-cart-target]", targetPos, image: product.foto_url || undefined, icon: "cart" });
      addQuoteItem({
        productId: product.id,
        name: product.nome,
        type: product.categoria_nome,
        quantity: 1,
        image: product.foto_url || undefined,
      });
      toast.success("Produto adicionado à lista de orçamento!");
      return;
    }
    
    if (product.estoque !== null && product.estoque !== undefined && product.estoque <= 0) {
      toast.error("Produto sem estoque disponível");
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cartTarget = document.querySelector<HTMLElement>("[data-cart-target]");
    const cartRect = cartTarget?.getBoundingClientRect();
    const targetPos = cartRect ? { x: cartRect.left + cartRect.width / 2, y: cartRect.top + cartRect.height / 2 } : undefined;
    setFlyAnim({ startRect: rect, target: "[data-cart-target]", targetPos, image: product.foto_url || undefined, icon: "cart" });
    addItem({
      productId: product.id,
      name: product.nome,
      type: product.categoria_nome,
      gramatura: null,
      quantity: 1,
      maxStock: product.estoque ?? 999,
      image: product.foto_url || undefined,
      price: product.preco_minimo || product.preco_tabela || 0,
    });
    toast.success("Produto adicionado ao carrinho!");
  };

  useEffect(() => {
    loadProducts();
  }, [categoriaParam, grupoParam]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const estabId = localStorage.getItem("estabelecimentoId");

      let query = supabase
        .from("produtos")
        .select("id, nome, descricao, foto_url, preco_tabela, preco_minimo, estoque, marca, tipo_preco, categoria_id, grupo_id, campos_customizados, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)")
        .eq("ativo", true);

      if (estabId) {
        query = query.eq("estabelecimento_id", estabId);
      }

      const { data, error } = await query.limit(500);

      if (!error && data) {
        const priceMap = await resolveProductPricesBatch(data as any[]);

        let mapped: Product[] = data.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao,
          foto_url: p.foto_url,
          preco_tabela: priceMap.get(p.id)?.precoTabela ?? p.preco_tabela,
          preco_minimo: priceMap.get(p.id)?.precoMinimo ?? p.preco_minimo,
          estoque: p.estoque,
          marca: p.marca,
          categoria_nome: p.categoria?.nome || null,
          grupo_nome: p.grupo?.nome || null,
          grupo_id: p.grupo_id || null,
          campos_customizados: p.campos_customizados || null,
        }));

        // Filtrar por categoria ou grupo via URL
        if (categoriaParam) {
          mapped = mapped.filter(p => p.categoria_nome === categoriaParam);
        }
        if (grupoParam) {
          mapped = mapped.filter(p => p.grupo_nome === grupoParam);
        }

        setProducts(mapped);

        const marcas = [...new Set(mapped.map(p => p.marca).filter(Boolean))] as string[];
        setAvailableMarcas(marcas.sort());

        // Extract unique groups
        const gruposMap = new Map<string, string>();
        data.forEach((p: any) => {
          if (p.grupo_id && p.grupo?.nome) gruposMap.set(p.grupo_id, p.grupo.nome);
        });
        setAvailableGrupos(Array.from(gruposMap.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)));
      }
    } catch (err) {
      console.error("Error loading products:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (buscaParam) setSearchQuery(buscaParam);
  }, [buscaParam]);

  // Load custom fields when group changes
  useEffect(() => {
    if (selectedGrupo && selectedGrupo !== "" && selectedGrupo !== "all") {
      loadCamposCustomizados(selectedGrupo);
    } else {
      setCamposCustomizados([]);
      setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
    }
  }, [selectedGrupo]);

  const loadCamposCustomizados = async (grupoId: string) => {
    try {
      const { data, error } = await supabase
        .from('produto_campos_customizados')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('ativo', true)
        .order('ordem');
      if (error) throw error;
      setCamposCustomizados(data || []);
      const newFilters: CustomFieldFilters = { range: {}, text: {}, select: {}, checkbox: {}, number: {} };
      (data || []).forEach((campo: any) => {
        if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
          newFilters.range[campo.campo_key] = { min: "", max: "" };
        } else if (campo.tipo === 'numero') {
          newFilters.number[campo.campo_key] = "";
        } else if (campo.tipo === 'texto') {
          newFilters.text[campo.campo_key] = "";
        } else if (campo.tipo === 'selecao') {
          newFilters.select[campo.campo_key] = "";
        } else if (campo.tipo === 'checkbox') {
          newFilters.checkbox[campo.campo_key] = null;
        }
      });
      setCustomFieldFilters(newFilters);
    } catch (error) {
      console.error('Erro ao carregar campos customizados:', error);
    }
  };

  const updateCustomFilter = (type: keyof CustomFieldFilters, campoKey: string, value: any) => {
    setCustomFieldFilters(prev => ({ ...prev, [type]: { ...prev[type], [campoKey]: value } }));
  };

  const updateRangeFilter = (campoKey: string, field: "min" | "max", value: string) => {
    setCustomFieldFilters(prev => ({
      ...prev,
      range: { ...prev.range, [campoKey]: { ...prev.range[campoKey], [field]: value } }
    }));
  };

  const hasCustomFilters = Object.values(customFieldFilters.range).some(rf => rf?.min || rf?.max) ||
    Object.values(customFieldFilters.text).some(v => v) ||
    Object.values(customFieldFilters.select).some(v => v && v !== "all") ||
    Object.values(customFieldFilters.checkbox).some(v => v !== null) ||
    Object.values(customFieldFilters.number).some(v => v);

  const filteredProducts = products.filter(p => {
    if (searchQuery && !p.nome.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedMarcas.length > 0 && (!p.marca || !selectedMarcas.includes(p.marca))) return false;
    if (filterInStock && (p.estoque === null || p.estoque === undefined || p.estoque <= 0)) return false;
    if (selectedGrupo && selectedGrupo !== "" && selectedGrupo !== "all" && p.grupo_id !== selectedGrupo) return false;

    // Custom field filters
    const cf = p.campos_customizados || {};
    for (const [key, range] of Object.entries(customFieldFilters.range)) {
      if (range?.min || range?.max) {
        const value = cf[key];
        if (range.min && (value === undefined || value === null || Number(value) < Number(range.min))) return false;
        if (range.max && (value === undefined || value === null || Number(value) > Number(range.max))) return false;
      }
    }
    for (const [key, filterValue] of Object.entries(customFieldFilters.number)) {
      if (filterValue) {
        const value = cf[key];
        if (value !== undefined && value !== null && Number(value) !== Number(filterValue)) return false;
      }
    }
    for (const [key, filterValue] of Object.entries(customFieldFilters.text)) {
      if (filterValue) {
        const value = cf[key];
        if (!value || !String(value).toLowerCase().includes(filterValue.toLowerCase())) return false;
      }
    }
    for (const [key, filterValue] of Object.entries(customFieldFilters.select)) {
      if (filterValue && filterValue !== "all") {
        const value = cf[key];
        if (String(value) !== filterValue) return false;
      }
    }
    for (const [key, filterValue] of Object.entries(customFieldFilters.checkbox)) {
      if (filterValue !== null && filterValue !== undefined) {
        const value = cf[key];
        if (Boolean(value) !== filterValue) return false;
      }
    }

    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "nome-az": return a.nome.localeCompare(b.nome);
      case "menor-preco": return (a.preco_minimo ?? 0) - (b.preco_minimo ?? 0);
      case "maior-preco": return (b.preco_minimo ?? 0) - (a.preco_minimo ?? 0);
      default: return 0;
    }
  });

  const toggleFilter = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const clearAllFilters = () => {
    setSelectedMarcas([]);
    setFilterInStock(false);
    setSelectedGrupo("");
    setCamposCustomizados([]);
    setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
    setSearchQuery("");
  };

  const activeFilterCount = selectedMarcas.length + (filterInStock ? 1 : 0) + (selectedGrupo && selectedGrupo !== "all" ? 1 : 0) + (hasCustomFilters ? 1 : 0);

  const pageTitle = categoriaParam
    ? categoriaParam
    : grupoParam
      ? grupoParam
      : "Catálogo de Produtos";

  const FilterPanel = () => (
    <div className="space-y-6">
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{activeFilterCount} filtro(s) ativo(s)</span>
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-destructive hover:text-destructive">
            <X className="h-3 w-3 mr-1" /> Limpar
          </Button>
        </div>
      )}

      {/* Group filter */}
      {availableGrupos.length > 1 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Grupo</h4>
          <Select value={selectedGrupo || "all"} onValueChange={(v) => setSelectedGrupo(v === "all" ? "" : v)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Todos os grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {availableGrupos.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dynamic custom field filters */}
      {camposCustomizados.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Especificações</h4>
          {camposCustomizados.map(campo => {
            const opcoes = Array.isArray(campo.opcoes) ? campo.opcoes : [];

            if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
              return (
                <div key={campo.id} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {campo.nome} {campo.unidade && <span>({campo.unidade})</span>}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      className="h-8 text-sm"
                      value={customFieldFilters.range[campo.campo_key]?.min || ""}
                      onChange={(e) => updateRangeFilter(campo.campo_key, "min", e.target.value)}
                    />
                    <span className="text-muted-foreground text-xs">—</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      className="h-8 text-sm"
                      value={customFieldFilters.range[campo.campo_key]?.max || ""}
                      onChange={(e) => updateRangeFilter(campo.campo_key, "max", e.target.value)}
                    />
                  </div>
                </div>
              );
            }

            if (campo.tipo === 'numero') {
              return (
                <div key={campo.id} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {campo.nome} {campo.unidade && <span>({campo.unidade})</span>}
                  </label>
                  <Input
                    type="number"
                    placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                    className="h-8 text-sm"
                    value={customFieldFilters.number[campo.campo_key] || ""}
                    onChange={(e) => updateCustomFilter('number', campo.campo_key, e.target.value)}
                  />
                </div>
              );
            }

            if (campo.tipo === 'texto') {
              return (
                <div key={campo.id} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{campo.nome}</label>
                  <Input
                    type="text"
                    placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                    className="h-8 text-sm"
                    value={customFieldFilters.text[campo.campo_key] || ""}
                    onChange={(e) => updateCustomFilter('text', campo.campo_key, e.target.value)}
                  />
                </div>
              );
            }

            if (campo.tipo === 'selecao') {
              return (
                <div key={campo.id} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{campo.nome}</label>
                  <Select value={customFieldFilters.select[campo.campo_key] || "all"} onValueChange={(v) => updateCustomFilter('select', campo.campo_key, v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder={`Selecione`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {opcoes.map((opt: any, idx: number) => {
                        const val = typeof opt === 'string' ? opt : opt.valor || opt.label || String(opt);
                        return <SelectItem key={idx} value={val}>{val}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            if (campo.tipo === 'checkbox') {
              return (
                <div key={campo.id} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{campo.nome}</label>
                  <Select
                    value={customFieldFilters.checkbox[campo.campo_key] === null ? "all" : customFieldFilters.checkbox[campo.campo_key] ? "true" : "false"}
                    onValueChange={(v) => updateCustomFilter('checkbox', campo.campo_key, v === "all" ? null : v === "true")}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="true">Sim</SelectItem>
                      <SelectItem value="false">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {availableMarcas.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Marca</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableMarcas.map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-lg px-2 py-1.5 transition-colors">
                <Checkbox checked={selectedMarcas.includes(m)} onCheckedChange={() => toggleFilter(m, selectedMarcas, setSelectedMarcas)} />
                <span className="text-sm">{m}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-3">Disponibilidade</h4>
        <label className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-lg px-2 py-1.5 transition-colors">
          <Checkbox checked={filterInStock} onCheckedChange={(v) => setFilterInStock(!!v)} />
          <span className="text-sm">Em estoque</span>
        </label>
      </div>
    </div>
  );

  const formatPrice = (value: number | null) => {
    if (!value) return null;
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <EcommerceAdBanner posicao="catalogo_topo" carousel />
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/ecommerce" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {grupoParam && (
          <>
            <Link to={`/ecommerce/catalogo?grupo=${encodeURIComponent(grupoParam)}`} className="hover:text-primary transition-colors">{grupoParam}</Link>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        )}
        <span className="text-foreground font-medium">{categoriaParam || "Catálogo"}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{sortedProducts.length} produto(s) encontrado(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Input placeholder="Buscar no catálogo..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-10 hidden sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="hidden md:flex border rounded-full overflow-hidden">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-10 w-10 rounded-none" onClick={() => setViewMode("grid")}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-10 w-10 rounded-none" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden relative h-10 w-10">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">{activeFilterCount}</span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filtros
            </h3>
            <FilterPanel />
          </div>
        </aside>

        <div className="flex-1">
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedMarcas.map(m => (
                <Badge key={m} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleFilter(m, selectedMarcas, setSelectedMarcas)}>
                  {m} <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}

          {loading ? (
            <div className={`grid ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"} gap-4`}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="aspect-square rounded-xl mb-3" /><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-5 w-1/2" /></CardContent></Card>
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-6xl block mb-4">🔍</span>
              <h3 className="text-xl font-semibold text-foreground">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground mt-2">Tente ajustar seus filtros ou termos de busca</p>
              <Button variant="outline" className="mt-4" onClick={clearAllFilters}>Limpar filtros</Button>
            </div>
          ) : (
            <div className={`grid ${viewMode === "grid" ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"} gap-3 md:gap-4`}>
              {sortedProducts.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <Link to={`/ecommerce/produto/${product.id}`}>
                    <Card className={`group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden h-full flex ${viewMode === "list" ? "flex-row" : "flex-col"}`}>
                      <div className={`relative ${viewMode === "list" ? "w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0" : "aspect-square"} bg-muted/30 flex items-center justify-center overflow-hidden`}>
                        {product.foto_url ? (
                          <img src={product.foto_url} alt={product.nome} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <span className="text-3xl md:text-4xl">📄</span>
                        )}
                        <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                          <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full shadow" onClick={(e) => { e.preventDefault(); toast.success("Adicionado aos favoritos ❤️"); }}>
                            <Heart className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full shadow" onClick={(e) => handleQuickAddToCart(e, product)} title={isCatalogMode ? "Adicionar ao orçamento" : "Adicionar ao carrinho"}>
                            {isCatalogMode ? <FileText className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                      <CardContent className={`${viewMode === "list" ? "flex-1 flex items-center justify-between" : "flex flex-col flex-1"} p-2.5 md:p-3`}>
                        <div className="min-w-0 flex flex-col flex-1">
                          {product.categoria_nome && <p className="text-[10px] md:text-xs text-muted-foreground truncate">{product.categoria_nome}</p>}
                          <p className="text-xs md:text-sm font-semibold text-foreground line-clamp-2 mt-0.5 flex-1">{product.nome}</p>
                          <div className="mt-auto pt-1.5 md:pt-2 min-h-[2.75rem]">
                            {showPrices ? (
                              <>
                                <p className={`text-[10px] md:text-xs text-muted-foreground line-through ${product.preco_tabela && product.preco_minimo && product.preco_tabela > product.preco_minimo ? "visible" : "invisible"}`}>
                                  {product.preco_tabela && product.preco_minimo && product.preco_tabela > product.preco_minimo ? formatPrice(product.preco_tabela) : "\u00A0"}
                                </p>
                                {product.preco_minimo ? (
                                  <p className="text-sm md:text-base font-bold text-primary">{formatPrice(product.preco_minimo)}</p>
                                ) : (
                                  <p className="text-sm md:text-base font-bold text-muted-foreground">Sob consulta</p>
                                )}
                              </>
                            ) : (
                              <p className="text-xs md:text-sm font-medium text-primary">Faça login para ver preços</p>
                            )}
                          </div>
                        </div>
                        {viewMode === "list" && (
                          <Button size="sm" className="gap-1 rounded-full ml-4" onClick={(e) => handleQuickAddToCart(e, product)}>
                            {isCatalogMode ? <FileText className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                            {isCatalogMode ? "Orçamento" : "Adicionar"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    {flyAnim && (
      <FlyToAnimation
        startRect={flyAnim.startRect}
        targetSelector={flyAnim.target}
        targetPos={flyAnim.targetPos}
        imageUrl={flyAnim.image}
        icon={flyAnim.icon}
        onComplete={() => setFlyAnim(null)}
      />
    )}
    </>
  );
}
