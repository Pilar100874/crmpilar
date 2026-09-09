// Bloco de texto livre: títulos, avisos ou legendas no painel.
import { Bloco } from "@/lib/automacao/api";

export const FONTES_TEXTO = [
  { valor: "system", rotulo: "Padrão do sistema", css: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { valor: "inter", rotulo: "Inter (moderna)", css: "Inter, system-ui, sans-serif" },
  { valor: "arial", rotulo: "Arial", css: "Arial, Helvetica, sans-serif" },
  { valor: "georgia", rotulo: "Georgia (serifada)", css: "Georgia, 'Times New Roman', serif" },
  { valor: "times", rotulo: "Times New Roman", css: "'Times New Roman', Times, serif" },
  { valor: "courier", rotulo: "Courier (máquina)", css: "'Courier New', Courier, monospace" },
  { valor: "impact", rotulo: "Impact (impacto)", css: "Impact, 'Arial Black', sans-serif" },
  { valor: "comic", rotulo: "Comic Sans", css: "'Comic Sans MS', 'Comic Sans', cursive" },
  { valor: "trebuchet", rotulo: "Trebuchet", css: "'Trebuchet MS', sans-serif" },
  { valor: "verdana", rotulo: "Verdana", css: "Verdana, Geneva, sans-serif" },
];

export function fonteCss(valor?: string) {
  return FONTES_TEXTO.find((f) => f.valor === valor)?.css ?? FONTES_TEXTO[0].css;
}

export default function BlocoTexto({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as {
    texto?: string;
    tamanho?: number;
    negrito?: boolean;
    italico?: boolean;
    sublinhado?: boolean;
    cor?: string;
    fonte?: string;
    sombra?: boolean;
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
          fontStyle: cfg.italico ? "italic" : "normal",
          textDecoration: cfg.sublinhado ? "underline" : "none",
          fontFamily: fonteCss(cfg.fonte),
          textShadow: cfg.sombra ? "0 2px 6px rgba(0,0,0,0.55)" : undefined,
          color: cfg.cor || "hsl(var(--foreground))",
          textAlign: alinhar,
        }}
      >

        {texto}
      </p>
    </div>
  );
}
