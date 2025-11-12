import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/lib/toast-config";
import { Pencil, Trash2, Plus, X, Copy } from "lucide-react";

interface QuickReply {
  id: string;
  title: string;
  content: string;
  is_global: boolean;
}

export default function MeusTextosProntos() {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });

  useEffect(() => {
    loadQuickReplies();
  }, []);

  const loadQuickReplies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const { data, error } = await supabase
      .from("quick_replies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar textos prontos");
      return;
    }
    setQuickReplies(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const dataToSave = {
      title: formData.title,
      content: formData.content,
      user_id: user.id,
      is_global: false,
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
    if (reply.is_global) {
      toast.error("Não é possível editar textos globais");
      return;
    }
    setIsEditing(true);
    setCurrentId(reply.id);
    setFormData({
      title: reply.title,
      content: reply.content,
    });
  };

  const handleDelete = async (id: string, isGlobal: boolean) => {
    if (isGlobal) {
      toast.error("Não é possível excluir textos globais");
      return;
    }

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

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Texto copiado!");
  };

  const resetForm = () => {
    setFormData({ title: "", content: "" });
    setIsEditing(false);
    setCurrentId(null);
  };

  const myReplies = quickReplies.filter((r) => !r.is_global);
  const globalReplies = quickReplies.filter((r) => r.is_global);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-lg font-bold mb-6">Meus Textos Prontos</h1>

        <Card className="p-4 mb-6">
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

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
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

        {globalReplies.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Textos Globais</h2>
            <div className="space-y-2">
              {globalReplies.map((reply) => (
                <Card key={reply.id} className="p-4 bg-muted/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{reply.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {reply.content}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(reply.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-3">Meus Textos</h2>
          <div className="space-y-2">
            {myReplies.map((reply) => (
              <Card key={reply.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{reply.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {reply.content}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(reply.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
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
                      onClick={() => handleDelete(reply.id, reply.is_global)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {myReplies.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum texto pronto cadastrado
              </p>
            )}
          </div>
        </div>
      </div>
  );
}
