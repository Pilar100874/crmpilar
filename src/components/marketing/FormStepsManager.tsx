import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FormStep, ResourceField, FieldType, FIELD_TYPE_LABELS, FIELD_TYPE_DESCRIPTIONS, FIELD_TYPE_CATEGORIES } from './types';
import { ResourceFieldEditor } from './ResourceFieldEditor';

interface FormStepsManagerProps {
  steps: FormStep[];
  fields: ResourceField[];
  onStepsChange: (steps: FormStep[]) => void;
  onFieldsChange: (fields: ResourceField[]) => void;
}

export const FormStepsManager: React.FC<FormStepsManagerProps> = ({
  steps,
  fields,
  onStepsChange,
  onFieldsChange,
}) => {
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});

  const handleAddStep = () => {
    const newStep: FormStep = {
      id: crypto.randomUUID(),
      number: steps.length + 1,
      title: `Etapa ${steps.length + 1}`,
      description: '',
    };
    onStepsChange([...steps, newStep]);
    setOpenSteps(prev => ({ ...prev, [newStep.id]: true }));
  };

  const handleUpdateStep = (index: number, updates: Partial<FormStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onStepsChange(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    const stepToRemove = steps[index];
    // Remove fields belonging to this step
    const newFields = fields.filter(f => f.stepId !== stepToRemove.id);
    onFieldsChange(newFields);
    
    const newSteps = steps.filter((_, i) => i !== index).map((step, i) => ({
      ...step,
      number: i + 1,
    }));
    onStepsChange(newSteps);
  };

  const handleAddFieldToStep = (stepId: string, type: FieldType) => {
    const newField: ResourceField = {
      id: crypto.randomUUID(),
      name: '',
      label: FIELD_TYPE_LABELS[type],
      type,
      required: false,
      stepId,
    };
    onFieldsChange([...fields, newField]);
  };

  const handleUpdateField = (fieldId: string, updatedField: ResourceField) => {
    onFieldsChange(fields.map(f => f.id === fieldId ? updatedField : f));
  };

  const handleRemoveField = (fieldId: string) => {
    onFieldsChange(fields.filter(f => f.id !== fieldId));
  };

  const getFieldsForStep = (stepId: string) => {
    return fields.filter((f) => f.stepId === stepId);
  };

  const toggleStep = (stepId: string) => {
    setOpenSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-sm">Etapas do Formulário</h4>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddStep}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Etapa
        </Button>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
          <Info className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">Nenhuma etapa configurada</p>
          <p className="text-xs mt-1">
            Adicione etapas para organizar o formulário em seções
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const stepFields = getFieldsForStep(step.id);
            const isOpen = openSteps[step.id] ?? true;
            
            return (
              <Collapsible key={step.id} open={isOpen} onOpenChange={() => toggleStep(step.id)}>
                <Card className="border-primary/20">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 cursor-move">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center rounded-full">
                          {step.number}
                        </Badge>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={step.title}
                          onChange={(e) => handleUpdateStep(index, { title: e.target.value })}
                          placeholder="Título da etapa"
                          className="h-8 font-medium"
                        />
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveStep(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent className="py-3 px-4 pt-0 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Texto informativo (exibido no início da etapa)
                        </Label>
                        <Textarea
                          value={step.description || ''}
                          onChange={(e) => handleUpdateStep(index, { description: e.target.value })}
                          placeholder="Ex: Nesta etapa, você irá fornecer as informações básicas do produto..."
                          rows={2}
                          className="resize-none text-sm"
                        />
                      </div>

                      {/* Fields in this step */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">
                            Campos desta etapa ({stepFields.length})
                          </Label>
                        </div>
                        
                        {stepFields.length > 0 && (
                          <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                            {stepFields.map((field) => (
                              <ResourceFieldEditor
                                key={field.id}
                                field={field}
                                onChange={(updated) => handleUpdateField(field.id, updated)}
                                onRemove={() => handleRemoveField(field.id)}
                              />
                            ))}
                          </div>
                        )}

                        {/* Add field buttons */}
                        <div className="pt-2 border-t border-dashed">
                          <p className="text-xs text-muted-foreground mb-2">Adicionar campo:</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(FIELD_TYPE_CATEGORIES).flatMap(([_, category]) =>
                              category.types.map((type) => (
                                <Button
                                  key={type}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleAddFieldToStep(step.id, type)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  {FIELD_TYPE_LABELS[type]}
                                </Button>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};
