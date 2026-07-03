import { useState, useEffect } from 'react';
import { 
  MessageSquareQuote,
  Paperclip,
  Award,
  ListTree,
  MessageSquare,
  Bell,
  Workflow,
  Star,
  ClipboardCheck,
  Brain,
  BookOpen,
  Clock,
  LucideIcon,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Edit,
  Trash2,
  Power,
  TestTube2,
  Phone,
  Video,
  Wrench,
  Send,
  FileText,
  Shield,
  Activity,
  Bot,
  HardDrive,
  Smartphone
} from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Components with correct imports
import QuickRepliesCRUD from '@/components/config/QuickRepliesCRUD';
import QuickAttachmentsCRUD from '@/components/config/QuickAttachmentsCRUD';
import { CanaisAtendimentoCRUD } from '@/components/config/CanaisAtendimentoCRUD';
import { NotificacoesCRUD } from '@/components/config/NotificacoesCRUD';
import { OmnichannelFlowsCRUD } from '@/components/config/OmnichannelFlowsCRUD';
import PesquisasSatisfacaoCRUD from '@/components/atendimento/PesquisasSatisfacaoCRUD';
import QualityAssuranceCRUD from '@/components/config/QualityAssuranceCRUD';
import SentimentAnalysisCRUD from '@/components/config/SentimentAnalysisCRUD';

import IAConfigCRUD from '@/components/config/IAConfigCRUD';
import SLAConfigCRUD from '@/components/config/SLAConfigCRUD';
import FerramentasAtendimentoCRUD from '@/components/config/FerramentasAtendimentoCRUD';
import { EnvioMassaWebhookConfig } from '@/components/config/EnvioMassaWebhookConfig';
import { EnvioMassaTemplatesCRUD } from '@/components/config/EnvioMassaTemplatesCRUD';
import { CampaignPermissionsCRUD } from '@/components/config/CampaignPermissionsCRUD';
import { CampaignSendMonitor } from '@/components/config/CampaignSendMonitor';
import ChatAgentsCRUD from '@/components/config/ChatAgentsCRUD';
import KbLacunasCRUD from '@/components/config/KbLacunasCRUD';
import ChatRetencaoCRUD from '@/components/config/ChatRetencaoCRUD';
import SmsConfigCRUD from '@/components/config/SmsConfigCRUD';


// Import Bot components
import BotCreate from './BotCreate';
import BotTest from './BotTest';

// Import Telefonia components
import Softphone from './Softphone';
import VideoCall from './VideoCall';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const tabItems: TabItem[] = [
  { id: 'ferramentas', label: 'Ferramentas por Aba', icon: Wrench },
  { id: 'agentes-chat', label: 'Agentes de Chat', icon: Bot },
  { id: 'textos-prontos', label: 'Textos Prontos', icon: MessageSquareQuote },
  { id: 'anexos-rapidos', label: 'Anexos Rápidos', icon: Paperclip },
  { id: 'skills', label: 'Skills de Atendimento', icon: Award },
  { id: 'filas', label: 'Filas de Atendimento', icon: ListTree },
  { id: 'canais', label: 'Canais de Atendimento', icon: MessageSquare },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'workflows', label: 'Workflows Omnichannel', icon: Workflow },
  { id: 'pesquisas', label: 'Pesquisas de Satisfação', icon: Star },
  { id: 'quality-assurance', label: 'Quality Assurance', icon: ClipboardCheck },
  { id: 'sentimento', label: 'Análise de Sentimento', icon: Brain },
  
  { id: 'ia-config', label: 'Configurações de IA', icon: Brain },
  { id: 'sla', label: 'SLA de Atendimento', icon: Clock },
  { id: 'templates-mensagem', label: 'Templates de Mensagem', icon: FileText },
  { id: 'envio-massa', label: 'Webhook de Disparo', icon: Send },
  { id: 'permissao-envio', label: 'Permissão Anti-Bloqueio', icon: Shield },
  { id: 'monitor-envio', label: 'Monitor de Envios', icon: Activity },
  { id: 'bot-criar', label: 'Criar / Editar Bot', icon: Plus },
  { id: 'bot-testar', label: 'Testar Bot', icon: TestTube2 },
  { id: 'softphone', label: 'Softphone', icon: Phone },
  { id: 'videochamada', label: 'Videochamada', icon: Video },
  { id: 'sms', label: 'Envio de SMS', icon: Smartphone },
  { id: 'retencao-dados', label: 'Retenção de Dados', icon: HardDrive },
];

// Skills Manager Component (embedded)
function SkillsManagerEmbedded({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null);
  const [editingSkill, setEditingSkill] = useState<any | null>(null);
  const [formData, setFormData] = useState({ nome: "", descricao: "", cor: "#3b82f6" });

  useEffect(() => {
    loadSkills();
  }, [estabelecimentoId]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");
      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error("Erro ao carregar skills:", error);
      toast.error("Erro ao carregar habilidades");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome da habilidade é obrigatório");
      return;
    }
    try {
      if (editingSkill) {
        const { error } = await supabase.from("skills").update(formData).eq("id", editingSkill.id);
        if (error) throw error;
        toast.success("Habilidade atualizada");
      } else {
        const { error } = await supabase.from("skills").insert({ ...formData, estabelecimento_id: estabelecimentoId });
        if (error) throw error;
        toast.success("Habilidade criada");
      }
      setDialogOpen(false);
      loadSkills();
    } catch (error) {
      toast.error("Erro ao salvar habilidade");
    }
  };

  const confirmDelete = async () => {
    if (!skillToDelete) return;
    try {
      const { error } = await supabase.from("skills").delete().eq("id", skillToDelete);
      if (error) throw error;
      toast.success("Habilidade excluída");
      loadSkills();
    } catch (error) {
      toast.error("Erro ao excluir habilidade");
    } finally {
      setDeleteDialogOpen(false);
      setSkillToDelete(null);
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingSkill(null); setFormData({ nome: "", descricao: "", cor: "#3b82f6" }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Habilidade
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cor</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skills.map((skill) => (
            <TableRow key={skill.id}>
              <TableCell><div className="w-6 h-6 rounded-full" style={{ backgroundColor: skill.cor || "#3b82f6" }} /></TableCell>
              <TableCell className="font-medium">{skill.nome}</TableCell>
              <TableCell className="text-muted-foreground">{skill.descricao || "-"}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="icon" onClick={() => { setEditingSkill(skill); setFormData({ nome: skill.nome, descricao: skill.descricao || "", cor: skill.cor || "#3b82f6" }); setDialogOpen(true); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setSkillToDelete(skill.id); setDeleteDialogOpen(true); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {skills.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma habilidade cadastrada</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSkill ? "Editar Habilidade" : "Nova Habilidade"}</DialogTitle>
            <DialogDescription>Configure uma habilidade para roteamento avançado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Nome *</Label><Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Inglês Fluente" /></div>
            <div><Label>Descrição</Label><Textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={3} /></div>
            <div><Label>Cor</Label><div className="flex gap-2"><Input type="color" value={formData.cor} onChange={(e) => setFormData({ ...formData, cor: e.target.value })} className="w-20 h-10" /><Input value={formData.cor} onChange={(e) => setFormData({ ...formData, cor: e.target.value })} /></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>{editingSkill ? "Atualizar" : "Criar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir esta habilidade?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Filas Manager Component (embedded)
function FilasManagerEmbedded({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [filas, setFilas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filaToDelete, setFilaToDelete] = useState<any | null>(null);
  const [editingFila, setEditingFila] = useState<any | null>(null);
  const [formData, setFormData] = useState({ nome: "", descricao: "", prioridade: 1, ativa: true });

  useEffect(() => {
    loadFilas();
  }, [estabelecimentoId]);

  const loadFilas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("filas_atendimento")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("prioridade");
      if (error) throw error;
      setFilas(data || []);
    } catch (error) {
      console.error("Erro ao carregar filas:", error);
      toast.error("Erro ao carregar filas");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome da fila é obrigatório");
      return;
    }
    try {
      if (editingFila) {
        const { error } = await supabase.from("filas_atendimento").update(formData).eq("id", editingFila.id);
        if (error) throw error;
        toast.success("Fila atualizada");
      } else {
        const { error } = await supabase.from("filas_atendimento").insert({ ...formData, estabelecimento_id: estabelecimentoId });
        if (error) throw error;
        toast.success("Fila criada");
      }
      setDialogOpen(false);
      loadFilas();
    } catch (error) {
      toast.error("Erro ao salvar fila");
    }
  };

  const toggleAtiva = async (filaId: string, ativa: boolean) => {
    try {
      const { error } = await supabase.from("filas_atendimento").update({ ativa }).eq("id", filaId);
      if (error) throw error;
      toast.success(ativa ? "Fila ativada" : "Fila desativada");
      loadFilas();
    } catch (error) {
      toast.error("Erro ao atualizar fila");
    }
  };

  const confirmDelete = async () => {
    if (!filaToDelete) return;
    try {
      const { error } = await supabase.from("filas_atendimento").delete().eq("id", filaToDelete.id);
      if (error) throw error;
      toast.success("Fila excluída");
      loadFilas();
    } catch (error) {
      toast.error("Erro ao excluir fila");
    } finally {
      setDeleteDialogOpen(false);
      setFilaToDelete(null);
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingFila(null); setFormData({ nome: "", descricao: "", prioridade: 1, ativa: true }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Fila
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila) => (
            <TableRow key={fila.id}>
              <TableCell><Switch checked={fila.ativa} onCheckedChange={(checked) => toggleAtiva(fila.id, checked)} /></TableCell>
              <TableCell className="font-medium">{fila.nome}</TableCell>
              <TableCell className="text-muted-foreground">{fila.descricao || "-"}</TableCell>
              <TableCell>{fila.prioridade}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="icon" onClick={() => { setEditingFila(fila); setFormData({ nome: fila.nome, descricao: fila.descricao || "", prioridade: fila.prioridade || 1, ativa: fila.ativa }); setDialogOpen(true); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setFilaToDelete(fila); setDeleteDialogOpen(true); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {filas.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma fila cadastrada</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFila ? "Editar Fila" : "Nova Fila"}</DialogTitle>
            <DialogDescription>Configure uma fila de atendimento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Nome *</Label><Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Suporte Técnico" /></div>
            <div><Label>Descrição</Label><Textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={3} /></div>
            <div><Label>Prioridade</Label><Input type="number" value={formData.prioridade} onChange={(e) => setFormData({ ...formData, prioridade: parseInt(e.target.value) || 1 })} min={1} /></div>
            <div className="flex items-center gap-2"><Switch checked={formData.ativa} onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })} /><Label>Fila Ativa</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>{editingFila ? "Atualizar" : "Criar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir a fila "{filaToDelete?.nome}"?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AtendimentoConfig() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [currentTab, setCurrentTab] = useState(() => {
    const tabFromUrl = new URLSearchParams(window.location.search).get('tab');
    return tabItems.some(tab => tab.id === tabFromUrl) ? tabFromUrl! : 'ferramentas';
  });

  const { data: estabelecimentoId } = useQuery({
    queryKey: ['user-estabelecimento-atendimento'],
    queryFn: async () => {
      return await getEstabelecimentoId();
    }
  });

  const handleTabChange = (value: string) => {
    if (value === currentTab) return;
    setCurrentTab(value);
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('tab', value);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${nextParams.toString()}`);
  };

  // Sanity: garante que nenhum lock de pointer-events ou scroll-lock fique preso
  // (Radix Dialog/Popover em alguns casos deixa body bloqueado se for desmontado durante uma transição)
  useEffect(() => {
    try {
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('data-scroll-locked');
    } catch {}
  }, [currentTab]);

  const currentTabItem = tabItems.find(t => t.id === currentTab) || tabItems[0];
  const CurrentIcon = currentTabItem.icon;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-2xl font-bold">Configurações de Atendimento</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Gerencie filas, skills, canais e configurações de atendimento
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="h-full flex flex-col lg:flex-row">
          {/* Mobile: Select dropdown */}
          <div className="lg:hidden border-b bg-muted/30 p-3">
            <Select value={currentTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <CurrentIcon className="h-4 w-4" />
                    <span>{currentTabItem.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {tabItems.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <SelectItem key={tab.id} value={tab.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Sidebar menu */}
          <div className={`hub-menu hidden lg:flex lg:flex-col lg:p-3 lg:gap-1 lg:overflow-y-auto lg:shrink-0 transition-all duration-300 ${isMenuCollapsed ? 'lg:w-16' : 'lg:w-64'}`}>
            <Button variant="ghost" size="sm" onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} className="mb-2 self-end">
              {isMenuCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <TooltipProvider delayDuration={0}>
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                const menuButton = (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`hub-menu-item flex items-center gap-3 px-3 py-2.5 text-left w-full text-muted-foreground ${isActive ? 'is-active' : ''} ${isMenuCollapsed ? 'justify-center' : ''}`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? '' : 'opacity-70'}`} />
                    {!isMenuCollapsed && <span className="truncate">{tab.label}</span>}
                  </button>
                );
                if (isMenuCollapsed) {
                  return (
                    <Tooltip key={tab.id}>
                      <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                      <TooltipContent side="right">{tab.label}</TooltipContent>
                    </Tooltip>
                  );
                }
                return menuButton;
              })}
            </TooltipProvider>
          </div>

          <div className="flex-1 overflow-auto p-3 sm:p-6">
            <TabsContent value="ferramentas" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Wrench className="h-4 w-4 sm:h-5 sm:w-5" />Ferramentas por Aba</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure quais ferramentas aparecem em cada aba e no RadialMenu</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <FerramentasAtendimentoCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agentes-chat" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Bot className="h-4 w-4 sm:h-5 sm:w-5" />Agentes de Chat</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Crie agentes de IA para auxiliar ou responder automaticamente no atendimento</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <ChatAgentsCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="textos-prontos" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><MessageSquareQuote className="h-4 w-4 sm:h-5 sm:w-5" />Textos Prontos</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Gerencie respostas rápidas para uso no atendimento</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <QuickRepliesCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anexos-rapidos" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />Anexos Rápidos</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Gerencie anexos pré-configurados para envio rápido</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <QuickAttachmentsCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Award className="h-4 w-4 sm:h-5 sm:w-5" />Skills de Atendimento</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure habilidades dos atendentes</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <SkillsManagerEmbedded estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="filas" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><ListTree className="h-4 w-4 sm:h-5 sm:w-5" />Filas de Atendimento</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Gerencie as filas de atendimento</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <FilasManagerEmbedded estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="canais" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />Canais de Atendimento</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure os canais de atendimento disponíveis</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <CanaisAtendimentoCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notificacoes" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Bell className="h-4 w-4 sm:h-5 sm:w-5" />Notificações</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure notificações do sistema de atendimento</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <NotificacoesCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workflows" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Workflow className="h-4 w-4 sm:h-5 sm:w-5" />Workflows Omnichannel</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Gerencie os fluxos de trabalho omnichannel</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <OmnichannelFlowsCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pesquisas" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Star className="h-4 w-4 sm:h-5 sm:w-5" />Pesquisas de Satisfação</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure pesquisas CSAT e NPS</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <PesquisasSatisfacaoCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quality-assurance" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />Quality Assurance</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure avaliações de qualidade do atendimento</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <QualityAssuranceCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sentimento" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Brain className="h-4 w-4 sm:h-5 sm:w-5" />Análise de Sentimento</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure análise de sentimento nas conversas</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <SentimentAnalysisCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="ia-config" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Brain className="h-4 w-4 sm:h-5 sm:w-5" />Configurações de IA</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure provedores e modelos de IA</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <IAConfigCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sla" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Clock className="h-4 w-4 sm:h-5 sm:w-5" />SLA de Atendimento</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure regras de SLA para atendimento</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <SLAConfigCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates-mensagem" className="mt-0 h-full overflow-y-auto">
              <div className="px-3 sm:px-6 py-3">
                {estabelecimentoId && (
                  <EnvioMassaTemplatesCRUD estabelecimentoId={estabelecimentoId} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="envio-massa" className="mt-0 h-full overflow-y-auto">
              <div className="space-y-6 px-3 sm:px-6 py-3">
                {estabelecimentoId && (
                  <EnvioMassaWebhookConfig estabelecimentoId={estabelecimentoId} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="permissao-envio" className="mt-0 h-full overflow-y-auto">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Shield className="h-4 w-4 sm:h-5 sm:w-5" />Permissão Anti-Bloqueio WhatsApp</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure regras de segurança para envio em massa</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <CampaignPermissionsCRUD />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monitor-envio" className="mt-0 h-full overflow-y-auto">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Activity className="h-4 w-4 sm:h-5 sm:w-5" />Monitor de Envios em Massa</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Acompanhe o status dos envios e motivos de bloqueio</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <CampaignSendMonitor />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bot-criar" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Plus className="h-4 w-4 sm:h-5 sm:w-5" />Criar / Editar Bot</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Crie e edite fluxos de bot para atendimento automatizado</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6"><BotCreate embedded /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bot-testar" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><TestTube2 className="h-4 w-4 sm:h-5 sm:w-5" />Testar Bot</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Teste os fluxos de bot configurados</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6"><BotTest embedded /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="softphone" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Phone className="h-4 w-4 sm:h-5 sm:w-5" />Softphone</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Realize chamadas telefônicas via SIP</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6"><Softphone embedded /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videochamada" className="mt-0 h-full">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Video className="h-4 w-4 sm:h-5 sm:w-5" />Videochamada</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Realize videochamadas com clientes</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6"><VideoCall embedded /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sms" className="mt-0 h-full overflow-y-auto">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />Envio de SMS</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure o provedor (GatewayAPI, Twilio ou Zenvia) e envie SMS de teste</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <SmsConfigCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="retencao-dados" className="mt-0 h-full overflow-y-auto">
              <Card className="h-full">
                <CardHeader className="px-3 sm:px-6 py-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><HardDrive className="h-4 w-4 sm:h-5 sm:w-5" />Retenção de Dados do Chat</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Configure o prazo de retenção de conversas e monitore o uso do banco de dados</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">{estabelecimentoId && <ChatRetencaoCRUD estabelecimentoId={estabelecimentoId} />}</CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
