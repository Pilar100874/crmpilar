import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ResourceField, FieldOption } from './types';
import { Upload, Image as ImageIcon, Music, Check } from 'lucide-react';

interface DynamicFieldRendererProps {
  field: ResourceField;
  value: any;
  onChange: (value: any) => void;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  field,
  value,
  onChange,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onChange(file);
    }
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={value || false}
              onCheckedChange={onChange}
            />
            <span className="text-sm text-muted-foreground">
              {field.placeholder || 'Ativar'}
            </span>
          </div>
        );

      case 'dropdown':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Selecione...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'image':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="relative"
                asChild
              >
                <label>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Imagem
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                  />
                </label>
              </Button>
              {value && <span className="text-sm text-muted-foreground">Arquivo selecionado</span>}
            </div>
            {previewUrl && (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="relative"
                asChild
              >
                <label>
                  <Music className="h-4 w-4 mr-2" />
                  Upload Áudio
                  <input
                    type="file"
                    accept="audio/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                  />
                </label>
              </Button>
              {value && <span className="text-sm text-muted-foreground">Arquivo selecionado</span>}
            </div>
            {previewUrl && (
              <audio controls src={previewUrl} className="w-full" />
            )}
          </div>
        );

      case 'image_selection':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {field.options?.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.value)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                  value === option.value
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {option.imageUrl ? (
                  <img
                    src={option.imageUrl}
                    alt={option.label}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <span className="text-xs text-white font-medium">{option.label}</span>
                </div>
                {value === option.value && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        );

      case 'text_selection':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {field.options?.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.value)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  value === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{option.label}</span>
                  {value === option.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                {option.value !== option.label && (
                  <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {option.value}
                  </span>
                )}
              </button>
            ))}
          </div>
        );

      default:
        return <Input value={value || ''} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      {renderField()}
    </div>
  );
};
