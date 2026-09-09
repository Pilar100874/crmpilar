import { useState } from "react";
import { Bell, Video } from "lucide-react";
import { Bloco } from "@/lib/automacao/api";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { useInterfoneConfig, useCampainha, tocarAlerta } from "@/lib/portaria/interfone";
import InterfonePopup from "@/components/portaria/InterfonePopup";
import { cn } from "@/lib/utils";

/** Abre a tela cheia do interfone e avisa quando alguém toca a campainha. */
export default function BlocoInterfone({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as { abrir_ao_tocar?: boolean; som?: boolean };
  const { unidadeId } = useUnidadeAtual();
  const { config } = useInterfoneConfig(unidadeId);
  const [aberto, setAberto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [toqueId, setToqueId] = useState<string | undefined>();

  useCampainha(unidadeId, true, (toque) => {
    setTocando(true);
    setToqueId(toque?.id);
    if (cfg.som !== false) tocarAlerta();
    if (cfg.abrir_ao_tocar !== false) setAberto(true);
    setTimeout(() => setTocando(false), 20000);
  });

  return (
    <>
      <button
        type="button"
        onClick={() => { setTocando(false); setAberto(true); }}
        className={cn(
          "h-full w-full overflow-hidden rounded-2xl border p-3 text-left transition-colors",
          tocando ? "animate-pulse border-primary bg-primary/20" : "border-border bg-card hover:border-primary/50",
        )}
      >
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            {tocando ? <Bell className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </span>
          <p className="truncate text-sm font-semibold">{bloco.nome || "Interfone"}</p>
          <p className="text-[11px] text-muted-foreground">
            {tocando ? "Campainha tocando — toque para atender" : "Toque para ver as câmeras e abrir"}
          </p>
        </div>
      </button>

      <InterfonePopup
        aberto={aberto}
        onFechar={() => setAberto(false)}
        config={config}
        unidadeId={unidadeId}
        toqueId={toqueId}
      />
    </>
  );
}
