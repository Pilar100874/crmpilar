import React, { useRef } from 'react';
import { Plus, Trash2, GripVertical, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
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
  const needsOptions = ['dropdown', 'text_selection', 'image'].includes(field.type);

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

  const handleImageUpload = (index: number, file: File) => {
    const url = URL.createObjectURL(file);
    handleUpdateOption(index, { imageUrl: url });
  };

  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-start gap-3">
        <div className="cursor-grab text-muted-foreground mt-2">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={field.type}
                onValueChange={(value: FieldType) => onChange({ ...field, type: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={field.required}
                  onCheckedChange={(checked) => onChange({ ...field, required: checked })}
                />
                <Label className="text-xs">Obrigatório</Label>
              </div>
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

          {needsOptions && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Opções</Label>
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
                    
                    {field.type === 'text_selection' ? (
                      <Textarea
                        value={option.value}
                        onChange={(e) => handleUpdateOption(index, { value: e.target.value })}
                        placeholder="Digite o texto completo aqui..."
                        rows={3}
                        className="text-sm"
                      />
                    ) : (
                      <Input
                        value={option.value}
                        onChange={(e) => handleUpdateOption(index, { value: e.target.value })}
                        placeholder="Valor"
                        className="h-8 text-sm"
                      />
                    )}
                    
                    {field.type === 'image' && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={option.imageUrl || ''}
                            onChange={(e) => handleUpdateOption(index, { imageUrl: e.target.value })}
                            placeholder="URL da Imagem"
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
                                  if (file) handleImageUpload(index, file);
                                }}
                              />
                            </label>
                          </Button>
                        </div>
                        {option.imageUrl && (
                          <div className="w-10 h-10 rounded border overflow-hidden shrink-0">
                            <img 
                              src={option.imageUrl} 
                              alt={option.label} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
