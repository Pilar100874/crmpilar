// Bloco de texto livre: títulos, avisos ou legendas no painel.
import { Bloco } from "@/lib/automacao/api";

export default function BlocoTexto({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as {
    texto?: string;
    tamanho?: number;
    negrito?: boolean;
    cor?: string;
    alinhamento?: "left" | "center" | "right";
    vertical?: "start" | "center" | "end";
    fundo?: string;
  };
  const texto = cfg.texto ?? bloco.nome ?? "Escreva o texto";
  const alinhar = cfg.alinhamento ?? "left";
  const vertical = cfg.vertical ?? "center";

  return (
    <div
      className="flex h-full w-full overflow-hidden p-3"
      style={{
        background: cfg.fundo || "transparent",
        justifyContent: alinhar === "center" ? "center" : alinhar === "right" ? "flex-end" : "flex-start",
        alignItems: vertical === "center" ? "center" : vertical === "end" ? "flex-end" : "flex-start",
      }}
    >
      <p
        className="whitespace-pre-wrap break-words leading-tight"
        style={{
          fontSize: Math.max(8, Number(cfg.tamanho ?? 20)),
          fontWeight: cfg.negrito === false ? 400 : 700,
          color: cfg.cor || "hsl(var(--foreground))",
          textAlign: alinhar,
        }}
      >
        {texto}
      </p>
    </div>
  );
}
