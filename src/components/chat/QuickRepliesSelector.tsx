import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";
import { AnimatePresence, motion, Transition } from "framer-motion";
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

const buttonVariants = {
  initial: { gap: 0, paddingLeft: ".5rem", paddingRight: ".5rem" },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : 0,
    paddingLeft: isSelected ? "1rem" : ".5rem",
    paddingRight: isSelected ? "1rem" : ".5rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition: Transition = { delay: 0.1, type: "spring", bounce: 0, duration: 0.6 };

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
      <PopoverTrigger asChild>
        <motion.button
          variants={buttonVariants}
          initial={false}
          animate="animate"
          custom={open}
          disabled={disabled}
          transition={transition}
          title="Textos prontos"
          className={cn(
            "relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
            open
              ? "bg-muted text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <MessageSquare size={20} />
          <AnimatePresence initial={false}>
            {open && (
              <motion.span
                variants={spanVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                className="overflow-hidden whitespace-nowrap"
              >
                Textos Prontos
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl" align="end">
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
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-2xl"
                  onClick={() => handleSelect(reply.content)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {reply.shortcut && (
                          <span className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-full">
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
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
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
