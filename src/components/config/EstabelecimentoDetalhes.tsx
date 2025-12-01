import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UnidadesCRUD } from "./UnidadesCRUD";
import { SegmentosCRUD } from "./SegmentosCRUD";
import { GruposAcessoCRUD } from "./GruposAcessoCRUD";
import { UsuariosCRUD } from "./UsuariosCRUD";
import { RedesSociaisCRUD } from "./RedesSociaisCRUD";
import QuickRepliesCRUD from "./QuickRepliesCRUD";
import QuickAttachmentsCRUD from "./QuickAttachmentsCRUD";
import { APIGeneratorCRUD } from "./APIGeneratorCRUD";
import { WebhooksCRUD } from "./WebhooksCRUD";
import { WebhooksEntradaCRUD } from "./WebhooksEntradaCRUD";
import { CanaisAtendimentoCRUD } from "./CanaisAtendimentoCRUD";
import { NotificacoesCRUD } from "./NotificacoesCRUD";
import { SegurancaCRUD } from "./SegurancaCRUD";
import { ProdutosCRUD } from "./ProdutosCRUD";
import { ProdutoCategoriasCRUD } from "./ProdutoCategoriasCRUD";
import { ProdutoGruposCRUD } from "./ProdutoGruposCRUD";
import { ProdutoCamposCustomizadosCRUD } from "./ProdutoCamposCustomizadosCRUD";
import { NcmCRUD } from "./NcmCRUD";
import { CondicoesPagamentoCRUD } from "./CondicoesPagamentoCRUD";
import { TabelasPrecoCRUD } from "./TabelasPrecoCRUD";
import { TiposPagamentoCRUD } from "./TiposPagamentoCRUD";
import QualityAssuranceCRUD from "./QualityAssuranceCRUD";
import SentimentAnalysisCRUD from "./SentimentAnalysisCRUD";
import { CalendarioRegrasCRUD } from "./CalendarioRegrasCRUD";
import { UCMConfigCRUD } from "./UCMConfigCRUD";
import { OmnichannelFlowsCRUD } from "./OmnichannelFlowsCRUD";
import SLAConfigCRUD from "./SLAConfigCRUD";
import { FilasManager } from "@/components/atendimento/FilasManager";
import { SkillsManager } from "@/components/atendimento/SkillsManager";
import { AtendentesFilaManager } from "@/components/atendimento/AtendentesFilaManager";
import { SkillsFilaManager } from "@/components/atendimento/SkillsFilaManager";
import { AutomacaoVendasCRUD } from "./AutomacaoVendasCRUD";
import PedagioAPIConfigCRUD from "./PedagioAPIConfigCRUD";
import { CustosVeiculosCRUD } from "./CustosVeiculosCRUD";
import { Users, Building2, Tag, FolderTree, UserCog, Share2, MessageSquare, Link as LinkIcon, Globe, Webhook, Key, Bell, Shield, Mail, Package, FolderOpen, Layers, CreditCard, DollarSign, Wallet, Calendar, Phone, MessageSquareQuote, Award, Workflow, ListTree, Star, Clock, ClipboardCheck, Brain, HelpCircle, Zap, BookOpen, Navigation, Fuel, Truck, FileCode } from "lucide-react";
import PesquisasSatisfacaoCRUD from "@/components/atendimento/PesquisasSatisfacaoCRUD";
import KnowledgeBaseCRUD from "./KnowledgeBaseCRUD";
import IAConfigCRUD from "./IAConfigCRUD";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, AlertCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast as sonnerToast } from "@/lib/toast-config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EstabelecimentoDetalhesProps {
  estabelecimentoId: string;
  estabelecimentoNome: string;
}

function ResendConfigSection({ estabelecimentoId }: { estabelecimentoId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    loadResendConfig();
  }, [estabelecimentoId]);

  const loadResendConfig = async () => {
    try {
      const { data } = await supabase
        .from('resend_config')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (data) {
        setConfigId(data.id);
        setApiKey(data.api_key);
        setFromEmail(data.from_email);
        setFromName(data.from_name);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey || !fromEmail || !fromName) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (configId) {
        const { error } = await supabase
          .from('resend_config')
          .update({
            api_key: apiKey,
            from_email: fromEmail,
            from_name: fromName,
          })
          .eq('id', configId);

        if (error) throw error;
        toast({
          title: "✓ Configuração atualizada!",
          description: "As configurações do Resend foram atualizadas.",
        });
      } else {
        const { data, error } = await supabase
          .from('resend_config')
          .insert({
            estabelecimento_id: estabelecimentoId,
            api_key: apiKey,
            from_email: fromEmail,
            from_name: fromName,
          })
          .select()
          .single();

        if (error) throw error;
        setConfigId(data.id);
        toast({
          title: "✓ Configuração salva!",
          description: "As configurações do Resend foram salvas.",
        });
      }

      loadResendConfig();
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-5 w-5" />
          Configuração Resend (Envio de Email)
        </CardTitle>
        <CardDescription>
          Configure o serviço Resend para envio de emails deste estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-semibold text-sm">Como obter as credenciais:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
              <li>
                Acesse{" "}
                <a 
                  href="https://resend.com/signup" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  resend.com/signup
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Verifique seu domínio em{" "}
                <a 
                  href="https://resend.com/domains" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Domains
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Gere uma API Key em{" "}
                <a 
                  href="https://resend.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  API Keys
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ol>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="api-key">
              API Key *
            </Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxx"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="from-email">
              Email Remetente *
            </Label>
            <Input
              id="from-email"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="noreply@seudominio.com"
            />
          </div>

          <div>
            <Label htmlFor="from-name">
              Nome do Remetente *
            </Label>
            <Input
              id="from-name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Minha Empresa"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Salvando..." : configId ? "Atualizar" : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Wrapper components para gerenciar o estado local das filas e skills
function FilasManagerWrapper({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [filas, setFilas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filaToDelete, setFilaToDelete] = useState<any | null>(null);
  const [atendentesDialogOpen, setAtendentesDialogOpen] = useState(false);
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [selectedFila, setSelectedFila] = useState<any | null>(null);
  const [editingFila, setEditingFila] = useState<any | null>(null);
  const [formData, setFormData] = useState<{
    nome: string;
    descricao: string;
    tipo_roteamento: "round_robin" | "por_skill" | "por_prioridade" | "por_disponibilidade" | "por_carteira";
    max_chats_por_atendente: number;
    prioridade: number;
    tempo_resposta_esperado: number;
    mensagem_fila: string;
    ativa: boolean;
  }>({
    nome: "",
    descricao: "",
    tipo_roteamento: "round_robin",
    max_chats_por_atendente: 5,
    prioridade: 1,
    tempo_resposta_esperado: 300,
    mensagem_fila: "",
    ativa: true
  });

  useEffect(() => {
    loadFilas();
  }, [estabelecimentoId]);

  const loadFilas = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('filas_atendimento')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('prioridade');
      if (data) setFilas(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFila = () => {
    setEditingFila(null);
    setFormData({
      nome: "",
      descricao: "",
      tipo_roteamento: "round_robin",
      max_chats_por_atendente: 5,
      prioridade: 1,
      tempo_resposta_esperado: 300,
      mensagem_fila: "",
      ativa: true
    });
    setDialogOpen(true);
  };

  const handleEditFila = (fila: any) => {
    setEditingFila(fila);
    setFormData({
      nome: fila.nome,
      descricao: fila.descricao || "",
      tipo_roteamento: fila.tipo_roteamento || "round_robin",
      max_chats_por_atendente: fila.max_chats_por_atendente || 5,
      prioridade: fila.prioridade || 1,
      tempo_resposta_esperado: fila.tempo_resposta_esperado || 300,
      mensagem_fila: fila.mensagem_fila || "",
      ativa: fila.ativa !== false
    });
    setDialogOpen(true);
  };

  const handleToggleAtiva = async (filaId: string, ativa: boolean) => {
    try {
      const { error } = await supabase
        .from('filas_atendimento')
        .update({ ativa })
        .eq('id', filaId);

      if (error) throw error;
      sonnerToast.success(ativa ? "Fila ativada" : "Fila desativada");
      loadFilas();
    } catch (error) {
      console.error("Erro ao atualizar fila:", error);
      sonnerToast.error("Erro ao atualizar fila");
    }
  };

  const handleViewAtendentes = (fila: any) => {
    setSelectedFila(fila);
    setAtendentesDialogOpen(true);
  };

  const handleConfigureSkills = (fila: any) => {
    setSelectedFila(fila);
    setSkillsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      sonnerToast.error("Nome da fila é obrigatório");
      return;
    }

    try {
      if (editingFila) {
        const { error } = await supabase
          .from('filas_atendimento')
          .update(formData)
          .eq('id', editingFila.id);

        if (error) throw error;
        sonnerToast.success("Fila atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from('filas_atendimento')
          .insert([{
            ...formData,
            estabelecimento_id: estabelecimentoId
          }]);

        if (error) throw error;
        sonnerToast.success("Fila criada com sucesso");
      }

      setDialogOpen(false);
      loadFilas();
    } catch (error) {
      console.error("Erro ao salvar fila:", error);
      sonnerToast.error("Erro ao salvar fila");
    }
  };

  const checkFilaInUse = async (filaId: string) => {
    try {
      // Verifica se há conversas usando esta fila
      const { count: conversationsCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('fila_id', filaId);

      // Verifica se há atendentes vinculados
      const { count: atendentesCount } = await supabase
        .from('atendente_filas')
        .select('*', { count: 'exact', head: true })
        .eq('fila_id', filaId);

      // Verifica se há skills vinculadas
      const { count: skillsCount } = await supabase
        .from('fila_skills')
        .select('*', { count: 'exact', head: true })
        .eq('fila_id', filaId);

      // Verifica se está sendo usada em workflows omnichannel
      const { data: flows } = await supabase
        .from('omnichannel_flows')
        .select('flow_data')
        .eq('estabelecimento_id', estabelecimentoId);

      let flowsCount = 0;
      if (flows) {
        flowsCount = flows.filter((flow: any) => {
          const flowData = flow.flow_data;
          if (flowData && flowData.nodes) {
            return flowData.nodes.some((node: any) => 
              node.data?.config?.filaId === filaId
            );
          }
          return false;
        }).length;
      }

      return {
        inUse: (conversationsCount || 0) > 0 || (atendentesCount || 0) > 0 || (skillsCount || 0) > 0 || flowsCount > 0,
        conversationsCount: conversationsCount || 0,
        atendentesCount: atendentesCount || 0,
        skillsCount: skillsCount || 0,
        flowsCount
      };
    } catch (error) {
      console.error("Erro ao verificar uso da fila:", error);
      return { inUse: true, conversationsCount: 0, atendentesCount: 0, skillsCount: 0, flowsCount: 0 };
    }
  };

  const handleDeleteFila = async (fila: any) => {
    const usage = await checkFilaInUse(fila.id);
    
    if (usage.inUse) {
      let message = "Esta fila não pode ser excluída pois está em uso:\n\n";
      if (usage.conversationsCount > 0) message += `• ${usage.conversationsCount} conversas\n`;
      if (usage.atendentesCount > 0) message += `• ${usage.atendentesCount} atendentes vinculados\n`;
      if (usage.skillsCount > 0) message += `• ${usage.skillsCount} skills configuradas\n`;
      if (usage.flowsCount > 0) message += `• ${usage.flowsCount} workflows omnichannel\n`;
      
      sonnerToast.error(message);
      return;
    }

    setFilaToDelete(fila);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!filaToDelete) return;

    try {
      const { error } = await supabase
        .from('filas_atendimento')
        .delete()
        .eq('id', filaToDelete.id);

      if (error) throw error;
      
      sonnerToast.success("Fila excluída com sucesso");
      setDeleteDialogOpen(false);
      setFilaToDelete(null);
      loadFilas();
    } catch (error) {
      console.error("Erro ao excluir fila:", error);
      sonnerToast.error("Erro ao excluir fila");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Carregando...</div>;
  }

  return (
    <>
      <FilasManager
        filas={filas}
        onCreateFila={handleCreateFila}
        onEditFila={handleEditFila}
        onDeleteFila={handleDeleteFila}
        onToggleAtiva={handleToggleAtiva}
        onViewAtendentes={handleViewAtendentes}
        onConfigureSkills={handleConfigureSkills}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFila ? "Editar Fila" : "Nova Fila"}</DialogTitle>
            <DialogDescription>
              Configure uma fila de atendimento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome da Fila *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Suporte Técnico"
                />
              </div>

              <div>
                <Label htmlFor="prioridade">Prioridade</Label>
                <Input
                  id="prioridade"
                  type="number"
                  value={formData.prioridade}
                  onChange={(e) => setFormData({ ...formData, prioridade: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da fila"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo_roteamento">Tipo de Roteamento</Label>
                <select
                  id="tipo_roteamento"
                  value={formData.tipo_roteamento}
                  onChange={(e) => setFormData({ ...formData, tipo_roteamento: e.target.value as any })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="round_robin">Circular</option>
                  <option value="por_disponibilidade">Por Disponibilidade</option>
                  <option value="por_skill">Por Skill</option>
                  <option value="por_prioridade">Por Prioridade</option>
                  <option value="por_carteira">Por Carteira</option>
                </select>
              </div>

              <div>
                <Label htmlFor="max_chats">Max Chats por Atendente</Label>
                <Input
                  id="max_chats"
                  type="number"
                  value={formData.max_chats_por_atendente}
                  onChange={(e) => setFormData({ ...formData, max_chats_por_atendente: parseInt(e.target.value) || 5 })}
                  min={1}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tempo_resposta">Tempo de Resposta Esperado (segundos)</Label>
              <Input
                id="tempo_resposta"
                type="number"
                value={formData.tempo_resposta_esperado}
                onChange={(e) => setFormData({ ...formData, tempo_resposta_esperado: parseInt(e.target.value) || 300 })}
                min={0}
              />
            </div>

            <div>
              <Label htmlFor="mensagem_fila">Mensagem da Fila</Label>
              <Input
                id="mensagem_fila"
                value={formData.mensagem_fila}
                onChange={(e) => setFormData({ ...formData, mensagem_fila: e.target.value })}
                placeholder="Mensagem exibida ao entrar na fila"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="ativa"
                checked={formData.ativa}
                onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                className="rounded border-input"
              />
              <Label htmlFor="ativa">Fila ativa</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingFila ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={atendentesDialogOpen} onOpenChange={setAtendentesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atendentes da Fila: {selectedFila?.nome}</DialogTitle>
            <DialogDescription>
              Gerencie os atendentes vinculados a esta fila
            </DialogDescription>
          </DialogHeader>
          {selectedFila && estabelecimentoId && (
            <AtendentesFilaManager 
              filaId={selectedFila.id} 
              estabelecimentoId={estabelecimentoId}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={skillsDialogOpen} onOpenChange={setSkillsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Skills da Fila: {selectedFila?.nome}</DialogTitle>
            <DialogDescription>
              Configure as habilidades necessárias para esta fila
            </DialogDescription>
          </DialogHeader>
          {selectedFila && estabelecimentoId && (
            <SkillsFilaManager 
              filaId={selectedFila.id} 
              estabelecimentoId={estabelecimentoId}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a fila "{filaToDelete?.nome}"?
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFilaToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SkillsManagerWrapper({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null);
  const [editingSkill, setEditingSkill] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    cor: "#3b82f6"
  });

  useEffect(() => {
    loadSkills();
  }, [estabelecimentoId]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('skills')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');
      if (data) setSkills(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSkill = () => {
    setEditingSkill(null);
    setFormData({
      nome: "",
      descricao: "",
      cor: "#3b82f6"
    });
    setDialogOpen(true);
  };

  const handleEditSkill = (skill: any) => {
    setEditingSkill(skill);
    setFormData({
      nome: skill.nome,
      descricao: skill.descricao || "",
      cor: skill.cor || "#3b82f6"
    });
    setDialogOpen(true);
  };

  const handleDeleteSkill = (skillId: string) => {
    setSkillToDelete(skillId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!skillToDelete) return;

    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillToDelete);

      if (error) throw error;
      
      sonnerToast.success("Habilidade excluída com sucesso");
      loadSkills();
    } catch (error) {
      console.error("Erro ao excluir skill:", error);
      sonnerToast.error("Erro ao excluir habilidade");
    } finally {
      setDeleteDialogOpen(false);
      setSkillToDelete(null);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      sonnerToast.error("Nome da habilidade é obrigatório");
      return;
    }

    try {
      if (editingSkill) {
        const { error } = await supabase
          .from('skills')
          .update(formData)
          .eq('id', editingSkill.id);

        if (error) throw error;
        sonnerToast.success("Habilidade atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from('skills')
          .insert([{
            ...formData,
            estabelecimento_id: estabelecimentoId
          }]);

        if (error) throw error;
        sonnerToast.success("Habilidade criada com sucesso");
      }

      setDialogOpen(false);
      loadSkills();
    } catch (error) {
      console.error("Erro ao salvar skill:", error);
      sonnerToast.error("Erro ao salvar habilidade");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8">Carregando...</div>;
  }

  return (
    <>
      <SkillsManager
        skills={skills}
        onCreateSkill={handleCreateSkill}
        onEditSkill={handleEditSkill}
        onDeleteSkill={handleDeleteSkill}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSkill ? "Editar Habilidade" : "Nova Habilidade"}</DialogTitle>
            <DialogDescription>
              Configure uma habilidade para roteamento avançado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nome">Nome da Habilidade *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Inglês Fluente"
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional da habilidade"
              />
            </div>

            <div>
              <Label htmlFor="cor">Cor</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="cor"
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingSkill ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta habilidade? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function EstabelecimentoDetalhes({ estabelecimentoId, estabelecimentoNome }: EstabelecimentoDetalhesProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Normaliza possíveis valores antigos de subsecao/subsubsecao para os atuais valores dos Accordions
  const rawSubsecaoParam = searchParams.get('subsecao');
  const rawSubsubsecaoParam = searchParams.get('subsubsecao');
  
  // Mapeia valores dos atalhos para os valores reais dos accordions
  const subsecaoParam = rawSubsecaoParam === 'regras-orcamento' 
    ? 'automacao-vendas' 
    : rawSubsecaoParam;
  const subsubsecaoParam = rawSubsubsecaoParam === 'workflows-omnichannel'
    ? 'omnichannel-workflows'
    : rawSubsubsecaoParam;
  
  const [userEstabId, setUserEstabId] = useState<string | null>(null);
  const [helpDialogOpen, setHelpDialogOpen] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);
  const [nestedAccordionValue, setNestedAccordionValue] = useState<string | undefined>(undefined);

  // Força a abertura do accordion quando há parâmetros na URL
  useEffect(() => {
    if (subsecaoParam) {
      // Pequeno delay para garantir que o accordion está montado
      setTimeout(() => {
        setAccordionValue(subsecaoParam);
      }, 50);
    }
    if (subsubsecaoParam) {
      setTimeout(() => {
        setNestedAccordionValue(subsubsecaoParam);
      }, 50);
    }
  }, [subsecaoParam, subsubsecaoParam]);

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (user) {
          const { data, error } = await supabase.rpc('get_user_estabelecimento_id', { _user_id: user.id });
          if (!error) setUserEstabId(data);
        }
      } catch (e) {
        console.error('Erro ao obter estabelecimento do usuário:', e);
      }
    })();
  }, [estabelecimentoId]);

  return (
    <div className="space-y-4 pl-4 border-l-2 border-primary/20">
      <div className="text-sm font-medium text-muted-foreground mb-4">
        Gerenciando dados de: <span className="text-primary font-semibold">{estabelecimentoNome}</span>
      </div>

      {userEstabId && userEstabId !== estabelecimentoId && (
        <Alert variant="destructive">
          <AlertDescription>
            Você não tem permissão para salvar neste estabelecimento. Selecione o estabelecimento vinculado ao seu usuário.
          </AlertDescription>
        </Alert>
      )}

      <Accordion type="single" collapsible className="space-y-2" value={accordionValue} onValueChange={setAccordionValue}>
        <AccordionItem value="resend-config" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span className="font-medium">Configuração Resend (Email)</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configuração Resend (Email) - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">📧 Serviço Resend</h4>
                        <p className="text-sm">Configure o serviço Resend para envio profissional de emails transacionais e marketing.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🔑 API Key</h4>
                        <p className="text-sm">Obtenha sua chave API em resend.com após criar uma conta e verificar seu domínio.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">📮 Remetente</h4>
                        <p className="text-sm">Configure o email e nome que aparecerão como remetente dos emails enviados.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ResendConfigSection estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-unidades" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="font-medium">Cadastro de Unidades</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Cadastro de Unidades - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">🏢 Unidades Organizacionais</h4>
                        <p className="text-sm">Cadastre filiais, departamentos ou unidades de negócio para organização hierárquica.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">📍 Localização</h4>
                        <p className="text-sm">Registre endereço completo, telefone e informações de contato de cada unidade.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">👥 Gestão de Equipes</h4>
                        <p className="text-sm">Vincule usuários e equipes às unidades para segmentação de relatórios e permissões.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <UnidadesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-sla" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">SLA de Atendimento</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>SLA de Atendimento - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">📊 O que é SLA?</h4>
                        <p className="text-sm">SLA (Service Level Agreement) define os tempos máximos de resposta e resolução para seus atendimentos.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">⏱️ Tempos Monitorados</h4>
                        <ul className="text-sm list-disc ml-6 space-y-1">
                          <li><strong>Primeira Resposta:</strong> Tempo até a primeira resposta do atendente</li>
                          <li><strong>Respostas Subsequentes:</strong> Tempo entre mensagens do cliente e respostas</li>
                          <li><strong>Resolução Total:</strong> Tempo total até encerramento do chat</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🎯 Multiplicadores de Prioridade</h4>
                        <p className="text-sm">Os tempos são ajustados automaticamente pela prioridade do chat.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🔔 Notificações e Ações</h4>
                        <p className="text-sm">Configure notificações automáticas para supervisores e ações como aumento de prioridade ou escalação quando SLA está em risco.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <SLAConfigCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="usuarios-acessos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4 text-primary" />
                <span className="font-medium">Usuários e Acessos</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Usuários e Acessos - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">👥 Grupos de Acesso</h4>
                        <p className="text-sm">Defina perfis de permissão para controlar o que cada tipo de usuário pode visualizar e fazer no sistema. Exemplos: Administrador, Atendente, Supervisor.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">👤 Cadastro de Usuários</h4>
                        <p className="text-sm">Gerencie os usuários do estabelecimento, atribuindo grupos de acesso e configurando permissões individuais.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🏷️ Segmentos</h4>
                        <p className="text-sm">Organize seus clientes em segmentos para campanhas direcionadas e relatórios específicos.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">⭐ Atalhos</h4>
                        <p className="text-sm">Configure atalhos personalizados para acesso rápido às funcionalidades mais utilizadas.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Accordion type="single" collapsible className="space-y-2 pl-4" value={nestedAccordionValue} onValueChange={setNestedAccordionValue}>
              <AccordionItem value="grupos-acesso" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-primary" />
                      <span className="font-medium">Grupos de Acesso</span>
                    </div>
                    <Dialog open={helpDialogOpen === "grupos-acesso"} onOpenChange={(open) => setHelpDialogOpen(open ? "grupos-acesso" : null)}>
                      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <HelpCircle className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Grupos de Acesso - Ajuda</DialogTitle>
                          <DialogDescription className="text-left space-y-4 pt-4">
                            <div>
                              <h4 className="font-semibold mb-2">🔐 Controle de Permissões</h4>
                              <p className="text-sm">Crie perfis personalizados definindo quais menus e funcionalidades cada grupo pode acessar.</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">📋 Exemplos de Grupos</h4>
                              <p className="text-sm">Administrador (acesso total), Atendente (somente atendimento), Supervisor (relatórios + atendimento), Vendedor (somente vendas).</p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <GruposAcessoCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cadastro-usuarios" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-4 h-4 text-primary" />
                      <span className="font-medium">Cadastro de Usuários</span>
                    </div>
                    <Dialog open={helpDialogOpen === "cadastro-usuarios"} onOpenChange={(open) => setHelpDialogOpen(open ? "cadastro-usuarios" : null)}>
                      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <HelpCircle className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Cadastro de Usuários - Ajuda</DialogTitle>
                          <DialogDescription className="text-left space-y-4 pt-4">
                            <div>
                              <h4 className="font-semibold mb-2">👤 Gestão de Usuários</h4>
                              <p className="text-sm">Crie e gerencie os usuários que terão acesso ao sistema, definindo nome, email, senha e grupo de acesso.</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">🎭 Atribuição de Roles</h4>
                              <p className="text-sm">Associe cada usuário a um grupo de acesso para definir suas permissões no sistema.</p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <UsuariosCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cadastro-segmentos" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="font-medium">Cadastro de Segmentos</span>
                    </div>
                    <Dialog open={helpDialogOpen === "cadastro-segmentos"} onOpenChange={(open) => setHelpDialogOpen(open ? "cadastro-segmentos" : null)}>
                      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <HelpCircle className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Cadastro de Segmentos - Ajuda</DialogTitle>
                          <DialogDescription className="text-left space-y-4 pt-4">
                            <div>
                              <h4 className="font-semibold mb-2">🏷️ Segmentação de Clientes</h4>
                              <p className="text-sm">Crie segmentos para organizar seus clientes por características comuns (VIP, Bronze, Prata, Ouro, etc.).</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">🎯 Campanhas Direcionadas</h4>
                              <p className="text-sm">Use segmentos para enviar campanhas de marketing personalizadas e criar relatórios específicos.</p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <SegmentosCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="gerenciar-atalhos" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary" />
                      <span className="font-medium">Gerenciar Atalhos</span>
                    </div>
                    <Dialog open={helpDialogOpen === "gerenciar-atalhos"} onOpenChange={(open) => setHelpDialogOpen(open ? "gerenciar-atalhos" : null)}>
                      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <HelpCircle className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Gerenciar Atalhos - Ajuda</DialogTitle>
                          <DialogDescription className="text-left space-y-4 pt-4">
                            <div>
                              <h4 className="font-semibold mb-2">⚡ Acesso Rápido</h4>
                              <p className="text-sm">Configure atalhos personalizados para cada usuário acessar rapidamente as funcionalidades mais utilizadas.</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">🎨 Personalização</h4>
                              <p className="text-sm">Defina ícones, cores e ordem de exibição dos atalhos no menu principal.</p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure os atalhos personalizados para cada usuário do sistema.
                    </p>
                    <Button onClick={() => window.location.href = '/gerenciar-atalhos'} className="w-full">
                      <Star className="w-4 h-4 mr-2" />
                      Acessar Gerenciador de Atalhos
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ia-config" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="font-medium">Configurações de IA</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>💡 Configurações de IA - Guia Completo</DialogTitle>
                    <DialogDescription className="space-y-4 text-left pt-4">
                      <p>
                        Configure qual provedor e modelo de IA será usado em cada contexto do sistema.
                      </p>
                      <div>
                        <h4 className="font-semibold mb-2">🤖 Provedor Padrão (Lovable AI)</h4>
                        <p className="text-sm">Por padrão, o sistema usa Lovable AI sem necessidade de chaves API. Configure apenas se desejar usar outro provedor.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">📍 Contextos Disponíveis</h4>
                        <ul className="text-sm space-y-1 list-disc list-inside">
                          <li>Sugestão de Resposta: IA sugere respostas baseadas no contexto</li>
                          <li>Resumo: IA resume conversas longas</li>
                          <li>Tradução: IA traduz mensagens em tempo real</li>
                          <li>Análise de Sentimento: IA analisa sentimento das mensagens</li>
                          <li>Sugestão de Artigos KB: IA sugere artigos da base de conhecimento</li>
                          <li>Extração de Itens: IA extrai itens de orçamento</li>
                          <li>Sugestão de Produtos: IA sugere produtos</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🔑 Provedores Externos</h4>
                        <p className="text-sm">Para usar OpenAI, Anthropic ou Google diretamente, você precisará fornecer suas próprias chaves API.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <IAConfigCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="quality-assurance" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                <span className="font-medium">Controle de Qualidade</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Controle de Qualidade - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">📋 O que é?</h4>
                        <p className="text-sm">Sistema completo para avaliar e monitorar a qualidade do atendimento da sua equipe.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">✅ Formulários de Avaliação</h4>
                        <p className="text-sm">Crie critérios personalizados (booleano, escala 1-5, texto) com pesos e campos obrigatórios.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🎯 Metas por Atendente</h4>
                        <p className="text-sm">Defina pontuação mínima e número de avaliações esperadas por período.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">📊 Dashboard de Qualidade</h4>
                        <p className="text-sm">Acompanhe scores, evolução temporal, critérios com pior desempenho e atendentes abaixo da meta.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <QualityAssuranceCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="analise-sentimento" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="font-medium">Análise de Sentimento</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Análise de Sentimento - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">🤖 Análise Automática com IA</h4>
                        <p className="text-sm">Cada mensagem é analisada em tempo real detectando sentimento (positivo/neutro/negativo), emoção e pontuação de 0.0 a 1.0.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🚨 Alertas Proativos</h4>
                        <p className="text-sm">Notificações automáticas quando detecta múltiplas mensagens negativas, pontuação baixa ou palavras de escalação.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">⚙️ Limites Configuráveis</h4>
                        <p className="text-sm">Defina os limites de pontuação para classificação negativa/positiva e o número de mensagens negativas para alerta.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">📈 Dashboard de Sentimento</h4>
                        <p className="text-sm">Acompanhe score médio, distribuição de sentimentos, alertas e tendências ao longo do tempo.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <SentimentAnalysisCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="api-webhooks" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="font-medium">API E Webhooks</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>API E Webhooks - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">🔗 Gerador de APIs</h4>
                        <p className="text-sm">Crie endpoints REST automaticamente a partir de consultas SQL para integração com sistemas externos.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">📤 Webhooks de Saída</h4>
                        <p className="text-sm">Configure webhooks para enviar dados automaticamente para URLs externas quando eventos ocorrerem.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">📥 Webhooks de Entrada</h4>
                        <p className="text-sm">Receba dados de sistemas externos através de URLs únicas geradas pelo sistema.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Accordion type="single" collapsible className="space-y-2 pl-4" value={nestedAccordionValue} onValueChange={setNestedAccordionValue}>
              <AccordionItem value="gerador-api" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="font-medium">Gerador de APIs</span>
                    </div>
                    <Dialog open={helpDialogOpen === "gerador-api"} onOpenChange={(open) => setHelpDialogOpen(open ? "gerador-api" : null)}>
                      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <HelpCircle className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Gerador de APIs - Ajuda</DialogTitle>
                          <DialogDescription className="text-left space-y-4 pt-4">
                            <div>
                              <h4 className="font-semibold mb-2">🔗 APIs REST Automáticas</h4>
                              <p className="text-sm">Transforme consultas SQL em endpoints REST prontos para integração com sistemas externos.</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">🔒 Segurança</h4>
                              <p className="text-sm">Configure autenticação, permissões e limites de acesso para cada endpoint criado.</p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <APIGeneratorCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cadastro-webhooks" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Webhook className="w-4 h-4 text-primary" />
                      <span className="font-medium">Cadastro de Webhooks</span>
                    </div>
                    <Dialog open={helpDialogOpen === "cadastro-webhooks"} onOpenChange={(open) => setHelpDialogOpen(open ? "cadastro-webhooks" : null)}>
                      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <HelpCircle className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Cadastro de Webhooks - Ajuda</DialogTitle>
                          <DialogDescription className="text-left space-y-4 pt-4">
                            <div>
                              <h4 className="font-semibold mb-2">📤 Webhooks de Saída</h4>
                              <p className="text-sm">Envie dados automaticamente para URLs externas quando eventos específicos ocorrerem no sistema.</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">🎯 Eventos Configuráveis</h4>
                              <p className="text-sm">Configure gatilhos como novo chat, mensagem recebida, chat encerrado, etc.</p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <WebhooksCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cadastro-webhooks-entrada" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Webhook className="w-4 h-4 text-primary" />
                      <span className="font-medium">Cadastro de Webhooks de Entrada</span>
                    </div>
                    <Dialog open={helpDialogOpen === "cadastro-webhooks-entrada"} onOpenChange={(open) => setHelpDialogOpen(open ? "cadastro-webhooks-entrada" : null)}>
                      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <HelpCircle className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Webhooks de Entrada - Ajuda</DialogTitle>
                          <DialogDescription className="text-left space-y-4 pt-4">
                            <div>
                              <h4 className="font-semibold mb-2">📥 Receba Dados Externos</h4>
                              <p className="text-sm">Gere URLs únicas para receber dados de sistemas externos via POST.</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">🔄 Processamento Automático</h4>
                              <p className="text-sm">Configure ações automáticas para processar os dados recebidos (criar contato, abrir chat, etc.).</p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <WebhooksEntradaCRUD />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notificacoes" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="font-medium">Notificações</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Notificações - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">🔔 Notificações em Tempo Real</h4>
                        <p className="text-sm">Configure alertas instantâneos para eventos importantes como novos chats, violações de SLA, sentimentos negativos e mais.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🔊 Personalização</h4>
                        <p className="text-sm">Ajuste volume, escolha sons diferentes para cada tipo de notificação e configure notificações de desktop.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">📊 Log de Notificações</h4>
                        <p className="text-sm">Todas as notificações são registradas para auditoria e análise posterior.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <NotificacoesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="seguranca" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-medium">Segurança e LGPD</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Segurança e LGPD - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">🔒 Controle de Acesso</h4>
                        <p className="text-sm">Configure políticas de segurança, autenticação de dois fatores e restrições de IP.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">📜 Conformidade LGPD</h4>
                        <p className="text-sm">Gerencie consentimentos, políticas de privacidade e direitos dos titulares de dados.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🗑️ Retenção de Dados</h4>
                        <p className="text-sm">Configure períodos de retenção e exclusão automática de dados conforme a legislação.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <SegurancaCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ucm-config" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span className="font-medium">Configuração PABX (UCM)</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configuração PABX (UCM) - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">📞 Integração PABX</h4>
                        <p className="text-sm">Conecte seu sistema Grandstream UCM para realizar e receber chamadas telefônicas através da plataforma.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🌐 Modo Local ou Web</h4>
                        <p className="text-sm">Configure se o UCM está na rede local ou acessível pela web para chamadas diretas ou via proxy.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">📊 Softphone Integrado</h4>
                        <p className="text-sm">Use o softphone integrado para fazer e receber chamadas sem sair da plataforma.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <UCMConfigCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="calendario-regras" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-medium">Regras do Calendário</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Regras do Calendário - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">📅 Regras Configuráveis</h4>
                        <p className="text-sm">Crie regras automáticas para gestão inteligente do calendário e tarefas.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🔄 Movimentação Automática</h4>
                        <p className="text-sm">Configure regras para mover tarefas não realizadas para o próximo dia útil automaticamente.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🚫 Bloqueios</h4>
                        <p className="text-sm">Defina bloqueios de finais de semana, feriados e horários específicos com confirmação ou realocação.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">⏰ Horário Comercial</h4>
                        <p className="text-sm">Configure horários de trabalho para validar e realocar tarefas automaticamente.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <CalendarioRegrasCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pesquisas-satisfacao" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                <span className="font-medium">Pesquisas de Satisfação (Config)</span>
              </div>
              <Dialog>
                <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Pesquisas de Satisfação - Ajuda</DialogTitle>
                    <DialogDescription className="text-left space-y-4 pt-4">
                      <div>
                        <h4 className="font-semibold mb-2">⭐ CSAT e NPS</h4>
                        <p className="text-sm">Crie pesquisas de satisfação (CSAT) ou probabilidade de recomendação (NPS) personalizadas.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🎯 Disparo Automático</h4>
                        <p className="text-sm">Configure envio automático após encerramento de chats, com filtros por canal, fila e segmento.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">📊 Dashboard Integrado</h4>
                        <p className="text-sm">Visualize resultados, NPS score, distribuição de notas e comentários em dashboards dedicados.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">🔗 Múltiplos Canais</h4>
                        <p className="text-sm">Envie pesquisas por WhatsApp, Telegram, WebChat, E-mail e SMS automaticamente.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <PesquisasSatisfacaoCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}
