import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, Trash2, X, Link as LinkIcon, FileUp, Upload, Image as ImageIcon } from "lucide-react";
import { createThumbnail, getFileTypeAccept, getFileTypeIcon } from "@/lib/imageUtils";
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
  grupo_acesso_id: string | null;
  is_global: boolean;
  file_type?: string | null;
  thumbnail_url?: string | null;
}

interface GrupoAcesso {
  id: string;
  nome: string;
}

export default function QuickAttachmentsCRUD() {
  const [quickAttachments, setQuickAttachments] = useState<QuickAttachment[]>([]);
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "link" as "link" | "file",
    url: "",
    grupo_acesso_id: "",
    file_type: "",
    thumbnail_url: "",
  });

  useEffect(() => {
    loadQuickAttachments();
    loadGrupos();
  }, []);

  const loadQuickAttachments = async () => {
    const { data, error } = await supabase
      .from("quick_attachments")
      .select("*")
      .eq("is_global", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar anexos rápidos");
      return;
    }
    setQuickAttachments((data || []) as QuickAttachment[]);
  };

  const loadGrupos = async () => {
    const { data, error } = await supabase
      .from("grupos_acesso")
      .select("id, nome")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar grupos de acesso");
      return;
    }
    setGrupos(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.url.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (formData.type === "file" && !formData.file_type) {
      toast.error("Selecione o tipo de arquivo");
      return;
    }

    const dataToSave = {
      title: formData.title,
      type: formData.type,
      url: formData.url,
      grupo_acesso_id: formData.grupo_acesso_id || null,
      is_global: true,
      file_type: formData.type === "file" ? formData.file_type : null,
      thumbnail_url: formData.type === "file" ? formData.thumbnail_url : null,
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
    setIsEditing(true);
    setCurrentId(attachment.id);
    setFormData({
      title: attachment.title,
      type: attachment.type,
      url: attachment.url,
      grupo_acesso_id: attachment.grupo_acesso_id || "",
      file_type: attachment.file_type || "",
      thumbnail_url: attachment.thumbnail_url || "",
    });
  };

  const handleDelete = async (id: string) => {
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `attachments/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('bot-media')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('bot-media')
        .getPublicUrl(filePath);

      // Create thumbnail if it's an image
      let thumbnailUrl = "";
      if (formData.file_type === "image") {
        try {
          const thumbnailBlob = await createThumbnail(file);
          const thumbFileName = `thumb_${fileName}`;
          const thumbFilePath = `attachments/${thumbFileName}`;
          
          const { error: thumbError } = await supabase.storage
            .from('bot-media')
            .upload(thumbFilePath, thumbnailBlob);
          
          if (!thumbError) {
            const { data: { publicUrl: thumbUrl } } = supabase.storage
              .from('bot-media')
              .getPublicUrl(thumbFilePath);
            thumbnailUrl = thumbUrl;
          }
        } catch (thumbError) {
          console.error("Error creating thumbnail:", thumbError);
        }
      }

      setFormData(prev => ({ 
        ...prev, 
        url: publicUrl,
        thumbnail_url: thumbnailUrl 
      }));
      toast.success("Arquivo enviado com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao enviar arquivo: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      title: "", 
      type: "link", 
      url: "", 
      grupo_acesso_id: "",
      file_type: "",
      thumbnail_url: ""
    });
    setIsEditing(false);
    setCurrentId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const linkAttachments = quickAttachments.filter((a) => a.type === "link");
  const fileAttachments = quickAttachments.filter((a) => a.type === "file");

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

          {formData.type === "file" && (
            <div>
              <Label htmlFor="file_type">Tipo de Arquivo *</Label>
              <Select
                value={formData.file_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, file_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">🖼️ Imagem (JPG, PNG, GIF, WebP)</SelectItem>
                  <SelectItem value="pdf">📄 PDF</SelectItem>
                  <SelectItem value="excel">📊 Excel</SelectItem>
                  <SelectItem value="word">📝 Word</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="url">
              {formData.type === "link" ? "URL *" : "Arquivo *"}
            </Label>
            {formData.type === "file" ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  accept={formData.file_type ? getFileTypeAccept(formData.file_type) : "*/*"}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || !formData.file_type}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? "Enviando..." : "Selecionar Arquivo"}
                  </Button>
                </div>
                {!formData.file_type && (
                  <p className="text-xs text-muted-foreground">
                    Selecione o tipo de arquivo primeiro
                  </p>
                )}
                {formData.url && (
                  <div className="space-y-2">
                    {formData.thumbnail_url && (
                      <div className="flex justify-center">
                        <img 
                          src={formData.thumbnail_url} 
                          alt="Miniatura" 
                          className="h-24 w-24 object-cover rounded border"
                        />
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                      <p className="font-medium">Arquivo enviado:</p>
                      <p className="truncate">{formData.url}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Input
                id="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                placeholder="https://exemplo.com"
              />
            )}
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

      <Tabs defaultValue="links" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="links">
            <LinkIcon className="h-4 w-4 mr-2" />
            Links ({linkAttachments.length})
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileUp className="h-4 w-4 mr-2" />
            Arquivos ({fileAttachments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="space-y-2 mt-4">
          {linkAttachments.map((attachment) => (
            <Card key={attachment.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium">{attachment.title}</h4>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {attachment.url}
                  </a>
                  {attachment.grupo_acesso_id && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Grupo:{" "}
                      {grupos.find((g) => g.id === attachment.grupo_acesso_id)?.nome}
                    </p>
                  )}
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
                    onClick={() => handleDelete(attachment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {linkAttachments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum link cadastrado
            </p>
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-2 mt-4">
          {fileAttachments.map((attachment) => (
            <Card key={attachment.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3 flex-1 min-w-0">
                  {attachment.thumbnail_url ? (
                    <img 
                      src={attachment.thumbnail_url} 
                      alt={attachment.title}
                      className="h-16 w-16 object-cover rounded border flex-shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center bg-muted rounded border flex-shrink-0">
                      <span className="text-2xl">{getFileTypeIcon(attachment.file_type)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{attachment.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      Tipo: {getFileTypeIcon(attachment.file_type)} {attachment.file_type || "arquivo"}
                    </p>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline break-all"
                    >
                      {attachment.url}
                    </a>
                    {attachment.grupo_acesso_id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Grupo: {grupos.find((g) => g.id === attachment.grupo_acesso_id)?.nome}
                      </p>
                    )}
                  </div>
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
                    onClick={() => handleDelete(attachment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {fileAttachments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum arquivo cadastrado
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
