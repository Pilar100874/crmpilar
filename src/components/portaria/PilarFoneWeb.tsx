import { useEffect, useState } from "react";
import { Phone, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import PilarFone from "./PilarFone";

const EVENTO_ABRIR = "pilar-sip:abrir";

export function abrirPilarSip(numero?: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR, { detail: { numero } }));
}

interface ServidoresEstabelecimento {
  servidor: string;
  servidorRemoto: string;
}

export default function PilarFoneWeb() {
  const [aberto, setAberto] = useState(false);
  const [numeroInicial, setNumeroInicial] = useState<string | undefined>();
  const [servidores, setServidores] = useState<ServidoresEstabelecimento>({ servidor: "", servidorRemoto: "" });

  useEffect(() => {
    const abrir = (event: Event) => {
      const detail = (event as CustomEvent<{ numero?: string }>).detail;
      setNumeroInicial(detail?.numero);
      setAberto(true);
    };
    window.addEventListener(EVENTO_ABRIR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR, abrir);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    void (async () => {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;
      const { data } = await supabase
        .from("ucm_config")
        .select("ucm_host, remote_ip")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();
      if (!ativo || !data) return;
      setServidores({
        servidor: data.ucm_host ?? "",
        servidorRemoto: data.remote_ip ?? "",
      });
    })();
    return () => {
      ativo = false;
    };
  }, [aberto]);

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => {
                setNumeroInicial(undefined);
                setAberto(true);
              }}
              aria-label="Abrir Pilar Sip"
              className="fixed bottom-4 right-16 z-[1000] h-10 w-10 rounded-full border-primary/30 bg-background/95 text-primary shadow-lg backdrop-blur hover:bg-accent"
            >
              <Phone className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Abrir Pilar Sip</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="w-[min(430px,calc(100vw-1rem))] max-w-none overflow-hidden rounded-[32px] border-border/70 bg-card p-0 shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
          <DialogTitle className="sr-only">Pilar Sip</DialogTitle>
          <DialogDescription className="sr-only">
            Telefone SIP com agenda, discador, chamadas de voz e vídeo.
          </DialogDescription>
          <div className="relative flex h-[min(860px,calc(100dvh-2rem))] w-full overflow-hidden rounded-[32px] border-8 border-foreground/10 bg-background shadow-inner">
            <div className="pointer-events-none absolute left-1/2 top-1 z-20 h-1.5 w-20 -translate-x-1/2 rounded-full bg-foreground/20" />
            <div className="pointer-events-none absolute bottom-1 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 text-[9px] text-muted-foreground/70">
              <Smartphone className="h-3 w-3" /> Pilar Sip
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <PilarFone
                embedded
                initialNumber={numeroInicial}
                serverConfig={servidores}
                mostrarInterfone={false}
                onAbrirInterfone={() => undefined}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
