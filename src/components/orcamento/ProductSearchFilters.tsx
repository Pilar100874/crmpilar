import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { ProdutoGrupo } from "@/types/orcamento";

interface ProductSearchFiltersProps {
  grupos: ProdutoGrupo[];
  onFilterChange: (filters: ProductFilters) => void;
}

export interface ProductFilters {
  nome?: string;
  gramaturaMin?: number;
  gramaturaMax?: number;
  larguraMin?: number;
  larguraMax?: number;
  comprimentoMin?: number;
  comprimentoMax?: number;
  grupoId?: string;
}

export default function ProductSearchFilters({ grupos, onFilterChange }: ProductSearchFiltersProps) {
  const [filters, setFilters] = useState<ProductFilters>({});

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Search className="w-4 h-4" />
          Filtros de Busca
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearFilters}
          className="h-7 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Limpar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Nome do Produto */}
        <div className="space-y-1.5">
          <Label htmlFor="nome" className="text-xs">Nome do Produto</Label>
          <Input
            id="nome"
            placeholder="Buscar por nome..."
            value={filters.nome || ""}
            onChange={(e) => handleFilterChange("nome", e.target.value)}
          />
        </div>

        {/* Grupo */}
        <div className="space-y-1.5">
          <Label htmlFor="grupo" className="text-xs">Grupo</Label>
          <Select
            value={filters.grupoId ?? "all"}
            onValueChange={(value) => handleFilterChange("grupoId", value === "all" ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {grupos.map((grupo) => (
                <SelectItem key={grupo.id} value={grupo.id}>
                  {grupo.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Gramatura */}
        <div className="space-y-1.5">
          <Label className="text-xs">Gramatura (g/m²)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.gramaturaMin || ""}
              onChange={(e) => handleFilterChange("gramaturaMin", e.target.value ? Number(e.target.value) : undefined)}
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.gramaturaMax || ""}
              onChange={(e) => handleFilterChange("gramaturaMax", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>

        {/* Largura */}
        <div className="space-y-1.5">
          <Label className="text-xs">Largura (cm)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.larguraMin || ""}
              onChange={(e) => handleFilterChange("larguraMin", e.target.value ? Number(e.target.value) : undefined)}
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.larguraMax || ""}
              onChange={(e) => handleFilterChange("larguraMax", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>

        {/* Comprimento */}
        <div className="space-y-1.5">
          <Label className="text-xs">Comprimento (cm)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.comprimentoMin || ""}
              onChange={(e) => handleFilterChange("comprimentoMin", e.target.value ? Number(e.target.value) : undefined)}
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.comprimentoMax || ""}
              onChange={(e) => handleFilterChange("comprimentoMax", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}