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

      // Buscar ID do usuário na tabela usuarios por auth_user_id
      const { data: userData } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!userData?.id) return;

      const { data, error } = await supabase
        .from("user_atalhos")
        .select("*")
        .eq("usuario_id", userData.id)
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

      // Buscar id e estabelecimento_id do usuário por auth_user_id
      const { data: userData } = await supabase
        .from("usuarios")
        .select("id, estabelecimento_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!userData?.id || !userData?.estabelecimento_id) {
        toast({
          title: "Erro",
          description: "Usuário ou estabelecimento não encontrado",
          variant: "destructive",
        });
        return;
      }

      const ordem = atalhos.length;

      const { error } = await supabase
        .from("user_atalhos")
        .insert({
          usuario_id: userData.id,
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

      // Força recarregamento imediato
      await loadAtalhos();
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

      // Buscar ID do usuário na tabela usuarios por auth_user_id
      const { data: userData } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!userData?.id) return;

      const { error } = await supabase
        .from("user_atalhos")
        .delete()
        .eq("usuario_id", userData.id)
        .eq("path", path);

      if (error) throw error;

      toast({
        title: "Atalho removido",
        description: "O atalho foi removido da sua lista",
      });

      // Força recarregamento imediato
      await loadAtalhos();
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
      .channel(`user_atalhos_changes_${Math.random().toString(36).slice(2)}`)
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
