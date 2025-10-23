import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuickReply {
  id: string;
  title: string;
  content: string;
  grupo_acesso_id: string | null;
  is_global: boolean;
  shortcut?: string | null;
}

interface GrupoAcesso {
  id: string;
  nome: string;
}

interface QuickRepliesCRUDProps {
  estabelecimentoId?: string;
}

export default function QuickRepliesCRUD({ estabelecimentoId }: QuickRepliesCRUDProps = {}) {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    grupo_acesso_id: "",
    shortcut: "",
  });

  useEffect(() => {
    loadQuickReplies();
    loadGrupos();
  }, [estabelecimentoId]);

  const loadQuickReplies = async () => {
    let query = supabase
      .from("quick_replies")
      .select("*")
      .eq("is_global", true);

    // Note: quick_replies não tem estabelecimento_id no schema atual
    // Filtra por grupo_acesso_id se estabelecimento foi fornecido
    if (estabelecimentoId) {
      const { data: grupos } = await supabase
        .from("grupos_acesso")
        .select("id")
        .eq("estabelecimento_id", estabelecimentoId);
      
      if (grupos && grupos.length > 0) {
        const grupoIds = grupos.map(g => g.id);
        query = query.in("grupo_acesso_id", grupoIds);
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar textos prontos");
      return;
    }
    setQuickReplies(data || []);
  };

  const loadGrupos = async () => {
    let query = supabase
      .from("grupos_acesso")
      .select("id, nome");

    if (estabelecimentoId) {
      query = query.eq("estabelecimento_id", estabelecimentoId);
    }

    const { data, error } = await query.order("nome");

    if (error) {
      toast.error("Erro ao carregar grupos de acesso");
      return;
    }
    setGrupos(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const dataToSave = {
      title: formData.title,
      content: formData.content,
      grupo_acesso_id: formData.grupo_acesso_id || null,
      is_global: true,
      shortcut: formData.shortcut || null,
    };

    if (isEditing && currentId) {
      const { error } = await supabase
        .from("quick_replies")
        .update(dataToSave)
        .eq("id", currentId);

      if (error) {
        toast.error("Erro ao atualizar texto pronto");
        return;
      }
      toast.success("Texto pronto atualizado!");
    } else {
      const { error } = await supabase
        .from("quick_replies")
        .insert([dataToSave]);

      if (error) {
        toast.error("Erro ao criar texto pronto");
        return;
      }
      toast.success("Texto pronto criado!");
    }

    resetForm();
    loadQuickReplies();
  };

  const handleEdit = (reply: QuickReply) => {
    setIsEditing(true);
    setCurrentId(reply.id);
    setFormData({
      title: reply.title,
      content: reply.content,
      grupo_acesso_id: reply.grupo_acesso_id || "",
      shortcut: reply.shortcut || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este texto pronto?")) return;

    const { error } = await supabase
      .from("quick_replies")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir texto pronto");
      return;
    }

    toast.success("Texto pronto excluído!");
    loadQuickReplies();
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", grupo_acesso_id: "", shortcut: "" });
    setIsEditing(false);
    setCurrentId(null);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Saudação inicial"
            />
          </div>

          <div>
            <Label htmlFor="content">Conteúdo *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Digite o texto pronto..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="shortcut">Atalho (opcional)</Label>
            <Input
              id="shortcut"
              value={formData.shortcut}
              onChange={(e) =>
                setFormData({ ...formData, shortcut: e.target.value })
              }
              placeholder="Ex: /oi, /ajuda, ctrl+a"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Digite este atalho no campo de mensagem para inserir o texto automaticamente
            </p>
          </div>

          <div>
            <Label htmlFor="grupo">Grupo de Acesso</Label>
            <Select
              value={formData.grupo_acesso_id || "todos"}
              onValueChange={(value) =>
                setFormData({ ...formData, grupo_acesso_id: value === "todos" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os grupos</SelectItem>
                {grupos.map((grupo) => (
                  <SelectItem key={grupo.id} value={grupo.id}>
                    {grupo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {isEditing ? "Atualizar" : "Adicionar"}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        {quickReplies.map((reply) => (
          <Card key={reply.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium">{reply.title}</h4>
                {reply.shortcut && (
                  <p className="text-xs text-primary font-mono bg-primary/10 px-2 py-1 rounded inline-block mb-1">
                    {reply.shortcut}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {reply.content}
                </p>
                {reply.grupo_acesso_id && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Grupo:{" "}
                    {grupos.find((g) => g.id === reply.grupo_acesso_id)?.nome}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(reply)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(reply.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {quickReplies.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Nenhum texto pronto cadastrado
          </p>
        )}
      </div>
    </div>
  );
}
