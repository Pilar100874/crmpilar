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
import { CondicoesPagamentoCRUD } from "./CondicoesPagamentoCRUD";
import { TabelasPrecoCRUD } from "./TabelasPrecoCRUD";
import { TiposPagamentoCRUD } from "./TiposPagamentoCRUD";
import { CalendarioRegrasCRUD } from "./CalendarioRegrasCRUD";
import { UCMConfigCRUD } from "./UCMConfigCRUD";
import { OmnichannelFlowsCRUD } from "./OmnichannelFlowsCRUD";
import { FilasManager } from "@/components/atendimento/FilasManager";
import { SkillsManager } from "@/components/atendimento/SkillsManager";
import { AtendentesFilaManager } from "@/components/atendimento/AtendentesFilaManager";
import { SkillsFilaManager } from "@/components/atendimento/SkillsFilaManager";
import { Users, Building2, Tag, FolderTree, UserCog, Share2, MessageSquare, Link as LinkIcon, Globe, Webhook, Key, Bell, Shield, Mail, Package, FolderOpen, Layers, CreditCard, DollarSign, Wallet, Calendar, Phone, MessageSquareQuote, Award, Workflow } from "lucide-react";
import { useState, useEffect } from "react";
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

  if (loading) {
    return <div className="flex items-center justify-center py-8">Carregando...</div>;
  }

  return (
    <>
      <FilasManager
        filas={filas}
        onCreateFila={handleCreateFila}
        onEditFila={handleEditFila}
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
                  <option value="round_robin">Round Robin</option>
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
  const [userEstabId, setUserEstabId] = useState<string | null>(null);

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

      <Accordion type="single" collapsible className="space-y-2">
        <AccordionItem value="resend-config" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span className="font-medium">Configuração Resend (Email)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ResendConfigSection estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cadastro-unidades" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="font-medium">Cadastro de Unidades</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <UnidadesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>


        <AccordionItem value="usuarios-acessos" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-primary" />
              <span className="font-medium">Usuários e Acessos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Accordion type="single" collapsible className="space-y-2 pl-4">
              <AccordionItem value="grupos-acesso" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-primary" />
                    <span className="font-medium">Grupos de Acesso</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <GruposAcessoCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cadastro-usuarios" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-primary" />
                    <span className="font-medium">Cadastro de Usuários</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <UsuariosCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cadastro-segmentos" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="font-medium">Cadastro de Segmentos</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <SegmentosCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="atendimento" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="w-4 h-4 text-primary" />
              <span className="font-medium">Atendimento</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Accordion type="single" collapsible className="space-y-2 pl-4">
              <AccordionItem value="filas-atendimento" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <MessageSquareQuote className="w-4 h-4 text-primary" />
                    <span className="font-medium">Filas de Atendimento</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <FilasManagerWrapper estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="skills-atendimento" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="font-medium">Skills de Atendimento</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <SkillsManagerWrapper estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="anexos-rapidos" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-primary" />
                    <span className="font-medium">Anexos Rápidos Globais</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <QuickAttachmentsCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="textos-prontos" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="font-medium">Textos Prontos Globais</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <QuickRepliesCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="redes-sociais" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-primary" />
                    <span className="font-medium">Redes Sociais</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <RedesSociaisCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="canais" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    <span className="font-medium">Canais de Atendimento</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <CanaisAtendimentoCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="omnichannel-workflows" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-primary" />
                    <span className="font-medium">Workflow Builder Omnichannel</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <OmnichannelFlowsCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="api-webhooks" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="font-medium">API E Webhooks</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Accordion type="single" collapsible className="space-y-2 pl-4">
              <AccordionItem value="gerador-api" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="font-medium">Gerador de APIs</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <APIGeneratorCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cadastro-webhooks" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-primary" />
                    <span className="font-medium">Cadastro de Webhooks</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <WebhooksCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cadastro-webhooks-entrada" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-primary" />
                    <span className="font-medium">Cadastro de Webhooks de Entrada</span>
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
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-medium">Notificações</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <NotificacoesCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="seguranca" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="font-medium">Segurança e LGPD</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <SegurancaCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ucm-config" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <span className="font-medium">Configuração PABX (UCM)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <UCMConfigCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vendas" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="w-4 h-4 text-primary" />
              <span className="font-medium">Vendas</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Accordion type="single" collapsible className="space-y-2 pl-4">
              <AccordionItem value="tipos-pagamento" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="font-medium">Tipos de Pagamento</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <TiposPagamentoCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tabelas-preco" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="font-medium">Tabelas de Preço</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <TabelasPrecoCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="condicoes-pagamento" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span className="font-medium">Condições de Pagamento</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <CondicoesPagamentoCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="produtos" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-medium">Cadastro de Produtos</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <ProdutosCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="produto-grupos" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="font-medium">Grupos de Produtos</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <ProdutoGruposCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="produto-categorias" className="border rounded-md">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-primary" />
                    <span className="font-medium">Categorias de Produtos</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <ProdutoCategoriasCRUD estabelecimentoId={estabelecimentoId} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="calendario-regras" className="border rounded-md">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">Regras do Calendário</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <CalendarioRegrasCRUD estabelecimentoId={estabelecimentoId} />
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}
