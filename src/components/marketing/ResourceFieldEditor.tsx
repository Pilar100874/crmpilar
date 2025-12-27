import React from 'react';
import { Plus, Trash2, GripVertical, Upload, Image as ImageIcon, Music, FileText, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResourceField, FieldType, FIELD_TYPE_LABELS, FieldOption } from './types';

interface ResourceFieldEditorProps {
  field: ResourceField;
  onChange: (field: ResourceField) => void;
  onRemove: () => void;
}

export const ResourceFieldEditor: React.FC<ResourceFieldEditorProps> = ({
  field,
  onChange,
  onRemove,
}) => {
  const needsOptions = ['dropdown', 'selection_image', 'selection_audio', 'selection_text'].includes(field.type);

  const handleAddOption = () => {
    const newOption: FieldOption = {
      id: crypto.randomUUID(),
      label: '',
      value: '',
    };
    onChange({
      ...field,
      options: [...(field.options || []), newOption],
    });
  };

  const handleUpdateOption = (index: number, updates: Partial<FieldOption>) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = { ...newOptions[index], ...updates };
    onChange({ ...field, options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = (field.options || []).filter((_, i) => i !== index);
    onChange({ ...field, options: newOptions });
  };

  const handleFileUpload = (index: number, file: File, type: 'image' | 'audio') => {
    const url = URL.createObjectURL(file);
    if (type === 'image') {
      handleUpdateOption(index, { imageUrl: url });
    } else {
      handleUpdateOption(index, { audioUrl: url });
    }
  };

  const renderSelectionOptions = () => {
    if (!needsOptions) return null;

    return (
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">
            {field.type === 'selection_image' && 'Imagens para Seleção'}
            {field.type === 'selection_audio' && 'Áudios para Seleção'}
            {field.type === 'selection_text' && 'Textos para Seleção'}
            {field.type === 'dropdown' && 'Opções'}
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {(field.options || []).map((option, index) => (
            <div key={option.id} className="space-y-2 p-3 bg-background rounded-lg border">
              <div className="flex gap-2">
                <Input
                  value={option.label}
                  onChange={(e) => handleUpdateOption(index, { label: e.target.value })}
                  placeholder="Título/Label"
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveOption(index)}
                  className="h-8 w-8 p-0 text-destructive shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              
              {/* Dropdown - apenas valor texto */}
              {field.type === 'dropdown' && (
                <Input
                  value={option.value}
                  onChange={(e) => handleUpdateOption(index, { value: e.target.value })}
                  placeholder="Valor"
                  className="h-8 text-sm"
                />
              )}

              {/* Seleção de Texto - textarea para texto longo */}
              {field.type === 'selection_text' && (
                <Textarea
                  value={option.value}
                  onChange={(e) => handleUpdateOption(index, { value: e.target.value })}
                  placeholder="Digite o texto completo aqui..."
                  rows={4}
                  className="text-sm"
                />
              )}
              
              {/* Seleção de Imagem - upload de imagem */}
              {field.type === 'selection_image' && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={option.imageUrl || ''}
                      onChange={(e) => handleUpdateOption(index, { imageUrl: e.target.value })}
                      placeholder="URL da Imagem ou faça upload"
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 relative shrink-0"
                      asChild
                    >
                      <label className="cursor-pointer">
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(index, file, 'image');
                          }}
                        />
                      </label>
                    </Button>
                  </div>
                  {option.imageUrl && (
                    <div className="w-12 h-12 rounded border overflow-hidden shrink-0">
                      <img 
                        src={option.imageUrl} 
                        alt={option.label} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Seleção de Áudio - upload de áudio */}
              {field.type === 'selection_audio' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={option.audioUrl || ''}
                      onChange={(e) => handleUpdateOption(index, { audioUrl: e.target.value })}
                      placeholder="URL do Áudio ou faça upload"
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 relative shrink-0"
                      asChild
                    >
                      <label className="cursor-pointer">
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                        <input
                          type="file"
                          accept="audio/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(index, file, 'audio');
                          }}
                        />
                      </label>
                    </Button>
                  </div>
                  {option.audioUrl && (
                    <audio controls className="w-full h-8">
                      <source src={option.audioUrl} />
                    </audio>
                  )}
                </div>
              )}
            </div>
          ))}

          {(field.options?.length || 0) === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm border border-dashed rounded-lg">
              {field.type === 'selection_image' && 'Adicione imagens para o usuário escolher'}
              {field.type === 'selection_audio' && 'Adicione áudios para o usuário escolher'}
              {field.type === 'selection_text' && 'Adicione textos para o usuário escolher'}
              {field.type === 'dropdown' && 'Adicione opções para a lista'}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-start gap-3">
        <div className="cursor-grab text-muted-foreground mt-2">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Campo</Label>
              <Input
                value={field.name}
                onChange={(e) => onChange({ ...field, name: e.target.value })}
                placeholder="nome_campo"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Label (Exibição)</Label>
              <Input
                value={field.label}
                onChange={(e) => onChange({ ...field, label: e.target.value })}
                placeholder="Nome do Campo"
                className="h-9"
              />
            </div>
          </div>

          {/* Tipo do Campo - Apenas exibição */}
          <div className="flex items-center gap-2">
            <Label className="text-xs">Tipo:</Label>
            <Badge variant="secondary" className="text-xs">
              {FIELD_TYPE_LABELS[field.type]}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => onChange({ ...field, required: checked })}
              />
              <Label className="text-xs">Obrigatório</Label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Texto de Apoio</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
              placeholder="Digite aqui..."
              className="h-9"
            />
          </div>

          {/* Info para tipos de mídia */}
          {['media_image', 'media_audio', 'media_video'].includes(field.type) && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {field.type === 'media_image' && '📷 O usuário irá fazer upload de uma imagem ao usar este recurso.'}
                {field.type === 'media_audio' && '🎵 O usuário irá fazer upload de um áudio ao usar este recurso.'}
                {field.type === 'media_video' && '🎬 O usuário irá fazer upload de um vídeo ao usar este recurso.'}
              </p>
            </div>
          )}

          {/* Opções para tipos de seleção */}
          {renderSelectionOptions()}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};