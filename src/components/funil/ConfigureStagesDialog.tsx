import { useState } from 'react';
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
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { FunilStage } from '@/types/funil';

interface StageConfig {
  id: FunilStage | string;
  title: string;
  isDefault: boolean;
}

interface ConfigureStagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (stages: StageConfig[]) => void;
}

const defaultStages: StageConfig[] = [
  { id: 'lead', title: 'ETAPA DE LEADS DE ENTRADA', isDefault: true },
  { id: 'qualificacao', title: 'CONTATO INICIAL', isDefault: true },
  { id: 'proposta', title: 'DISCUSSÕES', isDefault: true },
  { id: 'negociacao', title: 'TOMADA DE DECISÃO', isDefault: true },
  { id: 'fechamento', title: 'DISCUSSÃO DE CONTRATO', isDefault: true },
];

export function ConfigureStagesDialog({ open, onOpenChange, onSave }: ConfigureStagesDialogProps) {
  const [stages, setStages] = useState<StageConfig[]>(defaultStages);
  const [newStageTitle, setNewStageTitle] = useState('');

  const handleAddStage = () => {
    if (newStageTitle.trim()) {
      const newStage: StageConfig = {
        id: `custom-${Date.now()}`,
        title: newStageTitle.toUpperCase(),
        isDefault: false,
      };
      setStages([...stages, newStage]);
      setNewStageTitle('');
    }
  };

  const handleRemoveStage = (id: string) => {
    setStages(stages.filter(s => s.id !== id));
  };

  const handleUpdateStageTitle = (id: string, newTitle: string) => {
    setStages(stages.map(s => 
      s.id === id ? { ...s, title: newTitle.toUpperCase() } : s
    ));
  };

  const handleSave = () => {
    onSave(stages);
    onOpenChange(false);
  };

  const handleReset = () => {
    setStages(defaultStages);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurar Etapas do Funil</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Lista de etapas */}
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <Card key={stage.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="cursor-grab text-muted-foreground">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Etapa {index + 1}
                      </Badge>
                      {stage.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Padrão
                        </Badge>
                      )}
                    </div>
                    <Input
                      value={stage.title}
                      onChange={(e) => handleUpdateStageTitle(stage.id, e.target.value)}
                      placeholder="Nome da etapa"
                      className="font-medium"
                    />
                  </div>

                  {!stage.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStage(stage.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Adicionar nova etapa */}
          <Card className="p-3 border-dashed">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nome da nova etapa..."
                value={newStageTitle}
                onChange={(e) => setNewStageTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddStage()}
              />
              <Button 
                onClick={handleAddStage}
                disabled={!newStageTitle.trim()}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
          </Card>

          {/* Informações */}
          <div className="bg-muted/50 p-4 rounded-sm space-y-2 text-sm">
            <p className="font-semibold">💡 Dicas:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Arraste as etapas para reordenar (em breve)</li>
              <li>Etapas padrão não podem ser removidas</li>
              <li>Você pode renomear qualquer etapa</li>
              <li>Etapas customizadas podem ser removidas</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            Restaurar Padrão
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
