import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, ImageIcon, X, Sparkles, Loader2, Wand2, FolderOpen } from 'lucide-react';
import { CatalogPage } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCatalogAIImages } from './hooks/useCatalogAIImages';
import { AIImageGallery } from './AIImageGallery';

interface StepCoverProps {
  page: CatalogPage;
  onChange: (page: CatalogPage) => void;
  primaryColor: string;
  catalogName?: string;
  businessType?: string;
  estabelecimentoId?: string | null;
}

export const StepCover: React.FC<StepCoverProps> = ({ 
  page, 
  onChange, 
  primaryColor,
  catalogName,
  businessType,
  estabelecimentoId
}) => {
  // Debug log to track logo state
  console.log('[StepCover] Rendering with logoUrl:', page.logoUrl ? `${page.logoUrl.substring(0, 50)}... (${page.logoUrl.length} chars)` : 'null');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingText, setGeneratingText] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  
  // AI Images hook for gallery
  const { images, loading: imagesLoading, saveImage, deleteImage, refresh: refreshGallery } = useCatalogAIImages(estabelecimentoId || 'default');
  
  // Use refs to track if we're the source of the change
  const isLocalChange = useRef(false);
  
  // Local state to track uploaded images for immediate display
  const [localLogoUrl, setLocalLogoUrl] = useState<string | undefined>(page.logoUrl);
  const [localBgImage, setLocalBgImage] = useState<string | undefined>(page.backgroundImage);
  
  // Sync local state with props - but only if the change came from outside
  useEffect(() => {
    if (!isLocalChange.current) {
      console.log('[StepCover] External change detected - syncing local state');
      setLocalLogoUrl(page.logoUrl);
      setLocalBgImage(page.backgroundImage);
    }
    isLocalChange.current = false;
  }, [page.logoUrl, page.backgroundImage]);

  const handleSelectFromGallery = (imageUrl: string) => {
    isLocalChange.current = true;
    setLocalBgImage(imageUrl);
    onChange({ ...page, backgroundImage: imageUrl });
    toast.success('Imagem selecionada!');
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'backgroundImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      console.log(`[StepCover] File uploaded for ${field}, size: ${dataUrl.length} chars`);
      
      // Mark as local change to prevent sync overwriting
      isLocalChange.current = true;
      
      // Update local state immediately for visual feedback
      if (field === 'logoUrl') {
        setLocalLogoUrl(dataUrl);
      } else {
        setLocalBgImage(dataUrl);
      }
      
      // Update parent state
      const newPage = { ...page, [field]: dataUrl };
      console.log(`[StepCover] Calling onChange, logoUrl exists: ${!!newPage.logoUrl}, backgroundImage exists: ${!!newPage.backgroundImage}`);
      onChange(newPage);
      setForceUpdate(prev => prev + 1);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (field: 'logoUrl' | 'backgroundImage') => {
    isLocalChange.current = true;
    if (field === 'logoUrl') {
      setLocalLogoUrl(undefined);
    } else {
      setLocalBgImage(undefined);
    }
    onChange({ ...page, [field]: undefined });
  };

  const generateAIImage = useCallback(async () => {
    if (!imagePrompt.trim()) {
      toast.error('Digite uma descrição para a imagem');
      return;
    }
    
    setGeneratingImage(true);
    toast.loading('Gerando imagem... isso pode levar até 30 segundos', { id: 'ai-image' });
    
    try {
      console.log('[StepCover] Generating AI image with prompt:', imagePrompt.trim());
      
      // Use fetch with AbortController for better timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
      
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
            prompt: `Professional catalog cover background: ${imagePrompt.trim()}`,
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
      console.log('[StepCover] AI response received:', { hasImageUrl: !!data?.imageUrl, imageUrlLength: data?.imageUrl?.length });

      if (data?.imageUrl) {
        console.log('[StepCover] Setting background image, URL:', data.imageUrl.substring(0, 100));
        
        // Mark as local change to prevent sync overwriting
        isLocalChange.current = true;
        
        // Apply image to catalog immediately
        setLocalBgImage(data.imageUrl);
        onChange({ ...page, backgroundImage: data.imageUrl });
        
        // If saved to gallery by edge function, just refresh the gallery
        if (data.savedToGallery) {
          await refreshGallery();
          toast.success('Imagem gerada e aplicada ao catálogo!', { id: 'ai-image' });
        } else {
          // If not saved by edge function, save manually
          await saveImage(data.imageUrl, imagePrompt.trim());
          toast.success('Imagem gerada e aplicada ao catálogo!', { id: 'ai-image' });
        }
      } else {
        console.error('[StepCover] No imageUrl in response:', data);
        toast.error('Erro: imagem não retornada', { id: 'ai-image' });
      }
    } catch (error: any) {
      console.error('[StepCover] Error generating image:', error);
      if (error.name === 'AbortError') {
        toast.error('Timeout: a geração demorou muito. Tente novamente.', { id: 'ai-image' });
      } else {
        toast.error(error.message || 'Erro ao gerar imagem', { id: 'ai-image' });
      }
    } finally {
      setGeneratingImage(false);
    }
  }, [imagePrompt, onChange, page, saveImage, refreshGallery]);

  const generateAIText = useCallback(async () => {
    setGeneratingText(true);
    try {
      const { data, error } = await supabase.functions.invoke('catalog-ai', {
        body: { 
          action: 'suggest-layout',
          catalogName: catalogName || 'Catálogo de Produtos',
          businessType: businessType || 'varejo'
        }
      });

      if (error) throw error;
      if (data.suggestions?.length > 0) {
        const suggestion = data.suggestions[0];
        onChange({ 
          ...page, 
          title: suggestion.title,
          subtitle: suggestion.subtitle 
        });
        toast.success('Texto gerado com sucesso!');
      }
    } catch (error: any) {
      console.error('Error generating text:', error);
      toast.error(error.message || 'Erro ao gerar texto');
    } finally {
      setGeneratingText(false);
    }
  }, [catalogName, businessType, onChange]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Capa do Catálogo</h3>
          <p className="text-sm text-muted-foreground">
            Personalize a primeira página do seu catálogo
          </p>
        </div>

        <div className="space-y-5">
          {/* AI Text Generation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Título e Subtítulo
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateAIText}
                disabled={generatingText}
                className="h-8 text-xs gap-1.5"
              >
                {generatingText ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
                Gerar com IA
              </Button>
            </div>
            <Input
              value={page.title || ''}
              onChange={(e) => onChange({ ...page, title: e.target.value })}
              placeholder="Ex: Catálogo de Produtos"
              className="h-11 border-0 border-b rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
            />
            <Input
              value={page.subtitle || ''}
              onChange={(e) => onChange({ ...page, subtitle: e.target.value })}
              placeholder="Ex: Primavera/Verão 2024"
              className="h-11 border-0 border-b rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Logo (3x3 cm)
            </Label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'logoUrl')}
              className="hidden"
            />
            {localLogoUrl ? (
              <div className="relative inline-block group" key={`logo-preview-${forceUpdate}`}>
                <img
                  src={localLogoUrl}
                  alt="Logo"
                  className="h-16 w-auto object-contain rounded-lg border bg-white p-1"
                  onLoad={() => console.log('[StepCover] Logo image loaded in form')}
                  onError={(e) => console.error('[StepCover] Logo image failed to load in form', e)}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => clearImage('logoUrl')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="w-full h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs">Carregar logo</span>
              </button>
            )}
          </div>

          {/* AI Image Generation */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Imagem de Fundo com IA
            </Label>
            
            {/* Custom Prompt */}
            <Textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Descreva a imagem que deseja, ex: paisagem moderna com tons azuis e abstratos, fundo minimalista com texturas de mármore..."
              className="min-h-[80px] resize-none text-sm"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={generateAIImage}
                disabled={generatingImage || !imagePrompt.trim()}
                className="flex-1 h-11 gap-2"
              >
                {generatingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generatingImage ? 'Gerando...' : 'Gerar com IA'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setGalleryOpen(true)}
                className="h-11 gap-2"
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <input
              ref={bgInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'backgroundImage')}
              className="hidden"
            />

            {page.backgroundImage ? (
              <div className="relative group">
                <img
                  src={page.backgroundImage}
                  alt="Background"
                  className="w-full h-32 object-cover rounded-xl"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => clearImage('backgroundImage')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bgInputRef.current?.click()}
                className="w-full h-16 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors text-xs"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Carregar imagem do dispositivo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="lg:col-span-3">
        <div className="sticky top-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Preview
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <div
              className="aspect-[210/297] flex flex-col overflow-hidden bg-white"
            >
              {/* Top White Header Section */}
              <div className="bg-white px-6 pt-20 pb-4 text-center">
                <h1 
                  className="text-3xl text-gray-900 tracking-[0.15em] uppercase"
                  style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: 700 }}
                >
                  {page.title || 'CATALOG'}
                </h1>
                {page.subtitle && (
                  <p 
                    className="text-[8px] text-gray-400 tracking-[0.3em] uppercase mt-2"
                    style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300 }}
                  >
                    {page.subtitle}
                  </p>
                )}
                {/* Year with decorative lines */}
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className="w-8 h-px bg-gray-400" />
                  <span 
                    className="text-xs text-gray-600 tracking-[0.15em]"
                    style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300 }}
                  >
                    {new Date().getFullYear()}
                  </span>
                  <div className="w-8 h-px bg-gray-400" />
                </div>
              </div>

              {/* Main Image Area with 5mm margins - fixed position */}
              <div className="flex-1 px-[5mm] pb-[5mm]">
                <div className="relative w-full h-full overflow-hidden">
                  {page.backgroundImage ? (
                    <img 
                      src={page.backgroundImage}
                      alt="Cover"
                      className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">Imagem gerada por IA</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Footer Section */}
              <div className="bg-white px-4 py-3 flex items-center justify-between">
              {/* Logo bottom left */}
              <div className="flex items-center">
                {localLogoUrl ? (
                  <img 
                    key={`preview-logo-${forceUpdate}`} 
                    src={localLogoUrl} 
                    alt="Logo" 
                    className="h-6 w-auto object-contain"
                    onLoad={() => console.log('[StepCover] Logo image loaded in preview')}
                    onError={(e) => console.error('[StepCover] Logo image failed in preview', e)}
                  />
                ) : (
                  <div className="w-7 h-7 border border-gray-300 rounded flex items-center justify-center">
                    <span className="text-[6px] text-gray-400 uppercase">Logo</span>
                  </div>
                )}
              </div>

                {/* Website right */}
                <span 
                  className="text-base text-gray-500 tracking-wider"
                  style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif', fontWeight: 300 }}
                >
                  www.pilar.com.br
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Image Gallery Dialog */}
      <AIImageGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        images={images}
        loading={imagesLoading}
        onSelect={handleSelectFromGallery}
        onDelete={deleteImage}
      />
    </div>
  );
};
