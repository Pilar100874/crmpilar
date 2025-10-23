import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  grupo_acesso_id: string | null;
  estabelecimento_id: string | null;
  is_admin?: boolean;
  grupos_acesso?: { nome: string };
  estabelecimentos?: { nome: string };
}

interface GrupoAcesso {
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
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [grupoAcessoId, setGrupoAcessoId] = useState("");
  const [selectedEstabelecimentoId, setSelectedEstabelecimentoId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchUsuarios(),
      fetchGrupos(),
      fetchEstabelecimentos(),
    ]);
  };

  const fetchUsuarios = async () => {
    let query = supabase
      .from("usuarios")
      .select(`
        *,
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

    // Buscar roles de admin para cada usuário
    const usuariosComRoles = await Promise.all(
      (data || []).map(async (usuario) => {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", usuario.id)
          .eq("role", "admin")
          .maybeSingle();
        
        return {
          ...usuario,
          is_admin: !!roleData,
        };
      })
    );

    setUsuarios(usuariosComRoles);
  };

  const fetchGrupos = async () => {
    let query = supabase.from("grupos_acesso").select("*");
    if (estabelecimentoId) {
      query = query.eq('estabelecimento_id', estabelecimentoId);
    }
    const { data } = await query.order("nome");
    setGrupos(data || []);
  };

  const fetchEstabelecimentos = async () => {
    const { data } = await supabase.from("estabelecimentos").select("*").order("nome");
    setEstabelecimentos(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios",
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
      grupo_acesso_id: grupoAcessoId || null,
      estabelecimento_id: selectedEstabelecimentoId || estabelecimentoId,
      senha_hash: senha || undefined,
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

      // Atualizar role de admin
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingId)
        .eq("role", "admin");

      if (isAdmin) {
        await supabase
          .from("user_roles")
          .insert({
            user_id: editingId,
            role: "admin",
          });
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

      // Adicionar role de admin
      if (data && isAdmin) {
        await supabase
          .from("user_roles")
          .insert({
            user_id: data.id,
            role: "admin",
          });
      }

      toast({ title: "Usuário criado com sucesso!" });
      resetForm();
      fetchUsuarios();
    }
  };

  const resetForm = () => {
    setNome("");
    setEmail("");
    setTelefone("");
    setSenha("");
    setGrupoAcessoId("");
    setSelectedEstabelecimentoId("");
    setIsAdmin(false);
    setEditingId(null);
  };

  const handleEdit = async (usuario: Usuario) => {
    setNome(usuario.nome);
    setEmail(usuario.email);
    setTelefone(usuario.telefone || "");
    setGrupoAcessoId(usuario.grupo_acesso_id || "");
    setSelectedEstabelecimentoId(usuario.estabelecimento_id || "");
    setEditingId(usuario.id);

    // Buscar se o usuário é admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", usuario.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!roleData);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    const { error } = await supabase
      .from("usuarios")
      .delete()
      .eq("id", id);

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
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="usuario-email">Email *</Label>
            <Input
              id="usuario-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
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
            <Label htmlFor="usuario-senha">Senha {!editingId && "*"} (mínimo 6 caracteres)</Label>
            <Input
              id="usuario-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder={editingId ? "Deixe vazio para manter" : "Mínimo 6 caracteres"}
              minLength={6}
            />
            {senha && senha.length < 6 && (
              <p className="text-xs text-destructive mt-1">
                A senha deve ter no mínimo 6 caracteres
              </p>
            )}
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
                  <SelectValue placeholder="Selecione o estabelecimento" />
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

        <div className="flex gap-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="is-admin"
              checked={isAdmin}
              onCheckedChange={setIsAdmin}
            />
            <Label htmlFor="is-admin" className="cursor-pointer">
              Agente
            </Label>
          </div>
        </div>

        <Button type="submit">
          {editingId ? "Atualizar" : <><Plus className="w-4 h-4 mr-2" /> Adicionar</>}
        </Button>
        {editingId && (
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            className="ml-2"
          >
            Cancelar
          </Button>
        )}
      </form>

      <div className="space-y-2">
        {usuarios.map((usuario) => (
          <div
            key={usuario.id}
            className="flex items-start justify-between p-3 border rounded-md"
          >
            <div>
              <div className="font-semibold">{usuario.nome}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>{usuario.email}</span>
                {usuario.telefone && <span>• {usuario.telefone}</span>}
                {usuario.is_admin && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Agente</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {usuario.estabelecimentos?.nome && `Estabelecimento: ${usuario.estabelecimentos.nome}`}
                {usuario.grupos_acesso?.nome && ` • Grupo: ${usuario.grupos_acesso.nome}`}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(usuario)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(usuario.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
