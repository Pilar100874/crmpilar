import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BotaoAbrirAcesso, { AcessoCard } from "@/components/portaria/BotaoAbrirAcesso";

export default function PortariaAcessos() {
  const [acessos, setAcessos] = useState<AcessoCard[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("port_access_points")
      .select("id, nome, tipo, confirmar_abertura, ordem, device:port_devices(id, nome, status, habilitado, ultima_comunicacao)")
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    setAcessos((data ?? []) as unknown as AcessoCard[]);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Acessos</h2>
        <p className="text-sm text-muted-foreground">
          Somente os acessos autorizados para o seu perfil são liberados — a permissão é revalidada no servidor.
        </p>
      </div>

      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : acessos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum ponto de acesso disponível.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {acessos.map((a) => <BotaoAbrirAcesso key={a.id} acesso={a} onAberto={carregar} />)}
        </div>
      )}
    </div>
  );
}
