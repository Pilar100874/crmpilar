import React, { useState, useEffect } from 'react';
import { Plus, Save, X, Wand2, Image, FileText, List, Package, Sparkles } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResourceFieldEditor } from './ResourceFieldEditor';
import { 
  MarketingResource, 
  ResourceField, 
  ReturnType, 
  FieldType,
  RETURN_TYPE_LABELS, 
  FIELD_TYPE_LABELS,
  FIELD_TYPE_DESCRIPTIONS,
  FIELD_TYPE_CATEGORIES 
} from './types';

interface ResourceFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (resource: MarketingResource) => void;
  resource?: MarketingResource;
}

const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
  const icons: Record<string, React.ReactNode> = {
    basic: <FileText className="h-4 w-4" />,
    media: <Image className="h-4 w-4" />,
    selection: <List className="h-4 w-4" />,
    product: <Package className="h-4 w-4" />,
  };
  return <>{icons[category] || <FileText className="h-4 w-4" />}</>;
};

export const ResourceFormDialog: React.FC<ResourceFormDialogProps> = ({
  open,
  onClose,
  onSave,
  resource,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<ResourceField[]>([]);
  const [returnType, setReturnType] = useState<ReturnType>('text');
  const [saveLocation, setSaveLocation] = useState('');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [activeFieldTab, setActiveFieldTab] = useState('basic');

  useEffect(() => {
    if (resource) {
      setName(resource.name);
      setDescription(resource.description || '');
      setFields(resource.fields);
      setReturnType(resource.returnType);
      setSaveLocation(resource.saveLocation || '');
      setN8nWebhookUrl(resource.n8nWebhookUrl || '');
    } else {
      setName('');
      setDescription('');
      setFields([]);
      setReturnType('text');
      setSaveLocation('');
      setN8nWebhookUrl('');
    }
  }, [resource, open]);

  const handleAddField = (type: FieldType) => {
    const newField: ResourceField = {
      id: crypto.randomUUID(),
      name: '',
      label: FIELD_TYPE_LABELS[type],
      type,
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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            {resource ? 'Editar Recurso' : 'Novo Recurso de Marketing'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configure os campos que serão usados para gerar conteúdo com IA
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 py-6 space-y-8">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Informações Básicas</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nome do Recurso *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Gerador de Posts para Instagram"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo de Retorno *</Label>
                  <Select value={returnType} onValueChange={(v: ReturnType) => setReturnType(v)}>
                    <SelectTrigger className="h-11">
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
                <Label className="text-sm font-medium">Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o que este recurso faz e como ele ajuda na criação de conteúdo..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">URL Webhook n8n</Label>
                  <Input
                    value={n8nWebhookUrl}
                    onChange={(e) => setN8nWebhookUrl(e.target.value)}
                    placeholder="https://n8n.exemplo.com/webhook/..."
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Local para Salvar</Label>
                  <Input
                    value={saveLocation}
                    onChange={(e) => setSaveLocation(e.target.value)}
                    placeholder="Ex: storage/marketing/posts"
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Fields Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Campos do Formulário</h3>
                  <Badge variant="secondary" className="ml-2">
                    {fields.length} campo{fields.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              {/* Field Type Selector */}
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Clique em um tipo de campo para adicioná-lo ao formulário:
                  </p>
                  <Tabs value={activeFieldTab} onValueChange={setActiveFieldTab}>
                    <TabsList className="grid grid-cols-4 mb-4">
                      {Object.entries(FIELD_TYPE_CATEGORIES).map(([key, category]) => (
                        <TabsTrigger key={key} value={key} className="gap-2 text-xs sm:text-sm">
                          <CategoryIcon category={key} />
                          <span className="hidden sm:inline">{category.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {Object.entries(FIELD_TYPE_CATEGORIES).map(([key, category]) => (
                      <TabsContent key={key} value={key} className="mt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {category.types.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => handleAddField(type)}
                              className="flex flex-col items-start p-3 rounded-lg border bg-background hover:bg-accent hover:border-primary/50 transition-all text-left group"
                            >
                              <span className="font-medium text-sm group-hover:text-primary transition-colors">
                                {FIELD_TYPE_LABELS[type]}
                              </span>
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {FIELD_TYPE_DESCRIPTIONS[type]}
                              </span>
                            </button>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* Added Fields */}
              {fields.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                  <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Nenhum campo adicionado</p>
                  <p className="text-xs mt-1">Selecione um tipo de campo acima para começar</p>
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

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Recurso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
