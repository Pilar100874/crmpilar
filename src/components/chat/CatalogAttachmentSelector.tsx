import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { BookOpen, Search, FileDown, Calendar, Package, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { pdf } from "@react-pdf/renderer";
import { CatalogPDFDocument } from "@/components/marketing/catalogo/PDFDocument";
import { CatalogConfig, CatalogPage, CatalogProduct, LAYOUT_OPTIONS, ProductGroup } from "@/components/marketing/catalogo/types";
import { Json } from "@/integrations/supabase/types";

const toolbarBtnClass = "h-9 w-9 rounded-xl bg-background border border-border/50 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 hover:shadow-md";
const toolbarBtnActiveClass = "h-9 w-9 rounded-xl bg-primary/15 border border-primary/40 shadow-sm flex items-center justify-center text-primary hover:bg-primary/20 transition-all duration-200";

interface SavedCatalogRaw {
  id: string;
  nome: string;
  config: Json;
  cover_page: Json | null;
  products_page: Json | null;
  backcover_page: Json | null;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  ativo: boolean;
  data_validade: string | null;
  data_indeterminada: boolean;
}

interface SavedCatalog {
  id: string;
  nome: string;
  config: CatalogConfig;
  cover_page: CatalogPage | null;
  products_page: CatalogPage | null;
  backcover_page: CatalogPage | null;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  ativo: boolean;
  data_validade: string | null;
  data_indeterminada: boolean;
}

interface PageInfo {
  type: 'cover' | 'group-header' | 'products' | 'price-table' | 'backcover';
  groupName?: string;
  products?: CatalogProduct[];
  startIdx?: number;
  pageNumber?: number;
  priceTableData?: { groupName: string; products: CatalogProduct[] }[];
}

interface CatalogAttachmentSelectorProps {
  onSelectPdf: (file: File, url: string) => void;
  disabled?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

const parseJsonField = <T,>(json: Json | null): T | null => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  return json as unknown as T;
};

// Helper function to build grouped products
const buildGroupedProducts = (products: CatalogProduct[], groupByCategory: boolean): ProductGroup[] => {
  if (!groupByCategory) {
    return [{ id: 'all', nome: 'Todos os Produtos', products }];
  }

  const groupMap = new Map<string, { id: string; nome: string; products: CatalogProduct[]; descritivo_catalogo?: string }>();
  products.forEach(product => {
    const groupName = product.grupo_nome || 'Outros';
    const groupId = product.grupo_id || `outros_${groupName.replace(/\s+/g, '_').toLowerCase()}`;
    
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, { 
        id: groupId, 
        nome: groupName, 
        products: [],
        descritivo_catalogo: product.grupo_descritivo_catalogo
      });
    }
    groupMap.get(groupId)!.products.push(product);
  });

  return Array.from(groupMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
};

// Helper function to build pages array
const buildPages = (
  groupedProducts: ProductGroup[], 
  productsPerPage: number, 
  groupByCategory: boolean,
  showPriceTable: boolean
): PageInfo[] => {
  const result: PageInfo[] = [{ type: 'cover', pageNumber: 1 }];
  let pageNum = 2;

  groupedProducts.forEach(group => {
    if (groupByCategory) {
      result.push({ type: 'group-header', groupName: group.nome, pageNumber: pageNum++ });
    }
    
    const totalProductPages = Math.ceil(group.products.length / productsPerPage);
    for (let i = 0; i < totalProductPages; i++) {
      result.push({
        type: 'products',
        groupName: group.nome,
        products: group.products.slice(i * productsPerPage, (i + 1) * productsPerPage),
        startIdx: i * productsPerPage,
        pageNumber: pageNum++,
      });
    }
  });

  if (showPriceTable !== false) {
    const sortedGroupsForPriceTable = [...groupedProducts]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(group => ({
        groupName: group.nome,
        products: [...group.products].sort((a, b) => a.nome.localeCompare(b.nome))
      }));
    
    const ROWS_PER_PRICE_PAGE = 28;
    let currentPricePageProducts: { groupName: string; products: CatalogProduct[] }[] = [];
    let currentRowCount = 0;
    
    sortedGroupsForPriceTable.forEach(group => {
      const groupRows = 1 + group.products.length;
      
      if (currentRowCount + groupRows > ROWS_PER_PRICE_PAGE && currentPricePageProducts.length > 0) {
        result.push({ type: 'price-table', priceTableData: currentPricePageProducts, pageNumber: pageNum++ });
        currentPricePageProducts = [];
        currentRowCount = 0;
      }
      
      currentPricePageProducts.push(group);
      currentRowCount += groupRows;
    });
    
    if (currentPricePageProducts.length > 0) {
      result.push({ type: 'price-table', priceTableData: currentPricePageProducts, pageNumber: pageNum++ });
    }
  }

  result.push({ type: 'backcover', pageNumber: pageNum });
  return result;
};

const CatalogAttachmentSelector = forwardRef<{ openPopover: () => void }, CatalogAttachmentSelectorProps>(({ 
  onSelectPdf,
  disabled,
  externalOpen,
  onExternalOpenChange
}, ref) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Combine internal and external open state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    setInternalOpen(value);
    onExternalOpenChange?.(value);
  };
  
  useImperativeHandle(ref, () => ({
    openPopover: () => setOpen(true)
  }));
  
  // Sync external open changes
  useEffect(() => {
    if (externalOpen !== undefined) {
      setInternalOpen(externalOpen);
    }
  }, [externalOpen]);
  const [catalogs, setCatalogs] = useState<SavedCatalog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCatalogs();
    }
  }, [open]);

  const loadCatalogs = async () => {
    setLoading(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      const { data, error } = await supabase
        .from("catalogos_salvos")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Parse and filter expired catalogs
      const now = new Date();
      const parsedData: SavedCatalog[] = (data || [])
        .map((raw: SavedCatalogRaw) => ({
          ...raw,
          config: parseJsonField<CatalogConfig>(raw.config) || {
            name: '',
            pages: [],
            primaryColor: '#0f172a',
            secondaryColor: '#64748b',
            fontFamily: 'Inter, sans-serif',
            showPrices: true,
            showCodes: true,
            showPriceTable: true,
          },
          cover_page: parseJsonField<CatalogPage>(raw.cover_page),
          products_page: parseJsonField<CatalogPage>(raw.products_page),
          backcover_page: parseJsonField<CatalogPage>(raw.backcover_page),
        }))
        .filter((catalog: SavedCatalog) => {
          // Filter out expired catalogs
          if (!catalog.data_indeterminada && catalog.data_validade) {
            return new Date(catalog.data_validade) > now;
          }
          return true;
        });
      
      setCatalogs(parsedData);
    } catch (error: any) {
      console.error("Erro ao carregar catálogos:", error);
      toast.error("Erro ao carregar catálogos");
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = async (catalog: SavedCatalog) => {
    if (!catalog.cover_page || !catalog.products_page || !catalog.backcover_page) {
      toast.error("Catálogo incompleto. Edite o catálogo para completar todas as páginas.");
      return;
    }

    setGeneratingPdf(catalog.id);
    try {
      const products = catalog.products_page.products || [];
      const layout = catalog.products_page.layout || 'grid-3';
      const layoutConfig = LAYOUT_OPTIONS.find((l) => l.value === layout) || LAYOUT_OPTIONS[1];
      const productsPerPage = layout === 'list' ? 4 : layoutConfig.cols * 2;
      const groupByCategory = catalog.products_page.groupByCategory ?? true;

      // Build grouped products and pages
      const groupedProducts = buildGroupedProducts(products, groupByCategory);
      const pages = buildPages(groupedProducts, productsPerPage, groupByCategory, catalog.config.showPriceTable !== false);

      // Generate PDF using react-pdf
      const pdfBlob = await pdf(
        <CatalogPDFDocument
          config={catalog.config}
          coverPage={catalog.cover_page}
          productsPage={catalog.products_page}
          backcoverPage={catalog.backcover_page}
          groupImages={catalog.config.groupImages || {}}
          groupedProducts={groupedProducts}
          pages={pages}
        />
      ).toBlob();

      const fileName = `catalogo_${catalog.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      
      onSelectPdf(file, url);
      setOpen(false);
      toast.success("PDF do catálogo gerado e anexado!");
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF do catálogo");
    } finally {
      setGeneratingPdf(null);
    }
  };

  const filteredCatalogs = catalogs.filter((catalog) => {
    const searchLower = searchQuery.toLowerCase();
    return catalog.nome.toLowerCase().includes(searchLower);
  });

  const getProductCount = (catalog: SavedCatalog) => {
    return catalog.products_page?.products?.length || 0;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className={open ? toolbarBtnActiveClass : toolbarBtnClass}
                disabled={disabled}
              >
                <BookOpen size={18} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Anexar Catálogo</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-96 p-0 rounded-2xl shadow-xl z-[9999]" align="start" sideOffset={8}>
        <div className="p-4 border-b">
          <h4 className="font-semibold text-sm mb-3">Anexar Catálogo de Produtos</h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar catálogo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
        </div>

        <ScrollArea className="h-80">
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredCatalogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                {searchQuery ? "Nenhum catálogo encontrado" : "Nenhum catálogo ativo disponível"}
              </div>
            ) : (
              filteredCatalogs.map((catalog) => (
                <Card 
                  key={catalog.id} 
                  className="p-3 hover:bg-muted/50 transition-colors rounded-xl"
                >
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                        {catalog.thumbnail ? (
                          <img
                            src={catalog.thumbnail}
                            alt={catalog.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">
                            {catalog.nome}
                          </span>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            <Package className="h-3 w-3 mr-1" />
                            {getProductCount(catalog)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(catalog.updated_at), "dd/MM/yy", { locale: ptBR })}
                          </span>
                          {!catalog.data_indeterminada && catalog.data_validade && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertCircle className="h-3 w-3" />
                              Até {format(new Date(catalog.data_validade), "dd/MM/yy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full h-8 text-xs rounded-lg"
                      onClick={() => generatePdf(catalog)}
                      disabled={generatingPdf === catalog.id}
                    >
                      {generatingPdf === catalog.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Gerando PDF...
                        </>
                      ) : (
                        <>
                          <FileDown className="h-3.5 w-3.5 mr-1.5" />
                          Anexar PDF do Catálogo
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
});

CatalogAttachmentSelector.displayName = 'CatalogAttachmentSelector';

export default CatalogAttachmentSelector;
