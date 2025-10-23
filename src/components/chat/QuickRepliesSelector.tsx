import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface QuickReply {
  id: string;
  title: string;
  content: string;
  is_global: boolean;
  shortcut?: string | null;
}

interface QuickRepliesSelectorProps {
  onSelect: (content: string) => void;
  disabled?: boolean;
}

export default function QuickRepliesSelector({ onSelect, disabled }: QuickRepliesSelectorProps) {
  const [open, setOpen] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);

  useEffect(() => {
    if (open) {
      loadQuickReplies();
    }
  }, [open]);

  const loadQuickReplies = async () => {
    const { data, error } = await supabase
      .from("quick_replies")
      .select("*")
      .order("is_global", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar textos prontos");
      return;
    }
    setQuickReplies(data || []);
  };

  const handleSelect = (content: string) => {
    onSelect(content);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          title="Textos prontos"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold">Textos Prontos</h4>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-2">
            {quickReplies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum texto pronto cadastrado
              </p>
            ) : (
              quickReplies.map((reply) => (
                <Card
                  key={reply.id}
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelect(reply.content)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {reply.shortcut && (
                          <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
                            {reply.shortcut}
                          </span>
                        )}
                        <h5 className="font-medium text-sm">{reply.title}</h5>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {reply.content}
                      </p>
                    </div>
                    {reply.is_global && (
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
      </PopoverContent>
    </Popover>
  );
}
