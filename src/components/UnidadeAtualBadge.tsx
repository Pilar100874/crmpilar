import { Building2, AlertTriangle } from "lucide-react";
import { useUnidadeAtual } from "@/lib/unidadeAtual";

/**
 * Mostra a unidade/filial na qual o usuário está operando.
 * Os módulos de portaria só permitem movimentações dessa unidade.
 */
export default function UnidadeAtualBadge({ className = "" }: { className?: string }) {
  const { unidadeId, unidadeNome, isAdmin, carregando } = useUnidadeAtual();

  if (carregando) return null;

  if (isAdmin) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground ${className}`}
        title="Administradores acessam todas as unidades"
      >
        <Building2 className="h-3.5 w-3.5 text-primary" />
        <span className="truncate max-w-[180px]">
          {unidadeNome ? `${unidadeNome} · todas as unidades` : "Todas as unidades"}
        </span>
      </span>
    );
  }

  if (!unidadeId) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs text-destructive ${className}`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Sem unidade vinculada — peça ao administrador</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground ${className}`}
      title="Você só acessa registros desta unidade"
    >
      <Building2 className="h-3.5 w-3.5 text-primary" />
      <span className="truncate max-w-[180px]">{unidadeNome}</span>
    </span>
  );
}
