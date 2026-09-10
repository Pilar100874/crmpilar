import { Bloco } from "@/lib/automacao/api";
import { useNavegacaoAmbientes } from "@/lib/automacao/navegacao";
import { cn } from "@/lib/utils";

interface Props {
  bloco: Bloco;
  edicao?: boolean;
}

/**
 * Elemento que mostra as abas dos ambientes do mesmo tipo de tela
 * e permite trocar de aba direto pelo painel.
 */
export default function BlocoAbas({ bloco, edicao }: Props) {
  const { ambientes, ambienteId, trocar } = useNavegacaoAmbientes();
  const cfg = (bloco.config ?? {}) as Record<string, any>;

  const somente: string[] = Array.isArray(cfg.ambientes) ? cfg.ambientes : [];
  const lista = somente.length ? ambientes.filter((a) => somente.includes(a.id)) : ambientes;

  const vertical = cfg.orientacao === "vertical";
  const tamanho = Number(cfg.tamanho) || 16;
  const raio = cfg.formato === "reto" ? 8 : 999;
  const corTexto = cfg.cor || "#e5e7eb";
  const corFundo = cfg.fundo || "rgba(255,255,255,0.08)";
  const corAtiva = cfg.corAtiva || "#2563eb";
  const corTextoAtivo = cfg.corTextoAtivo || "#ffffff";

  if (!lista.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Nenhum ambiente para navegar.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center gap-2 overflow-auto",
        vertical ? "flex-col justify-start" : "flex-row flex-wrap justify-center",
      )}
    >
      {lista.map((a) => {
        const ativo = a.id === ambienteId;
        return (
          <button
            key={a.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!edicao) trocar(a.id);
            }}
            className="whitespace-nowrap px-4 py-2 font-medium transition"
            style={{
              fontSize: tamanho,
              borderRadius: raio,
              color: ativo ? corTextoAtivo : corTexto,
              background: ativo ? corAtiva : corFundo,
              width: vertical ? "100%" : undefined,
            }}
          >
            {a.nome}
          </button>
        );
      })}
    </div>
  );
}
