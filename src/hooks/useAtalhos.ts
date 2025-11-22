import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Atalho {
  id: string;
  usuario_id: string;
  estabelecimento_id: string;
  titulo: string;
  icone: string;
  path: string;
  ordem: number;
  created_at: string;
}

export const useAtalhos = () => {
  const [atalhos, setAtalhos] = useState<Atalho[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadAtalhos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_atalhos")
        .select("*")
        .eq("usuario_id", user.id)
        .order("ordem", { ascending: true });

      if (error) throw error;
      setAtalhos(data || []);
    } catch (error) {
      console.error("Erro ao carregar atalhos:", error);
    } finally {
      setLoading(false);
    }
  };

  const adicionarAtalho = async (
    titulo: string,
    icone: string,
    path: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar estabelecimento_id do usuário
      const { data: userData } = await supabase
        .from("usuarios")
        .select("estabelecimento_id")
        .eq("id", user.id)
        .single();

      if (!userData?.estabelecimento_id) {
        toast({
          title: "Erro",
          description: "Estabelecimento não encontrado",
          variant: "destructive",
        });
        return;
      }

      const ordem = atalhos.length;

      const { error } = await supabase
        .from("user_atalhos")
        .insert({
          usuario_id: user.id,
          estabelecimento_id: userData.estabelecimento_id,
          titulo,
          icone,
          path,
          ordem,
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Atalho já existe",
            description: "Este atalho já está na sua lista",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Atalho adicionado",
        description: `"${titulo}" foi adicionado aos seus atalhos`,
      });

      loadAtalhos();
    } catch (error) {
      console.error("Erro ao adicionar atalho:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o atalho",
        variant: "destructive",
      });
    }
  };

  const removerAtalho = async (path: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_atalhos")
        .delete()
        .eq("usuario_id", user.id)
        .eq("path", path);

      if (error) throw error;

      toast({
        title: "Atalho removido",
        description: "O atalho foi removido da sua lista",
      });

      loadAtalhos();
    } catch (error) {
      console.error("Erro ao remover atalho:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o atalho",
        variant: "destructive",
      });
    }
  };

  const isAtalho = (path: string): boolean => {
    return atalhos.some((a) => a.path === path);
  };

  useEffect(() => {
    loadAtalhos();

    // Realtime subscription
    const channel = supabase
      .channel("user_atalhos_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_atalhos",
        },
        () => {
          loadAtalhos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    atalhos,
    loading,
    adicionarAtalho,
    removerAtalho,
    isAtalho,
    reloadAtalhos: loadAtalhos,
  };
};
