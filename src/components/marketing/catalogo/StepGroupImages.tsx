import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, ImageIcon, Layers, Check, X, FolderOpen } from 'lucide-react';
import { CatalogPage, CatalogProduct, ProductGroup } from './types';
import { toast } from 'sonner';
import { useCatalogAIImages } from './hooks/useCatalogAIImages';
import { AIImageGallery } from './AIImageGallery';

interface StepGroupImagesProps {
  productsPage: CatalogPage;
  groupImages: Record<string, string>;
  onGroupImageChange: (groupId: string, imageUrl: string) => void;
  groupPrompts: Record<string, string>;
  onGroupPromptChange: (groupId: string, prompt: string) => void;
  estabelecimentoId?: string | null;
}

export const StepGroupImages: React.FC<StepGroupImagesProps> = ({
  productsPage,
  groupImages,
  onGroupImageChange,
  groupPrompts,
  onGroupPromptChange,
  estabelecimentoId,
}) => {
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [galleryOpenFor, setGalleryOpenFor] = useState<string | null>(null);

  const products = productsPage.products || [];
  const groupByCategory = productsPage.groupByCategory ?? true;

  // AI Images hook for gallery
  const { images, loading: imagesLoading, saveImage, deleteImage, refresh: refreshGallery } = useCatalogAIImages(estabelecimentoId || 'default');

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
    const prompt = groupPrompts[group.id];
    if (!prompt?.trim()) {
      toast.error(`Digite uma descrição para o grupo "${group.nome}"`);
      return;
    }

    setGeneratingFor(group.id);
    toast.loading(`Gerando imagem para ${group.nome}...`, { id: `ai-group-${group.id}` });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

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
            prompt: `Professional catalog group page background: ${prompt.trim()}`,
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
        
        // Refresh gallery if saved
        if (data.savedToGallery) {
          await refreshGallery();
        }
        
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

  const clearGroupImage = (groupId: string) => {
    onGroupImageChange(groupId, '');
  };

  const handleSelectFromGallery = (groupId: string, imageUrl: string) => {
    onGroupImageChange(groupId, imageUrl);
    setGalleryOpenFor(null);
    toast.success('Imagem selecionada!');
  };

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
      <div>
        <h3 className="text-lg font-medium">Imagens dos Grupos</h3>
        <p className="text-sm text-muted-foreground">
          Digite uma descrição para cada grupo e gere imagens personalizadas com IA ou selecione da galeria
        </p>
      </div>

      {/* Groups List */}
      <div className="space-y-6">
        {groups.map((group) => {
          const hasImage = !!groupImages[group.id];
          const isGenerating = generatingFor === group.id;
          const prompt = groupPrompts[group.id] || '';

          return (
            <div
              key={group.id}
              className="rounded-xl border bg-card overflow-hidden"
            >
              {/* Group Header */}
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{group.nome}</h4>
                    <p className="text-xs text-muted-foreground">
                      {group.products.length} produto{group.products.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {hasImage && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-xs">
                      <Check className="h-3 w-3" />
                      Imagem pronta
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Prompt Input */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Descrição para IA
                  </Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => onGroupPromptChange(group.id, e.target.value)}
                    placeholder={`Ex: produtos de ${group.nome.toLowerCase()} em ambiente moderno, tons neutros, iluminação profissional...`}
                    className="min-h-[80px] resize-none text-sm"
                  />
                </div>

                <div className="flex gap-4">
                  {/* Image Preview */}
                  <div className="w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {hasImage ? (
                      <div className="relative w-full h-full group">
                        <img
                          src={groupImages[group.id]}
                          alt={group.nome}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => clearGroupImage(group.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex-1 flex gap-2">
                    {/* Generate Button */}
                    <Button
                      variant={hasImage ? "outline" : "default"}
                      className="flex-1 gap-2"
                      onClick={() => generateImageForGroup(group)}
                      disabled={isGenerating || !prompt.trim()}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {isGenerating ? 'Gerando...' : hasImage ? 'Nova' : 'Gerar com IA'}
                    </Button>

                    {/* Gallery Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setGalleryOpenFor(group.id)}
                      className="gap-2"
                    >
                      <FolderOpen className="h-4 w-4" />
                      <span className="hidden sm:inline">Galeria</span>
                      {images.length > 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {images.length}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Gallery Dialog for this group */}
              <AIImageGallery
                open={galleryOpenFor === group.id}
                onOpenChange={(open) => !open && setGalleryOpenFor(null)}
                images={images}
                loading={imagesLoading}
                onSelect={(url) => handleSelectFromGallery(group.id, url)}
                onDelete={deleteImage}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
