import React, { useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResourceFieldEditor } from './ResourceFieldEditor';
import { MarketingResource, ResourceField, ReturnType, RETURN_TYPE_LABELS } from './types';

interface ResourceFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (resource: MarketingResource) => void;
  resource?: MarketingResource;
}

export const ResourceFormDialog: React.FC<ResourceFormDialogProps> = ({
  open,
  onClose,
  onSave,
  resource,
}) => {
  const [name, setName] = useState(resource?.name || '');
  const [description, setDescription] = useState(resource?.description || '');
  const [fields, setFields] = useState<ResourceField[]>(resource?.fields || []);
  const [returnType, setReturnType] = useState<ReturnType>(resource?.returnType || 'text');
  const [saveLocation, setSaveLocation] = useState(resource?.saveLocation || '');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(resource?.n8nWebhookUrl || '');

  const handleAddField = () => {
    const newField: ResourceField = {
      id: crypto.randomUUID(),
      name: '',
      label: '',
      type: 'text',
      required: false,
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (index: number, updatedField: ResourceField) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    setFields(newFields);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const newResource: MarketingResource = {
      id: resource?.id || crypto.randomUUID(),
      name,
      description,
      fields,
      returnType,
      saveLocation,
      n8nWebhookUrl,
      createdAt: resource?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(newResource);
    onClose();
  };

  const isValid = name.trim() && fields.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            {resource ? 'Editar Recurso' : 'Novo Recurso de Marketing'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6 py-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Recurso *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Gerador de Posts"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Retorno *</Label>
                <Select value={returnType} onValueChange={(v: ReturnType) => setReturnType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RETURN_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que este recurso faz..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL Webhook n8n</Label>
                <Input
                  value={n8nWebhookUrl}
                  onChange={(e) => setN8nWebhookUrl(e.target.value)}
                  placeholder="https://n8n.exemplo.com/webhook/..."
                />
              </div>

              <div className="space-y-2">
                <Label>Local para Salvar</Label>
                <Input
                  value={saveLocation}
                  onChange={(e) => setSaveLocation(e.target.value)}
                  placeholder="Ex: storage/marketing/posts"
                />
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Campos do Formulário</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddField}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Campo
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <p className="text-sm">Nenhum campo adicionado</p>
                  <p className="text-xs mt-1">Clique em "Adicionar Campo" para começar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <ResourceFieldEditor
                      key={field.id}
                      field={field}
                      onChange={(updated) => handleUpdateField(index, updated)}
                      onRemove={() => handleRemoveField(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            <Save className="h-4 w-4 mr-1" />
            Salvar Recurso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
