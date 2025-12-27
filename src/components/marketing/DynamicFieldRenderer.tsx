import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResourceField } from './types';
import { Upload, Image as ImageIcon, Music, Check, Link, Search, Package, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DynamicFieldRendererProps {
  field: ResourceField;
  value: any;
  onChange: (value: any) => void;
}

interface Produto {
  id: string;
  nome: string;
  foto_url?: string | null;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  field,
  value,
  onChange,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [imageSelectionMode, setImageSelectionMode] = useState<'options' | 'upload' | 'url'>('options');
  const [imageUrl, setImageUrl] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchProduto, setSearchProduto] = useState('');
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

  useEffect(() => {
    // Removed product loading as product types were removed
  }, [field.type]);

  const loadProdutos = async () => {
    setLoadingProdutos(true);
    try {
      const { data } = await supabase
        .from('produtos')
        .select('id, nome, foto_url')
        .limit(50);
      
      if (data) {
        setProdutos(data as Produto[]);
      }
    } catch (error) {
      console.error('Error loading produtos:', error);
    } finally {
      setLoadingProdutos(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onChange({ type: 'file', file, previewUrl: url });
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    if (url) {
      setPreviewUrl(url);
      onChange({ type: 'url', url });
    }
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomImagePreview(url);
      onChange({ type: 'file', file, previewUrl: url });
    }
  };

  const handleCustomImageUrlChange = (url: string) => {
    setCustomImageUrl(url);
    if (url) {
      setCustomImagePreview(url);
      onChange({ type: 'url', url });
    }
  };

  const handleSelectProduto = (produto: Produto) => {
    setSelectedProduto(produto);
    onChange({ productId: produto.id, productName: produto.nome, value: produto.nome });
  };

  const handleSelectProdutoImage = (produto: Produto, imageUrl: string) => {
    setSelectedProduto(produto);
    onChange({ productId: produto.id, productName: produto.nome, imageUrl, value: imageUrl });
  };

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchProduto.toLowerCase())
  );

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
        const hasOptions = field.options && field.options.length > 0;
        const tabCount = hasOptions ? 3 : 2;
        
        return (
          <div className="space-y-4">
            <Tabs 
              value={hasOptions ? imageSelectionMode : imageInputMode} 
              onValueChange={(v) => {
                if (hasOptions) {
                  setImageSelectionMode(v as 'options' | 'upload' | 'url');
                } else {
                  setImageInputMode(v as 'upload' | 'url');
                }
              }}
            >
              <TabsList className={`grid w-full max-w-md ${hasOptions ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {hasOptions && (
                  <TabsTrigger value="options" className="gap-2">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Opções
                  </TabsTrigger>
                )}
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <Link className="h-3.5 w-3.5" />
                  URL
                </TabsTrigger>
              </TabsList>

              {hasOptions && (
                <TabsContent value="options" className="mt-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {field.options!.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setPreviewUrl(null);
                          setCustomImagePreview(null);
                          onChange(option.imageUrl || option.value);
                        }}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                          value === (option.imageUrl || option.value)
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
                        {value === (option.imageUrl || option.value) && (
                          <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </TabsContent>
              )}

              <TabsContent value="upload" className="mt-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="relative"
                      asChild
                    >
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Escolher Arquivo
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </Button>
                    {value?.type === 'file' && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Arquivo selecionado
                      </span>
                    )}
                  </div>
                  {previewUrl && (
                    <div className="relative w-40 h-40 rounded-lg overflow-hidden border bg-muted">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="url" className="mt-3">
                <div className="space-y-3">
                  <Input
                    value={imageUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                  {previewUrl && (
                    <div className="relative w-40 h-40 rounded-lg overflow-hidden border bg-muted">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
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
