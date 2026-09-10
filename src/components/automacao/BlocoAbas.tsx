import { Bloco } from "@/lib/automacao/api";
import { useNavegacaoAmbientes } from "@/lib/automacao/navegacao";
import { cn } from "@/lib/utils";

interface Props {
  bloco: Bloco;
  edicao?: boolean;
}

/** Modelos de botão disponíveis para o elemento de abas. */
export const ESTILOS_ABAS = [
  { valor: "pilula", label: "Pílula (arredondada)" },
  { valor: "cartao", label: "Cartão" },
  { valor: "contorno", label: "Só contorno" },
  { valor: "texto", label: "Só texto" },
  { valor: "sublinhado", label: "Texto com traço embaixo" },
  { valor: "barra", label: "Barra dividida" },
] as const;

export default function BlocoAbas({ bloco, edicao }: Props) {
  const { ambientes, ambienteId, trocar } = useNavegacaoAmbientes();
  const cfg = (bloco.config ?? {}) as Record<string, any>;

  const modoBotao = cfg.modo === "botao";
  const somente: string[] = Array.isArray(cfg.ambientes) ? cfg.ambientes : [];

  // Em "botão único" mostra apenas o destino escolhido; em abas, mostra os
  // ambientes marcados (ou todos, se nada foi marcado), na ordem escolhida.
  const lista = modoBotao
    ? ambientes.filter((a) => a.id === cfg.destino)
    : somente.length
      ? somente.map((id) => ambientes.find((a) => a.id === id)).filter(Boolean) as typeof ambientes
      : ambientes;

  const vertical = cfg.orientacao === "vertical";
  const estilo = (cfg.estilo as string) ?? (cfg.formato === "reto" ? "cartao" : "pilula");
  const tamanho = Number(cfg.tamanho) || 16;
  const corTexto = cfg.cor || "#e5e7eb";
  const corFundo = cfg.fundo || "rgba(255,255,255,0.08)";
  const corAtiva = cfg.corAtiva || "#2563eb";
  const corTextoAtivo = cfg.corTextoAtivo || "#ffffff";
  const cantos = cfg.cantos !== undefined ? Number(cfg.cantos) : estilo === "pilula" ? 999 : 10;

  if (!lista.length) {
    return (
      <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
        {modoBotao ? "Escolha para qual tela este botão leva." : "Nenhuma tela para navegar."}
      </div>
    );
  }

  const visualDe = (ativo: boolean): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontSize: tamanho,
      color: ativo ? corTextoAtivo : corTexto,
      borderRadius: cantos,
      width: vertical ? "100%" : undefined,
    };
    switch (estilo) {
      case "contorno":
        return { ...base, background: ativo ? corAtiva : "transparent", border: `2px solid ${ativo ? corAtiva : corTexto}`, color: ativo ? corTextoAtivo : corTexto };
      case "texto":
        return { ...base, background: "transparent", color: ativo ? corAtiva : corTexto };
      case "sublinhado":
        return { ...base, background: "transparent", borderRadius: 0, borderBottom: `3px solid ${ativo ? corAtiva : "transparent"}`, color: ativo ? corAtiva : corTexto };
      case "cartao":
        return { ...base, background: ativo ? corAtiva : corFundo, boxShadow: "0 6px 18px rgba(0,0,0,0.35)" };
      case "barra":
        return { ...base, background: ativo ? corAtiva : "transparent", borderRadius: 0, flex: 1, textAlign: "center" };
      default:
        return { ...base, background: ativo ? corAtiva : corFundo };
    }
  };

  return (
    <div
      className={cn(
        "flex h-full w-full items-center gap-2 overflow-auto",
        vertical ? "flex-col justify-start" : "flex-row flex-wrap justify-center",
        estilo === "barra" && "gap-0 overflow-hidden rounded-xl",
      )}
      style={estilo === "barra" ? { background: corFundo, borderRadius: cantos } : undefined}
    >
      {lista.map((a) => {
        const ativo = !modoBotao && a.id === ambienteId;
        const rotulo = (cfg.rotulos ?? {})[a.id] || (modoBotao ? cfg.rotulo || a.nome : a.nome);
        return (
          <button
            key={a.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!edicao) trocar(a.id);
            }}
            className="whitespace-nowrap px-4 py-2 font-medium transition hover:brightness-110"
            style={visualDe(ativo)}
          >
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}
