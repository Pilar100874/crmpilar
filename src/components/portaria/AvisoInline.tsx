import { AlertTriangle, Info } from "lucide-react";

interface Props {
  tipo?: "erro" | "aviso";
  children: React.ReactNode;
  className?: string;
}

/** Banner inline elegante para erros e avisos nas telas escuras da portaria. */
export default function AvisoInline({ tipo = "erro", children, className = "" }: Props) {
  const erro = tipo === "erro";
  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-sm shadow-lg backdrop-blur ${
        erro
          ? "border-red-400/30 bg-gradient-to-r from-red-500/15 to-red-500/5 text-red-200 shadow-red-500/10"
          : "border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-amber-200 shadow-amber-500/10"
      } ${className}`}
    >
      {erro ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      )}
      <span className="leading-snug">{children}</span>
    </div>
  );
}
