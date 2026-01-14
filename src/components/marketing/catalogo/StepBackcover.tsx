import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CatalogPage } from './types';
import { Phone, Mail, Globe, MapPin } from 'lucide-react';

interface StepBackcoverProps {
  page: CatalogPage;
  onChange: (page: CatalogPage) => void;
  primaryColor: string;
  logoUrl?: string;
}

export const StepBackcover: React.FC<StepBackcoverProps> = ({ 
  page, 
  onChange, 
  primaryColor,
  logoUrl 
}) => {
  const updateContact = (field: keyof CatalogPage['contactInfo'], value: string) => {
    onChange({
      ...page,
      contactInfo: {
        ...page.contactInfo,
        [field]: value,
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Contracapa</h3>
          <p className="text-sm text-muted-foreground">
            Configure as informações de contato
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Título
            </Label>
            <Input
              value={page.title || ''}
              onChange={(e) => onChange({ ...page, title: e.target.value })}
              placeholder="Ex: Entre em Contato"
              className="h-11 border-0 border-b rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Telefone
            </Label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={page.contactInfo?.phone || ''}
                onChange={(e) => updateContact('phone', e.target.value)}
                placeholder="(11) 99999-9999"
                className="pl-11 h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={page.contactInfo?.email || ''}
                onChange={(e) => updateContact('email', e.target.value)}
                placeholder="contato@empresa.com"
                className="pl-11 h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Website
            </Label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={page.contactInfo?.website || ''}
                onChange={(e) => updateContact('website', e.target.value)}
                placeholder="www.empresa.com"
                className="pl-11 h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Endereço
            </Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
              <Textarea
                value={page.contactInfo?.address || ''}
                onChange={(e) => updateContact('address', e.target.value)}
                placeholder="Rua Exemplo, 123 - Cidade - Estado"
                className="pl-11 min-h-[80px] rounded-xl resize-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Cor de Fundo
            </Label>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg shadow-sm border cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: page.backgroundColor || primaryColor }}
                onClick={() => document.getElementById('backcover-bg-color')?.click()}
              />
              <Input
                id="backcover-bg-color"
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
              className="aspect-[210/297] relative flex flex-col items-center justify-center p-12 text-center"
              style={{
                backgroundColor: page.backgroundColor || primaryColor,
              }}
            >
              <div className="flex flex-col items-center gap-8 text-white max-w-sm">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-20 object-contain drop-shadow-lg"
                  />
                )}
                
                <h2 className="text-2xl font-light tracking-wide">
                  {page.title || 'Entre em Contato'}
                </h2>

                <div className="w-12 h-px bg-white/30" />

                <div className="space-y-4 text-sm">
                  {page.contactInfo?.phone && (
                    <div className="flex items-center gap-3 justify-center text-white/90">
                      <Phone className="h-4 w-4" />
                      <span>{page.contactInfo.phone}</span>
                    </div>
                  )}
                  {page.contactInfo?.email && (
                    <div className="flex items-center gap-3 justify-center text-white/90">
                      <Mail className="h-4 w-4" />
                      <span>{page.contactInfo.email}</span>
                    </div>
                  )}
                  {page.contactInfo?.website && (
                    <div className="flex items-center gap-3 justify-center text-white/90">
                      <Globe className="h-4 w-4" />
                      <span>{page.contactInfo.website}</span>
                    </div>
                  )}
                  {page.contactInfo?.address && (
                    <div className="flex items-center gap-3 justify-center text-white/90">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="text-center">{page.contactInfo.address}</span>
                    </div>
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
