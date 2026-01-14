import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Package, X, GripVertical, LayoutGrid } from 'lucide-react';
import { CatalogProduct, CatalogPage, LAYOUT_OPTIONS } from './types';
import { useCatalogProducts } from './useCatalogProducts';
import { cn } from '@/lib/utils';

interface StepProductsProps {
  page: CatalogPage;
  onChange: (page: CatalogPage) => void;
  estabelecimentoId: string | null;
  showPrices: boolean;
  showCodes: boolean;
}

export const StepProducts: React.FC<StepProductsProps> = ({
  page,
  onChange,
  estabelecimentoId,
  showPrices,
  showCodes,
}) => {
  const {
    products,
    categories,
    groups,
    loading,
    selectedCategory,
    setSelectedCategory,
    selectedGroup,
    setSelectedGroup,
    searchTerm,
    setSearchTerm,
  } = useCatalogProducts(estabelecimentoId);

  const selectedProducts = page.products || [];
  const selectedIds = new Set(selectedProducts.map((p) => p.id));

  const toggleProduct = (product: CatalogProduct) => {
    if (selectedIds.has(product.id)) {
      onChange({
        ...page,
        products: selectedProducts.filter((p) => p.id !== product.id),
      });
    } else {
      onChange({
        ...page,
        products: [...selectedProducts, product],
      });
    }
  };

  const removeProduct = (productId: string) => {
    onChange({
      ...page,
      products: selectedProducts.filter((p) => p.id !== productId),
    });
  };

  const selectAll = () => {
    const allIds = new Set([...selectedIds, ...products.map((p) => p.id)]);
    const allProducts = [...selectedProducts];
    products.forEach((p) => {
      if (!selectedIds.has(p.id)) {
        allProducts.push(p);
      }
    });
    onChange({ ...page, products: allProducts });
  };

  const clearSelection = () => {
    onChange({ ...page, products: [] });
  };

  const formatPrice = (price?: number) => {
    if (!price) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Product Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select
            value={selectedCategory || 'all'}
            onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedGroup || 'all'}
            onValueChange={(v) => setSelectedGroup(v === 'all' ? null : v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos grupos</SelectItem>
              {groups.map((grp) => (
                <SelectItem key={grp.id} value={grp.id}>
                  {grp.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Selecionar todos
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Limpar seleção
          </Button>
        </div>

        <ScrollArea className="h-[400px] border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Carregando produtos...
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Package className="h-8 w-8 mb-2" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    selectedIds.has(product.id)
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  )}
                  onClick={() => toggleProduct(product)}
                >
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={() => toggleProduct(product)}
                  />
                  {product.foto_url ? (
                    <img
                      src={product.foto_url}
                      alt={product.nome}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.nome}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {showCodes && product.codigo && <span>{product.codigo}</span>}
                      {showPrices && product.preco_tabela && (
                        <span className="font-medium text-foreground">
                          {formatPrice(product.preco_tabela)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Selected Products & Layout */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Produtos Selecionados ({selectedProducts.length})</Label>
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <Select
              value={page.layout || 'grid-3'}
              onValueChange={(v) => onChange({ ...page, layout: v as CatalogPage['layout'] })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="h-[400px] border rounded-lg">
          {selectedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Package className="h-8 w-8 mb-2" />
              <p>Selecione produtos à esquerda</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {selectedProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg group"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                  {product.foto_url ? (
                    <img
                      src={product.foto_url}
                      alt={product.nome}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="flex-1 text-sm truncate">{product.nome}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeProduct(product.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Mini Preview */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">Preview do Layout</p>
          <div
            className={cn(
              "grid gap-2",
              page.layout === 'grid-2' && "grid-cols-2",
              page.layout === 'grid-3' && "grid-cols-3",
              page.layout === 'grid-4' && "grid-cols-4",
              page.layout === 'list' && "grid-cols-1"
            )}
          >
            {Array.from({ length: Math.min(selectedProducts.length, 6) }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-muted rounded flex items-center justify-center"
              >
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
