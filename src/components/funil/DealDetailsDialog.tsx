import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Deal } from '@/types/funil';
import {
  User,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  MessageSquare,
  Video,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DealDetailsDialogProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (dealId: string, updates: Partial<Deal>) => void;
}

export function DealDetailsDialog({ deal, open, onOpenChange, onUpdate }: DealDetailsDialogProps) {
  const [newTask, setNewTask] = useState('');
  const [newNote, setNewNote] = useState('');

  if (!deal) return null;

  const timeline = [
    { type: 'whatsapp', content: 'Mensagem enviada via WhatsApp', time: '2h atrás', icon: MessageSquare },
    { type: 'email', content: 'E-mail de proposta enviado', time: '1 dia atrás', icon: Mail },
    { type: 'call', content: 'Ligação realizada - 15min', time: '2 dias atrás', icon: Phone },
    { type: 'meeting', content: 'Reunião de apresentação', time: '3 dias atrás', icon: Video },
  ];

  const tasks = [
    { id: 1, title: 'Enviar proposta comercial', completed: true, dueDate: '2025-11-15' },
    { id: 2, title: 'Follow-up WhatsApp', completed: false, dueDate: '2025-11-20' },
    { id: 3, title: 'Agendar reunião técnica', completed: false, dueDate: '2025-11-22' },
  ];

  const handleAddTask = () => {
    if (newTask.trim()) {
      // Implementar adicionar tarefa
      setNewTask('');
    }
  };

  const saudeColors = {
    verde: 'bg-green-500',
    amarelo: 'bg-yellow-500',
    vermelho: 'bg-red-500',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl">{deal.cliente}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{deal.responsavel}</Badge>
                {deal.origem && <Badge variant="secondary">{deal.origem}</Badge>}
                {deal.saude && (
                  <div className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full ${saudeColors[deal.saude]}`} />
                    <span className="text-xs text-muted-foreground capitalize">
                      {deal.saude}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                R$ {deal.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">
                Fechamento: {new Date(deal.dataEstimada).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            <TabsContent value="overview" className="space-y-4 mt-0">
              {/* Informações principais */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Cliente</Label>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{deal.cliente}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Responsável</Label>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{deal.responsavel}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Valor</Label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-medium">
                          R$ {deal.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Data Estimada</Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">
                          {new Date(deal.dataEstimada).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {deal.segmento && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Segmento</Label>
                        <span className="font-medium">{deal.segmento}</span>
                      </div>
                    )}

                    {deal.cluster && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Cluster</Label>
                        <span className="font-medium">{deal.cluster}</span>
                      </div>
                    )}
                  </div>

                  {deal.diasParado && deal.diasParado > 0 && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-sm border border-orange-200 dark:border-orange-800">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-orange-900 dark:text-orange-100">
                          Negócio parado há <strong>{deal.diasParado} dias</strong> sem interação
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Insights de IA */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="text-primary">✨</span>
                    Insights de IA
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>Próxima ação sugerida:</strong> Enviar material sobre cases de sucesso
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Objeções esperadas:</strong> Preço, tempo de implementação
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Sentimento:</strong> Positivo (engajamento alto no WhatsApp)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-3 mt-0">
              {timeline.map((item, index) => (
                <Card key={index}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-3 mt-0">
              <div className="flex gap-2">
                <Input
                  placeholder="Nova tarefa..."
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                />
                <Button size="icon" onClick={handleAddTask}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {task.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-3 mt-0">
              <Textarea
                placeholder="Adicionar nota..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
              />
              <Button onClick={() => setNewNote('')}>Adicionar Nota</Button>

              <Separator />

              <div className="space-y-3">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-sm">Cliente demonstrou interesse em expandir operação no próximo trimestre.</p>
                    <p className="text-xs text-muted-foreground mt-2">Marcos • há 2 dias</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
