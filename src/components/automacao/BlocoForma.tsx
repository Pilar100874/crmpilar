// Forma vetorial: retângulo, bola (círculo/elipse) ou losango desenhados no painel.
import { Bloco } from "@/lib/automacao/api";

export const FORMAS = [
  { valor: "retangulo", rotulo: "Retângulo" },
  { valor: "bola", rotulo: "Bola / círculo" },
  { valor: "losango", rotulo: "Losango" },
] as const;

export default function BlocoForma({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as {
    forma?: string;
    fundo?: string;
    borda_cor?: string;
    borda_espessura?: number;
    borda_estilo?: "solid" | "dashed" | "dotted";
    cantos?: number;
    opacidade?: number;
    sombra?: boolean;
  };

  const forma = cfg.forma ?? "retangulo";
  const espessura = Math.max(0, Number(cfg.borda_espessura ?? 2));
  const opacidade = Math.min(100, Math.max(0, Number(cfg.opacidade ?? 100))) / 100;

  const raio =
    forma === "bola" ? "9999px" : `${Math.max(0, Number(cfg.cantos ?? 12))}px`;

  return (
    <div className="flex h-full w-full items-center justify-center p-1">
      <div
        className="h-full w-full"
        style={{
          background: cfg.fundo || "transparent",
          border: espessura > 0 ? `${espessura}px ${cfg.borda_estilo ?? "solid"} ${cfg.borda_cor || "#ffffff"}` : "none",
          borderRadius: forma === "losango" ? 0 : raio,
          clipPath: forma === "losango" ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" : undefined,
          opacity: opacidade,
          boxShadow: cfg.sombra ? "0 8px 24px rgba(0,0,0,0.45)" : undefined,
        }}
      />
    </div>
  );
}
