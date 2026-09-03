import { useEffect, useState } from "react";
import { PanelRight, Phone, Smartphone } from "lucide-react";
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
  const [modo, setModo] = useState<"popup" | "painel">(
    () => (localStorage.getItem("pilarSipModo") as "popup" | "painel") || "popup",
  );
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
    localStorage.setItem("pilarSipModo", modo);
  }, [modo]);

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


      {/* Botão para alternar o modo de abertura */}
      <button
        type="button"
        aria-label={modo === "popup" ? "Abrir como painel lateral" : "Abrir como popup"}
        title={modo === "popup" ? "Abrir como painel lateral" : "Abrir como popup"}
        onClick={() => setModo(modo === "popup" ? "painel" : "popup")}
        className="fixed right-0 z-[502] flex h-6 w-6 items-center justify-center rounded-l-md bg-emerald-800 text-white/90 shadow-md transition hover:bg-emerald-900"
        style={{ bottom: "calc(15% + 132px)" }}
      >
        {modo === "popup" ? <PanelRight className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
      </button>

      {modo === "popup" ? (
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
      ) : (
        <div className={`sip-slide-menu ${aberto ? "open" : ""}`} aria-hidden={!aberto}>
          <div className="relative h-full w-full overflow-hidden">
            <PilarFone
              embedded
              initialNumber={numeroInicial}
              serverConfig={servidores}
              mostrarInterfone={false}
              onAbrirInterfone={() => undefined}
              onFechar={() => setAberto(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
