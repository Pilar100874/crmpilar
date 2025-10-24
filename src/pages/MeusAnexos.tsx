import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, X, Link as LinkIcon, FileUp, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuickAttachment {
  id: string;
  title: string;
  type: "link" | "file";
  url: string;
  is_global: boolean;
}

export default function MeusAnexos() {
  const [quickAttachments, setQuickAttachments] = useState<QuickAttachment[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "link" as "link" | "file",
    url: "",
  });

  useEffect(() => {
    loadQuickAttachments();
  }, []);

  const loadQuickAttachments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const { data, error } = await supabase
      .from("quick_attachments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar anexos rápidos");
      return;
    }
    setQuickAttachments((data || []) as QuickAttachment[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.url.trim()) {
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
      type: formData.type,
      url: formData.url,
      user_id: user.id,
      is_global: false,
    };

    if (isEditing && currentId) {
      const { error } = await supabase
        .from("quick_attachments")
        .update(dataToSave)
        .eq("id", currentId);

      if (error) {
        toast.error("Erro ao atualizar anexo rápido");
        return;
      }
      toast.success("Anexo rápido atualizado!");
    } else {
      const { error } = await supabase
        .from("quick_attachments")
        .insert([dataToSave]);

      if (error) {
        toast.error("Erro ao criar anexo rápido");
        return;
      }
      toast.success("Anexo rápido criado!");
    }

    resetForm();
    loadQuickAttachments();
  };

  const handleEdit = (attachment: QuickAttachment) => {
    if (attachment.is_global) {
      toast.error("Não é possível editar anexos globais");
      return;
    }
    setIsEditing(true);
    setCurrentId(attachment.id);
    setFormData({
      title: attachment.title,
      type: attachment.type,
      url: attachment.url,
    });
  };

  const handleDelete = async (id: string, isGlobal: boolean) => {
    if (isGlobal) {
      toast.error("Não é possível excluir anexos globais");
      return;
    }

    if (!confirm("Deseja realmente excluir este anexo rápido?")) return;

    const { error } = await supabase
      .from("quick_attachments")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir anexo rápido");
      return;
    }

    toast.success("Anexo rápido excluído!");
    loadQuickAttachments();
  };

  const resetForm = () => {
    setFormData({ title: "", type: "link", url: "" });
    setIsEditing(false);
    setCurrentId(null);
  };

  const myAttachments = quickAttachments.filter((a) => !a.is_global);
  const globalAttachments = quickAttachments.filter((a) => a.is_global);

  const myLinks = myAttachments.filter((a) => a.type === "link");
  const myFiles = myAttachments.filter((a) => a.type === "file");
  const globalLinks = globalAttachments.filter((a) => a.type === "link");
  const globalFiles = globalAttachments.filter((a) => a.type === "file");

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Meus Anexos Rápidos</h1>

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
                placeholder="Ex: Manual do produto"
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "link" | "file") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="file">Arquivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="url">
                {formData.type === "link" ? "URL *" : "URL do Arquivo *"}
              </Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                placeholder={
                  formData.type === "link"
                    ? "https://exemplo.com"
                    : "https://exemplo.com/arquivo.pdf"
                }
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

        {(globalLinks.length > 0 || globalFiles.length > 0) && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Anexos Globais</h2>
            <Tabs defaultValue="links" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="links">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Links ({globalLinks.length})
                </TabsTrigger>
                <TabsTrigger value="files">
                  <FileUp className="h-4 w-4 mr-2" />
                  Arquivos ({globalFiles.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="links" className="space-y-2 mt-4">
                {globalLinks.map((attachment) => (
                  <Card key={attachment.id} className="p-4 bg-muted/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{attachment.title}</h4>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline break-all inline-flex items-center gap-1"
                        >
                          {attachment.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="files" className="space-y-2 mt-4">
                {globalFiles.map((attachment) => (
                  <Card key={attachment.id} className="p-4 bg-muted/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{attachment.title}</h4>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline break-all inline-flex items-center gap-1"
                        >
                          {attachment.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-3">Meus Anexos</h2>
          <Tabs defaultValue="links" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="links">
                <LinkIcon className="h-4 w-4 mr-2" />
                Links ({myLinks.length})
              </TabsTrigger>
              <TabsTrigger value="files">
                <FileUp className="h-4 w-4 mr-2" />
                Arquivos ({myFiles.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="links" className="space-y-2 mt-4">
              {myLinks.map((attachment) => (
                <Card key={attachment.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{attachment.title}</h4>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all inline-flex items-center gap-1"
                      >
                        {attachment.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(attachment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(attachment.id, attachment.is_global)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {myLinks.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum link cadastrado
                </p>
              )}
            </TabsContent>

            <TabsContent value="files" className="space-y-2 mt-4">
              {myFiles.map((attachment) => (
                <Card key={attachment.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{attachment.title}</h4>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all inline-flex items-center gap-1"
                      >
                        {attachment.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(attachment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(attachment.id, attachment.is_global)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {myFiles.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum arquivo cadastrado
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
  );
}
