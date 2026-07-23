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
  ImageIcon, FileSpreadsheet, Calendar, Package, Loader2, AlertCircle
} from "lucide-react";
import { ContentItem, QuickReply, MediaGalleryItem, CanalEnvio } from "../types";
import { Settings } from "lucide-react";
import { EnvioMassaTemplate } from "../hooks/useEnvioMassaTemplates";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";
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

// Interfaces for Catalog
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

// Interfaces for Quick Attachments
interface QuickAttachment {
  id: string;
  title: string;
  type: "link" | "file";
  url: string;
  is_global: boolean;
  file_type?: string | null;
  thumbnail_url?: string | null;
}

interface StepComposeProps {
  contentItems: ContentItem[];
  quickReplies: QuickReply[];
  groupedReplies: Record<string, QuickReply[]>;
  templates: EnvioMassaTemplate[];
  media: MediaGalleryItem[];
  onContentChange: (items: ContentItem[]) => void;
  onUploadMedia: (file: File) => Promise<MediaGalleryItem | null>;
  onBack: () => void;
  onNext: () => void;
  canal?: CanalEnvio | null;
  onOpenTemplates?: () => void;
}

const VARIABLES = [
  { key: '{{contato}}', label: 'Nome do Contato' },
  { key: '{{empresa}}', label: 'Empresa' },
  { key: '{{whatsapp}}', label: 'WhatsApp' },
  { key: '{{email}}', label: 'E-mail' },
];

// Componente para item arrastável
interface SortableContentItemProps {
  item: ContentItem;
  index: number;
  onRemove: (id: string) => void;
}

function SortableContentItem({ item, index, onRemove }: SortableContentItemProps) {
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
                {item.quickReplyTitle ? item.quickReplyTitle : 'Texto'}
              </Badge>
              <p className="text-sm whitespace-pre-wrap line-clamp-3">{item.content}</p>
            </div>
          )}
          {item.type === 'quick_reply' && (
            <div>
              <Badge variant="outline" className="mb-1 bg-primary/10">
                {item.quickReplyTitle}
              </Badge>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                {item.content}
              </p>
            </div>
          )}
          {(item.type === 'image' || item.type === 'video') && (
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
                {item.type === 'video' ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {item.mediaThumbnail ? (
                      <img
                        src={item.mediaThumbnail}
                        alt={item.content}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Video className="h-5 w-5 text-muted-foreground" />
                    )}
                    <Play className="absolute h-3 w-3 text-white" />
                  </div>
                ) : item.mediaUrl ? (
                  <img
                    src={item.mediaUrl}
                    alt={item.content}
                    className="w-full h-full object-cover"
                  />
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
                <p className="text-sm text-muted-foreground truncate">
                  {item.content}
                </p>
              </div>
            </div>
          )}
          {item.type === 'catalog' && (
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 shrink-0 flex items-center justify-center border border-primary/20 shadow-sm">
                {item.mediaUrl ? (
                  <img
                    src={item.mediaUrl}
                    alt={item.catalogName || 'Catálogo'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Badge className="mb-1 bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                  <FileText className="h-3 w-3 mr-1" />
                  PDF
                </Badge>
                <p className="text-sm font-medium truncate">
                  {item.catalogName || 'Catálogo'}
                </p>
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
                <p className="text-sm text-muted-foreground truncate">
                  {item.content}
                </p>
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

export function StepCompose({
  contentItems,
  quickReplies,
  groupedReplies,
  templates,
  media,
  onContentChange,
  onUploadMedia,
  onBack,
  onNext,
  canal,
  onOpenTemplates
}: StepComposeProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'text' | 'media' | 'catalogo' | 'anexos'>('templates');
  const [textInput, setTextInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Catalog state
  const [catalogs, setCatalogs] = useState<SavedCatalog[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  
  // Attachments state
  const [attachments, setAttachments] = useState<QuickAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [attachmentSearch, setAttachmentSearch] = useState('');

  // Load catalogs when tab is active
  useEffect(() => {
    if (activeTab === 'catalogo') {
      loadCatalogs();
    }
  }, [activeTab]);

  // Load attachments when tab is active
  useEffect(() => {
    if (activeTab === 'anexos') {
      loadAttachments();
    }
  }, [activeTab]);

  const loadCatalogs = async () => {
    setLoadingCatalogs(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      const { data, error } = await supabase
        .from("catalogos_salvos")
        .select("id, nome, thumbnail, updated_at, ativo, data_validade, data_indeterminada, products_page")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Filter expired catalogs
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
      toast.error("Erro ao carregar catálogos");
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const loadAttachments = async () => {
    setLoadingAttachments(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      const { data, error } = await supabase
        .from("quick_attachments")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .order("is_global", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttachments((data || []) as QuickAttachment[]);
    } catch (error: any) {
      console.error("Erro ao carregar anexos:", error);
      toast.error("Erro ao carregar anexos rápidos");
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Filtered catalogs
  const filteredCatalogs = useMemo(() => {
    return catalogs.filter(c => 
      c.nome.toLowerCase().includes(catalogSearch.toLowerCase())
    );
  }, [catalogs, catalogSearch]);

  // Filtered attachments
  const filteredAttachments = useMemo(() => {
    return attachments.filter(a => 
      a.title.toLowerCase().includes(attachmentSearch.toLowerCase())
    );
  }, [attachments, attachmentSearch]);

  // Separate attachments by type
  const attachmentLinks = filteredAttachments.filter(a => a.type === "link");
  const attachmentFiles = filteredAttachments.filter(a => a.type === "file");
  const attachmentImages = attachmentFiles.filter(f => f.file_type === "image");

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

  const addTemplate = (template: EnvioMassaTemplate) => {
    // If template has content_items, use them; otherwise fallback to conteudo text
    if (template.content_items && template.content_items.length > 0) {
      // Generate new unique IDs for each item to avoid duplicates
      const newItems: ContentItem[] = template.content_items.map((item, index) => ({
        ...item,
        id: `template-${template.id}-${Date.now()}-${index}`
      }));
      onContentChange([...contentItems, ...newItems]);
    } else {
      // Fallback for old templates without content_items
      const newItem: ContentItem = {
        id: `template-${Date.now()}`,
        type: 'text',
        content: template.conteudo,
        quickReplyTitle: template.nome
      };
      onContentChange([...contentItems, newItem]);
    }
    toast.success(`Template "${template.nome}" adicionado`);
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
    // Determine the correct type based on file type
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
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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
    const uploaded = await onUploadMedia(file);
    if (uploaded) {
      addMedia(uploaded);
    }
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getProductCount = (catalog: SavedCatalog) => {
    return catalog.products_page?.products?.length || 0;
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
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
      {/* Tabs de seleção - Full width, stack on mobile */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="templates" className="flex flex-col sm:flex-row gap-1 py-2 px-1 text-xs">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="text" className="flex flex-col sm:flex-row gap-1 py-2 px-1 text-xs">
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">Texto</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="flex flex-col sm:flex-row gap-1 py-2 px-1 text-xs">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Mídia</span>
          </TabsTrigger>
          <TabsTrigger value="catalogo" className="flex flex-col sm:flex-row gap-1 py-2 px-1 text-xs">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Catálogo</span>
          </TabsTrigger>
          <TabsTrigger value="anexos" className="flex flex-col sm:flex-row gap-1 py-2 px-1 text-xs">
            <Paperclip className="h-4 w-4" />
            <span className="hidden sm:inline">Anexos</span>
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Left Panel - Content Selection */}
          <div className="border rounded-lg min-h-[400px]">
            {/* Templates Tab */}
            <TabsContent value="templates" className="m-0 p-0">
              <ScrollArea className="h-[380px]">
                <div className="p-4 space-y-2">
                  {canal === 'whatsapp' && onOpenTemplates && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenTemplates}
                      className="w-full gap-2 mb-2"
                    >
                      <Settings className="h-4 w-4" />
                      Gerenciar templates
                    </Button>
                  )}
                  {templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum template cadastrado</p>
                      <p className="text-sm mt-1">
                        {canal === 'whatsapp'
                          ? 'Clique em "Gerenciar templates" acima para criar um template.'
                          : 'Nenhum template disponível.'}
                      </p>
                    </div>
                  ) : (
                    templates.map(template => {
                      const hasContentItems = template.content_items && template.content_items.length > 0;
                      const itemCount = hasContentItems ? template.content_items.length : 1;
                      const textCount = hasContentItems ? template.content_items.filter(i => i.type === 'text').length : 1;
                      const imageCount = hasContentItems ? template.content_items.filter(i => i.type === 'image').length : 0;
                      const videoCount = hasContentItems ? template.content_items.filter(i => i.type === 'video').length : 0;
                      const catalogCount = hasContentItems ? template.content_items.filter(i => i.type === 'catalog').length : 0;
                      const fileCount = hasContentItems ? template.content_items.filter(i => i.type === 'file').length : 0;
                      
                      return (
                        <Card
                          key={template.id}
                          className="p-3 cursor-pointer hover:bg-muted/50 transition-colors hover:shadow-sm"
                          onClick={() => addTemplate(template)}
                        >
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm">{template.nome}</p>
                              {template.descricao && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  {template.descricao}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {textCount > 0 && (
                                  <Badge variant="outline" className="text-xs h-5">
                                    {textCount} texto{textCount > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {imageCount > 0 && (
                                  <Badge variant="outline" className="text-xs h-5">
                                    <Image className="h-3 w-3 mr-1" />
                                    {imageCount}
                                  </Badge>
                                )}
                                {videoCount > 0 && (
                                  <Badge variant="outline" className="text-xs h-5">
                                    <Video className="h-3 w-3 mr-1" />
                                    {videoCount}
                                  </Badge>
                                )}
                                {catalogCount > 0 && (
                                  <Badge variant="outline" className="text-xs h-5">
                                    <BookOpen className="h-3 w-3 mr-1" />
                                    {catalogCount}
                                  </Badge>
                                )}
                                {fileCount > 0 && (
                                  <Badge variant="outline" className="text-xs h-5">
                                    <Paperclip className="h-3 w-3 mr-1" />
                                    {fileCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Text Tab */}
            <TabsContent value="text" className="m-0 p-4 space-y-4">
              <div className="space-y-2">
                <Label>Digite sua mensagem</Label>
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Digite o texto da mensagem..."
                  rows={6}
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
              <ScrollArea className="h-[320px]">
                <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {media.map(item => (
                    <Card
                      key={item.id}
                      className="aspect-square cursor-pointer overflow-hidden hover:ring-2 ring-primary transition-all"
                      onClick={() => addMedia(item)}
                    >
                      {item.tipo === 'video' ? (
                        <div className="relative w-full h-full bg-muted flex items-center justify-center">
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.nome}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Video className="h-8 w-8 text-muted-foreground" />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.public_url}
                          alt={item.nome}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </Card>
                  ))}
                  {media.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <Image className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhuma mídia disponível</p>
                    </div>
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
              <ScrollArea className="h-[320px]">
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
                        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors hover:shadow-sm"
                        onClick={() => addCatalog(catalog)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-muted shrink-0 overflow-hidden">
                            {catalog.thumbnail ? (
                              <img
                                src={catalog.thumbnail}
                                alt={catalog.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm truncate">
                                {catalog.nome}
                              </span>
                              <Badge variant="secondary" className="text-xs shrink-0">
                                <Package className="h-3 w-3 mr-1" />
                                {getProductCount(catalog)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(catalog.updated_at), "dd/MM/yy", { locale: ptBR })}
                              </span>
                              {!catalog.data_indeterminada && catalog.data_validade && (
                                <span className="flex items-center gap-1 text-amber-600">
                                  <AlertCircle className="h-3 w-3" />
                                  Até {format(new Date(catalog.data_validade), "dd/MM/yy")}
                                </span>
                              )}
                            </div>
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
              <ScrollArea className="h-[320px]">
                <div className="p-4 space-y-4">
                  {loadingAttachments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredAttachments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>{attachmentSearch ? "Nenhum anexo encontrado" : "Nenhum anexo cadastrado"}</p>
                      <p className="text-sm mt-1">
                        Configure anexos em Configurações → Anexos Rápidos
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Links */}
                      {attachmentLinks.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2">
                            <LinkIcon className="h-3 w-3" />
                            LINKS ({attachmentLinks.length})
                          </h5>
                          <div className="space-y-2">
                            {attachmentLinks.map(attachment => (
                              <Card
                                key={attachment.id}
                                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-primary/20 hover:border-l-primary"
                                onClick={() => addAttachment(attachment)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <LinkIcon className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="font-medium text-sm truncate flex-1">{attachment.title}</span>
                                  {attachment.is_global && (
                                    <Badge variant="secondary" className="text-xs">Global</Badge>
                                  )}
                                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Images */}
                      {attachmentImages.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2">
                            <ImageIcon className="h-3 w-3" />
                            IMAGENS ({attachmentImages.length})
                          </h5>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {attachmentImages.map(attachment => (
                              <Card
                                key={attachment.id}
                                className="aspect-square cursor-pointer overflow-hidden hover:ring-2 ring-primary transition-all"
                                onClick={() => addAttachment(attachment)}
                              >
                                <img
                                  src={attachment.thumbnail_url || attachment.url}
                                  alt={attachment.title}
                                  className="w-full h-full object-cover"
                                />
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other Files */}
                      {attachmentFiles.filter(f => f.file_type !== 'image').length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2">
                            <FileUp className="h-3 w-3" />
                            ARQUIVOS ({attachmentFiles.filter(f => f.file_type !== 'image').length})
                          </h5>
                          <div className="space-y-2">
                            {attachmentFiles.filter(f => f.file_type !== 'image').map(attachment => (
                              <Card
                                key={attachment.id}
                                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => addAttachment(attachment)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    {getFileIcon(attachment.file_type)}
                                  </div>
                                  <span className="font-medium text-sm truncate flex-1">{attachment.title}</span>
                                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
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
          </div>

          {/* Right Panel - Sequence Preview */}
          <div className="border rounded-lg">
            <div className="px-4 py-3 border-b bg-muted/30">
              <h3 className="font-medium flex items-center gap-2">
                Sequência de Envio
                <Badge variant="outline">{contentItems.length} itens</Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Arraste para reordenar
              </p>
            </div>
            <ScrollArea className="h-[360px]">
              <div className="p-4">
                {contentItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Plus className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Adicione itens à sequência</p>
                    <p className="text-sm">Templates, textos ou mídias</p>
                  </div>
                ) : (
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
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </Tabs>

      </div>

      {/* Footer - Always at bottom */}
      <div className="flex items-center justify-between pt-4 border-t mt-4 shrink-0">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onNext} disabled={contentItems.length === 0}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
