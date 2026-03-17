import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon, FileUp, Image as ImageIcon, FileText, FileSpreadsheet, ZoomIn, File, Search, X, Video, Play } from "lucide-react";
import { getFileTypeIcon } from "@/lib/imageUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/toast-config";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const toolbarBtnClass = "h-9 w-9 rounded-xl bg-card border border-border/30 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/50 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
const toolbarBtnActiveClass = "h-9 w-9 rounded-xl bg-primary/15 border border-primary/40 shadow-sm flex items-center justify-center text-primary hover:bg-primary/20 transition-all duration-200";

interface QuickAttachment {
  id: string;
  title: string;
  type: "link" | "file";
  url: string;
  is_global: boolean;
  file_type?: string | null;
  thumbnail_url?: string | null;
}

interface GalleryMediaItem {
  id: string;
  nome: string;
  tipo: string;
  public_url: string;
  thumbnail_url: string | null;
}

interface QuickAttachmentsSelectorProps {
  onSelect: (attachment: QuickAttachment) => void;
  disabled?: boolean;
}

export default function QuickAttachmentsSelector({ onSelect, disabled }: QuickAttachmentsSelectorProps) {
  const [open, setOpen] = useState(false);
  const [quickAttachments, setQuickAttachments] = useState<QuickAttachment[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryMediaItem[]>([]);
  const [galleryVideos, setGalleryVideos] = useState<GalleryMediaItem[]>([]);
  const [previewImage, setPreviewImage] = useState<QuickAttachment | null>(null);
  const [previewVideo, setPreviewVideo] = useState<GalleryMediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      loadQuickAttachments();
      loadGalleryMedia();
    }
  }, [open]);

  const loadQuickAttachments = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) {
      toast.error("Estabelecimento não identificado");
      return;
    }

    const { data, error } = await supabase
      .from("quick_attachments")
      .select("*")
      .eq("estabelecimento_id", estabId)
      .order("is_global", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar anexos rápidos");
      return;
    }
    setQuickAttachments((data || []) as QuickAttachment[]);
  };

  const loadGalleryMedia = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) return;

    const { data, error } = await (supabase
      .from("media_gallery")
      .select("id, nome, tipo, public_url, thumbnail_url")
      .eq("estabelecimento_id", estabId) as any)
      .eq("disponivel_chat", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar galeria:", error);
      return;
    }

    const items = (data || []) as GalleryMediaItem[];
    setGalleryImages(items.filter(i => i.tipo === 'image'));
    setGalleryVideos(items.filter(i => i.tipo === 'video'));
  };

  const handleSelect = (attachment: QuickAttachment) => {
    onSelect(attachment);
    setOpen(false);
    setPreviewImage(null);
    toast.success(`${attachment.title} selecionado`);
  };

  const handleGallerySelect = (item: GalleryMediaItem) => {
    const asAttachment: QuickAttachment = {
      id: item.id,
      title: item.nome,
      type: 'file',
      url: item.public_url,
      is_global: false,
      file_type: item.tipo === 'video' ? 'video' : 'image',
      thumbnail_url: item.thumbnail_url,
    };
    onSelect(asAttachment);
    setOpen(false);
    setPreviewVideo(null);
    toast.success(`${item.nome} selecionado`);
  };

  const handleImageClick = (attachment: QuickAttachment) => {
    if (attachment.file_type === "image") {
      setPreviewImage(attachment);
    } else {
      handleSelect(attachment);
    }
  };

  // Filter by search query
  const filteredAttachments = quickAttachments.filter((attachment) =>
    attachment.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGalleryImages = galleryImages.filter(i =>
    i.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGalleryVideos = galleryVideos.filter(i =>
    i.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const links = filteredAttachments.filter((a) => a.type === "link");
  const files = filteredAttachments.filter((a) => a.type === "file");
  
  // Separate files by type
  const images = files.filter((f) => f.file_type === "image");
  const pdfs = files.filter((f) => f.file_type === "pdf");
  const excels = files.filter((f) => f.file_type === "excel");
  const words = files.filter((f) => f.file_type === "word");
  const others = files.filter((f) => !f.file_type);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  disabled={disabled}
                  className={open ? toolbarBtnActiveClass : toolbarBtnClass}
                >
                  <LinkIcon size={20} />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Anexos rápidos</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[500px] p-0 rounded-2xl z-[9999]" align="start" sideOffset={8}>
          <div className="p-4 border-b bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-lg">📎 Anexos Rápidos</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione um anexo para inserir na conversa
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pesquisar anexos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-full"
              />
            </div>
          </div>
          <Tabs defaultValue="gallery-images" className="w-full">
            <TabsList className="w-full grid grid-cols-4 rounded-none border-b">
              <TabsTrigger value="gallery-images" className="gap-1.5 text-xs">
                <ImageIcon className="h-3.5 w-3.5" />
                Imagens ({filteredGalleryImages.length})
              </TabsTrigger>
              <TabsTrigger value="gallery-videos" className="gap-1.5 text-xs">
                <Video className="h-3.5 w-3.5" />
                Vídeos ({filteredGalleryVideos.length})
              </TabsTrigger>
              <TabsTrigger value="links" className="gap-1.5 text-xs">
                <LinkIcon className="h-3.5 w-3.5" />
                Links ({links.length})
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1.5 text-xs">
                <FileUp className="h-3.5 w-3.5" />
                Arquivos ({files.length})
              </TabsTrigger>
            </TabsList>

          {/* Gallery Images Tab */}
          <TabsContent value="gallery-images" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="p-3">
                {filteredGalleryImages.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma imagem habilitada para o chat
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Habilite imagens na Galeria de Conteúdo do Marketing
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredGalleryImages.map((item) => (
                      <Card
                        key={item.id}
                        className="group relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 rounded-2xl"
                        onClick={() => handleGallerySelect(item)}
                      >
                        <div className="aspect-square relative">
                          <img 
                            src={item.thumbnail_url || item.public_url} 
                            alt={item.nome}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <div className="p-2 border-t bg-background">
                          <p className="text-xs font-medium truncate">{item.nome}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Gallery Videos Tab */}
          <TabsContent value="gallery-videos" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="p-3">
                {filteredGalleryVideos.length === 0 ? (
                  <div className="text-center py-12">
                    <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum vídeo habilitado para o chat
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Habilite vídeos na Galeria de Conteúdo do Marketing
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredGalleryVideos.map((item) => (
                      <Card
                        key={item.id}
                        className="group relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 rounded-2xl"
                        onClick={() => {
                          setPreviewVideo(item);
                        }}
                      >
                        <div className="aspect-video relative bg-black">
                          {item.thumbnail_url ? (
                            <img 
                              src={item.thumbnail_url} 
                              alt={item.nome}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video 
                              src={item.public_url}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="h-8 w-8 text-white fill-white" />
                          </div>
                        </div>
                        <div className="p-2 border-t bg-background">
                          <p className="text-xs font-medium truncate">{item.nome}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="links" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="p-3 space-y-2">
                {links.length === 0 ? (
                  <div className="text-center py-12">
                    <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum link cadastrado
                    </p>
                  </div>
                ) : (
                  links.map((attachment) => (
                    <Card
                      key={attachment.id}
                      className="p-3 cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary rounded-2xl"
                      onClick={() => handleSelect(attachment)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <LinkIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-sm mb-1">{attachment.title}</h5>
                          </div>
                        </div>
                        {attachment.is_global && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                            Global
                          </span>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="files" className="mt-0">
            <Tabs defaultValue={images.length > 0 ? "images" : pdfs.length > 0 ? "pdfs" : "all"} className="w-full">
              <TabsList className="w-full grid grid-cols-5 rounded-none border-b h-auto p-1">
                <TabsTrigger value="images" className="text-xs gap-1 py-2" disabled={images.length === 0}>
                  <ImageIcon className="h-3 w-3" />
                  {images.length}
                </TabsTrigger>
                <TabsTrigger value="pdfs" className="text-xs gap-1 py-2" disabled={pdfs.length === 0}>
                  <FileText className="h-3 w-3" />
                  {pdfs.length}
                </TabsTrigger>
                <TabsTrigger value="excel" className="text-xs gap-1 py-2" disabled={excels.length === 0}>
                  <FileSpreadsheet className="h-3 w-3" />
                  {excels.length}
                </TabsTrigger>
                <TabsTrigger value="word" className="text-xs gap-1 py-2" disabled={words.length === 0}>
                  <File className="h-3 w-3" />
                  {words.length}
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs gap-1 py-2">
                  Todos
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[350px]">
                <TabsContent value="images" className="mt-0 p-3">
                  {images.length === 0 ? (
                    <div className="text-center py-12">
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">Nenhuma imagem</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {images.map((attachment) => (
                        <Card
                          key={attachment.id}
                          className="group relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 rounded-2xl"
                          onClick={() => handleImageClick(attachment)}
                        >
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
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="h-8 w-8 text-white" />
                            </div>
                            {attachment.is_global && (
                              <span className="absolute top-2 right-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">
                                Global
                              </span>
                            )}
                          </div>
                          <div className="p-2 border-t bg-background">
                            <p className="text-xs font-medium truncate">{attachment.title}</p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pdfs" className="mt-0 p-3 space-y-2">
                  {pdfs.map((attachment) => (
                    <Card
                      key={attachment.id}
                      className="p-3 cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all duration-200 border-l-4 border-l-red-500/20 hover:border-l-red-500 rounded-2xl"
                      onClick={() => handleSelect(attachment)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-sm mb-1">{attachment.title}</h5>
                        </div>
                      </div>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="excel" className="mt-0 p-3 space-y-2">
                  {excels.map((attachment) => (
                    <Card
                      key={attachment.id}
                      className="p-3 cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500/20 hover:border-l-green-500 rounded-2xl"
                      onClick={() => handleSelect(attachment)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-green-500/10 flex items-center justify-center">
                          <FileSpreadsheet className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-sm mb-1">{attachment.title}</h5>
                        </div>
                        {attachment.is_global && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            Global
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="word" className="mt-0 p-3 space-y-2">
                  {words.map((attachment) => (
                    <Card
                      key={attachment.id}
                      className="p-3 cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500/20 hover:border-l-blue-500 rounded-2xl"
                      onClick={() => handleSelect(attachment)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                          <File className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-sm mb-1">{attachment.title}</h5>
                        </div>
                        {attachment.is_global && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            Global
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="all" className="mt-0 p-3 space-y-3">
                  {files.length === 0 ? (
                    <div className="text-center py-12">
                      <FileUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">Nenhum arquivo cadastrado</p>
                    </div>
                  ) : (
                    <>
                      {images.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            IMAGENS ({images.length})
                          </h5>
                          <div className="grid grid-cols-2 gap-2">
                            {images.map((attachment) => (
                              <Card
                                key={attachment.id}
                                className="group relative overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 rounded-2xl"
                                onClick={() => handleImageClick(attachment)}
                              >
                                <div className="aspect-square relative">
                                  {attachment.thumbnail_url || attachment.url ? (
                                    <img 
                                      src={attachment.thumbnail_url || attachment.url} 
                                      alt={attachment.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ZoomIn className="h-6 w-6 text-white" />
                                  </div>
                                </div>
                                <div className="p-2 border-t bg-background">
                                  <p className="text-xs font-medium truncate">{attachment.title}</p>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {pdfs.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            PDFs ({pdfs.length})
                          </h5>
                          <div className="space-y-2">
                            {pdfs.map((attachment) => (
                              <Card
                                key={attachment.id}
                                className="p-2 cursor-pointer hover:bg-muted/50 transition-colors border-l-2 border-l-red-500/20 rounded-2xl"
                                onClick={() => handleSelect(attachment)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                    <FileText className="h-4 w-4 text-red-500" />
                                  </div>
                                  <p className="text-xs font-medium truncate flex-1">{attachment.title}</p>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {excels.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            EXCEL ({excels.length})
                          </h5>
                          <div className="space-y-2">
                            {excels.map((attachment) => (
                              <Card
                                key={attachment.id}
                                className="p-2 cursor-pointer hover:bg-muted/50 transition-colors border-l-2 border-l-green-500/20 rounded-2xl"
                                onClick={() => handleSelect(attachment)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-2xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                    <FileSpreadsheet className="h-4 w-4 text-green-500" />
                                  </div>
                                  <p className="text-xs font-medium truncate flex-1">{attachment.title}</p>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {words.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-2">
                            <File className="h-4 w-4" />
                            WORD ({words.length})
                          </h5>
                          <div className="space-y-2">
                            {words.map((attachment) => (
                              <Card
                                key={attachment.id}
                                className="p-2 cursor-pointer hover:bg-muted/50 transition-colors border-l-2 border-l-blue-500/20 rounded-2xl"
                                onClick={() => handleSelect(attachment)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-2xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <File className="h-4 w-4 text-blue-500" />
                                  </div>
                                  <p className="text-xs font-medium truncate flex-1">{attachment.title}</p>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {others.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-muted-foreground mb-2">OUTROS ({others.length})</h5>
                          <div className="space-y-2">
                            {others.map((attachment) => (
                              <Card
                                key={attachment.id}
                                className="p-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-2xl"
                                onClick={() => handleSelect(attachment)}
                              >
                                <p className="text-xs font-medium truncate">{attachment.title}</p>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>

    <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
      <DialogContent className="max-w-3xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>{previewImage?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-muted">
            <img
              src={previewImage?.url}
              alt={previewImage?.title}
              className="w-full h-auto max-h-[60vh] object-contain"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setPreviewImage(null)} className="rounded-full">
              Cancelar
            </Button>
            <Button onClick={() => previewImage && handleSelect(previewImage)} className="rounded-full">
              Inserir Imagem
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
