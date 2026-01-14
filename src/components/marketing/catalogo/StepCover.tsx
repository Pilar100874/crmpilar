import React, { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, ImageIcon, X, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { CatalogPage } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StepCoverProps {
  page: CatalogPage;
  onChange: (page: CatalogPage) => void;
  primaryColor: string;
  catalogName?: string;
  businessType?: string;
}

export const StepCover: React.FC<StepCoverProps> = ({ 
  page, 
  onChange, 
  primaryColor,
  catalogName,
  businessType 
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingText, setGeneratingText] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'backgroundImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onChange({ ...page, [field]: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (field: 'logoUrl' | 'backgroundImage') => {
    onChange({ ...page, [field]: undefined });
  };

  const generateAIImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Digite uma descrição para a imagem');
      return;
    }
    
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('catalog-ai', {
        body: { 
          action: 'generate-image',
          prompt: `Professional catalog cover background: ${imagePrompt.trim()}`
        }
      });

      if (error) throw error;
      if (data.imageUrl) {
        onChange({ ...page, backgroundImage: data.imageUrl });
        toast.success('Imagem gerada com sucesso!');
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      toast.error(error.message || 'Erro ao gerar imagem');
    } finally {
      setGeneratingImage(false);
    }
  };

  const generateAIText = async () => {
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
  };

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
              Logo
            </Label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'logoUrl')}
              className="hidden"
            />
            {page.logoUrl ? (
              <div className="relative inline-block group">
                <img
                  src={page.logoUrl}
                  alt="Logo"
                  className="h-16 object-contain rounded-lg"
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

            <Button
              type="button"
              onClick={generateAIImage}
              disabled={generatingImage || !imagePrompt.trim()}
              className="w-full h-11 gap-2"
            >
              {generatingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generatingImage ? 'Gerando imagem...' : 'Gerar imagem com IA'}
            </Button>

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

          {/* Color */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Cor de Fundo
            </Label>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg shadow-sm border cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: page.backgroundColor || primaryColor }}
                onClick={() => document.getElementById('cover-bg-color')?.click()}
              />
              <Input
                id="cover-bg-color"
                type="color"
                value={page.backgroundColor || primaryColor}
                onChange={(e) => onChange({ ...page, backgroundColor: e.target.value })}
                className="sr-only"
              />
              <Input
                value={page.backgroundColor || primaryColor}
                onChange={(e) => onChange({ ...page, backgroundColor: e.target.value })}
                className="flex-1 h-10 font-mono text-sm"
              />
            </div>
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
              className="aspect-[210/297] relative flex flex-col items-center justify-center p-8 text-center"
              style={{
                backgroundColor: page.backgroundColor || primaryColor,
                backgroundImage: page.backgroundImage ? `url(${page.backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {page.backgroundImage && (
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />
              )}
              <div className="relative z-10 flex flex-col items-center gap-6">
                {page.logoUrl && (
                  <img
                    src={page.logoUrl}
                    alt="Logo"
                    className="h-24 object-contain drop-shadow-lg"
                  />
                )}
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight drop-shadow-lg">
                    {page.title || 'Título do Catálogo'}
                  </h1>
                  {(page.subtitle || !page.title) && (
                    <p className="text-lg text-white/80 font-light tracking-wide">
                      {page.subtitle || 'Subtítulo'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
