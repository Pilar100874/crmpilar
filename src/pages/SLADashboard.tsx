import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import SLADashboard from "@/components/atendimento/SLADashboard";
import { toast } from "@/lib/toast-config";

export default function SLADashboardPage() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEstabelecimento = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Usuário não autenticado");
          return;
        }

        const { data: usuario } = await supabase
          .from("usuarios")
          .select("estabelecimento_id")
          .eq("email", user.email)
          .single();

        if (usuario?.estabelecimento_id) {
          setEstabelecimentoId(usuario.estabelecimento_id);
        }
      } catch (error) {
        console.error("Erro ao carregar estabelecimento:", error);
        toast.error("Erro ao carregar estabelecimento");
      } finally {
        setIsLoading(false);
      }
    };

    loadEstabelecimento();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!estabelecimentoId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">
          Nenhum estabelecimento encontrado
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <SLADashboard estabelecimentoId={estabelecimentoId} />
    </div>
  );
}
