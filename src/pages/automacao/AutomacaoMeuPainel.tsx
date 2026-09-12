import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TipoTela, detectarTipoTela } from "@/lib/automacao/api";

/**
 * Abertura do aplicativo Pilar Automação.
 * Exige entrada com usuário e senha e, em seguida, abre apenas o painel
 * que foi definido para aquela pessoa (um para celular e outro para tablet).
 */
export default function AutomacaoMeuPainel() {
  const [params] = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;

      if (!data.session) {
        window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      const tipo = ((params.get("tipo") as TipoTela) || detectarTipoTela()) === "tablet" ? "tablet" : "celular";

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("automacao_ambiente_celular, automacao_ambiente_tablet")
        .eq("auth_user_id", data.session.user.id)
        .maybeSingle();

      if (!ativo) return;

      const ambiente = tipo === "tablet"
        ? usuario?.automacao_ambiente_tablet
        : usuario?.automacao_ambiente_celular;

      if (!ambiente) {
        setErro("Nenhum painel foi definido para você neste tipo de aparelho. Peça ao responsável para escolher o painel em Configurações → Usuários.");
        return;
      }

      const barra = params.get("barra") ?? "0";
      window.location.replace(`/automacao/tela?ambiente=${ambiente}&tipo=${tipo}&barra=${barra}&app=1`);
    })();

    return () => { ativo = false; };
  }, [params]);

  if (erro) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-lg font-semibold text-foreground">Painel não definido</h1>
          <p className="text-sm text-muted-foreground">{erro}</p>
          <button
            className="rounded-md border px-4 py-2 text-sm text-foreground"
            onClick={() => window.location.reload()}
          >
            Tentar de novo
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
