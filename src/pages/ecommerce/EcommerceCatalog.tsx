import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Grid3X3, List, Star, Heart, ShoppingCart, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface Product {
  id: string;
  nome: string;
  tipo: string | null;
  gramatura: string | null;
  largura: string | null;
  comprimento: string | null;
  embalagem: string | null;
  quantidade: number | null;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("relevancia");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedGramaturas, setSelectedGramaturas] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableGramaturas, setAvailableGramaturas] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 500]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Get estabelecimento_id from localStorage
      const estabId = localStorage.getItem("estabelecimentoId");
      if (!estabId) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("produtos_importados")
        .select("id, nome, tipo, gramatura, largura, comprimento, embalagem, quantidade")
        .eq("estabelecimento_id", estabId)
        .limit(200);

      if (!error && data) {
        setProducts(data);
        // Extract unique types and gramaturas for filters
        const types = [...new Set(data.map(p => p.tipo).filter(Boolean))] as string[];
        const grams = [...new Set(data.map(p => p.gramatura).filter(Boolean))] as string[];
        setAvailableTypes(types.sort());
        setAvailableGramaturas(grams.sort());
      }
    } catch (err) {
      console.error("Error loading products:", err);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter(p => {
    if (searchQuery && !p.nome.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedTypes.length > 0 && (!p.tipo || !selectedTypes.includes(p.tipo))) return false;
    if (selectedGramaturas.length > 0 && (!p.gramatura || !selectedGramaturas.includes(p.gramatura))) return false;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "nome-az": return a.nome.localeCompare(b.nome);
      default: return 0;
    }
  });

  const toggleFilter = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedGramaturas([]);
    setSearchQuery("");
    setPriceRange([0, 500]);
  };

  const activeFilterCount = selectedTypes.length + selectedGramaturas.length;

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

      {/* Type filter */}
      {availableTypes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Tipo</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableTypes.map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-lg px-2 py-1.5 transition-colors">
                <Checkbox checked={selectedTypes.includes(type)} onCheckedChange={() => toggleFilter(type, selectedTypes, setSelectedTypes)} />
                <span className="text-sm">{type}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Gramatura filter */}
      {availableGramaturas.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Gramatura</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableGramaturas.map(gram => (
              <label key={gram} className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-lg px-2 py-1.5 transition-colors">
                <Checkbox checked={selectedGramaturas.includes(gram)} onCheckedChange={() => toggleFilter(gram, selectedGramaturas, setSelectedGramaturas)} />
                <span className="text-sm">{gram}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Availability */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Disponibilidade</h4>
        <label className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-lg px-2 py-1.5 transition-colors">
          <Checkbox />
          <span className="text-sm">Em estoque</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link to="/ecommerce" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Catálogo</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Catálogo de Produtos</h1>
          <p className="text-sm text-muted-foreground mt-1">{sortedProducts.length} produto(s) encontrado(s)</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
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
          <div className="hidden sm:flex border rounded-full overflow-hidden">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-10 w-10 rounded-none" onClick={() => setViewMode("grid")}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-10 w-10 rounded-none" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
          {/* Mobile filter button */}
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
        {/* Desktop filters */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filtros
            </h3>
            <FilterPanel />
          </div>
        </aside>

        {/* Products */}
        <div className="flex-1">
          {/* Active filter badges */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedTypes.map(t => (
                <Badge key={t} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleFilter(t, selectedTypes, setSelectedTypes)}>
                  {t} <X className="h-3 w-3" />
                </Badge>
              ))}
              {selectedGramaturas.map(g => (
                <Badge key={g} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleFilter(g, selectedGramaturas, setSelectedGramaturas)}>
                  {g} <X className="h-3 w-3" />
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
            <div className={`grid ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"} gap-4`}>
              {sortedProducts.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <Link to={`/ecommerce/produto/${product.id}`}>
                    <Card className={`group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden ${viewMode === "list" ? "flex flex-row" : ""}`}>
                      <div className={`relative ${viewMode === "list" ? "w-32 h-32 flex-shrink-0" : "aspect-square"} bg-muted/30 flex items-center justify-center`}>
                        <span className="text-4xl">📄</span>
                        {product.quantidade && product.quantidade > 0 && (
                          <Badge className="absolute top-2 left-2 text-[10px] bg-success text-success-foreground border-0">Em estoque</Badge>
                        )}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                          <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full shadow" onClick={(e) => { e.preventDefault(); }}>
                            <Heart className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className={`${viewMode === "list" ? "flex-1 flex items-center justify-between" : ""} p-3`}>
                        <div>
                          {product.tipo && <p className="text-xs text-muted-foreground">{product.tipo}</p>}
                          <p className="text-sm font-semibold text-foreground line-clamp-2 mt-0.5">{product.nome}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {product.gramatura && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.gramatura}</Badge>}
                            {product.largura && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.largura}</Badge>}
                            {product.embalagem && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.embalagem}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            Qtd: {product.quantidade ?? 0}
                          </p>
                        </div>
                        {viewMode === "list" && (
                          <Button size="sm" className="gap-1 rounded-full ml-4">
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
  );
}
