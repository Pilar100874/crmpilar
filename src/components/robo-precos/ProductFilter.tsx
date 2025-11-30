import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ProdutoCategoria {
  id: string;
  nome: string;
}

interface ProdutoGrupo {
  id: string;
  nome: string;
}

interface CampoCustomizado {
  id: string;
  nome: string;
  campo_key: string;
  tipo: string;
  opcoes: any;
  obrigatorio: boolean;
  placeholder: string | null;
  unidade: string | null;
  ativo: boolean;
  pesquisa_faixa?: boolean;
}

interface RangeFilter {
  min: string;
  max: string;
}

interface CustomFieldFilters {
  range: Record<string, RangeFilter>;
  text: Record<string, string>;
  select: Record<string, string>;
  checkbox: Record<string, boolean | null>;
  number: Record<string, string>;
}

export interface ProductFilterState {
  searchTerm: string;
  filterCategoria: string;
  filterGrupo: string;
  filterStatus: string;
  customFieldFilters: CustomFieldFilters;
}

interface ProductFilterProps {
  estabelecimentoId: string;
  onFilterChange: (filters: ProductFilterState) => void;
  showStatusFilter?: boolean;
}

export function ProductFilter({ 
  estabelecimentoId, 
  onFilterChange,
  showStatusFilter = true 
}: ProductFilterProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterGrupo, setFilterGrupo] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilters>({
    range: {},
    text: {},
    select: {},
    checkbox: {},
    number: {}
  });

  const [categorias, setCategorias] = useState<ProdutoCategoria[]>([]);
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [filterCamposCustomizados, setFilterCamposCustomizados] = useState<CampoCustomizado[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Load categories and groups
  useEffect(() => {
    if (estabelecimentoId) {
      loadBaseData();
    }
  }, [estabelecimentoId]);

  // Load custom fields when group changes
  useEffect(() => {
    if (filterGrupo && filterGrupo !== "all") {
      loadFilterCamposCustomizados(filterGrupo);
    } else {
      setFilterCamposCustomizados([]);
      setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
    }
  }, [filterGrupo]);

  // Emit filter changes
  useEffect(() => {
    onFilterChange({
      searchTerm,
      filterCategoria,
      filterGrupo,
      filterStatus,
      customFieldFilters
    });
  }, [searchTerm, filterCategoria, filterGrupo, filterStatus, customFieldFilters]);

  const loadBaseData = async () => {
    try {
      const [categoriasRes, gruposRes] = await Promise.all([
        supabase
          .from('produto_categorias')
          .select('id, nome')
          .eq('estabelecimento_id', estabelecimentoId)
          .order('nome'),
        supabase
          .from('produto_grupos')
          .select('id, nome')
          .eq('estabelecimento_id', estabelecimentoId)
          .order('nome'),
      ]);

      if (categoriasRes.data) setCategorias(categoriasRes.data);
      if (gruposRes.data) setGrupos(gruposRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados base:', error);
    }
  };

  const loadFilterCamposCustomizados = async (grupoId: string) => {
    try {
      const { data, error } = await supabase
        .from('produto_campos_customizados')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setFilterCamposCustomizados(data || []);
      
      const newFilters: CustomFieldFilters = { range: {}, text: {}, select: {}, checkbox: {}, number: {} };
      (data || []).forEach(campo => {
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
      console.error('Erro ao carregar campos para filtro:', error);
      setFilterCamposCustomizados([]);
    }
  };

  const updateCustomFilter = (type: keyof CustomFieldFilters, campoKey: string, value: any) => {
    setCustomFieldFilters(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [campoKey]: value
      }
    }));
  };

  const updateRangeFilter = (campoKey: string, field: "min" | "max", value: string) => {
    setCustomFieldFilters(prev => ({
      ...prev,
      range: {
        ...prev.range,
        [campoKey]: {
          ...prev.range[campoKey],
          [field]: value
        }
      }
    }));
  };

  const hasCustomFilters = 
    Object.values(customFieldFilters.range).some(rf => rf?.min || rf?.max) ||
    Object.values(customFieldFilters.text).some(v => v) ||
    Object.values(customFieldFilters.select).some(v => v) ||
    Object.values(customFieldFilters.checkbox).some(v => v !== null) ||
    Object.values(customFieldFilters.number).some(v => v);

  const hasActiveFilters = searchTerm || filterCategoria !== "all" || filterGrupo !== "all" || filterStatus !== "all" || hasCustomFilters;

  const clearFilters = () => {
    setSearchTerm("");
    setFilterCategoria("all");
    setFilterGrupo("all");
    setFilterStatus("all");
    setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowFilters(!showFilters)}
          className={cn(hasActiveFilters && "border-primary text-primary")}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtrar Produtos
          {hasActiveFilters && <Badge variant="secondary" className="ml-2 text-xs">{hasActiveFilters ? "•" : ""}</Badge>}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
            <X className="w-3 h-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filtros de Produtos</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, SKU ou EAN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterGrupo} onValueChange={setFilterGrupo}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos grupos</SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showStatusFilter && (
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Advanced filters - Custom fields */}
          {filterGrupo !== "all" && (
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between border-t pt-3 mt-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Filtros Avançados (Campos do Grupo)
                  </span>
                  {isAdvancedOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                {filterCamposCustomizados.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Nenhum campo customizado configurado para este grupo.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filterCamposCustomizados.map(campo => {
                      // Range filter for numeric fields with pesquisa_faixa
                      if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
                        return (
                          <div key={campo.id} className="bg-background rounded-md p-3 border">
                            <Label className="text-xs font-medium mb-2 block">
                              {campo.nome} {campo.unidade && <span className="text-muted-foreground">({campo.unidade})</span>}
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="De"
                                value={customFieldFilters.range[campo.campo_key]?.min || ""}
                                onChange={(e) => updateRangeFilter(campo.campo_key, "min", e.target.value)}
                                className="text-sm h-8"
                              />
                              <span className="text-xs text-muted-foreground">até</span>
                              <Input
                                type="number"
                                placeholder="Até"
                                value={customFieldFilters.range[campo.campo_key]?.max || ""}
                                onChange={(e) => updateRangeFilter(campo.campo_key, "max", e.target.value)}
                                className="text-sm h-8"
                              />
                            </div>
                          </div>
                        );
                      }
                      
                      // Simple number filter
                      if (campo.tipo === 'numero') {
                        return (
                          <div key={campo.id} className="bg-background rounded-md p-3 border">
                            <Label className="text-xs font-medium mb-2 block">
                              {campo.nome} {campo.unidade && <span className="text-muted-foreground">({campo.unidade})</span>}
                            </Label>
                            <Input
                              type="number"
                              placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                              value={customFieldFilters.number[campo.campo_key] || ""}
                              onChange={(e) => updateCustomFilter('number', campo.campo_key, e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                        );
                      }
                      
                      // Text filter
                      if (campo.tipo === 'texto') {
                        return (
                          <div key={campo.id} className="bg-background rounded-md p-3 border">
                            <Label className="text-xs font-medium mb-2 block">{campo.nome}</Label>
                            <Input
                              type="text"
                              placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                              value={customFieldFilters.text[campo.campo_key] || ""}
                              onChange={(e) => updateCustomFilter('text', campo.campo_key, e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                        );
                      }
                      
                      // Selection filter
                      if (campo.tipo === 'selecao') {
                        const opcoes = Array.isArray(campo.opcoes) ? campo.opcoes : [];
                        return (
                          <div key={campo.id} className="bg-background rounded-md p-3 border">
                            <Label className="text-xs font-medium mb-2 block">{campo.nome}</Label>
                            <Select 
                              value={customFieldFilters.select[campo.campo_key] || ""} 
                              onValueChange={(val) => updateCustomFilter('select', campo.campo_key, val === "all" ? "" : val)}
                            >
                              <SelectTrigger className="text-sm h-8">
                                <SelectValue placeholder={`Selecione ${campo.nome.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {opcoes.map((opcao: string, idx: number) => (
                                  <SelectItem key={idx} value={opcao}>{opcao}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
                      
                      // Checkbox filter
                      if (campo.tipo === 'checkbox') {
                        return (
                          <div key={campo.id} className="bg-background rounded-md p-3 border">
                            <Label className="text-xs font-medium mb-2 block">{campo.nome}</Label>
                            <Select 
                              value={customFieldFilters.checkbox[campo.campo_key] === null ? "all" : customFieldFilters.checkbox[campo.campo_key] ? "true" : "false"} 
                              onValueChange={(val) => updateCustomFilter('checkbox', campo.campo_key, val === "all" ? null : val === "true")}
                            >
                              <SelectTrigger className="text-sm h-8">
                                <SelectValue placeholder="Selecione" />
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
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to apply filters to products
export function applyProductFilters(
  produtos: any[],
  filters: ProductFilterState,
  filterCamposCustomizados: any[]
): any[] {
  let result = [...produtos];
  
  // Search filter
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    result = result.filter(p => 
      p.nome?.toLowerCase().includes(term) ||
      p.codigo?.toLowerCase().includes(term) ||
      p.ean_13?.toLowerCase().includes(term)
    );
  }
  
  // Category filter
  if (filters.filterCategoria !== "all") {
    result = result.filter(p => p.categoria_id === filters.filterCategoria);
  }
  
  // Group filter
  if (filters.filterGrupo !== "all") {
    result = result.filter(p => p.grupo_id === filters.filterGrupo);
  }
  
  // Status filter
  if (filters.filterStatus !== "all") {
    result = result.filter(p => filters.filterStatus === "ativo" ? p.ativo : !p.ativo);
  }
  
  // Custom field filters
  filterCamposCustomizados.forEach(campo => {
    const camposCustom = (p: any) => p.campos_customizados || {};
    
    if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
      const range = filters.customFieldFilters.range[campo.campo_key];
      if (range && (range.min || range.max)) {
        const minVal = range.min ? parseFloat(range.min) : 0;
        const maxVal = range.max ? parseFloat(range.max) : 99999;
        result = result.filter(p => {
          const fieldValue = parseFloat(camposCustom(p)[campo.campo_key]) || 0;
          return fieldValue >= minVal && fieldValue <= maxVal;
        });
      }
    } else if (campo.tipo === 'numero') {
      const filterVal = filters.customFieldFilters.number[campo.campo_key];
      if (filterVal) {
        result = result.filter(p => {
          const fieldValue = String(camposCustom(p)[campo.campo_key] || "");
          return fieldValue.includes(filterVal);
        });
      }
    } else if (campo.tipo === 'texto') {
      const filterVal = filters.customFieldFilters.text[campo.campo_key];
      if (filterVal) {
        const term = filterVal.toLowerCase();
        result = result.filter(p => {
          const fieldValue = String(camposCustom(p)[campo.campo_key] || "").toLowerCase();
          return fieldValue.includes(term);
        });
      }
    } else if (campo.tipo === 'selecao') {
      const filterVal = filters.customFieldFilters.select[campo.campo_key];
      if (filterVal) {
        result = result.filter(p => camposCustom(p)[campo.campo_key] === filterVal);
      }
    } else if (campo.tipo === 'checkbox') {
      const filterVal = filters.customFieldFilters.checkbox[campo.campo_key];
      if (filterVal !== null) {
        result = result.filter(p => Boolean(camposCustom(p)[campo.campo_key]) === filterVal);
      }
    }
  });
  
  return result;
}
