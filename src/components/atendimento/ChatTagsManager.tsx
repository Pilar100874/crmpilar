import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { X, Plus, Tag } from "lucide-react";
import type { ChatTag, ChatTagAplicada } from "@/types/atendimento";

interface ChatTagsManagerProps {
  chatId: string;
  estabelecimentoId: string;
}

export const ChatTagsManager = ({ chatId, estabelecimentoId }: ChatTagsManagerProps) => {
  const [allTags, setAllTags] = useState<ChatTag[]>([]);
  const [appliedTags, setAppliedTags] = useState<(ChatTagAplicada & { tag: ChatTag })[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTags();
    loadAppliedTags();
  }, [chatId, estabelecimentoId]);

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_tags")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");

      if (error) throw error;
      setAllTags(data || []);
    } catch (error) {
      console.error("Erro ao carregar tags:", error);
    }
  };

  const loadAppliedTags = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_tags_aplicadas")
        .select("*, tag:chat_tags(*)")
        .eq("chat_id", chatId);

      if (error) throw error;
      setAppliedTags(data || []);
    } catch (error) {
      console.error("Erro ao carregar tags aplicadas:", error);
    }
  };

  const handleApplyTag = async (tagId: string) => {
    if (appliedTags.some(t => t.tag_id === tagId)) {
      toast.info("Tag já aplicada a este chat");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("chat_tags_aplicadas")
        .insert({
          chat_id: chatId,
          tag_id: tagId,
          aplicada_por: user?.id
        });

      if (error) throw error;

      toast.success("Tag aplicada com sucesso");
      loadAppliedTags();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao aplicar tag:", error);
      toast.error("Erro ao aplicar tag");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagAplicadaId: string) => {
    try {
      const { error } = await supabase
        .from("chat_tags_aplicadas")
        .delete()
        .eq("id", tagAplicadaId);

      if (error) throw error;

      toast.success("Tag removida com sucesso");
      loadAppliedTags();
    } catch (error) {
      console.error("Erro ao remover tag:", error);
      toast.error("Erro ao remover tag");
    }
  };

  const availableTags = allTags.filter(
    tag => !appliedTags.some(at => at.tag_id === tag.id)
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {appliedTags.map((tagAplicada) => (
        <Badge
          key={tagAplicada.id}
          variant="secondary"
          className="gap-1 pr-1"
          style={{ backgroundColor: tagAplicada.tag.cor || undefined }}
        >
          <Tag className="h-3 w-3" />
          {tagAplicada.tag.nome}
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => handleRemoveTag(tagAplicada.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {availableTags.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7">
              <Plus className="h-3 w-3 mr-1" />
              Adicionar Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar tag..." />
              <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
              <CommandGroup>
                {availableTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.nome}
                    onSelect={() => handleApplyTag(tag.id)}
                    disabled={loading}
                  >
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: tag.cor || "#64748b" }}
                    />
                    {tag.nome}
                    {tag.categoria && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {tag.categoria}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
