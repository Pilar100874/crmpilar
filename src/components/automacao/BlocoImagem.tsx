// Bloco de imagem (planta da casa, foto do ambiente, etc.).
import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Bloco } from "@/lib/automacao/api";

export default function BlocoImagem({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as {
    url?: string;
    caminho?: string;
    ajuste?: "cobrir" | "conter";
    mostrar_nome?: boolean;
    opacidade?: number;
    transparente?: boolean;
  };
  const [src, setSrc] = useState<string | null>(cfg.url ?? null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (cfg.url) return setSrc(cfg.url);
      if (!cfg.caminho) return setSrc(null);
      const { data } = await supabase.storage.from("automacao").createSignedUrl(cfg.caminho, 60 * 60 * 8);
      if (vivo) setSrc(data?.signedUrl ?? null);
    })();
    return () => { vivo = false; };
  }, [cfg.url, cfg.caminho]);

  if (!src) {
    return (
      <div className="h-full rounded-2xl border border-dashed bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground">
        <ImageIcon className="h-6 w-6 opacity-50" />
        <p className="text-xs">Escolha uma imagem</p>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full overflow-hidden rounded-2xl", cfg.transparente ? "border-0 bg-transparent" : "border bg-card")}>
      <img
        src={src}
        alt={bloco.nome}
        loading="lazy"
        className={cn("h-full w-full", cfg.ajuste === "conter" ? "object-contain" : "object-cover")}
        style={{ opacity: (cfg.opacidade ?? 100) / 100 }}
      />
      {cfg.mostrar_nome && (
        <span className="absolute left-2 bottom-2 rounded-md bg-background/70 px-2 py-0.5 text-[11px] backdrop-blur">
          {bloco.nome}
        </span>
      )}
    </div>
  );
}
