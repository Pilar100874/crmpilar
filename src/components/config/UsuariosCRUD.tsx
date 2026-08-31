import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { USUARIO_COLUNAS_PUBLICAS } from "@/lib/usuariosColunas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, HelpCircle, ExternalLink, Award, TestTube, Loader2, Mail, Search, Users, ArrowLeft } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { AtendenteSkillsManager } from "./AtendenteSkillsManager";
import { MaskedInput } from "@/components/ui/masked-input";
import { maskWhatsApp } from "@/lib/masks";
import { validateEmail, validateWhatsApp } from "@/lib/validators";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CadastroCardList } from "@/components/cadastros/CadastroCardList";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  unidade_id: string | null;
  grupo_acesso_id: string | null;
  estabelecimento_id: string | null;
  smtp: string | null;
  porta_smtp: number | null;
  imap: string | null;
  porta_imap: number | null;
  senha_email: string | null;
  usar_autenticacao: boolean | null;
  hora_inicial: string;
  hora_final: string;
  ramal: string | null;
  senha_sip: string | null;
  usuario_sip: string | null;
  is_admin?: boolean;
  unidades?: { nome: string };
  grupos_acesso?: { nome: string };
  estabelecimentos?: { nome: string };
  is_porteiro?: boolean;
  is_atendente?: boolean;
  atendente_id?: string;
  tipo?: string;
}

interface Unidade {
  id: string;
  nome: string;
}

interface GrupoAcesso {
  id: string;
  nome: string;
}

interface Segmento {
  id: string;
  nome: string;
}

interface Estabelecimento {
  id: string;
  nome: string;
  numero_usuarios_permitidos: number;
}

interface UsuariosCRUDProps {
  estabelecimentoId?: string;
}

export const UsuariosCRUD = ({ estabelecimentoId }: UsuariosCRUDProps) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [smtp, setSmtp] = useState("");
  const [portaSmtp, setPortaSmtp] = useState("");
  const [imap, setImap] = useState("");
  const [portaImap, setPortaImap] = useState("");
  const [senhaEmail, setSenhaEmail] = useState("");
  const [usarAutenticacao, setUsarAutenticacao] = useState(true);
  const [unidadeId, setUnidadeId] = useState("");
  const [grupoAcessoId, setGrupoAcessoId] = useState("");
  const [selectedEstabelecimentoId, setSelectedEstabelecimentoId] = useState("");
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [horaInicial, setHoraInicial] = useState("08:00");
  const [horaFinal, setHoraFinal] = useState("18:00");
  const [ramal, setRamal] = useState("");
  const [tipo, setTipo] = useState<string>("padrao");
  const [senhaSip, setSenhaSip] = useState("");
  const [usuarioSip, setUsuarioSip] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAtendente, setIsAtendente] = useState(false);
  const [isPorteiro, setIsPorteiro] = useState(false);
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [selectedUsuarioForSkills, setSelectedUsuarioForSkills] = useState<Usuario | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [perfilFiltro, setPerfilFiltro] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  
  const { toast } = useToast();

  // O grupo de acesso é a única fonte das permissões (admin/atendente/porteiro/gerente)
  const perfilGrupo: string =
    (grupos.find((g: any) => g.id === grupoAcessoId) as any)?.perfil || "padrao";

  useEffect(() => {
    setIsAdmin(perfilGrupo === "admin");
    setIsAtendente(perfilGrupo === "atendente");
    setIsPorteiro(perfilGrupo === "porteiro");
    setTipo(perfilGrupo === "gerente" ? "gerente" : "padrao");
  }, [perfilGrupo]);

  useEffect(() => {
    fetchData();
  }, [estabelecimentoId]);


  const fetchData = async () => {
    await Promise.all([
      fetchUsuarios(),
      fetchUnidades(),
      fetchGrupos(),
      fetchSegmentos(),
      fetchEstabelecimentos(),
    ]);
  };

  const fetchUsuarios = async () => {
    let query = (supabase as any)
      .from("usuarios")
      .select(`
        ${USUARIO_COLUNAS_PUBLICAS},
        unidades(nome),
        grupos_acesso(nome),
        estabelecimentos(nome)
      `);

    // Filter by estabelecimento if prop is provided
    if (estabelecimentoId) {
      query = query.eq('estabelecimento_id', estabelecimentoId);
    }

    const { data, error } = await query.order("nome");

    if (error) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Buscar roles de admin e atendentes para cada usuário
    const usuariosComRoles = await Promise.all(
      (data || []).map(async (usuario) => {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", usuario.id)
          .eq("role", "admin")
          .maybeSingle();
        
        const { data: atendenteData } = await supabase
          .from("atendentes")
          .select("id")
          .eq("usuario_id", usuario.id)
          .maybeSingle();
        
        return {
          ...usuario,
          is_admin: !!roleData,
          is_atendente: !!atendenteData,
          atendente_id: atendenteData?.id,
        };
      })
    );

    setUsuarios(usuariosComRoles);
  };

  const fetchUnidades = async () => {
    let query = supabase.from("unidades").select("*");
    if (estabelecimentoId) {
      query = query.eq('estabelecimento_id', estabelecimentoId);
    }
    const { data } = await query.order("nome");
    setUnidades(data || []);
  };

  const fetchGrupos = async () => {
    let query = supabase.from("grupos_acesso").select("*");
    if (estabelecimentoId) {
      query = query.eq('estabelecimento_id', estabelecimentoId);
    }
    const { data } = await query.order("nome");
    setGrupos(data || []);
  };

  const fetchSegmentos = async () => {
    let query = supabase.from("segmentos").select("*");
    if (estabelecimentoId) {
      query = query.eq('estabelecimento_id', estabelecimentoId);
    }
    const { data } = await query.order("nome");
    setSegmentos(data || []);
  };

  const fetchEstabelecimentos = async () => {
    const { data } = await supabase.from("estabelecimentos").select("*").order("nome");
    setEstabelecimentos(data || []);
  };

  const checkExistingAdmin = async (userEstabelecimentoId: string, currentUserId?: string) => {
    // Buscar se já existe um admin no estabelecimento
    const { data: existingAdmins } = await supabase
      .from("user_roles")
      .select("user_id, usuarios!inner(estabelecimento_id)")
      .eq("role", "admin")
      .eq("usuarios.estabelecimento_id", userEstabelecimentoId);

    if (existingAdmins && existingAdmins.length > 0) {
      // Se estiver editando, verificar se o admin existente é o próprio usuário
      if (currentUserId && existingAdmins.some(admin => admin.user_id === currentUserId)) {
        return false; // Não há outro admin
      }
      return true; // Já existe outro admin
    }
    return false; // Não há admin
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !telefone.trim() || !horaInicial || !horaFinal) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome, WhatsApp e jornada de trabalho são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!validateWhatsApp(telefone)) {
      toast({
        title: "WhatsApp inválido",
        description: "Informe um número de WhatsApp válido com DDD",
        variant: "destructive",
      });
      return;
    }

    if (email.trim() && !validateEmail(email)) {
      toast({
        title: "E-mail inválido",
        description: "Corrija o e-mail informado ou deixe o campo em branco",
        variant: "destructive",
      });
      return;
    }


    if (!unidadeId) {
      toast({
        title: "Unidade obrigatória",
        description: "Selecione a unidade do usuário",
        variant: "destructive",
      });
      return;
    }

    if (!estabelecimentoId) {
      toast({
        title: "Estabelecimento obrigatório",
        description: "Selecione um estabelecimento",
        variant: "destructive",
      });
      return;
    }

    // Validar se já existe um admin no estabelecimento
    if (isAdmin) {
      const userEstabelecimentoId = selectedEstabelecimentoId || estabelecimentoId;
      const hasAnotherAdmin = await checkExistingAdmin(userEstabelecimentoId, editingId);
      
      if (hasAnotherAdmin) {
        toast({
          title: "Limite atingido",
          description: "Já existe um usuário com permissão de admin neste estabelecimento",
          variant: "destructive",
        });
        return;
      }
    }

    if (!editingId && !senha) {
      toast({
        title: "Senha obrigatória",
        description: "Por favor, defina uma senha para o novo usuário",
        variant: "destructive",
      });
      return;
    }

    if (senha && senha.length < 6) {
      toast({
        title: "Senha inválida",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    const usuarioData = {
      nome,
      email: email.trim() || null,
      whatsapp: telefone,
      unidade_id: unidadeId || null,
      grupo_acesso_id: grupoAcessoId || null,
      estabelecimento_id: selectedEstabelecimentoId || estabelecimentoId,
      senha_hash: senha || undefined,
      smtp: smtp || null,
      porta_smtp: portaSmtp ? parseInt(portaSmtp) : null,
      imap: imap || null,
      porta_imap: portaImap ? parseInt(portaImap) : null,
      senha_email: senhaEmail || null,
      usar_autenticacao: usarAutenticacao,
      hora_inicial: horaInicial,
      hora_final: horaFinal,
      ramal: ramal || null,
      senha_sip: senhaSip || null,
      usuario_sip: usuarioSip || null,
      tipo: tipo || 'padrao',
      is_porteiro: isPorteiro,
    };

    if (editingId) {
      const { error } = await supabase
        .from("usuarios")
        .update(usuarioData)
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Atualizar segmentos
      await supabase
        .from("usuario_segmentos")
        .delete()
        .eq("usuario_id", editingId);

      if (segmentosSelecionados.length > 0) {
        await supabase
          .from("usuario_segmentos")
          .insert(
            segmentosSelecionados.map((sid) => ({
              usuario_id: editingId,
              segmento_id: sid,
            }))
          );
      }

      // Atualizar a role somente quando o valor realmente mudou.
      // Remover e recriar uma role já existente acionava a validação de admin único.
      const { data: adminRoleAtual, error: adminRoleCheckError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("user_id", editingId)
        .eq("role", "admin")
        .maybeSingle();

      if (adminRoleCheckError) {
        toast({
          title: "Erro ao verificar permissão",
          description: adminRoleCheckError.message,
          variant: "destructive",
        });
        return;
      }

      if (isAdmin && !adminRoleAtual) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: editingId,
            role: "admin",
          });

        if (roleError) {
          toast({
            title: "Erro ao atribuir permissão",
            description: roleError.message,
            variant: "destructive",
          });
          return;
        }
      } else if (!isAdmin && adminRoleAtual) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", editingId)
          .eq("role", "admin");

        if (roleError) {
          toast({
            title: "Erro ao remover permissão",
            description: roleError.message,
            variant: "destructive",
          });
          return;
        }
      }

      // Gerenciar registro de atendente
      const { data: atendenteExistente, error: atendenteCheckError } = await supabase
        .from("atendentes")
        .select("id")
        .eq("usuario_id", editingId)
        .maybeSingle();

      if (atendenteCheckError) {
        toast({
          title: "Erro ao verificar atendente",
          description: atendenteCheckError.message,
          variant: "destructive",
        });
        return;
      }

      if (isAtendente && !atendenteExistente) {
        const { error: atendenteInsertError } = await supabase
          .from("atendentes")
          .insert({
            usuario_id: editingId,
            estabelecimento_id: selectedEstabelecimentoId || estabelecimentoId,
            status: "offline",
            max_chats_simultaneos: 3,
            aceita_novos_chats: true,
          });

        if (atendenteInsertError) {
          toast({
            title: "Erro ao criar atendente",
            description: atendenteInsertError.message,
            variant: "destructive",
          });
          return;
        }
      } else if (!isAtendente && atendenteExistente) {
        const { error: atendenteDeleteError } = await supabase
          .from("atendentes")
          .delete()
          .eq("usuario_id", editingId);

        if (atendenteDeleteError) {
          toast({
            title: "Erro ao remover atendente",
            description: atendenteDeleteError.message,
            variant: "destructive",
          });
          return;
        }
      }

      toast({ title: "Usuário atualizado com sucesso!" });
      resetForm();
      fetchUsuarios();
    } else {
      const { data, error } = await (supabase as any)
        .from("usuarios")
        .insert([usuarioData])
        .select(USUARIO_COLUNAS_PUBLICAS)
        .single();

      if (error) {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Adicionar segmentos
      if (data && segmentosSelecionados.length > 0) {
        await supabase
          .from("usuario_segmentos")
          .insert(
            segmentosSelecionados.map((sid) => ({
              usuario_id: data.id,
              segmento_id: sid,
            }))
          );
      }

      // Adicionar role de admin
      if (data && isAdmin) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: data.id,
            role: "admin",
          });

        if (roleError) {
          toast({
            title: "Erro ao atribuir permissão",
            description: roleError.message,
            variant: "destructive",
          });
          return;
        }
      }

      // Criar atendente se marcado
      if (data && isAtendente) {
        const { error: atendenteInsertError } = await supabase
          .from("atendentes")
          .insert({
            usuario_id: data.id,
            estabelecimento_id: selectedEstabelecimentoId || estabelecimentoId,
            status: "offline",
            max_chats_simultaneos: 3,
            aceita_novos_chats: true,
          });

        if (atendenteInsertError) {
          toast({
            title: "Erro ao criar atendente",
            description: atendenteInsertError.message,
            variant: "destructive",
          });
          return;
        }
      }

      toast({ title: "Usuário criado com sucesso!" });
      resetForm();
      fetchUsuarios();
    }
  };

  const detectEmailProvider = (emailAddress: string) => {
    const domain = emailAddress.toLowerCase().split('@')[1];
    
    if (!domain) return;
    
    const configs: Record<string, {
      smtp: string;
      portaSmtp: string;
      imap: string;
      portaImap: string;
      providerName: string;
    }> = {
      'gmail.com': {
        smtp: 'smtp.gmail.com',
        portaSmtp: '587',
        imap: 'imap.gmail.com',
        portaImap: '993',
        providerName: 'Gmail'
      },
      'hotmail.com': {
        smtp: 'smtp-mail.outlook.com',
        portaSmtp: '587',
        imap: 'outlook.office365.com',
        portaImap: '993',
        providerName: 'Hotmail'
      },
      'outlook.com': {
        smtp: 'smtp-mail.outlook.com',
        portaSmtp: '587',
        imap: 'outlook.office365.com',
        portaImap: '993',
        providerName: 'Outlook'
      },
      'live.com': {
        smtp: 'smtp-mail.outlook.com',
        portaSmtp: '587',
        imap: 'outlook.office365.com',
        portaImap: '993',
        providerName: 'Live'
      },
    };

    const config = configs[domain];
    
    if (config) {
      setSmtp(config.smtp);
      setPortaSmtp(config.portaSmtp);
      setImap(config.imap);
      setPortaImap(config.portaImap);
      setUsarAutenticacao(true);
      
      toast({
        title: "✅ Configurações aplicadas automaticamente!",
        description: `Servidor ${config.providerName} configurado. Agora basta informar a senha do email.`,
      });
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    
    // Detecta provedor quando o email estiver completo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) {
      detectEmailProvider(value);
    }
  };

  const resetForm = () => {
    setNome("");
    setEmail("");
    setTelefone("");
    setSenha("");
    setSmtp("");
    setPortaSmtp("");
    setImap("");
    setPortaImap("");
    setSenhaEmail("");
    setUsarAutenticacao(true);
    setUnidadeId("");
    setGrupoAcessoId("");
    setSelectedEstabelecimentoId("");
    setSegmentosSelecionados([]);
    setIsAdmin(false);
    setIsAtendente(false);
    setIsPorteiro(false);
    setHoraInicial("08:00");
    setHoraFinal("18:00");
    setRamal("");
    setSenhaSip("");
    setUsuarioSip("");
    setTipo("padrao");
    setEditingId(null);
    setFormOpen(false);
  };

  const handleEdit = async (usuario: Usuario) => {
    setNome(usuario.nome);
    setEmail(usuario.email);
    setTelefone(usuario.whatsapp || "");
    setSmtp(usuario.smtp || "");
    setPortaSmtp(usuario.porta_smtp?.toString() || "");
    setImap(usuario.imap || "");
    setPortaImap(usuario.porta_imap?.toString() || "");
    setSenhaEmail(usuario.senha_email || "");
    setUsarAutenticacao(usuario.usar_autenticacao ?? true);
    setUnidadeId(usuario.unidade_id || "");
    setGrupoAcessoId(usuario.grupo_acesso_id || "");
    setSelectedEstabelecimentoId(usuario.estabelecimento_id || "");
    setHoraInicial(usuario.hora_inicial || "08:00");
    setHoraFinal(usuario.hora_final || "18:00");
    setRamal(usuario.ramal || "");
    setSenhaSip(usuario.senha_sip || "");
    setUsuarioSip(usuario.usuario_sip || "");
    setTipo((usuario as any).tipo || "padrao");
    setIsPorteiro(!!(usuario as any).is_porteiro);
    setEditingId(usuario.id);
    setFormOpen(true);

    // Buscar segmentos do usuário
    const { data: segmentosData } = await supabase
      .from("usuario_segmentos")
      .select("segmento_id")
      .eq("usuario_id", usuario.id);

    setSegmentosSelecionados(segmentosData?.map((s) => s.segmento_id) || []);

    // Buscar se o usuário é admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", usuario.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!roleData);

    // Buscar se o usuário é atendente
    const { data: atendenteData } = await supabase
      .from("atendentes")
      .select("id")
      .eq("usuario_id", usuario.id)
      .maybeSingle();

    setIsAtendente(!!atendenteData);
  };

  const handleDeleteClick = (usuario: Usuario) => {
    setUsuarioToDelete(usuario);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!usuarioToDelete) return;

    setIsDeleting(true);

    // Verificar vínculos com conversations (como assignee)
    const { data: conversations, error: checkError } = await supabase
      .from("conversations")
      .select("id")
      .eq("assignee_id", usuarioToDelete.id)
      .limit(1);

    if (checkError) {
      toast({
        title: "Erro ao verificar vínculos",
        description: checkError.message,
        variant: "destructive",
      });
      setIsDeleting(false);
      return;
    }

    if (conversations && conversations.length > 0) {
      toast({
        title: "Não é possível excluir",
        description: "Este usuário possui conversas vinculadas. Remova os vínculos primeiro.",
        variant: "destructive",
      });
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setUsuarioToDelete(null);
      return;
    }

    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", usuarioToDelete.id);

    setIsDeleting(false);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Usuário excluído com sucesso!" });
      fetchUsuarios();
    }

    setDeleteDialogOpen(false);
    setUsuarioToDelete(null);
  };

  const toggleSegmento = (segmentoId: string) => {
    setSegmentosSelecionados((prev) =>
      prev.includes(segmentoId)
        ? prev.filter((id) => id !== segmentoId)
        : [...prev, segmentoId]
    );
  };

  const testEmailConnection = async () => {
    if (!email || !senhaEmail) {
      toast({
        title: "Preencha os dados",
        description: "Email e senha são necessários para testar a conexão",
        variant: "destructive"
      });
      return;
    }

    if (!smtp || !imap) {
      toast({
        title: "Configuração incompleta",
        description: "Configure os servidores SMTP e IMAP antes de testar",
        variant: "destructive"
      });
      return;
    }

    setTestingEmail(true);
    try {
      // Buscar URL do servidor configurada no estabelecimento
      const estabId = estabelecimentoId || selectedEstabelecimentoId;
      let serverUrl = "https://mailcrm.pilar.com.br";
      
      if (estabId) {
        const { data: configData } = await supabase
          .from("email_oauth_config")
          .select("client_id")
          .eq("estabelecimento_id", estabId)
          .eq("provider", "external_server")
          .maybeSingle();
        
        if (configData?.client_id) {
          serverUrl = configData.client_id;
        }
      }

      // Usar edge function para evitar problemas de CORS
      const { data, error: fnError } = await supabase.functions.invoke('test-email-connection', {
        body: {
          serverUrl,
          accounts: [
            {
              user: email,
              pass: senhaEmail,
              smtp: smtp,
              smtp_port: parseInt(portaSmtp) || 587,
              imap: imap,
              imap_port: parseInt(portaImap) || 993
            }
          ],
          to: email,
          subject: "Teste de conexão - Pilar CRM",
          text: "Este é um email de teste para verificar a conexão."
        }
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.success) {
        toast({
          title: "✅ Conexão testada com sucesso!",
          description: "Verifique seu email para confirmar o recebimento."
        });
        console.log("Resultado do teste:", data);
      } else {
        toast({
          title: "Erro na conexão",
          description: data?.error || "Falha desconhecida",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível conectar ao servidor de email",
        variant: "destructive"
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
  const filteredUsuarios = usuarios.filter((usuario) => {
    const matchesSearch = [usuario.nome, usuario.email, usuario.whatsapp, usuario.unidades?.nome, usuario.grupos_acesso?.nome]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch));

    const matchesPerfil = perfilFiltro === "todos" ||
      (perfilFiltro === "admin" && usuario.is_admin) ||
      (perfilFiltro === "atendente" && usuario.is_atendente) ||
      (perfilFiltro === "porteiro" && usuario.is_porteiro) ||
      (perfilFiltro === "gerente" && usuario.tipo === "gerente") ||
      (perfilFiltro === "padrao" && usuario.tipo === "padrao" && !usuario.is_admin && !usuario.is_atendente && !usuario.is_porteiro);

    return matchesSearch && matchesPerfil;
  });

  const userBadges = (usuario: Usuario) => <div className="flex flex-wrap gap-1">
    {usuario.is_admin && <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Admin</span>}
    {usuario.is_atendente && <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">Atendente</span>}
    {usuario.is_porteiro && <span className="rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground">Porteiro</span>}
  </div>;

  const userActions = (usuario: Usuario) => <>
    {usuario.is_atendente && usuario.atendente_id && <Button variant="outline" size="sm" onClick={() => { setSelectedUsuarioForSkills(usuario); setSkillsDialogOpen(true); }} className="h-8 text-xs"><Award className="mr-1 h-3 w-3" /> Habilidades</Button>}
    <Button variant="ghost" size="icon" onClick={() => handleEdit(usuario)} className="h-8 w-8" aria-label={`Editar ${usuario.nome}`}><Edit className="h-4 w-4" /></Button>
    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(usuario)} className="h-8 w-8" aria-label={`Excluir ${usuario.nome}`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
  </>;

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-3"><Users className="h-5 w-5 text-primary" /><h4 className="font-semibold">{editingId ? "Editar usuário" : "Novo usuário"}</h4></div>
        {/* Dados Básicos */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground">Dados Básicos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="usuario-nome">Nome *</Label>
              <Input
                id="usuario-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            
            <div>
              <Label htmlFor="usuario-telefone">WhatsApp *</Label>
              <MaskedInput
                id="usuario-telefone"
                mask={maskWhatsApp}
                value={telefone}
                onValueChange={setTelefone}
                placeholder="+55 (XX) XXXXX-XXXX"
                invalid={!!telefone && !validateWhatsApp(telefone)}
              />
              {telefone && !validateWhatsApp(telefone) && (
                <p className="text-xs text-destructive mt-1">WhatsApp inválido (formato: +55 (XX) XXXXX-XXXX)</p>
              )}
            </div>

            <div>
              <Label htmlFor="usuario-email" className="flex flex-col sm:flex-row sm:items-center gap-1">
                <span>Email (opcional)</span>
                <span className="text-xs text-muted-foreground font-normal">
                  (Gmail, Hotmail configurados automaticamente)
                </span>
              </Label>
              <Input
                id="usuario-email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="usuario@gmail.com"
                className={email && !validateEmail(email) ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {email && !validateEmail(email) && (
                <p className="text-xs text-destructive mt-1">E-mail inválido</p>
              )}
            </div>


            <div>
              <Label htmlFor="usuario-senha">Senha {!editingId && "*"}</Label>
              <Input
                id="usuario-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={editingId ? "Deixe vazio para manter" : "Mínimo 6 caracteres"}
                minLength={6}
              />
              {senha && senha.length < 6 && (
                <p className="text-xs text-destructive mt-1">Mínimo 6 caracteres</p>
              )}
            </div>

            <div>
              <Label htmlFor="usuario-hora-inicial">Hora Inicial *</Label>
              <Input
                id="usuario-hora-inicial"
                type="time"
                value={horaInicial}
                onChange={(e) => setHoraInicial(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="usuario-hora-final">Hora Final *</Label>
              <Input
                id="usuario-hora-final"
                type="time"
                value={horaFinal}
                onChange={(e) => setHoraFinal(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Perfil (definido pelo grupo de acesso)</Label>
              <Input value={PERFIL_LABEL[perfilGrupo]} readOnly disabled />
            </div>

          </div>
        </Card>

        {/* Telefonia */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground">📞 Telefonia (UCM)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="usuario-ramal">Ramal</Label>
              <Input
                id="usuario-ramal"
                placeholder="Ex: 1001"
                value={ramal}
                onChange={(e) => setRamal(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="usuario-senha-sip">Senha SIP</Label>
              <Input
                id="usuario-senha-sip"
                type="password"
                placeholder="Senha do ramal"
                value={senhaSip}
                onChange={(e) => setSenhaSip(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="usuario-sip">Usuário SIP</Label>
              <Input
                id="usuario-sip"
                placeholder="Se diferente do ramal"
                value={usuarioSip}
                onChange={(e) => setUsuarioSip(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Vinculações */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground">Vinculações</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="usuario-unidade">Unidade *</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId}>
                <SelectTrigger id="usuario-unidade">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="usuario-grupo">Grupo de Acesso</Label>
              <Select value={grupoAcessoId} onValueChange={setGrupoAcessoId}>
                <SelectTrigger id="usuario-grupo">
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!estabelecimentoId && (
              <div>
                <Label htmlFor="usuario-estabelecimento">Estabelecimento *</Label>
                <Select value={selectedEstabelecimentoId} onValueChange={setSelectedEstabelecimentoId}>
                  <SelectTrigger id="usuario-estabelecimento">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {estabelecimentos.map((est) => (
                      <SelectItem key={est.id} value={est.id}>
                        {est.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* Configurações de E-mail */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Configurações de E-mail
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="usuario-smtp">
                Servidor SMTP
                {smtp && <span className="text-xs text-green-600 ml-2">✓</span>}
              </Label>
              <Input
                id="usuario-smtp"
                value={smtp}
                onChange={(e) => setSmtp(e.target.value)}
                placeholder="smtp.exemplo.com"
                className={smtp ? "border-green-500/50" : ""}
              />
            </div>

            <div>
              <Label htmlFor="usuario-porta-smtp">
                Porta SMTP
                {portaSmtp && <span className="text-xs text-green-600 ml-2">✓</span>}
              </Label>
              <Input
                id="usuario-porta-smtp"
                type="number"
                value={portaSmtp}
                onChange={(e) => setPortaSmtp(e.target.value)}
                placeholder="587"
                className={portaSmtp ? "border-green-500/50" : ""}
              />
            </div>

            <div>
              <Label htmlFor="usuario-imap">
                Servidor IMAP
                {imap && <span className="text-xs text-green-600 ml-2">✓</span>}
              </Label>
              <Input
                id="usuario-imap"
                value={imap}
                onChange={(e) => setImap(e.target.value)}
                placeholder="imap.exemplo.com"
                className={imap ? "border-green-500/50" : ""}
              />
            </div>

            <div>
              <Label htmlFor="usuario-porta-imap">
                Porta IMAP
                {portaImap && <span className="text-xs text-green-600 ml-2">✓</span>}
              </Label>
              <Input
                id="usuario-porta-imap"
                type="number"
                value={portaImap}
                onChange={(e) => setPortaImap(e.target.value)}
                placeholder="993"
                className={portaImap ? "border-green-500/50" : ""}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="usuario-senha-email" className="flex flex-col sm:flex-row sm:items-center gap-1">
                <span>Senha do E-mail *</span>
                <span className="text-xs text-muted-foreground font-normal">(Gmail: use Senha de App)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="usuario-senha-email"
                  type="password"
                  value={senhaEmail}
                  onChange={(e) => setSenhaEmail(e.target.value)}
                  placeholder="Digite a senha do email"
                  className="flex-1"
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="shrink-0">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <span>📧</span> Como Configurar Email
                      </DialogTitle>
                      <DialogDescription>
                        Passo a passo para Gmail, Hotmail e Outlook
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 text-sm">
                      {/* Gmail Section */}
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-xs">G</div>
                          <h4 className="font-semibold text-base">Gmail</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-muted-foreground">
                            O Gmail exige uma <strong>"Senha de App"</strong> (16 caracteres) em vez da senha normal.
                          </p>
                          
                          <div className="bg-background border rounded-md p-3">
                            <p className="font-medium mb-2">Passo a Passo:</p>
                            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                              <li>
                                <strong>Ative a Verificação em 2 Etapas:</strong><br/>
                                <a 
                                  href="https://myaccount.google.com/security" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  Acessar Segurança da Conta Google <ExternalLink className="h-3 w-3" />
                                </a>
                              </li>
                              <li>
                                <strong>Gere uma Senha de App:</strong><br/>
                                <a 
                                  href="https://myaccount.google.com/apppasswords" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  Acessar Senhas de App <ExternalLink className="h-3 w-3" />
                                </a>
                              </li>
                              <li>Selecione "Email" e "Outro (nome personalizado)"</li>
                              <li>Clique em "Gerar" e copie a senha de 16 caracteres</li>
                              <li>Cole essa senha no campo "Senha do E-mail" acima</li>
                            </ol>
                          </div>

                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3">
                            <p className="text-yellow-700 dark:text-yellow-400 text-xs">
                              ⚠️ <strong>Importante:</strong> Se não aparecer "Senhas de app", verifique se a Verificação em 2 Etapas está ativada.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Hotmail/Outlook Section */}
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">M</div>
                          <h4 className="font-semibold text-base">Hotmail / Outlook / Live</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-muted-foreground">
                            Contas Microsoft também exigem <strong>"Senha de App"</strong> quando a verificação em duas etapas está ativa.
                          </p>
                          
                          <div className="bg-background border rounded-md p-3">
                            <p className="font-medium mb-2">Passo a Passo:</p>
                            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                              <li>
                                <strong>Ative a Verificação em 2 Etapas:</strong><br/>
                                <a 
                                  href="https://account.live.com/proofs/manage/additional" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  Acessar Segurança Microsoft <ExternalLink className="h-3 w-3" />
                                </a>
                              </li>
                              <li>
                                <strong>Gere uma Senha de App:</strong><br/>
                                <a 
                                  href="https://account.live.com/proofs/AppPassword" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  Criar Senha de App <ExternalLink className="h-3 w-3" />
                                </a>
                              </li>
                              <li>Clique em "Criar nova senha de aplicativo"</li>
                              <li>Copie a senha gerada e cole no campo "Senha do E-mail" acima</li>
                            </ol>
                          </div>

                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3">
                            <p className="text-blue-700 dark:text-blue-400 text-xs">
                              💡 <strong>Dica:</strong> Se usar autenticador Microsoft (sem senha), vá em "Opções de segurança avançadas" para habilitar senhas de app.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Quick Reference */}
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3">📋 Configurações Automáticas</h4>
                        <p className="text-muted-foreground text-xs mb-3">
                          Ao digitar seu email, os servidores são configurados automaticamente:
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="font-medium">Gmail:</p>
                            <p className="text-muted-foreground">SMTP: smtp.gmail.com:587</p>
                            <p className="text-muted-foreground">IMAP: imap.gmail.com:993</p>
                          </div>
                          <div>
                            <p className="font-medium">Hotmail/Outlook:</p>
                            <p className="text-muted-foreground">SMTP: smtp-mail.outlook.com:587</p>
                            <p className="text-muted-foreground">IMAP: outlook.office365.com:993</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="flex items-center justify-between sm:col-span-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="usar-autenticacao"
                  checked={usarAutenticacao}
                  onCheckedChange={setUsarAutenticacao}
                />
                <Label htmlFor="usar-autenticacao" className="cursor-pointer text-sm">
                  Usar Autenticação
                </Label>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={testEmailConnection}
                disabled={testingEmail}
              >
                {testingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Testar Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Segmentos */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground">Segmentos</h3>


          {segmentos.length > 0 && (
            <div>
              <Label className="text-sm">Segmentos</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                {segmentos.map((segmento) => (
                  <div key={segmento.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`segmento-${segmento.id}`}
                      checked={segmentosSelecionados.includes(segmento.id)}
                      onCheckedChange={() => toggleSegmento(segmento.id)}
                    />
                    <label htmlFor={`segmento-${segmento.id}`} className="text-sm cursor-pointer truncate">
                      {segmento.nome}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Botões de Ação */}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1 sm:flex-none">
            {editingId ? "Atualizar" : <><Plus className="w-4 h-4 mr-2" /> Adicionar</>}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </div>
          {!editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
    </form>
  );

  if (formOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b pb-3">
          <Button type="button" variant="ghost" size="icon" onClick={resetForm} className="rounded-full shrink-0" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-5 w-5 text-primary shrink-0" />
            <h4 className="font-semibold truncate">{editingId ? `Editar usuário${nome ? `: ${nome}` : ""}` : "Novo usuário"}</h4>
          </div>
        </div>
        {renderForm()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{usuarios.length} {usuarios.length === 1 ? "usuário cadastrado" : "usuários cadastrados"}</p>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Novo usuário</Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Pesquisar por nome, e-mail, WhatsApp, unidade ou grupo" className="pl-9" /></div>
        <Select value={perfilFiltro} onValueChange={setPerfilFiltro}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filtrar por perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os perfis</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="atendente">Atendente</SelectItem>
            <SelectItem value="porteiro">Porteiro</SelectItem>
            <SelectItem value="gerente">Gerente</SelectItem>
            <SelectItem value="padrao">Padrão</SelectItem>
          </SelectContent>
        </Select>
      </div>


      {/* Lista de Usuários */}
      <div>
          {filteredUsuarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchTerm ? "Nenhum usuário encontrado para esta pesquisa." : "Nenhum usuário cadastrado ainda."}
            </div>
          ) : (
            <>
              <div className="lg:hidden"><CadastroCardList items={filteredUsuarios.map((usuario) => ({ id: usuario.id, title: usuario.nome, subtitle: usuario.email, badge: userBadges(usuario), fields: [{ label: "WhatsApp", value: usuario.whatsapp || "-" }, { label: "Unidade", value: usuario.unidades?.nome || "-" }, { label: "Grupo de acesso", value: usuario.grupos_acesso?.nome || "-", full: true }], actions: userActions(usuario) }))} /></div>
              <div className="hidden overflow-hidden rounded-lg border lg:block"><Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>WhatsApp</TableHead><TableHead>Unidade</TableHead><TableHead>Grupo de acesso</TableHead><TableHead>Perfis</TableHead><TableHead className="w-36 text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filteredUsuarios.map((usuario) => <TableRow key={usuario.id}><TableCell><div className="font-medium">{usuario.nome}</div><div className="text-xs text-muted-foreground">{usuario.email}</div></TableCell><TableCell>{usuario.whatsapp || "-"}</TableCell><TableCell>{usuario.unidades?.nome || "-"}</TableCell><TableCell>{usuario.grupos_acesso?.nome || "-"}</TableCell><TableCell>{userBadges(usuario)}</TableCell><TableCell><div className="flex justify-end gap-1">{userActions(usuario)}</div></TableCell></TableRow>)}</TableBody></Table></div>
            </>
          )}
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={usuarioToDelete?.nome}
        isLoading={isDeleting}
      />

      <Dialog open={skillsDialogOpen} onOpenChange={setSkillsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Habilidades do Atendente: {selectedUsuarioForSkills?.nome}</DialogTitle>
            <DialogDescription>
              Configure as habilidades deste atendente para melhorar o roteamento de chats
            </DialogDescription>
          </DialogHeader>
          {selectedUsuarioForSkills?.atendente_id && selectedUsuarioForSkills?.estabelecimento_id && (
            <AtendenteSkillsManager
              atendenteId={selectedUsuarioForSkills.atendente_id}
              estabelecimentoId={selectedUsuarioForSkills.estabelecimento_id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
