import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, Trash2, X, Link as LinkIcon, FileUp, Upload, Image as ImageIcon, Search, File, FileText, FileSpreadsheet } from "lucide-react";
import { createThumbnail, getFileTypeAccept, getFileTypeIcon } from "@/lib/imageUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface QuickAttachmentsCRUDProps {
  estabelecimentoId?: string;
}

export default function QuickAttachmentsCRUD({ estabelecimentoId }: QuickAttachmentsCRUDProps = {}) {
  const [quickAttachments, setQuickAttachments] = useState<QuickAttachment[]>([]);
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
  }, [estabelecimentoId]);

  const loadQuickAttachments = async () => {
    let query = supabase
      .from("quick_attachments")
      .select("*")
      .eq("is_global", true);

    // Note: quick_attachments não tem estabelecimento_id no schema atual
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
      toast.error("Erro ao carregar anexos rápidos");
      return;
    }
    setQuickAttachments((data || []) as QuickAttachment[]);
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

  // Filter by search query
  const filteredAttachments = quickAttachments.filter((attachment) =>
    attachment.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const linkAttachments = filteredAttachments.filter((a) => a.type === "link");
  const fileAttachments = filteredAttachments.filter((a) => a.type === "file");
  
  // Separate files by type
  const images = fileAttachments.filter((f) => f.file_type === "image");
  const pdfs = fileAttachments.filter((f) => f.file_type === "pdf");
  const excels = fileAttachments.filter((f) => f.file_type === "excel");
  const words = fileAttachments.filter((f) => f.file_type === "word");
  const others = fileAttachments.filter((f) => !f.file_type);

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
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="links" className="gap-2">
            <LinkIcon className="h-4 w-4" />
            Links ({linkAttachments.length})
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <FileUp className="h-4 w-4" />
            Arquivos ({fileAttachments.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquisar anexos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="links" className="space-y-3 mt-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 pr-4">
              {linkAttachments.length === 0 ? (
                <div className="text-center py-12">
                  <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum link cadastrado
                  </p>
                </div>
              ) : (
                linkAttachments.map((attachment) => (
                  <Card key={attachment.id} className="p-4 hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <LinkIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold mb-1">{attachment.title}</h4>
                          {attachment.grupo_acesso_id && (
                            <p className="text-xs text-muted-foreground">
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
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="files" className="space-y-4 mt-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-4">
              {fileAttachments.length === 0 ? (
                <div className="text-center py-12">
                  <FileUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum arquivo cadastrado
                  </p>
                </div>
              ) : (
                <>
                  {images.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        IMAGENS ({images.length})
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {images.map((attachment) => (
                          <Card key={attachment.id} className="group relative overflow-hidden">
                            <div className="aspect-square relative">
                              {attachment.thumbnail_url || attachment.url ? (
                                <img 
                                  src={attachment.thumbnail_url || attachment.url} 
                                  alt={attachment.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="p-3 border-t bg-background">
                              <p className="text-xs font-medium truncate mb-2">{attachment.title}</p>
                              {attachment.grupo_acesso_id && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  {grupos.find((g) => g.id === attachment.grupo_acesso_id)?.nome}
                                </p>
                              )}
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 flex-1"
                                  onClick={() => handleEdit(attachment)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 flex-1"
                                  onClick={() => handleDelete(attachment.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {pdfs.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDFs ({pdfs.length})
                      </h5>
                      <div className="space-y-2">
                        {pdfs.map((attachment) => (
                          <Card key={attachment.id} className="p-4 hover:shadow-md transition-all duration-200 border-l-4 border-l-red-500/20 hover:border-l-red-500">
                            <div className="flex items-start gap-4">
                              <div className="flex gap-3 flex-1 min-w-0">
                                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-red-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold mb-1">{attachment.title}</h4>
                                  {attachment.grupo_acesso_id && (
                                    <p className="text-xs text-muted-foreground">
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
                      </div>
                    </div>
                  )}

                  {excels.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        EXCEL ({excels.length})
                      </h5>
                      <div className="space-y-2">
                        {excels.map((attachment) => (
                          <Card key={attachment.id} className="p-4 hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500/20 hover:border-l-green-500">
                            <div className="flex items-start gap-4">
                              <div className="flex gap-3 flex-1 min-w-0">
                                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                  <FileSpreadsheet className="h-5 w-5 text-green-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold mb-1">{attachment.title}</h4>
                                  {attachment.grupo_acesso_id && (
                                    <p className="text-xs text-muted-foreground">
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
                      </div>
                    </div>
                  )}

                  {words.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2">
                        <File className="h-4 w-4" />
                        WORD ({words.length})
                      </h5>
                      <div className="space-y-2">
                        {words.map((attachment) => (
                          <Card key={attachment.id} className="p-4 hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500/20 hover:border-l-blue-500">
                            <div className="flex items-start gap-4">
                              <div className="flex gap-3 flex-1 min-w-0">
                                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                  <File className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold mb-1">{attachment.title}</h4>
                                  {attachment.grupo_acesso_id && (
                                    <p className="text-xs text-muted-foreground">
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
                      </div>
                    </div>
                  )}

                  {others.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-muted-foreground mb-3">OUTROS ({others.length})</h5>
                      <div className="space-y-2">
                        {others.map((attachment) => (
                          <Card key={attachment.id} className="p-4 hover:shadow-md transition-all duration-200">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold mb-1">{attachment.title}</h4>
                                {attachment.grupo_acesso_id && (
                                  <p className="text-xs text-muted-foreground">
                                    Grupo: {grupos.find((g) => g.id === attachment.grupo_acesso_id)?.nome}
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
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
