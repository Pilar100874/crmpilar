import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EVENTO_ESTADO_CREDITOS,
  creditosPossivelmenteEsgotados,
  limparAvisoCreditos,
} from "@/lib/ai/creditosIA";

/**
 * Banner persistente no topo avisando que os créditos de IA acabaram,
 * evitando novas tentativas em outras telas.
 */
export default function BannerCreditosIA() {
  const [visivel, setVisivel] = useState(() => creditosPossivelmenteEsgotados());

  useEffect(() => {
    const atualizar = () => setVisivel(creditosPossivelmenteEsgotados());
    window.addEventListener(EVENTO_ESTADO_CREDITOS, atualizar);
    window.addEventListener("storage", atualizar);
    const t = setInterval(atualizar, 60_000);
    return () => {
      window.removeEventListener(EVENTO_ESTADO_CREDITOS, atualizar);
      window.removeEventListener("storage", atualizar);
      clearInterval(t);
    };
  }, []);

  if (!visivel) return null;

  return (
    <div className="sticky top-0 z-[60] w-full border-b border-destructive/30 bg-destructive/10 backdrop-blur supports-[backdrop-filter]:bg-destructive/10">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-3 py-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="min-w-0 flex-1 text-foreground">
          <span className="font-semibold">Sem créditos de IA.</span>{" "}
          <span className="text-muted-foreground">
            As funções de inteligência artificial estão indisponíveis em todo o sistema até que
            novos créditos sejam adicionados. Evite tentar novamente em outras telas.
          </span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => limparAvisoCreditos()}
        >
          Já adicionei créditos
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Ocultar aviso de créditos de IA"
          className="h-8 w-8 shrink-0"
          onClick={() => setVisivel(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
