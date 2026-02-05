import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Image, Video, Plus, Trash2, 
  GripVertical, Upload, Type, Play, FileText,
  BookOpen, Paperclip, File, Search, LinkIcon, FileUp,
  ImageIcon, FileSpreadsheet, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Types from envio-massa
export interface ContentItem {
  id: string;
  type: 'text' | 'quick_reply' | 'image' | 'video' | 'catalog' | 'file';
  content: string;
  mediaUrl?: string;
  mediaThumbnail?: string;
  mediaDuration?: number;
  quickReplyId?: string;
  quickReplyTitle?: string;
  catalogId?: string;
  catalogName?: string;
  fileType?: 'pdf' | 'excel' | 'word' | 'link' | 'other';
}

interface SavedCatalog {
  id: string;
  nome: string;
  thumbnail: string | null;
  updated_at: string;
  ativo: boolean;
  data_validade: string | null;
  data_indeterminada: boolean;
  products_page: any;
}

interface QuickAttachment {
  id: string;
  title: string;
  type: "link" | "file";
  url: string;
  is_global: boolean;
  file_type?: string | null;
  thumbnail_url?: string | null;
}

interface MediaGalleryItem {
  id: string;
  tipo: 'image' | 'video' | 'audio' | 'document';
  storage_path: string;
  public_url: string;
  nome: string;
  descricao?: string;
  thumbnail_url?: string;
  duracao_segundos?: number;
}

interface TemplateContentEditorProps {
  contentItems: ContentItem[];
  onContentChange: (items: ContentItem[]) => void;
  estabelecimentoId: string;
}

const VARIABLES = [
  { key: '{{contato}}', label: 'Contato' },
  { key: '{{empresa}}', label: 'Empresa' },
  { key: '{{whatsapp}}', label: 'WhatsApp' },
  { key: '{{email}}', label: 'E-mail' },
];

// Sortable item component
function SortableContentItem({ item, index, onRemove }: { 
  item: ContentItem; 
  index: number; 
  onRemove: (id: string) => void; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="p-3 mb-2">
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Badge variant="secondary" className="shrink-0">
          {index + 1}
        </Badge>
        <div className="flex-1 min-w-0">
          {item.type === 'text' && (
            <div>
              <Badge variant="outline" className="mb-1">
                {item.quickReplyTitle || 'Texto'}
              </Badge>
              <p className="text-sm whitespace-pre-wrap line-clamp-3">{item.content}</p>
            </div>
          )}
          {(item.type === 'image' || item.type === 'video') && (
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
                {item.type === 'video' ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {item.mediaThumbnail ? (
                      <img src={item.mediaThumbnail} alt={item.content} className="w-full h-full object-cover" />
                    ) : (
                      <Video className="h-5 w-5 text-muted-foreground" />
                    )}
                    <Play className="absolute h-3 w-3 text-white" />
                  </div>
                ) : item.mediaUrl ? (
                  <img src={item.mediaUrl} alt={item.content} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant="outline" className="mb-1">
                  {item.type === 'video' ? 'Vídeo' : 'Imagem'}
                </Badge>
                <p className="text-sm text-muted-foreground truncate">{item.content}</p>
              </div>
            </div>
          )}
          {item.type === 'catalog' && (
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 shrink-0 flex items-center justify-center border border-primary/20">
                {item.mediaUrl ? (
                  <img src={item.mediaUrl} alt={item.catalogName || 'Catálogo'} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Badge className="mb-1 bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                  <FileText className="h-3 w-3 mr-1" />
                  PDF
                </Badge>
                <p className="text-sm font-medium truncate">{item.catalogName || 'Catálogo'}</p>
              </div>
            </div>
          )}
          {item.type === 'file' && (
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                {item.fileType === 'pdf' && <FileText className="h-5 w-5 text-red-500" />}
                {item.fileType === 'excel' && <FileSpreadsheet className="h-5 w-5 text-green-500" />}
                {item.fileType === 'word' && <File className="h-5 w-5 text-blue-500" />}
                {item.fileType === 'link' && <LinkIcon className="h-5 w-5 text-blue-500" />}
                {(!item.fileType || item.fileType === 'other') && <Paperclip className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant="outline" className="mb-1">
                  {item.quickReplyTitle || 'Anexo'}
                </Badge>
                <p className="text-sm text-muted-foreground truncate">{item.content}</p>
              </div>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

export function TemplateContentEditor({
  contentItems,
  onContentChange,
  estabelecimentoId
}: TemplateContentEditorProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'media' | 'catalogo' | 'anexos'>('text');
  const [textInput, setTextInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Media state
  const [media, setMedia] = useState<MediaGalleryItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  
  // Catalog state
  const [catalogs, setCatalogs] = useState<SavedCatalog[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  
  // Attachments state
  const [attachments, setAttachments] = useState<QuickAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [attachmentSearch, setAttachmentSearch] = useState('');

  // Load data when tabs change
  useEffect(() => {
    if (activeTab === 'media') loadMedia();
    if (activeTab === 'catalogo') loadCatalogs();
    if (activeTab === 'anexos') loadAttachments();
  }, [activeTab]);

  const loadMedia = async () => {
    setLoadingMedia(true);
    try {
      const { data, error } = await supabase
        .from('media_gallery')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .in('tipo', ['image', 'video'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMedia((data || []) as MediaGalleryItem[]);
    } catch (error: any) {
      console.error('Erro ao carregar mídia:', error);
    } finally {
      setLoadingMedia(false);
    }
  };

  const loadCatalogs = async () => {
    setLoadingCatalogs(true);
    try {
      const { data, error } = await supabase
        .from("catalogos_salvos")
        .select("id, nome, thumbnail, updated_at, ativo, data_validade, data_indeterminada, products_page")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativo", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      const now = new Date();
      const validCatalogs = (data || []).filter((catalog: SavedCatalog) => {
        if (!catalog.data_indeterminada && catalog.data_validade) {
          return new Date(catalog.data_validade) > now;
        }
        return true;
      });
      
      setCatalogs(validCatalogs);
    } catch (error: any) {
      console.error("Erro ao carregar catálogos:", error);
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const loadAttachments = async () => {
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase
        .from("quick_attachments")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("is_global", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttachments((data || []) as QuickAttachment[]);
    } catch (error: any) {
      console.error("Erro ao carregar anexos:", error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const filteredCatalogs = useMemo(() => {
    return catalogs.filter(c => c.nome.toLowerCase().includes(catalogSearch.toLowerCase()));
  }, [catalogs, catalogSearch]);

  const filteredAttachments = useMemo(() => {
    return attachments.filter(a => a.title.toLowerCase().includes(attachmentSearch.toLowerCase()));
  }, [attachments, attachmentSearch]);

  const addTextItem = () => {
    if (!textInput.trim()) return;
    
    const newItem: ContentItem = {
      id: `text-${Date.now()}`,
      type: 'text',
      content: textInput
    };
    onContentChange([...contentItems, newItem]);
    setTextInput('');
  };

  const addMedia = (item: MediaGalleryItem) => {
    const newItem: ContentItem = {
      id: `media-${Date.now()}`,
      type: item.tipo === 'video' ? 'video' : 'image',
      content: item.nome,
      mediaUrl: item.public_url,
      mediaThumbnail: item.thumbnail_url,
      mediaDuration: item.duracao_segundos
    };
    onContentChange([...contentItems, newItem]);
    toast.success(`${item.tipo === 'video' ? 'Vídeo' : 'Imagem'} adicionado`);
  };

  const addCatalog = (catalog: SavedCatalog) => {
    const productCount = catalog.products_page?.products?.length || 0;
    const newItem: ContentItem = {
      id: `catalogo-${Date.now()}`,
      type: 'catalog',
      content: `📦 Catálogo: ${catalog.nome} (${productCount} produtos)`,
      mediaUrl: catalog.thumbnail || undefined,
      catalogId: catalog.id,
      catalogName: catalog.nome,
      quickReplyTitle: 'Catálogo'
    };
    onContentChange([...contentItems, newItem]);
    toast.success(`Catálogo "${catalog.nome}" adicionado`);
  };

  const addAttachment = (attachment: QuickAttachment) => {
    let itemType: ContentItem['type'] = 'file';
    let fileType: ContentItem['fileType'] = 'other';
    
    if (attachment.file_type === 'image') {
      itemType = 'image';
    } else if (attachment.type === 'link') {
      itemType = 'file';
      fileType = 'link';
    } else {
      switch (attachment.file_type) {
        case 'pdf': fileType = 'pdf'; break;
        case 'excel': fileType = 'excel'; break;
        case 'word': fileType = 'word'; break;
        default: fileType = 'other';
      }
    }

    const newItem: ContentItem = {
      id: `anexo-${Date.now()}`,
      type: itemType,
      content: itemType === 'image' ? attachment.title : `📎 ${attachment.title}`,
      mediaUrl: attachment.url,
      mediaThumbnail: attachment.thumbnail_url || undefined,
      quickReplyTitle: attachment.type === 'link' ? 'Link' : 'Anexo',
      fileType: fileType
    };
    onContentChange([...contentItems, newItem]);
    toast.success(`"${attachment.title}" adicionado`);
  };

  const removeItem = (id: string) => {
    onContentChange(contentItems.filter(item => item.id !== id));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = contentItems.findIndex((item) => item.id === active.id);
      const newIndex = contentItems.findIndex((item) => item.id === over.id);
      onContentChange(arrayMove(contentItems, oldIndex, newIndex));
    }
  };

  const insertVariable = (variable: string) => {
    setTextInput(prev => prev + variable);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${estabelecimentoId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media_gallery')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media_gallery')
        .getPublicUrl(filePath);

      const tipo = file.type.startsWith('video/') ? 'video' : 'image';

      const { data: insertedData, error: insertError } = await supabase
        .from('media_gallery')
        .insert({
          estabelecimento_id: estabelecimentoId,
          tipo,
          storage_path: filePath,
          public_url: publicUrl,
          nome: file.name
        })
        .select()
        .single();

      if (insertError) throw insertError;

      addMedia(insertedData as MediaGalleryItem);
      loadMedia();
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (fileType?: string | null) => {
    switch (fileType) {
      case 'image': return <ImageIcon className="h-5 w-5 text-purple-500" />;
      case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
      case 'excel': return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'word': return <File className="h-5 w-5 text-blue-500" />;
      default: return <FileUp className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs de seleção */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="text" className="flex flex-col sm:flex-row gap-1 py-2 px-1 text-xs">
            <Type className="h-4 w-4" />
            <span>Texto</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="flex flex-col sm:flex-row gap-1 py-2 px-1 text-xs">
            <Image className="h-4 w-4" />
            <span>Mídia</span>
          </TabsTrigger>
          <TabsTrigger value="catalogo" className="flex flex-col sm:flex-row gap-1 py-2 px-1 text-xs">
            <BookOpen className="h-4 w-4" />
            <span>Catálogo</span>
          </TabsTrigger>
          <TabsTrigger value="anexos" className="flex flex-col sm:flex-row gap-1 py-2 px-1 text-xs">
            <Paperclip className="h-4 w-4" />
            <span>Anexos</span>
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Left Panel - Content Selection */}
          <div className="border rounded-lg min-h-[300px]">
            {/* Text Tab */}
            <TabsContent value="text" className="m-0 p-4 space-y-4">
              <div className="space-y-2">
                <Label>Digite sua mensagem</Label>
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Digite o texto da mensagem..."
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Variáveis disponíveis</Label>
                <div className="flex flex-wrap gap-2">
                  {VARIABLES.map(v => (
                    <Badge
                      key={v.key}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => insertVariable(v.key)}
                    >
                      {v.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={addTextItem} disabled={!textInput.trim()} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Texto
              </Button>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="m-0 p-0">
              <div className="p-4 border-b">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Enviando...' : 'Enviar nova mídia'}
                </Button>
              </div>
              <ScrollArea className="h-[250px]">
                <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {loadingMedia ? (
                    <div className="col-span-full flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : media.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <Image className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhuma mídia disponível</p>
                    </div>
                  ) : (
                    media.map(item => (
                      <Card
                        key={item.id}
                        className="aspect-square cursor-pointer overflow-hidden hover:ring-2 ring-primary transition-all"
                        onClick={() => addMedia(item)}
                      >
                        {item.tipo === 'video' ? (
                          <div className="relative w-full h-full bg-muted flex items-center justify-center">
                            {item.thumbnail_url ? (
                              <img src={item.thumbnail_url} alt={item.nome} className="w-full h-full object-cover" />
                            ) : (
                              <Video className="h-8 w-8 text-muted-foreground" />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ) : (
                          <img src={item.public_url} alt={item.nome} className="w-full h-full object-cover" />
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Catálogo Tab */}
            <TabsContent value="catalogo" className="m-0 p-0">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar catálogo..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="h-[250px]">
                <div className="p-4 space-y-2">
                  {loadingCatalogs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredCatalogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>{catalogSearch ? "Nenhum catálogo encontrado" : "Nenhum catálogo ativo"}</p>
                    </div>
                  ) : (
                    filteredCatalogs.map(catalog => (
                      <Card
                        key={catalog.id}
                        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => addCatalog(catalog)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted shrink-0 overflow-hidden">
                            {catalog.thumbnail ? (
                              <img src={catalog.thumbnail} alt={catalog.nome} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="h-4 w-4 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm truncate block">{catalog.nome}</span>
                            <span className="text-xs text-muted-foreground">
                              {catalog.products_page?.products?.length || 0} produtos
                            </span>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Anexos Tab */}
            <TabsContent value="anexos" className="m-0 p-0">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar anexo..."
                    value={attachmentSearch}
                    onChange={(e) => setAttachmentSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <ScrollArea className="h-[250px]">
                <div className="p-4 space-y-2">
                  {loadingAttachments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredAttachments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>{attachmentSearch ? "Nenhum anexo encontrado" : "Nenhum anexo cadastrado"}</p>
                    </div>
                  ) : (
                    filteredAttachments.map(attachment => (
                      <Card
                        key={attachment.id}
                        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => addAttachment(attachment)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                            {attachment.type === 'link' ? (
                              <LinkIcon className="h-4 w-4 text-blue-500" />
                            ) : (
                              getFileIcon(attachment.file_type)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm truncate block">{attachment.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {attachment.type === 'link' ? 'Link' : 'Arquivo'}
                            </span>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>

          {/* Right Panel - Selected Content */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-medium">Sequência de Conteúdo</Label>
              <Badge variant="secondary">{contentItems.length} itens</Badge>
            </div>
            
            {contentItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum conteúdo adicionado</p>
                <p className="text-sm">Adicione textos, mídias, catálogos ou anexos</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={contentItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {contentItems.map((item, index) => (
                      <SortableContentItem
                        key={item.id}
                        item={item}
                        index={index}
                        onRemove={removeItem}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </ScrollArea>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
