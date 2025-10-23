import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, FileUp, Image as ImageIcon, FileText, FileSpreadsheet } from "lucide-react";
import { getFileTypeIcon } from "@/lib/imageUtils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface QuickAttachment {
  id: string;
  title: string;
  type: "link" | "file";
  url: string;
  is_global: boolean;
  file_type?: string | null;
  thumbnail_url?: string | null;
}

interface QuickAttachmentsSelectorProps {
  onSelect: (attachment: QuickAttachment) => void;
  disabled?: boolean;
}

export default function QuickAttachmentsSelector({ onSelect, disabled }: QuickAttachmentsSelectorProps) {
  const [open, setOpen] = useState(false);
  const [quickAttachments, setQuickAttachments] = useState<QuickAttachment[]>([]);

  useEffect(() => {
    if (open) {
      loadQuickAttachments();
    }
  }, [open]);

  const loadQuickAttachments = async () => {
    const { data, error } = await supabase
      .from("quick_attachments")
      .select("*")
      .order("is_global", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar anexos rápidos");
      return;
    }
    setQuickAttachments((data || []) as QuickAttachment[]);
  };

  const handleSelect = (attachment: QuickAttachment) => {
    onSelect(attachment);
    setOpen(false);
    toast.success(`${attachment.title} selecionado`);
  };

  const links = quickAttachments.filter((a) => a.type === "link");
  const files = quickAttachments.filter((a) => a.type === "file");
  
  // Separate files by type
  const images = files.filter((f) => f.file_type === "image");
  const pdfs = files.filter((f) => f.file_type === "pdf");
  const excels = files.filter((f) => f.file_type === "excel");
  const words = files.filter((f) => f.file_type === "word");
  const others = files.filter((f) => !f.file_type);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          title="Anexos rápidos"
        >
          <LinkIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold">Anexos Rápidos</h4>
        </div>
        <Tabs defaultValue="links" className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-none">
            <TabsTrigger value="links">Links ({links.length})</TabsTrigger>
            <TabsTrigger value="files">Arquivos ({files.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="mt-0">
            <ScrollArea className="h-[300px]">
              <div className="p-2 space-y-2">
                {links.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum link cadastrado
                  </p>
                ) : (
                  links.map((attachment) => (
                    <Card
                      key={attachment.id}
                      className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSelect(attachment)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm">{attachment.title}</h5>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {attachment.url}
                          </p>
                        </div>
                        {attachment.is_global && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
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
            <ScrollArea className="h-[400px]">
              <div className="p-2 space-y-4">
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum arquivo cadastrado
                  </p>
                ) : (
                  <>
                    {images.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                          🖼️ IMAGENS ({images.length})
                        </h5>
                        <div className="space-y-2">
                          {images.map((attachment) => (
                            <Card
                              key={attachment.id}
                              className="p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleSelect(attachment)}
                            >
                              <div className="flex items-center gap-3">
                                {attachment.thumbnail_url ? (
                                  <img 
                                    src={attachment.thumbnail_url} 
                                    alt={attachment.title}
                                    className="h-12 w-12 object-cover rounded border flex-shrink-0"
                                  />
                                ) : (
                                  <div className="h-12 w-12 flex items-center justify-center bg-muted rounded border flex-shrink-0">
                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm truncate">{attachment.title}</h5>
                                  {attachment.is_global && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                      Global
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {pdfs.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                          📄 PDFs ({pdfs.length})
                        </h5>
                        <div className="space-y-2">
                          {pdfs.map((attachment) => (
                            <Card
                              key={attachment.id}
                              className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleSelect(attachment)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm">{attachment.title}</h5>
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {attachment.url}
                                  </p>
                                </div>
                                {attachment.is_global && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    Global
                                  </span>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {excels.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                          📊 EXCEL ({excels.length})
                        </h5>
                        <div className="space-y-2">
                          {excels.map((attachment) => (
                            <Card
                              key={attachment.id}
                              className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleSelect(attachment)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm">{attachment.title}</h5>
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {attachment.url}
                                  </p>
                                </div>
                                {attachment.is_global && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    Global
                                  </span>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {words.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                          📝 WORD ({words.length})
                        </h5>
                        <div className="space-y-2">
                          {words.map((attachment) => (
                            <Card
                              key={attachment.id}
                              className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleSelect(attachment)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm">{attachment.title}</h5>
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {attachment.url}
                                  </p>
                                </div>
                                {attachment.is_global && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    Global
                                  </span>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {others.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                          📎 OUTROS ({others.length})
                        </h5>
                        <div className="space-y-2">
                          {others.map((attachment) => (
                            <Card
                              key={attachment.id}
                              className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleSelect(attachment)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm">{attachment.title}</h5>
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {attachment.url}
                                  </p>
                                </div>
                                {attachment.is_global && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    Global
                                  </span>
                                )}
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
      </PopoverContent>
    </Popover>
  );
}
