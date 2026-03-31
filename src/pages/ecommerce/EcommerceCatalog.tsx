import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Grid3X3, List, Heart, ShoppingCart, X, ChevronDown, ChevronRight } from "lucide-react";
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
}

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(buscaParam || "");
  const [sortBy, setSortBy] = useState("relevancia");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedMarcas, setSelectedMarcas] = useState<string[]>([]);
  const [availableMarcas, setAvailableMarcas] = useState<string[]>([]);
  const [flyAnim, setFlyAnim] = useState<{ startRect: DOMRect; target: string; image?: string; icon?: "heart" | "cart" } | null>(null);

  const handleQuickAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.estoque !== null && product.estoque !== undefined && product.estoque <= 0) {
      toast.error("Produto sem estoque disponível");
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyAnim({ startRect: rect, target: "[data-cart-target]", image: product.foto_url || undefined, icon: "cart" });
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
        .select("id, nome, descricao, foto_url, preco_tabela, preco_minimo, estoque, marca, tipo_preco, categoria_id, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)")
        .eq("ativo", true);

      if (estabId) {
        query = query.eq("estabelecimento_id", estabId);
      }

      const { data, error } = await query.limit(500);

      if (!error && data) {
        const priceMap = await resolveProductPricesBatch(data as any[]);

        let mapped = data.map((p: any) => ({
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
      }
    } catch (err) {
      console.error("Error loading products:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (buscaParam) setSearchQuery(buscaParam);
  }, [buscaParam]);

  const filteredProducts = products.filter(p => {
    if (searchQuery && !p.nome.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedMarcas.length > 0 && (!p.marca || !selectedMarcas.includes(p.marca))) return false;
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
    setSearchQuery("");
  };

  const activeFilterCount = selectedMarcas.length;

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
          <Checkbox />
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
                    <Card className={`group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden ${viewMode === "list" ? "flex flex-row" : ""}`}>
                      <div className={`relative ${viewMode === "list" ? "w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0" : "aspect-[4/5]"} bg-muted/30 flex items-center justify-center overflow-hidden`}>
                        {product.foto_url ? (
                          <img src={product.foto_url} alt={product.nome} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <span className="text-3xl md:text-4xl">📄</span>
                        )}
                        <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                          <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full shadow" onClick={(e) => { e.preventDefault(); toast.success("Adicionado aos favoritos ❤️"); }}>
                            <Heart className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full shadow" onClick={(e) => handleQuickAddToCart(e, product)}>
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className={`${viewMode === "list" ? "flex-1 flex items-center justify-between" : ""} p-2.5 md:p-3`}>
                        <div className="min-w-0">
                          {product.categoria_nome && <p className="text-[10px] md:text-xs text-muted-foreground truncate">{product.categoria_nome}</p>}
                          <p className="text-xs md:text-sm font-semibold text-foreground line-clamp-2 mt-0.5">{product.nome}</p>
                          <div className="mt-1.5 md:mt-2">
                            {product.preco_tabela && product.preco_minimo && product.preco_tabela > product.preco_minimo && (
                              <p className="text-[10px] md:text-xs text-muted-foreground line-through">{formatPrice(product.preco_tabela)}</p>
                            )}
                            {product.preco_minimo ? (
                              <p className="text-sm md:text-base font-bold text-primary">{formatPrice(product.preco_minimo)}</p>
                            ) : (
                              <p className="text-[10px] md:text-xs text-muted-foreground">Sob consulta</p>
                            )}
                          </div>
                        </div>
                        {viewMode === "list" && (
                          <Button size="sm" className="gap-1 rounded-full ml-4" onClick={(e) => handleQuickAddToCart(e, product)}>
                            <ShoppingCart className="h-3.5 w-3.5" /> Adicionar
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
        imageUrl={flyAnim.image}
        icon={flyAnim.icon}
        onComplete={() => setFlyAnim(null)}
      />
    )}
    </>
  );
}
