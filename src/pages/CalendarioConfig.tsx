import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarioRegrasCRUD } from "@/components/config/CalendarioRegrasCRUD";
import { Calendar, Settings } from "lucide-react";

export default function CalendarioConfig() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("usuarios")
        .select("estabelecimento_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (data?.estabelecimento_id) setEstabelecimentoId(data.estabelecimento_id);
    })();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Configurações do Calendário
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1 flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          Regras e automações do seu calendário
        </p>
      </div>
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {estabelecimentoId ? (
          <CalendarioRegrasCRUD estabelecimentoId={estabelecimentoId} />
        ) : (
          <div className="text-sm text-muted-foreground">Carregando estabelecimento...</div>
        )}
      </div>
    </div>
  );
}
