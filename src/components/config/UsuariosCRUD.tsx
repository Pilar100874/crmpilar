import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  unidade_id: string | null;
  grupo_acesso_id: string | null;
  unidades?: { nome: string };
  grupos_acesso?: { nome: string };
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

export const UsuariosCRUD = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [grupoAcessoId, setGrupoAcessoId] = useState("");
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchUsuarios(),
      fetchUnidades(),
      fetchGrupos(),
      fetchSegmentos(),
    ]);
  };

  const fetchUsuarios = async () => {
    const { data, error } = await supabase
      .from("usuarios")
      .select(`
        *,
        unidades(nome),
        grupos_acesso(nome)
      `)
      .order("nome");

    if (error) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUsuarios(data || []);
    }
  };

  const fetchUnidades = async () => {
    const { data } = await supabase.from("unidades").select("*").order("nome");
    setUnidades(data || []);
  };

  const fetchGrupos = async () => {
    const { data } = await supabase.from("grupos_acesso").select("*").order("nome");
    setGrupos(data || []);
  };

  const fetchSegmentos = async () => {
    const { data } = await supabase.from("segmentos").select("*").order("nome");
    setSegmentos(data || []);
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

    if (!editingId && !senha) {
      toast({
        title: "Senha obrigatória",
        description: "Por favor, defina uma senha para o novo usuário",
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
    setUnidadeId("");
    setGrupoAcessoId("");
    setSegmentosSelecionados([]);
    setEditingId(null);
  };

  const handleEdit = async (usuario: Usuario) => {
    setNome(usuario.nome);
    setEmail(usuario.email);
    setTelefone(usuario.telefone || "");
    setUnidadeId(usuario.unidade_id || "");
    setGrupoAcessoId(usuario.grupo_acesso_id || "");
    setEditingId(usuario.id);

    // Buscar segmentos do usuário
    const { data } = await supabase
      .from("usuario_segmentos")
      .select("segmento_id")
      .eq("usuario_id", usuario.id);

    setSegmentosSelecionados(data?.map((s) => s.segmento_id) || []);
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
            <Label htmlFor="usuario-senha">Senha {!editingId && "*"}</Label>
            <Input
              id="usuario-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder={editingId ? "Deixe vazio para manter" : "Digite a senha"}
            />
          </div>

          <div>
            <Label htmlFor="usuario-unidade">Unidade</Label>
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
        </div>

        <div>
          <Label>Segmentos</Label>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {segmentos.map((segmento) => (
              <div key={segmento.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`segmento-${segmento.id}`}
                  checked={segmentosSelecionados.includes(segmento.id)}
                  onCheckedChange={() => toggleSegmento(segmento.id)}
                />
                <label
                  htmlFor={`segmento-${segmento.id}`}
                  className="text-sm cursor-pointer"
                >
                  {segmento.nome}
                </label>
              </div>
            ))}
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
              <div className="text-sm text-muted-foreground">
                {usuario.email} {usuario.telefone && `• ${usuario.telefone}`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {usuario.unidades?.nome && `Unidade: ${usuario.unidades.nome}`}
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
