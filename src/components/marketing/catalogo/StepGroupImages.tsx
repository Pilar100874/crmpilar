import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, ImageIcon, Layers, Check, X } from 'lucide-react';
import { CatalogPage, CatalogProduct, ProductGroup } from './types';
import { toast } from 'sonner';

interface StepGroupImagesProps {
  productsPage: CatalogPage;
  groupImages: Record<string, string>;
  onGroupImageChange: (groupId: string, imageUrl: string) => void;
  imagePrompt: string;
  estabelecimentoId?: string | null;
}

export const StepGroupImages: React.FC<StepGroupImagesProps> = ({
  productsPage,
  groupImages,
  onGroupImageChange,
  imagePrompt,
  estabelecimentoId,
}) => {
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);

  const products = productsPage.products || [];
  const groupByCategory = productsPage.groupByCategory ?? true;

  // Get unique groups from selected products
  const groups = useMemo((): ProductGroup[] => {
    if (!groupByCategory || products.length === 0) {
      return [];
    }

    const groupMap = new Map<string, CatalogProduct[]>();
    products.forEach(product => {
      const groupName = product.grupo_nome || 'Outros';
      const groupId = product.grupo_id || 'outros';
      const key = `${groupId}__${groupName}`;
      
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(product);
    });

    return Array.from(groupMap.entries()).map(([key, prods]) => {
      const [id, nome] = key.split('__');
      return { id, nome, products: prods, backgroundImage: groupImages[id] };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [products, groupByCategory, groupImages]);

  const generateImageForGroup = async (group: ProductGroup) => {
    if (!imagePrompt.trim()) {
      toast.error('Configure um prompt de imagem na etapa da Capa primeiro');
      return;
    }

    setGeneratingFor(group.id);
    toast.loading(`Gerando imagem para ${group.nome}...`, { id: `ai-group-${group.id}` });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      // Create a prompt that combines the base prompt with the group name
      const groupPrompt = `${imagePrompt.trim()}, featuring ${group.nome} products, professional catalog page background`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/catalog-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'generate-image',
            prompt: `Professional catalog group page background: ${groupPrompt}`,
            estabelecimentoId: estabelecimentoId || null,
            saveToGallery: true
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const data = await response.json();

      if (data?.imageUrl) {
        onGroupImageChange(group.id, data.imageUrl);
        toast.success(`Imagem gerada para ${group.nome}!`, { id: `ai-group-${group.id}` });
      } else {
        toast.error('Erro: imagem não retornada', { id: `ai-group-${group.id}` });
      }
    } catch (error: any) {
      console.error('Error generating group image:', error);
      if (error.name === 'AbortError') {
        toast.error('Timeout: tente novamente', { id: `ai-group-${group.id}` });
      } else {
        toast.error(error.message || 'Erro ao gerar imagem', { id: `ai-group-${group.id}` });
      }
    } finally {
      setGeneratingFor(null);
    }
  };

  const generateAllImages = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Configure um prompt de imagem na etapa da Capa primeiro');
      return;
    }

    setGeneratingAll(true);
    toast.loading('Gerando imagens para todos os grupos...', { id: 'ai-groups-all' });

    let successCount = 0;
    for (const group of groups) {
      if (groupImages[group.id]) continue; // Skip if already has image
      
      try {
        await generateImageForGroup(group);
        successCount++;
        // Small delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.error(`Error generating for ${group.nome}:`, error);
      }
    }

    setGeneratingAll(false);
    if (successCount > 0) {
      toast.success(`${successCount} imagens geradas!`, { id: 'ai-groups-all' });
    } else {
      toast.dismiss('ai-groups-all');
    }
  };

  const clearGroupImage = (groupId: string) => {
    onGroupImageChange(groupId, '');
  };

  const groupsWithoutImages = groups.filter(g => !groupImages[g.id]);
  const allGroupsHaveImages = groupsWithoutImages.length === 0 && groups.length > 0;

  if (!groupByCategory || groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Layers className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Nenhum grupo para configurar</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {!groupByCategory 
            ? 'Ative "Separar por grupos" na etapa de Produtos para configurar imagens por grupo.'
            : 'Selecione produtos na etapa anterior para ver os grupos disponíveis.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Imagens dos Grupos</h3>
          <p className="text-sm text-muted-foreground">
            Gere imagens personalizadas para cada página de grupo no catálogo
          </p>
        </div>
        
        {groups.length > 1 && !allGroupsHaveImages && (
          <Button
            onClick={generateAllImages}
            disabled={generatingAll || !imagePrompt.trim()}
            className="gap-2"
          >
            {generatingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Gerar Todas ({groupsWithoutImages.length})
          </Button>
        )}
      </div>

      {/* Prompt Info */}
      {!imagePrompt.trim() && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            <strong>Atenção:</strong> Configure um prompt de imagem na etapa da <strong>Capa</strong> para usar a mesma estética em todos os grupos.
          </p>
        </div>
      )}

      {imagePrompt.trim() && (
        <div className="p-4 rounded-xl bg-muted/50">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
            Prompt base (da Capa)
          </Label>
          <p className="text-sm">{imagePrompt}</p>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => {
          const hasImage = !!groupImages[group.id];
          const isGenerating = generatingFor === group.id;

          return (
            <div
              key={group.id}
              className="relative rounded-xl border bg-card overflow-hidden"
            >
              {/* Image Preview Area */}
              <div className="aspect-[16/9] relative bg-muted">
                {hasImage ? (
                  <>
                    <img
                      src={groupImages[group.id]}
                      alt={group.nome}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => clearGroupImage(group.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs">
                        <Check className="h-3 w-3" />
                        Pronto
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <span className="text-xs">Sem imagem</span>
                  </div>
                )}

                {/* Group Name Overlay - Similar to reference */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h4 className="text-white text-lg font-medium drop-shadow-lg">
                    {group.nome}
                  </h4>
                  <p className="text-white/70 text-xs">
                    {group.products.length} produto{group.products.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 border-t bg-card">
                <Button
                  variant={hasImage ? "outline" : "default"}
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => generateImageForGroup(group)}
                  disabled={isGenerating || !imagePrompt.trim()}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating ? 'Gerando...' : hasImage ? 'Gerar Nova' : 'Gerar Imagem'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status */}
      {groups.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          {allGroupsHaveImages ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              Todos os grupos têm imagem
            </>
          ) : (
            <>
              <Layers className="h-4 w-4" />
              {groupsWithoutImages.length} de {groups.length} grupos sem imagem
            </>
          )}
        </div>
      )}
    </div>
  );
};
