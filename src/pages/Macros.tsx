import { useState, useEffect, useCallback } from 'react';
import { useMacro } from '@/contexts/MacroContext';
import { MacroStep } from '@/types/macro';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Trash2, 
  Edit, 
  Navigation, 
  Type,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Keyboard
} from 'lucide-react';
import { toast } from 'sonner';

// Rotas disponíveis no sistema
const AVAILABLE_ROUTES = [
  { value: '/', label: 'Dashboard' },
  { value: '/atendimento', label: 'Atendimento' },
  { value: '/calendario', label: 'Calendário' },
  { value: '/clientes', label: 'Clientes' },
  { value: '/empresas', label: 'Empresas' },
  { value: '/produtos', label: 'Produtos' },
  { value: '/orcamentos', label: 'Orçamentos' },
  { value: '/relatorios', label: 'Relatórios' },
  { value: '/configuracoes', label: 'Configurações' },
  { value: '/macros', label: 'Macros' },
];

function generateStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function Macros() {
  const { macros, saveMacro, updateMacro, deleteMacro, executeMacro, executionStatus, showFloatingButton, setShowFloatingButton } = useMacro();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMacro, setEditingMacro] = useState<string | null>(null);
  const [macroToDelete, setMacroToDelete] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [steps, setSteps] = useState<MacroStep[]>([]);
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);

  // Captura atalho de teclado
  const handleShortcutKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isRecordingShortcut) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Ignora teclas modificadoras sozinhas
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('CTRL');
    if (e.shiftKey) parts.push('SHIFT');
    if (e.altKey) parts.push('ALT');
    
    // Converte a tecla para formato legível
    let key = e.key.toUpperCase();
    if (key === ' ') key = 'SPACE';
    if (key === 'ESCAPE') key = 'ESC';
    if (key === 'ARROWUP') key = 'UP';
    if (key === 'ARROWDOWN') key = 'DOWN';
    if (key === 'ARROWLEFT') key = 'LEFT';
    if (key === 'ARROWRIGHT') key = 'RIGHT';
    
    parts.push(key);
    
    setShortcut(parts.join('+'));
    setIsRecordingShortcut(false);
  }, [isRecordingShortcut]);

  useEffect(() => {
    if (isRecordingShortcut) {
      window.addEventListener('keydown', handleShortcutKeyDown);
      return () => window.removeEventListener('keydown', handleShortcutKeyDown);
    }
  }, [isRecordingShortcut, handleShortcutKeyDown]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setShortcut('');
    setSteps([]);
    setEditingMacro(null);
  };

  const openNewMacro = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditMacro = (macroId: string) => {
    const macro = macros.find(m => m.id === macroId);
    if (!macro) return;
    
    setName(macro.name);
    setDescription(macro.description || '');
    setShortcut(macro.shortcut || '');
    setSteps(macro.steps);
    setEditingMacro(macroId);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    if (steps.length === 0) {
      toast.error('Adicione pelo menos um passo');
      return;
    }

    if (editingMacro) {
      const macro = macros.find(m => m.id === editingMacro);
      if (macro) {
        await updateMacro({
          ...macro,
          name,
          description: description || undefined,
          shortcut: shortcut || undefined,
          steps
        });
      }
    } else {
      await saveMacro({
        name,
        description: description || undefined,
        shortcut: shortcut || undefined,
        enabled: true,
        steps
      });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const addNavigateStep = (route: string) => {
    const routeInfo = AVAILABLE_ROUTES.find(r => r.value === route);
    const newStep: MacroStep = {
      id: generateStepId(),
      type: 'navigate',
      value: route,
      label: `Abrir: ${routeInfo?.label || route}`,
      enabled: true
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (stepId: string, updates: Partial<MacroStep>) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId));
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const index = steps.findIndex(s => s.id === stepId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
  };


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Macros</h1>
          <p className="text-muted-foreground">Automatize ações repetitivas</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-floating"
              checked={showFloatingButton}
              onCheckedChange={setShowFloatingButton}
            />
            <Label htmlFor="show-floating" className="text-sm cursor-pointer">
              Exibir botão flutuante
            </Label>
          </div>
        </div>
      </div>

      {/* Lista de Macros */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {macros.map(macro => (
          <Card key={macro.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{macro.name}</CardTitle>
                  {macro.description && (
                    <CardDescription className="mt-1">{macro.description}</CardDescription>
                  )}
                </div>
                <Switch
                  checked={macro.enabled}
                  onCheckedChange={(enabled) => updateMacro({ ...macro, enabled })}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">{macro.steps.length} passos</Badge>
                {macro.shortcut && (
                  <Badge variant="secondary">{macro.shortcut}</Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => executeMacro(macro.id)}
                  disabled={!macro.enabled || executionStatus?.isRunning}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Executar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openEditMacro(macro.id)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => setMacroToDelete(macro.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {macros.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">Nenhuma macro criada</p>
              <p className="text-sm text-muted-foreground">
                Ative o botão flutuante acima para gravar suas macros
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingMacro ? 'Editar Macro' : 'Nova Macro'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Dados básicos */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Abrir orçamento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortcut">Atalho</Label>
                <div className="flex gap-2">
                  <Input
                    id="shortcut"
                    value={isRecordingShortcut ? 'Pressione as teclas...' : shortcut}
                    onChange={(e) => setShortcut(e.target.value.toUpperCase())}
                    placeholder="Ex: CTRL+SHIFT+O"
                    readOnly={isRecordingShortcut}
                    className={isRecordingShortcut ? 'border-primary animate-pulse' : ''}
                  />
                  <Button
                    type="button"
                    variant={isRecordingShortcut ? 'destructive' : 'outline'}
                    size="icon"
                    onClick={() => setIsRecordingShortcut(!isRecordingShortcut)}
                    title={isRecordingShortcut ? 'Cancelar gravação' : 'Gravar atalho'}
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que esta macro faz..."
                rows={2}
              />
            </div>

            {/* Botões de adicionar passo */}
            <div className="flex flex-wrap gap-2">
              <Select onValueChange={addNavigateStep}>
                <SelectTrigger className="w-[200px]">
                  <Navigation className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Abrir tela..." />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROUTES.map(route => (
                    <SelectItem key={route.value} value={route.value}>
                      {route.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lista de passos */}
            <div className="space-y-2">
              <Label>Passos ({steps.length})</Label>
              <ScrollArea className="h-[300px] border rounded-lg p-2">
                {steps.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <p>Adicione passos usando os botões acima</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {steps.map((step, index) => (
                      <div 
                        key={step.id}
                        className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveStep(step.id, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveStep(step.id, 'down')}
                            disabled={index === steps.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {step.type === 'navigate' ? (
                              <Badge className="bg-blue-500">
                                <Navigation className="h-3 w-3 mr-1" />
                                Abrir Tela
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500">
                                <Type className="h-3 w-3 mr-1" />
                                Digitar
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              Passo {index + 1}
                            </span>
                          </div>

                          {step.type === 'navigate' ? (
                            <Select
                              value={step.value}
                              onValueChange={(value) => updateStep(step.id, { value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a tela" />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_ROUTES.map(route => (
                                  <SelectItem key={route.value} value={route.value}>
                                    {route.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Texto a digitar</Label>
                                <Input
                                  placeholder="Digite o texto..."
                                  value={step.value}
                                  onChange={(e) => updateStep(step.id, { value: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Elemento selecionado
                                </Label>
                                <Input
                                  placeholder="Seletor do campo"
                                  value={step.target || ''}
                                  onChange={(e) => updateStep(step.id, { target: e.target.value })}
                                  className="font-mono text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeStep(step.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingMacro ? 'Salvar Alterações' : 'Criar Macro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status de execução */}
      {executionStatus?.isRunning && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            <div>
              <p className="font-medium">Executando macro...</p>
              <p className="text-sm text-muted-foreground">
                Passo {executionStatus.currentStep} de {executionStatus.totalSteps}
              </p>
              {executionStatus.currentStepLabel && (
                <p className="text-xs text-muted-foreground">
                  {executionStatus.currentStepLabel}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!macroToDelete} onOpenChange={(open) => !open && setMacroToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir macro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A macro será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (macroToDelete) {
                  deleteMacro(macroToDelete);
                  setMacroToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
