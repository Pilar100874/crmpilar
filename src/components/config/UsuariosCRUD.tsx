import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, HelpCircle, ExternalLink, Award } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { AtendenteSkillsManager } from "./AtendenteSkillsManager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  unidade_id: string | null;
  grupo_acesso_id: string | null;
  estabelecimento_id: string | null;
  smtp: string | null;
  porta_smtp: number | null;
  pop: string | null;
  porta_pop: number | null;
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
  is_atendente?: boolean;
  atendente_id?: string;
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
  const [pop, setPop] = useState("");
  const [portaPop, setPortaPop] = useState("");
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
  const [senhaSip, setSenhaSip] = useState("");
  const [usuarioSip, setUsuarioSip] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAtendente, setIsAtendente] = useState(false);
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [selectedUsuarioForSkills, setSelectedUsuarioForSkills] = useState<Usuario | null>(null);
  
  const { toast } = useToast();

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
    let query = supabase
      .from("usuarios")
      .select(`
        *,
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
    
    if (!nome.trim() || !email.trim() || !horaInicial || !horaFinal) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome, email e jornada de trabalho são obrigatórios",
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
      email,
      telefone: telefone || null,
      unidade_id: unidadeId || null,
      grupo_acesso_id: grupoAcessoId || null,
      estabelecimento_id: selectedEstabelecimentoId || estabelecimentoId,
      senha_hash: senha || undefined,
      smtp: smtp || null,
      porta_smtp: portaSmtp ? parseInt(portaSmtp) : null,
      pop: pop || null,
      porta_pop: portaPop ? parseInt(portaPop) : null,
      senha_email: senhaEmail || null,
      usar_autenticacao: usarAutenticacao,
      hora_inicial: horaInicial,
      hora_final: horaFinal,
      ramal: ramal || null,
      senha_sip: senhaSip || null,
      usuario_sip: usuarioSip || null,
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

      // Atualizar role de admin
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingId)
        .eq("role", "admin");

      if (isAdmin) {
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
      const { data, error } = await supabase
        .from("usuarios")
        .insert([usuarioData])
        .select()
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
      pop: string;
      portaPop: string;
      providerName: string;
    }> = {
      'gmail.com': {
        smtp: 'smtp.gmail.com',
        portaSmtp: '587',
        pop: 'imap.gmail.com',
        portaPop: '993',
        providerName: 'Gmail'
      },
      'hotmail.com': {
        smtp: 'smtp-mail.outlook.com',
        portaSmtp: '587',
        pop: 'outlook.office365.com',
        portaPop: '993',
        providerName: 'Hotmail'
      },
      'outlook.com': {
        smtp: 'smtp-mail.outlook.com',
        portaSmtp: '587',
        pop: 'outlook.office365.com',
        portaPop: '993',
        providerName: 'Outlook'
      },
      'live.com': {
        smtp: 'smtp-mail.outlook.com',
        portaSmtp: '587',
        pop: 'outlook.office365.com',
        portaPop: '993',
        providerName: 'Live'
      },
    };

    const config = configs[domain];
    
    if (config) {
      setSmtp(config.smtp);
      setPortaSmtp(config.portaSmtp);
      setPop(config.pop);
      setPortaPop(config.portaPop);
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
    setPop("");
    setPortaPop("");
    setSenhaEmail("");
    setUsarAutenticacao(true);
    setUnidadeId("");
    setGrupoAcessoId("");
    setSelectedEstabelecimentoId("");
    setSegmentosSelecionados([]);
    setIsAdmin(false);
    setIsAtendente(false);
    setHoraInicial("08:00");
    setHoraFinal("18:00");
    setRamal("");
    setSenhaSip("");
    setUsuarioSip("");
    setEditingId(null);
  };

  const handleEdit = async (usuario: Usuario) => {
    setNome(usuario.nome);
    setEmail(usuario.email);
    setTelefone(usuario.telefone || "");
    setSmtp(usuario.smtp || "");
    setPortaSmtp(usuario.porta_smtp?.toString() || "");
    setPop(usuario.pop || "");
    setPortaPop(usuario.porta_pop?.toString() || "");
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
    setEditingId(usuario.id);

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
      .single();

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

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="usuario-email" className="flex flex-col sm:flex-row sm:items-center gap-1">
                <span>Email *</span>
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
              />
            </div>

            <div>
              <Label htmlFor="usuario-telefone">Telefone</Label>
              <Input
                id="usuario-telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
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
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground">📧 Configurações de E-mail</h3>
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
              <Label htmlFor="usuario-pop">
                Servidor IMAP/POP
                {pop && <span className="text-xs text-green-600 ml-2">✓</span>}
              </Label>
              <Input
                id="usuario-pop"
                value={pop}
                onChange={(e) => setPop(e.target.value)}
                placeholder="imap.exemplo.com"
                className={pop ? "border-green-500/50" : ""}
              />
            </div>

            <div>
              <Label htmlFor="usuario-porta-pop">
                Porta IMAP/POP
                {portaPop && <span className="text-xs text-green-600 ml-2">✓</span>}
              </Label>
              <Input
                id="usuario-porta-pop"
                type="number"
                value={portaPop}
                onChange={(e) => setPortaPop(e.target.value)}
                placeholder="993"
                className={portaPop ? "border-green-500/50" : ""}
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
                  <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Senha de App</DialogTitle>
                      <DialogDescription>Como configurar para Gmail/Hotmail</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2">Gmail:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                          <li>Acesse myaccount.google.com</li>
                          <li>Ative verificação em 2 etapas</li>
                          <li>Vá em "Senhas de app"</li>
                          <li>Gere uma senha e use aqui</li>
                        </ol>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Hotmail/Outlook:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                          <li>Acesse account.live.com</li>
                          <li>Vá em Segurança → Senha de app</li>
                          <li>Gere uma senha e use aqui</li>
                        </ol>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

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
          </div>
        </Card>

        {/* Permissões e Segmentos */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground">Permissões</h3>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Switch id="is-admin" checked={isAdmin} onCheckedChange={setIsAdmin} />
              <Label htmlFor="is-admin" className="cursor-pointer text-sm">Admin</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="is-atendente" checked={isAtendente} onCheckedChange={setIsAtendente} />
              <Label htmlFor="is-atendente" className="cursor-pointer text-sm">Atendente</Label>
            </div>
          </div>

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
      </form>

      {/* Lista de Usuários */}
      <Card className="p-4">
        <h3 className="font-semibold text-base mb-4">Usuários Cadastrados</h3>
        <div className="space-y-3">
          {usuarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum usuário cadastrado ainda
            </div>
          ) : (
            usuarios.map((usuario) => (
              <Card key={usuario.id} className="p-3 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm truncate">{usuario.nome}</span>
                      {usuario.is_admin && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Admin</span>
                      )}
                      {usuario.is_atendente && (
                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">Atendente</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{usuario.email}</div>
                    {usuario.telefone && (
                      <div className="text-xs text-muted-foreground">{usuario.telefone}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                      {usuario.unidades?.nome && <span>📍 {usuario.unidades.nome}</span>}
                      {usuario.grupos_acesso?.nome && <span>• 🔐 {usuario.grupos_acesso.nome}</span>}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 flex-shrink-0">
                    {usuario.is_atendente && usuario.atendente_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUsuarioForSkills(usuario);
                          setSkillsDialogOpen(true);
                        }}
                        className="h-8 text-xs"
                      >
                        <Award className="w-3 h-3 mr-1" />
                        Skills
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(usuario)} className="h-8 w-8">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(usuario)} className="h-8 w-8">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

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
