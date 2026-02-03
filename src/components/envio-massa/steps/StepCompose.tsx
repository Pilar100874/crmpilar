import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, Image, Video, Plus, Trash2, 
  GripVertical, Upload, Type, ChevronDown, Play, FileText,
  BookOpen, Paperclip, File
} from "lucide-react";
import { ContentItem, QuickReply, MediaGalleryItem } from "../types";
import { EnvioMassaTemplate } from "../hooks/useEnvioMassaTemplates";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface CatalogoItem {
  id: string;
  nome: string;
  descricao?: string;
  imagem_url?: string;
  preco?: number;
}

export interface AnexoItem {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  tamanho?: number;
}

interface StepComposeProps {
  contentItems: ContentItem[];
  quickReplies: QuickReply[];
  groupedReplies: Record<string, QuickReply[]>;
  templates: EnvioMassaTemplate[];
  media: MediaGalleryItem[];
  catalogos?: CatalogoItem[];
  anexos?: AnexoItem[];
  onContentChange: (items: ContentItem[]) => void;
  onUploadMedia: (file: File) => Promise<MediaGalleryItem | null>;
  onUploadAnexo?: (file: File) => Promise<AnexoItem | null>;
  onBack: () => void;
  onNext: () => void;
}

const VARIABLES = [
  { key: '{{contato}}', label: 'Nome do Contato' },
  { key: '{{empresa}}', label: 'Empresa' },
  { key: '{{whatsapp}}', label: 'WhatsApp' },
  { key: '{{email}}', label: 'E-mail' },
];

export function StepCompose({
  contentItems,
  quickReplies,
  groupedReplies,
  templates,
  media,
  catalogos = [],
  anexos = [],
  onContentChange,
  onUploadMedia,
  onUploadAnexo,
  onBack,
  onNext
}: StepComposeProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'text' | 'media' | 'catalogo' | 'anexos'>('templates');
  const [textInput, setTextInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const anexoInputRef = useRef<HTMLInputElement>(null);

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
    const newItem: ContentItem = {
      id: `template-${Date.now()}`,
      type: 'text',
      content: template.conteudo,
      quickReplyTitle: template.nome
    };
    onContentChange([...contentItems, newItem]);
  };

  const addQuickReply = (reply: QuickReply) => {
    const newItem: ContentItem = {
      id: `qr-${Date.now()}`,
      type: 'quick_reply',
      content: reply.content,
      quickReplyId: reply.id,
      quickReplyTitle: reply.title
    };
    onContentChange([...contentItems, newItem]);
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

  const addCatalogo = (item: CatalogoItem) => {
    const newItem: ContentItem = {
      id: `catalogo-${Date.now()}`,
      type: 'image',
      content: `📦 ${item.nome}${item.preco ? ` - R$ ${item.preco.toFixed(2)}` : ''}`,
      mediaUrl: item.imagem_url,
      quickReplyTitle: 'Catálogo'
    };
    onContentChange([...contentItems, newItem]);
  };

  const addAnexo = (item: AnexoItem) => {
    const newItem: ContentItem = {
      id: `anexo-${Date.now()}`,
      type: 'text',
      content: `📎 Anexo: ${item.nome}`,
      mediaUrl: item.url,
      quickReplyTitle: 'Anexo'
    };
    onContentChange([...contentItems, newItem]);
  };

  const removeItem = (id: string) => {
    onContentChange(contentItems.filter(item => item.id !== id));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...contentItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    onContentChange(newItems);
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

  const handleAnexoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadAnexo) return;

    setUploadingAnexo(true);
    const uploaded = await onUploadAnexo(file);
    if (uploaded) {
      addAnexo(uploaded);
    }
    setUploadingAnexo(false);
    if (anexoInputRef.current) {
      anexoInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Painel de Seleção */}
        <div className="border rounded-lg">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full rounded-none border-b grid grid-cols-5">
              <TabsTrigger value="templates" className="gap-1 text-xs px-1">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-1 text-xs px-1">
                <Type className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Texto</span>
              </TabsTrigger>
              <TabsTrigger value="media" className="gap-1 text-xs px-1">
                <Image className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mídia</span>
              </TabsTrigger>
              <TabsTrigger value="catalogo" className="gap-1 text-xs px-1">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Catálogo</span>
              </TabsTrigger>
              <TabsTrigger value="anexos" className="gap-1 text-xs px-1">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Anexos</span>
              </TabsTrigger>
            </TabsList>

            {/* Templates Tab */}
            <TabsContent value="templates" className="p-0">
              <ScrollArea className="h-[350px]">
                <div className="p-4 space-y-2">
                  {templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum template cadastrado</p>
                      <p className="text-sm mt-1">
                        Configure templates em Configurações → Envio em Massa
                      </p>
                    </div>
                  ) : (
                    templates.map(template => (
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
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 bg-muted/50 p-2 rounded">
                              {template.conteudo}
                            </p>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Text Tab */}
            <TabsContent value="text" className="p-4 space-y-4">
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
            <TabsContent value="media" className="p-0">
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
              <ScrollArea className="h-[300px]">
                <div className="p-4 grid grid-cols-3 gap-2">
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
                            <Play className="h-8 w-8 text-white" />
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
                    <div className="col-span-3 text-center py-8 text-muted-foreground">
                      <Image className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhuma mídia disponível</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Catálogo Tab */}
            <TabsContent value="catalogo" className="p-0">
              <ScrollArea className="h-[350px]">
                <div className="p-4 space-y-2">
                  {catalogos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum item de catálogo disponível</p>
                      <p className="text-sm mt-1">
                        Configure seus produtos em Catálogos
                      </p>
                    </div>
                  ) : (
                    catalogos.map(item => (
                      <Card
                        key={item.id}
                        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors hover:shadow-sm"
                        onClick={() => addCatalogo(item)}
                      >
                        <div className="flex items-start gap-3">
                          {item.imagem_url ? (
                            <img
                              src={item.imagem_url}
                              alt={item.nome}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{item.nome}</p>
                            {item.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.descricao}
                              </p>
                            )}
                            {item.preco && (
                              <Badge variant="secondary" className="mt-1">
                                R$ {item.preco.toFixed(2)}
                              </Badge>
                            )}
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
            <TabsContent value="anexos" className="p-0">
              <div className="p-4 border-b">
                <input
                  ref={anexoInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                  onChange={handleAnexoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => anexoInputRef.current?.click()}
                  disabled={uploadingAnexo || !onUploadAnexo}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingAnexo ? 'Enviando...' : 'Enviar novo anexo'}
                </Button>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="p-4 space-y-2">
                  {anexos.map(item => (
                    <Card
                      key={item.id}
                      className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => addAnexo(item)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <File className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{item.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.tipo.toUpperCase()}
                            {item.tamanho && ` • ${(item.tamanho / 1024).toFixed(1)} KB`}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  ))}
                  {anexos.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Paperclip className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum anexo disponível</p>
                      <p className="text-sm mt-1">
                        Envie arquivos clicando no botão acima
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview da Sequência */}
        <div className="border rounded-lg">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="font-medium flex items-center gap-2">
              Sequência de Envio
              <Badge variant="outline">{contentItems.length} itens</Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Arraste para reordenar a sequência de mensagens
            </p>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-2">
              {contentItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Plus className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Adicione itens à sequência</p>
                  <p className="text-sm">Templates, textos, frases prontas ou mídias</p>
                </div>
              ) : (
                contentItems.map((item, index) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        {item.type === 'text' && (
                          <div>
                            <Badge variant="outline" className="mb-1">
                              {item.quickReplyTitle ? 'Template' : 'Texto'}
                            </Badge>
                            {item.quickReplyTitle && (
                              <p className="text-xs font-medium text-primary mb-1">
                                {item.quickReplyTitle}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{item.content}</p>
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
                            <div className="w-16 h-16 rounded overflow-hidden bg-muted shrink-0">
                              {item.type === 'video' ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                  {item.mediaThumbnail ? (
                                    <img
                                      src={item.mediaThumbnail}
                                      alt={item.content}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Video className="h-6 w-6 text-muted-foreground" />
                                  )}
                                  <Play className="absolute h-4 w-4 text-white" />
                                </div>
                              ) : (
                                <img
                                  src={item.mediaUrl}
                                  alt={item.content}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <Badge variant="outline" className="mb-1">
                                {item.type === 'video' ? 'Vídeo' : 'Imagem'}
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
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
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
