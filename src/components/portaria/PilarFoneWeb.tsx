import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import PilarFone from "./PilarFone";

const EVENTO_ABRIR = "pilar-sip:abrir";

/** Abre o Pilar Sip em qualquer lugar do sistema (opcionalmente já com um número). */
export function abrirPilarSip(numero?: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR, { detail: { numero } }));
}

export default function PilarFoneWeb() {
  const [aberto, setAberto] = useState(false);
  const [numeroInicial, setNumeroInicial] = useState<string | undefined>();
  const [servidores, setServidores] = useState<{ servidor: string; servidorRemoto: string }>({
    servidor: "",
    servidorRemoto: "",
  });

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
      setServidores({ servidor: data.ucm_host ?? "", servidorRemoto: data.remote_ip ?? "" });
    })();
    return () => {
      ativo = false;
    };
  }, [aberto]);

  return (
    <>
      {/* Aba lateral (mesmo padrão do chat interno), logo acima dele */}
      <div
        className="sip-tab"
        role="button"
        tabIndex={0}
        aria-label="Abrir Pilar Sip"
        title="Pilar Sip"
        onClick={() => {
          setNumeroInicial(undefined);
          setAberto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setNumeroInicial(undefined);
            setAberto(true);
          }
        }}
      >
        <Phone className="w-3 h-3" />
      </div>


      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="w-[min(400px,calc(100vw-1.5rem))] max-w-none overflow-hidden rounded-[28px] border border-border/60 bg-[#0B141A] p-0 shadow-2xl">
          <DialogTitle className="sr-only">Pilar Sip</DialogTitle>
          <DialogDescription className="sr-only">
            Telefone SIP com agenda, discador e chamadas de voz e vídeo.
          </DialogDescription>
          <div className="relative h-[min(780px,calc(100dvh-3rem))] w-full overflow-hidden rounded-[28px]">
            <PilarFone
              embedded
              initialNumber={numeroInicial}
              serverConfig={servidores}
              mostrarInterfone={false}
              onAbrirInterfone={() => undefined}
              onFechar={() => setAberto(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
