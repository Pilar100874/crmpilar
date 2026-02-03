import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast-config";
import { Pencil, Trash2, Plus, X, FolderPlus, Tag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface QuickReply {
  id: string;
  title: string;
  content: string;
  grupo_acesso_id: string | null;
  is_global: boolean;
  shortcut?: string | null;
  categoria?: string | null;
}

interface GrupoAcesso {
  id: string;
  nome: string;
}

interface Category {
  id: string;
  nome: string;
  ordem: number;
}

interface QuickRepliesCRUDProps {
  estabelecimentoId?: string;
}

export default function QuickRepliesCRUD({ estabelecimentoId }: QuickRepliesCRUDProps = {}) {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    grupo_acesso_id: "",
    shortcut: "",
    categoria: "",
  });

  useEffect(() => {
    loadQuickReplies();
    loadGrupos();
    loadCategories();
  }, [estabelecimentoId]);

  const loadQuickReplies = async () => {
    const estabId = await getEstabelecimentoId(estabelecimentoId);
    
    let query = supabase
      .from("quick_replies")
      .select("*")
      .eq("is_global", true);

    if (estabId) {
      query = query.eq("estabelecimento_id", estabId);
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

  const loadCategories = async () => {
    const estabId = await getEstabelecimentoId(estabelecimentoId);
    if (!estabId) return;

    const { data, error } = await supabase
      .from("quick_reply_categories")
      .select("id, nome, ordem")
      .eq("estabelecimento_id", estabId)
      .order("ordem");

    if (error) {
      console.error("Erro ao carregar categorias:", error);
      return;
    }
    setCategories(data || []);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    const estabId = await getEstabelecimentoId(estabelecimentoId);
    if (!estabId) {
      toast.error("Estabelecimento não identificado");
      return;
    }

    const { error } = await supabase
      .from("quick_reply_categories")
      .insert({
        estabelecimento_id: estabId,
        nome: newCategoryName.trim(),
        ordem: categories.length
      });

    if (error) {
      toast.error("Erro ao criar categoria");
      return;
    }

    toast.success("Categoria criada!");
    setNewCategoryName("");
    setShowCategoryDialog(false);
    loadCategories();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from("quick_reply_categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      toast.error("Erro ao remover categoria");
      return;
    }

    toast.success("Categoria removida!");
    loadCategories();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const estabId = await getEstabelecimentoId(estabelecimentoId);
    if (!estabId) {
      toast.error("Estabelecimento não identificado");
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
      grupo_acesso_id: formData.grupo_acesso_id || null,
      is_global: true,
      user_id: user.id,
      shortcut: formData.shortcut?.trim() || null,
      categoria: formData.categoria || null,
      estabelecimento_id: estabId,
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
        console.error("Erro ao criar texto pronto:", error);
        toast.error(`Erro ao criar texto pronto: ${error.message}`);
        return;
      }
      toast.success("Texto pronto criado!");
    }

    resetForm();
    await loadQuickReplies();
  };

  const handleEdit = (reply: QuickReply) => {
    setIsEditing(true);
    setCurrentId(reply.id);
    setFormData({
      title: reply.title,
      content: reply.content,
      grupo_acesso_id: reply.grupo_acesso_id || "",
      shortcut: reply.shortcut || "",
      categoria: reply.categoria || "",
    });
  };

  const handleDelete = async (id: string) => {
    setReplyToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!replyToDelete) return;

    const { error } = await supabase
      .from("quick_replies")
      .delete()
      .eq("id", replyToDelete);

    if (error) {
      toast.error("Erro ao excluir texto pronto");
    } else {
      toast.success("Texto pronto excluído!");
      loadQuickReplies();
    }
    
    setDeleteConfirmOpen(false);
    setReplyToDelete(null);
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", grupo_acesso_id: "", shortcut: "", categoria: "" });
    setIsEditing(false);
    setCurrentId(null);
  };

  // Group replies by category
  const groupedReplies = quickReplies.reduce((acc, reply) => {
    const cat = reply.categoria || 'Sem categoria';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(reply);
    return acc;
  }, {} as Record<string, QuickReply[]>);

  return (
    <div className="space-y-4">
      {/* Categories Management */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Categorias:</span>
        {categories.map(cat => (
          <Badge key={cat.id} variant="secondary" className="gap-1">
            {cat.nome}
            <button
              onClick={() => handleDeleteCategory(cat.id)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <FolderPlus className="h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Categoria</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Categoria</Label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Boas-vindas, Promoções..."
                />
              </div>
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                Criar Categoria
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={formData.categoria || "sem_categoria"}
                onValueChange={(value) =>
                  setFormData({ ...formData, categoria: value === "sem_categoria" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_categoria">Sem categoria</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.nome}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="content">Conteúdo *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Digite o texto pronto... Use {{contato}}, {{empresa}}, {{whatsapp}} para variáveis"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Variáveis disponíveis: {"{{contato}}"}, {"{{empresa}}"}, {"{{whatsapp}}"}, {"{{email}}"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Grouped Replies */}
      <div className="space-y-4">
        {Object.entries(groupedReplies).map(([category, replies]) => (
          <Collapsible key={category} defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <span className="font-medium">{category}</span>
                <Badge variant="secondary">{replies.length}</Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {replies.map((reply) => (
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
            </CollapsibleContent>
          </Collapsible>
        ))}
        {quickReplies.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Nenhum texto pronto cadastrado
          </p>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Confirmar exclusão"
        description="Tem certeza que deseja excluir este texto pronto? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
