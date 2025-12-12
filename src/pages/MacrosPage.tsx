import React, { useState, useEffect, useRef } from 'react';
import { useMacro } from '@/contexts/MacroContext';
import { useMacroRecorder } from '@/hooks/useMacroRecorder';
import { useShortcutCapture } from '@/hooks/useMacroHotkeys';
import { Macro, MacroStep } from '@/types/macro';
import { getStepLabel } from '@/services/macroEngine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Circle,
  Square,
  Play,
  Pause,
  Trash2,
  Copy,
  Download,
  Upload,
  Edit2,
  MoreVertical,
  Keyboard,
  Clock,
  MousePointer,
  Type,
  ToggleLeft,
  List,
  Navigation,
  Zap,
  Timer,
  GripVertical,
  X,
  Plus,
  Search,
  AlertTriangle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Ícone por tipo de step
const stepTypeIcons: Record<string, React.ReactNode> = {
  click: <MousePointer className="h-4 w-4" />,
  setValue: <Type className="h-4 w-4" />,
  toggle: <ToggleLeft className="h-4 w-4" />,
  select: <List className="h-4 w-4" />,
  navigate: <Navigation className="h-4 w-4" />,
  callAction: <Zap className="h-4 w-4" />,
  wait: <Timer className="h-4 w-4" />
};

// Componente para item de step arrastável
function SortableStepItem({ step, onEdit, onDelete, onToggle }: {
  step: MacroStep;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border ${step.enabled === false ? 'opacity-50 bg-muted' : 'bg-card'}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
        {stepTypeIcons[step.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{step.meta?.label || getStepLabel(step)}</p>
        <p className="text-xs text-muted-foreground">{step.type}</p>
      </div>
      <Switch
        checked={step.enabled !== false}
        onCheckedChange={onToggle}
        className="mr-2"
      />
      <Button variant="ghost" size="icon" onClick={onEdit}>
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function MacrosPage() {
  const {
    macros,
    executionStatus,
    saveMacro,
    updateMacro,
    deleteMacro,
    duplicateMacro,
    executeMacro,
    stopExecution,
    exportMacro,
    importMacro,
    setRecordingMeta,
  } = useMacro();

  const {
    isRecording,
    recordingSteps,
    startRecording,
    stopRecording,
    clearRecordingSteps,
    recordWait
  } = useMacroRecorder();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);
  const [editingMacro, setEditingMacro] = useState<Macro | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newMacroName, setNewMacroName] = useState('');
  const [newMacroDescription, setNewMacroDescription] = useState('');
  const [newMacroShortcut, setNewMacroShortcut] = useState('');
  const [capturingShortcut, setCapturingShortcut] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [editingStep, setEditingStep] = useState<MacroStep | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shortcutInputRef = useRef<HTMLInputElement>(null);

  const captureShortcut = useShortcutCapture((shortcut) => {
    if (editingMacro) {
      setEditingMacro({ ...editingMacro, shortcut });
    } else {
      setNewMacroShortcut(shortcut);
    }
    setCapturingShortcut(false);
  });

  useEffect(() => {
    if (capturingShortcut) {
      const handler = (e: KeyboardEvent) => captureShortcut(e);
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [capturingShortcut, captureShortcut]);

  // Filtrar macros
  const filteredMacros = macros.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sensors para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!editingMacro || !over || active.id === over.id) return;

    const oldIndex = editingMacro.steps.findIndex(s => s.id === active.id);
    const newIndex = editingMacro.steps.findIndex(s => s.id === over.id);

    setEditingMacro({
      ...editingMacro,
      steps: arrayMove(editingMacro.steps, oldIndex, newIndex)
    });
  };

  const handleSaveNewMacro = async () => {
    if (!newMacroName.trim() || !newMacroDescription.trim() || !newMacroShortcut.trim()) {
      toast.error('Preencha nome, descrição e atalho');
      return;
    }

    // Verifica atalho duplicado
    if (macros.some(m => m.shortcut === newMacroShortcut)) {
      toast.error('Este atalho já está em uso');
      return;
    }

    await saveMacro(newMacroName, newMacroDescription, newMacroShortcut);
    setNewMacroName('');
    setNewMacroDescription('');
    setNewMacroShortcut('');
    setRecordingMeta(null);
  };

  const handleUpdateMacro = async () => {
    if (!editingMacro) return;

    // Verifica atalho duplicado
    if (editingMacro.shortcut && macros.some(m => m.id !== editingMacro.id && m.shortcut === editingMacro.shortcut)) {
      toast.error('Este atalho já está em uso');
      return;
    }

    await updateMacro(editingMacro);
    setEditingMacro(null);
  };

  const handleExport = (macro: Macro) => {
    const json = exportMacro(macro);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `macro-${macro.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await importMacro(event.target?.result as string);
      } catch (error) {
        toast.error('Erro ao importar arquivo');
      }
    };
    reader.readAsText(file);
  };

  const handleToggleStep = (stepId: string) => {
    if (!editingMacro) return;

    setEditingMacro({
      ...editingMacro,
      steps: editingMacro.steps.map(s =>
        s.id === stepId ? { ...s, enabled: s.enabled === false ? true : false } : s
      )
    });
  };

  const handleDeleteStep = (stepId: string) => {
    if (!editingMacro) return;

    setEditingMacro({
      ...editingMacro,
      steps: editingMacro.steps.filter(s => s.id !== stepId)
    });
  };

  const handleUpdateStep = (updatedStep: MacroStep) => {
    if (!editingMacro) return;

    setEditingMacro({
      ...editingMacro,
      steps: editingMacro.steps.map(s =>
        s.id === updatedStep.id ? updatedStep : s
      )
    });
    setEditingStep(null);
  };

  // Criar macros de exemplo
  const createExampleMacros = async () => {
    const example1 = {
      name: 'Exemplo: Preencher e Salvar',
      description: 'Preenche um formulário e clica em salvar',
      shortcut: 'CTRL+SHIFT+P',
      enabled: true,
      steps: [
        { id: '1', type: 'click', target: 'btn_novo', enabled: true, meta: { label: 'Clicar em Novo' } },
        { id: '2', type: 'wait', ms: 500, enabled: true, meta: { label: 'Aguardar 500ms' } },
        { id: '3', type: 'setValue', target: 'input_nome', value: 'Exemplo', enabled: true, meta: { label: 'Preencher Nome' } },
        { id: '4', type: 'setValue', target: 'input_email', value: 'exemplo@email.com', enabled: true, meta: { label: 'Preencher Email' } },
        { id: '5', type: 'click', target: 'btn_salvar', enabled: true, meta: { label: 'Clicar em Salvar' } }
      ]
    };

    const example2 = {
      name: 'Exemplo: Filtrar e Exportar',
      description: 'Aplica filtro e exporta os resultados',
      shortcut: 'CTRL+SHIFT+E',
      enabled: true,
      steps: [
        { id: '1', type: 'click', target: 'btn_filtrar', enabled: true, meta: { label: 'Abrir Filtros' } },
        { id: '2', type: 'select', target: 'select_status', value: 'pago', enabled: true, meta: { label: 'Selecionar Status: Pago' } },
        { id: '3', type: 'wait', ms: 500, enabled: true, meta: { label: 'Aguardar 500ms' } },
        { id: '4', type: 'click', target: 'btn_aplicar_filtro', enabled: true, meta: { label: 'Aplicar Filtro' } },
        { id: '5', type: 'wait', ms: 1000, enabled: true, meta: { label: 'Aguardar 1s' } },
        { id: '6', type: 'click', target: 'btn_exportar', enabled: true, meta: { label: 'Exportar' } }
      ]
    };

    try {
      await importMacro(JSON.stringify(example1));
      await importMacro(JSON.stringify(example2));
      toast.success('Macros de exemplo criadas!');
    } catch {
      toast.error('Erro ao criar macros de exemplo');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Macros</h1>
          <p className="text-muted-foreground">
            Grave, edite e execute sequências de ações automatizadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            data-macro-id="btn_importar_macro"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button 
            variant="outline" 
            onClick={createExampleMacros}
            data-macro-id="btn_criar_exemplos"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Exemplos
          </Button>
        </div>
      </div>

      {/* Aviso sobre gravação */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium text-primary">Como gravar macros</p>
            <p className="text-sm text-muted-foreground">
              Use o controle flutuante no canto inferior direito para iniciar a gravação. 
              A gravação captura cliques em elementos marcados com <code className="bg-muted px-1 rounded">data-macro-id</code>.
              Teste clicando nos botões "Importar" ou "Criar Exemplos" acima durante a gravação.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Aviso de limitação */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">Limitações</p>
            <p className="text-sm text-muted-foreground">
              Macros funcionam apenas dentro desta aplicação. Não controlam outras abas, programas do Windows, ou aplicativos externos.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="macros" className="space-y-4">
        <TabsList>
          <TabsTrigger value="macros" data-macro-id="tab_minhas_macros">
            <List className="h-4 w-4 mr-2" />
            Minhas Macros
          </TabsTrigger>
          <TabsTrigger value="recorder" data-macro-id="tab_gravador">
            <Circle className="h-4 w-4 mr-2" />
            Gravador
          </TabsTrigger>
        </TabsList>

        {/* Aba de Macros */}
        <TabsContent value="macros" className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar macros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-macro-id="input_buscar_macros"
            />
          </div>

          {/* Status de execução */}
          {executionStatus?.isRunning && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse">
                      <Play className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">Executando...</span>
                    <span className="text-muted-foreground">
                      Passo {executionStatus.currentStep}/{executionStatus.totalSteps}
                    </span>
                  </div>
                  <Button variant="destructive" size="sm" onClick={stopExecution}>
                    <Square className="h-4 w-4 mr-2" />
                    Parar
                  </Button>
                </div>
                <Progress value={(executionStatus.currentStep / executionStatus.totalSteps) * 100} />
                <p className="text-sm text-muted-foreground">{executionStatus.currentStepLabel}</p>
              </CardContent>
            </Card>
          )}

          {/* Lista de macros */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMacros.map((macro) => (
              <Card key={macro.id} className={`${!macro.enabled ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{macro.name}</CardTitle>
                      {macro.description && (
                        <CardDescription>{macro.description}</CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingMacro(macro)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateMacro(macro.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport(macro)}>
                          <Download className="h-4 w-4 mr-2" />
                          Exportar JSON
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirmId(macro.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {macro.steps.length} passos
                    </Badge>
                    {macro.shortcut && (
                      <Badge variant="outline" className="font-mono">
                        <Keyboard className="h-3 w-3 mr-1" />
                        {macro.shortcut}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Switch
                      checked={macro.enabled}
                      onCheckedChange={(checked) => updateMacro({ ...macro, enabled: checked })}
                    />
                    <Button
                      size="sm"
                      onClick={() => executeMacro(macro.id)}
                      disabled={!macro.enabled || executionStatus?.isRunning}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Executar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredMacros.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma macro encontrada</p>
                <p className="text-sm">Use o Gravador para criar sua primeira macro</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Aba do Gravador */}
        <TabsContent value="recorder" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Painel de gravação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isRecording && <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />}
                  Gravador de Macro
                </CardTitle>
                <CardDescription>
                  Clique em Iniciar e interaja com a aplicação para gravar ações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (!newMacroName.trim() || !newMacroDescription.trim() || !newMacroShortcut.trim()) {
                        toast.error('Preencha nome, descrição e atalho antes de iniciar');
                        return;
                      }

                      if (macros.some(m => m.shortcut === newMacroShortcut)) {
                        toast.error('Este atalho já está em uso');
                        return;
                      }

                      setRecordingMeta({
                        name: newMacroName.trim(),
                        description: newMacroDescription.trim(),
                        shortcut: newMacroShortcut.trim(),
                      });

                      // Já inicia a gravação automaticamente
                      startRecording();

                      toast.success('Gravação iniciada! Agora navegue pelo sistema e use normalmente.');
                    }}
                    className="flex-1"
                    disabled={!newMacroName.trim() || !newMacroDescription.trim() || !newMacroShortcut.trim()}
                  >
                    <Circle className="h-4 w-4 mr-2 fill-red-500 text-red-500" />
                    Iniciar Gravação
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearRecordingSteps}
                    disabled={recordingSteps.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {isRecording && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => recordWait(200)}>
                      <Clock className="h-4 w-4 mr-1" />
                      +200ms
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => recordWait(500)}>
                      +500ms
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => recordWait(1000)}>
                      +1s
                    </Button>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label>Passos gravados ({recordingSteps.length})</Label>
                  <ScrollArea className="h-[200px] rounded-md border p-2">
                    {recordingSteps.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum passo gravado ainda
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {recordingSteps.map((step, index) => (
                          <div
                            key={step.id}
                            className="flex items-center gap-2 p-2 rounded bg-muted/50"
                          >
                            <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
                            <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary">
                              {stepTypeIcons[step.type]}
                            </div>
                            <span className="text-sm flex-1 truncate">
                              {step.meta?.label || getStepLabel(step)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            {/* Salvar nova macro */}
            <Card>
              <CardHeader>
                <CardTitle>Salvar Macro</CardTitle>
                <CardDescription>
                  Configure e salve a sequência gravada como uma nova macro
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="macroName">Nome da Macro *</Label>
                  <Input
                    id="macroName"
                    placeholder="Ex: Exportar relatório diário"
                    value={newMacroName}
                    onChange={(e) => setNewMacroName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="macroDescription">Descrição</Label>
                  <Textarea
                    id="macroDescription"
                    placeholder="Descrição opcional..."
                    value={newMacroDescription}
                    onChange={(e) => setNewMacroDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="macroShortcut">Atalho de Teclado</Label>
                  <div className="flex gap-2">
                    <Input
                      id="macroShortcut"
                      placeholder="Ex: CTRL+SHIFT+M"
                      value={newMacroShortcut}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setCapturingShortcut(true)}
                    >
                      {capturingShortcut ? 'Pressione...' : 'Capturar'}
                    </Button>
                    {newMacroShortcut && (
                      <Button variant="ghost" size="icon" onClick={() => setNewMacroShortcut('')}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSaveNewMacro}
                  disabled={recordingSteps.length === 0 || !newMacroName.trim()}
                  className="w-full"
                >
                  Salvar Macro
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de edição */}
      {editingMacro && (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            console.log('[MacrosPage] Dialog onOpenChange', open);
            if (!open) setEditingMacro(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Editar Macro</DialogTitle>
              <DialogDescription>
                Modifique as configurações e os passos da macro
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingMacro.name}
                  onChange={(e) => setEditingMacro({ ...editingMacro, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editingMacro.description || ''}
                  onChange={(e) => setEditingMacro({ ...editingMacro, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Atalho de Teclado</Label>
                <div className="flex gap-2">
                  <Input
                    value={editingMacro.shortcut || ''}
                    readOnly
                    className="font-mono"
                    placeholder="Nenhum atalho"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setCapturingShortcut(true)}
                  >
                    {capturingShortcut ? 'Pressione...' : 'Capturar'}
                  </Button>
                  {editingMacro.shortcut && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingMacro({ ...editingMacro, shortcut: undefined })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingMacro.enabled}
                  onCheckedChange={(checked) => setEditingMacro({ ...editingMacro, enabled: checked })}
                />
                <Label>Macro habilitada</Label>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Passos ({editingMacro.steps.length})</Label>
                <p className="text-xs text-muted-foreground">Arraste para reordenar</p>
                
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-2">
                    {editingMacro.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-2 p-2 rounded bg-muted/50"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary">
                          {stepTypeIcons[step.type] || <Zap className="h-4 w-4" />}
                        </div>
                        <span className={`flex-1 text-sm truncate ${step.enabled === false ? 'line-through text-muted-foreground' : ''}`}>
                          {step.meta?.label || getStepLabel(step)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setEditingStep(step)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleToggleStep(step.id)}
                        >
                          {step.enabled === false ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteStep(step.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  console.log('[MacrosPage] Cancelar clique, limpando editingMacro');
                  setEditingMacro(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateMacro}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}



      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Macro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A macro será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const idToDelete = deleteConfirmId;
                setDeleteConfirmId(null);
                if (idToDelete) {
                  await deleteMacro(idToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de importação */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Macro</DialogTitle>
            <DialogDescription>
              Cole o JSON da macro para importar
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{"name": "...", "steps": [...]}'
            rows={10}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              importMacro(importJson);
              setShowImportDialog(false);
              setImportJson('');
            }}>
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de edição de passo */}
      {editingStep && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setEditingStep(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Passo</DialogTitle>
              <DialogDescription>
                Modifique os detalhes deste passo da macro
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={editingStep.type}
                  onChange={(e) => setEditingStep({ ...editingStep, type: e.target.value as MacroStep['type'] })}
                >
                  <option value="click">Clique</option>
                  <option value="setValue">Preencher Valor</option>
                  <option value="toggle">Alternar</option>
                  <option value="select">Selecionar</option>
                  <option value="navigate">Navegar</option>
                  <option value="callAction">Chamar Ação</option>
                  <option value="wait">Aguardar</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Rótulo (label)</Label>
                <Input
                  value={editingStep.meta?.label || ''}
                  onChange={(e) => setEditingStep({ 
                    ...editingStep, 
                    meta: { ...editingStep.meta, label: e.target.value } 
                  })}
                  placeholder="Descrição do passo"
                />
              </div>

              {editingStep.type !== 'wait' && (
                <div className="space-y-2">
                  <Label>Alvo (target)</Label>
                  <Input
                    value={editingStep.target || ''}
                    onChange={(e) => setEditingStep({ ...editingStep, target: e.target.value })}
                    placeholder="ID do elemento ou seletor"
                  />
                </div>
              )}

              {(editingStep.type === 'setValue' || editingStep.type === 'select' || editingStep.type === 'navigate') && (
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    value={editingStep.value || ''}
                    onChange={(e) => setEditingStep({ ...editingStep, value: e.target.value })}
                    placeholder={editingStep.type === 'navigate' ? 'Rota (ex: /dashboard)' : 'Valor a ser preenchido'}
                  />
                </div>
              )}

              {editingStep.type === 'wait' && (
                <div className="space-y-2">
                  <Label>Tempo (ms)</Label>
                  <Input
                    type="number"
                    value={editingStep.ms || 0}
                    onChange={(e) => setEditingStep({ ...editingStep, ms: parseInt(e.target.value) || 0 })}
                    placeholder="Tempo em milissegundos"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingStep.enabled !== false}
                  onCheckedChange={(checked) => setEditingStep({ ...editingStep, enabled: checked })}
                />
                <Label>Passo habilitado</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStep(null)}>
                Cancelar
              </Button>
              <Button onClick={() => handleUpdateStep(editingStep)}>
                Salvar Passo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
