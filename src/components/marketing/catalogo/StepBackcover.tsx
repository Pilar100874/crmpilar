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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="backcover-title">Título</Label>
          <Input
            id="backcover-title"
            value={page.title || ''}
            onChange={(e) => onChange({ ...page, title: e.target.value })}
            placeholder="Ex: Entre em Contato"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-phone">Telefone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="contact-phone"
              value={page.contactInfo?.phone || ''}
              onChange={(e) => updateContact('phone', e.target.value)}
              placeholder="(11) 99999-9999"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="contact-email"
              value={page.contactInfo?.email || ''}
              onChange={(e) => updateContact('email', e.target.value)}
              placeholder="contato@empresa.com"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-website">Website</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="contact-website"
              value={page.contactInfo?.website || ''}
              onChange={(e) => updateContact('website', e.target.value)}
              placeholder="www.empresa.com"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-address">Endereço</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Textarea
              id="contact-address"
              value={page.contactInfo?.address || ''}
              onChange={(e) => updateContact('address', e.target.value)}
              placeholder="Rua Exemplo, 123 - Cidade - Estado"
              className="pl-10"
              rows={2}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="backcover-bg-color">Cor de Fundo</Label>
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
          Preview da Contracapa
        </div>
        <div
          className="aspect-[210/297] relative flex flex-col items-center justify-center p-8 text-center"
          style={{
            backgroundColor: page.backgroundColor || primaryColor,
          }}
        >
          <div className="flex flex-col items-center gap-6 text-white">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 object-contain"
              />
            )}
            
            <h2 className="text-xl font-bold">
              {page.title || 'Entre em Contato'}
            </h2>

            <div className="space-y-3 text-sm">
              {page.contactInfo?.phone && (
                <div className="flex items-center gap-2 justify-center">
                  <Phone className="h-4 w-4" />
                  <span>{page.contactInfo.phone}</span>
                </div>
              )}
              {page.contactInfo?.email && (
                <div className="flex items-center gap-2 justify-center">
                  <Mail className="h-4 w-4" />
                  <span>{page.contactInfo.email}</span>
                </div>
              )}
              {page.contactInfo?.website && (
                <div className="flex items-center gap-2 justify-center">
                  <Globe className="h-4 w-4" />
                  <span>{page.contactInfo.website}</span>
                </div>
              )}
              {page.contactInfo?.address && (
                <div className="flex items-center gap-2 justify-center">
                  <MapPin className="h-4 w-4" />
                  <span className="max-w-[200px]">{page.contactInfo.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
