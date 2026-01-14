import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CatalogConfig, FONT_OPTIONS } from './types';

interface StepInfoProps {
  config: CatalogConfig;
  onChange: (config: Partial<CatalogConfig>) => void;
}

export const StepInfo: React.FC<StepInfoProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="catalog-name">Nome do Catálogo</Label>
        <Input
          id="catalog-name"
          value={config.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex: Catálogo Primavera 2024"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primary-color">Cor Primária</Label>
          <div className="flex gap-2">
            <Input
              id="primary-color"
              type="color"
              value={config.primaryColor}
              onChange={(e) => onChange({ primaryColor: e.target.value })}
              className="w-12 h-10 p-1 cursor-pointer"
            />
            <Input
              value={config.primaryColor}
              onChange={(e) => onChange({ primaryColor: e.target.value })}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondary-color">Cor Secundária</Label>
          <div className="flex gap-2">
            <Input
              id="secondary-color"
              type="color"
              value={config.secondaryColor}
              onChange={(e) => onChange({ secondaryColor: e.target.value })}
              className="w-12 h-10 p-1 cursor-pointer"
            />
            <Input
              value={config.secondaryColor}
              onChange={(e) => onChange({ secondaryColor: e.target.value })}
              placeholder="#666666"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Fonte</Label>
        <Select value={config.fontFamily} onValueChange={(v) => onChange({ fontFamily: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="show-prices">Exibir Preços</Label>
          <p className="text-sm text-muted-foreground">Mostrar preços dos produtos no catálogo</p>
        </div>
        <Switch
          id="show-prices"
          checked={config.showPrices}
          onCheckedChange={(v) => onChange({ showPrices: v })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="show-codes">Exibir Códigos</Label>
          <p className="text-sm text-muted-foreground">Mostrar código/SKU dos produtos</p>
        </div>
        <Switch
          id="show-codes"
          checked={config.showCodes}
          onCheckedChange={(v) => onChange({ showCodes: v })}
        />
      </div>
    </div>
  );
};
