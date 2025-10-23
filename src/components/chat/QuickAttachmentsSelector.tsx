import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, FileUp } from "lucide-react";
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
      <PopoverContent className="w-80 p-0" align="end">
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
            <ScrollArea className="h-[300px]">
              <div className="p-2 space-y-2">
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum arquivo cadastrado
                  </p>
                ) : (
                  files.map((attachment) => (
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
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
