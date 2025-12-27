import React from 'react';
import { Plus, Trash2, GripVertical, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormStep, ResourceField } from './types';

interface FormStepsManagerProps {
  steps: FormStep[];
  fields: ResourceField[];
  onStepsChange: (steps: FormStep[]) => void;
  onFieldStepChange: (fieldId: string, stepId: string | undefined) => void;
}

export const FormStepsManager: React.FC<FormStepsManagerProps> = ({
  steps,
  fields,
  onStepsChange,
  onFieldStepChange,
}) => {
  const handleAddStep = () => {
    const newStep: FormStep = {
      id: crypto.randomUUID(),
      number: steps.length + 1,
      title: `Etapa ${steps.length + 1}`,
      description: '',
    };
    onStepsChange([...steps, newStep]);
  };

  const handleUpdateStep = (index: number, updates: Partial<FormStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onStepsChange(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    const stepToRemove = steps[index];
    // Remove step assignment from fields
    fields.forEach((field) => {
      if (field.stepId === stepToRemove.id) {
        onFieldStepChange(field.id, undefined);
      }
    });
    
    const newSteps = steps.filter((_, i) => i !== index).map((step, i) => ({
      ...step,
      number: i + 1,
    }));
    onStepsChange(newSteps);
  };

  const getFieldsForStep = (stepId: string) => {
    return fields.filter((f) => f.stepId === stepId);
  };

  const getUnassignedFields = () => {
    return fields.filter((f) => !f.stepId || !steps.find((s) => s.id === f.stepId));
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
          {steps.map((step, index) => (
            <Card key={step.id} className="border-primary/20">
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
              <CardContent className="py-3 px-4 pt-0 space-y-3">
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

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Campos nesta etapa ({getFieldsForStep(step.id).length})
                  </Label>
                  {getFieldsForStep(step.id).length === 0 ? (
                    <p className="text-xs text-muted-foreground/70 italic">
                      Nenhum campo atribuído a esta etapa
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {getFieldsForStep(step.id).map((field) => (
                        <Badge key={field.id} variant="outline" className="text-xs">
                          {field.label || field.name || 'Campo sem nome'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {getUnassignedFields().length > 0 && steps.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Info className="h-4 w-4" />
            {getUnassignedFields().length} campo(s) não atribuído(s) a nenhuma etapa
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {getUnassignedFields().map((field) => (
              <Badge key={field.id} variant="secondary" className="text-xs">
                {field.label || field.name || 'Campo sem nome'}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
