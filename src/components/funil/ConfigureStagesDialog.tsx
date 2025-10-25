import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Plus, Trash2, AlertCircle } from 'lucide-react';
import { FunilStage } from '@/types/funil';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable row component
function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}


interface StageConfig {
  id: FunilStage | string;
  title: string;
  isDefault: boolean;
}

interface ConfigureStagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (stages: StageConfig[], moves: { from: string; to: string }[]) => void;
  currentDeals: Array<{ id: string; stage?: FunilStage | string }>;
  initialStages: StageConfig[];
}

const defaultStages: StageConfig[] = [
  { id: 'lead', title: 'ETAPA DE LEADS DE ENTRADA', isDefault: true },
  { id: 'qualificacao', title: 'CONTATO INICIAL', isDefault: true },
  { id: 'proposta', title: 'DISCUSSÕES', isDefault: true },
  { id: 'negociacao', title: 'TOMADA DE DECISÃO', isDefault: true },
  { id: 'fechamento', title: 'DISCUSSÃO DE CONTRATO', isDefault: true },
];

export function ConfigureStagesDialog({ open, onOpenChange, onSave, currentDeals, initialStages }: ConfigureStagesDialogProps) {
  const [stages, setStages] = useState<StageConfig[]>(initialStages);
  const [newStageTitle, setNewStageTitle] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<StageConfig | null>(null);
  const [targetStageId, setTargetStageId] = useState<string>('');
  const [moves, setMoves] = useState<{ from: string; to: string }[]>([]);

  // Atualiza stages quando initialStages mudar
  useEffect(() => {
    setStages(initialStages);
  }, [initialStages]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getDealCountForStage = (stageId: string): number => {
    return currentDeals.filter(deal => deal.stage === stageId).length;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setStages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

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
    const stage = stages.find(s => s.id === id);
    if (!stage) return;

    const dealCount = getDealCountForStage(id);
    
    if (dealCount > 0) {
      // Se houver negócios, abre o diálogo de confirmação
      setStageToDelete(stage);
      setTargetStageId(''); // Reset
      setDeleteConfirmOpen(true);
    } else {
      // Se não houver negócios, pede confirmação simples
      setStageToDelete(stage);
      setTargetStageId('none'); // Indica que não há necessidade de mover
      setDeleteConfirmOpen(true);
    }
  };

  const confirmDelete = () => {
    if (!stageToDelete) return;

    const dealCount = getDealCountForStage(stageToDelete.id);

    if (dealCount > 0 && !targetStageId) {
      return; // Não permite deletar sem escolher uma etapa de destino
    }

  // Remove a etapa
    setStages(stages.filter(s => s.id !== stageToDelete.id));
    
    // Registra movimentação caso haja negócios
    if (dealCount > 0 && targetStageId) {
      setMoves(prev => [...prev, { from: String(stageToDelete.id), to: targetStageId }]);
    }
    
    // Fecha o diálogo
    setDeleteConfirmOpen(false);
    setStageToDelete(null);
    setTargetStageId('');

  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setStageToDelete(null);
    setTargetStageId('');
  };

  const handleUpdateStageTitle = (id: string, newTitle: string) => {
    setStages(stages.map(s => 
      s.id === id ? { ...s, title: newTitle.toUpperCase() } : s
    ));
  };

  const handleSave = () => {
    onSave(stages, moves);
    onOpenChange(false);
  };

  const handleReset = () => {
    setStages(defaultStages);
  };

  const dealCountForDeletedStage = stageToDelete ? getDealCountForStage(stageToDelete.id) : 0;
  const availableTargetStages = stages.filter(s => s.id !== stageToDelete?.id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Configurar Etapas do Funil</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Lista de etapas com drag & drop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={stages.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {stages.map((stage, index) => {
                    const dealCount = getDealCountForStage(stage.id as string);
                    return (
                      <SortableRow key={String(stage.id)} id={String(stage.id)}>
                        <Card className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="cursor-grab active:cursor-grabbing text-muted-foreground">
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
                                {dealCount > 0 && (
                                  <Badge className="text-xs">
                                    {dealCount} negócio{dealCount !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              <Input
                                value={stage.title}
                                onChange={(e) => handleUpdateStageTitle(stage.id as string, e.target.value)}
                                placeholder="Nome da etapa"
                                className="font-medium"
                              />
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveStage(stage.id as string)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      </SortableRow>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>

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
                <li>Arraste as etapas para reordenar</li>
                <li>Você pode renomear qualquer etapa</li>
                <li>Ao excluir uma etapa com negócios, escolha para onde movê-los</li>
                <li>Sempre confirme antes de excluir</li>
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

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Tem certeza que deseja excluir a etapa{' '}
                <strong className="text-foreground">{stageToDelete?.title}</strong>?
              </p>
              
              {dealCountForDeletedStage > 0 && (
                <>
                  <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-sm border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-900 dark:text-orange-100">
                      ⚠️ Existem <strong>{dealCountForDeletedStage} negócio{dealCountForDeletedStage !== 1 ? 's' : ''}</strong> nesta etapa.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target-stage" className="text-foreground">
                      Para qual etapa deseja mover os negócios?
                    </Label>
                    <Select value={targetStageId} onValueChange={setTargetStageId}>
                      <SelectTrigger id="target-stage">
                        <SelectValue placeholder="Selecione uma etapa" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTargetStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {dealCountForDeletedStage === 0 && (
                <p className="text-sm text-muted-foreground">
                  Esta etapa não possui negócios e pode ser excluída com segurança.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={dealCountForDeletedStage > 0 && !targetStageId}
            >
              Excluir Etapa
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
