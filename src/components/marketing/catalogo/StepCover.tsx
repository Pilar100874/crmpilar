import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, ImageIcon } from 'lucide-react';
import { CatalogPage } from './types';

interface StepCoverProps {
  page: CatalogPage;
  onChange: (page: CatalogPage) => void;
  primaryColor: string;
}

export const StepCover: React.FC<StepCoverProps> = ({ page, onChange, primaryColor }) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cover-title">Título</Label>
          <Input
            id="cover-title"
            value={page.title || ''}
            onChange={(e) => onChange({ ...page, title: e.target.value })}
            placeholder="Ex: Catálogo de Produtos"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover-subtitle">Subtítulo</Label>
          <Textarea
            id="cover-subtitle"
            value={page.subtitle || ''}
            onChange={(e) => onChange({ ...page, subtitle: e.target.value })}
            placeholder="Ex: Primavera/Verão 2024"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'logoUrl')}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => logoInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {page.logoUrl ? 'Alterar Logo' : 'Carregar Logo'}
          </Button>
          {page.logoUrl && (
            <div className="mt-2">
              <img
                src={page.logoUrl}
                alt="Logo"
                className="h-16 object-contain"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Imagem de Fundo</Label>
          <input
            ref={bgInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'backgroundImage')}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => bgInputRef.current?.click()}
            className="w-full"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {page.backgroundImage ? 'Alterar Imagem' : 'Carregar Imagem'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover-bg-color">Cor de Fundo</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={page.backgroundColor || primaryColor}
              onChange={(e) => onChange({ ...page, backgroundColor: e.target.value })}
              className="w-12 h-10 p-1 cursor-pointer"
            />
            <Input
              value={page.backgroundColor || primaryColor}
              onChange={(e) => onChange({ ...page, backgroundColor: e.target.value })}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="border rounded-lg overflow-hidden">
        <div className="text-xs text-muted-foreground p-2 bg-muted border-b">
          Preview da Capa
        </div>
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
            <div className="absolute inset-0 bg-black/40" />
          )}
          <div className="relative z-10 flex flex-col items-center gap-4">
            {page.logoUrl && (
              <img
                src={page.logoUrl}
                alt="Logo"
                className="h-20 object-contain"
              />
            )}
            <h1 
              className="text-2xl font-bold text-white drop-shadow-lg"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
            >
              {page.title || 'Título do Catálogo'}
            </h1>
            {page.subtitle && (
              <p 
                className="text-lg text-white/90"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
              >
                {page.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
