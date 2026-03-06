import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { toast } from "@/lib/toast-config";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const toolbarBtnClass = "h-9 w-9 rounded-xl bg-card border border-border/30 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/50 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
const toolbarBtnActiveClass = "h-9 w-9 rounded-xl bg-primary/15 border border-primary/40 shadow-sm flex items-center justify-center text-primary hover:bg-primary/20 transition-all duration-200";

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
    const estabId = await getEstabelecimentoId();
    if (!estabId) {
      toast.error("Estabelecimento não identificado");
      return;
    }

    const { data, error } = await supabase
      .from("quick_replies")
      .select("*")
      .eq("estabelecimento_id", estabId)
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
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                disabled={disabled}
                className={open ? toolbarBtnActiveClass : toolbarBtnClass}
              >
                <MessageSquare size={18} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Textos prontos</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-0 rounded-xl shadow-xl border-border/50 z-[9999]" align="start" sideOffset={8}>
        <div className="p-3 border-b border-border/50 bg-muted/30 rounded-t-xl">
          <h4 className="font-semibold text-sm">Textos Prontos</h4>
        </div>
        <ScrollArea className="h-[280px]">
          <div className="p-2 space-y-1.5">
            {quickReplies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum texto pronto cadastrado
              </p>
            ) : (
              quickReplies.map((reply) => (
                <Card
                  key={reply.id}
                  className="p-2.5 cursor-pointer hover:bg-muted/50 transition-all duration-150 rounded-lg border-border/30 hover:border-border/50 hover:shadow-sm"
                  onClick={() => handleSelect(reply.content)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {reply.shortcut && (
                          <span className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                            {reply.shortcut}
                          </span>
                        )}
                        <h5 className="font-medium text-xs">{reply.title}</h5>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {reply.content}
                      </p>
                    </div>
                    {reply.is_global && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
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
