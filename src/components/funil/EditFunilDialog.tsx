import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
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

function SortableStageRow({ id, children }: { id: string; children: React.ReactNode }) {
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

interface Stage {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  descricao?: string | null;
}

interface EditFunilDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funilId: string | null;
  onSuccess: () => void;
}

export function EditFunilDialog({ open, onOpenChange, funilId, onSuccess }: EditFunilDialogProps) {
  const [loading, setLoading] = useState(false);
  const [funilData, setFunilData] = useState({
    nome: '',
    descricao: '',
    cor: '#3b82f6',
  });
  const [stages, setStages] = useState<Stage[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#64748b');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open && funilId) {
      loadFunilData();
      loadStages();
    }
  }, [open, funilId]);

  const loadFunilData = async () => {
    if (!funilId) return;

    try {
      const { data, error } = await supabase
        .from('funis')
        .select('*')
        .eq('id', funilId)
        .single();

      if (error) throw error;

      setFunilData({
        nome: data.nome,
        descricao: data.descricao || '',
        cor: data.cor,
      });
    } catch (error) {
      console.error('Erro ao carregar funil:', error);
      toast.error('Erro ao carregar dados do funil');
    }
  };

  const loadStages = async () => {
    if (!funilId) return;

    try {
      const { data, error } = await supabase
        .from('funil_stages')
        .select('*')
        .eq('funil_id', funilId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
      toast.error('Erro ao carregar etapas');
    }
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
    if (!newStageName.trim()) return;

    const newStage: Stage = {
      id: `temp-${Date.now()}`,
      nome: newStageName.toUpperCase(),
      cor: newStageColor,
      ordem: stages.length,
    };

    setStages([...stages, newStage]);
    setNewStageName('');
    setNewStageColor('#64748b');
  };

  const handleRemoveStage = (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta etapa?')) return;
    setStages(stages.filter(s => s.id !== id));
  };

  const handleUpdateStageName = (id: string, nome: string) => {
    setStages(stages.map(s => s.id === id ? { ...s, nome: nome.toUpperCase() } : s));
  };

  const handleUpdateStageColor = (id: string, cor: string) => {
    setStages(stages.map(s => s.id === id ? { ...s, cor } : s));
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      if (!funilId) return;

      // Atualizar dados do funil
      const { error: funilError } = await supabase
        .from('funis')
        .update({
          nome: funilData.nome,
          descricao: funilData.descricao,
          cor: funilData.cor,
        })
        .eq('id', funilId);

      if (funilError) throw funilError;

      // Buscar etapas existentes
      const { data: existingStages, error: fetchError } = await supabase
        .from('funil_stages')
        .select('id')
        .eq('funil_id', funilId);

      if (fetchError) throw fetchError;

      const existingIds = new Set(existingStages?.map(s => s.id) || []);
      const currentIds = new Set(stages.filter(s => !s.id.startsWith('temp-')).map(s => s.id));

      // Deletar etapas removidas
      const toDelete = [...existingIds].filter(id => !currentIds.has(id));
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('funil_stages')
          .delete()
          .in('id', toDelete);

        if (deleteError) throw deleteError;
      }

      // Atualizar e inserir etapas
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const stageData = {
          funil_id: funilId,
          nome: stage.nome,
          cor: stage.cor,
          ordem: i,
        };

        if (stage.id.startsWith('temp-')) {
          // Inserir nova etapa
          const { error: insertError } = await supabase
            .from('funil_stages')
            .insert(stageData);

          if (insertError) throw insertError;
        } else {
          // Atualizar etapa existente
          const { error: updateError } = await supabase
            .from('funil_stages')
            .update(stageData)
            .eq('id', stage.id);

          if (updateError) throw updateError;
        }
      }

      toast.success('Funil e etapas atualizados com sucesso');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Funil e Etapas</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="funil" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="funil">Dados do Funil</TabsTrigger>
            <TabsTrigger value="etapas">Etapas ({stages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="funil" className="flex-1 overflow-y-auto space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label>Nome do Funil *</Label>
                <Input
                  value={funilData.nome}
                  onChange={(e) => setFunilData({ ...funilData, nome: e.target.value })}
                  placeholder="Ex: Vendas B2B"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={funilData.descricao}
                  onChange={(e) => setFunilData({ ...funilData, descricao: e.target.value })}
                  placeholder="Descreva o propósito deste funil"
                  rows={3}
                />
              </div>

              <div>
                <Label>Cor do Funil</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={funilData.cor}
                    onChange={(e) => setFunilData({ ...funilData, cor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <div 
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: funilData.cor }}
                  />
                  <span className="text-sm text-muted-foreground">{funilData.cor}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="etapas" className="flex-1 overflow-y-auto space-y-4 mt-4">
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
                  {stages.map((stage, index) => (
                    <SortableStageRow key={stage.id} id={stage.id}>
                      <Card className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="cursor-grab active:cursor-grabbing text-muted-foreground">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          
                          <Badge variant="outline" className="text-xs min-w-[70px]">
                            Etapa {index + 1}
                          </Badge>

                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={stage.nome}
                              onChange={(e) => handleUpdateStageName(stage.id, e.target.value)}
                              placeholder="Nome da etapa"
                              className="flex-1"
                            />
                            
                            <Input
                              type="color"
                              value={stage.cor}
                              onChange={(e) => handleUpdateStageColor(stage.id, e.target.value)}
                              className="w-16 h-9"
                            />
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveStage(stage.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    </SortableStageRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Card className="p-3 border-dashed">
              <div className="space-y-2">
                <Label className="text-sm">Nova Etapa</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nome da etapa..."
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddStage()}
                    className="flex-1"
                  />
                  <Input
                    type="color"
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="w-16 h-9"
                  />
                  <Button 
                    onClick={handleAddStage}
                    disabled={!newStageName.trim()}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </Card>

            <div className="bg-muted/50 p-3 rounded-sm text-sm space-y-2">
              <p className="font-semibold">💡 Dicas:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                <li>Arraste as etapas para reordenar</li>
                <li>Personalize o nome e cor de cada etapa</li>
                <li>Adicione quantas etapas precisar</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
