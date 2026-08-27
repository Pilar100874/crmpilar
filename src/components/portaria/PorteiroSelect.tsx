import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { usePorteiroContexto } from "@/lib/portaria/porteiros";

interface PorteiroSelectProps {
  /** ID do porteiro (usuário) responsável pelo registro. */
  value: string | null | undefined;
  /** Recebe o id e o nome do porteiro identificado. */
  onChange: (porteiroId: string | null, porteiroNome: string) => void;
  label?: string;
  /** Nome já gravado no registro. */
  nomeGravado?: string | null;
  disabled?: boolean;
  className?: string;
}

/**
 * Mostra o porteiro que está executando o registro.
 * O porteiro é sempre o usuário logado marcado com o flag "Porteiro"
 * no cadastro de usuários — não há seleção manual.
 */
export function PorteiroSelect({
  value,
  onChange,
  label = "Porteiro responsável",
  nomeGravado,
  className,
}: PorteiroSelectProps) {
  const { porteiroLogado, fixo, carregando } = usePorteiroContexto();

  useEffect(() => {
    if (fixo && porteiroLogado && value !== porteiroLogado.id) {
      onChange(porteiroLogado.id, porteiroLogado.nome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixo, porteiroLogado?.id]);

  if (carregando) return null;

  return (
    <div className={className}>
      <Label>{label}</Label>
      {fixo && porteiroLogado ? (
        <div className="flex items-center gap-2 mt-1 rounded-md border bg-muted/40 px-3 h-10">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{porteiroLogado.nome}</span>
          <Badge variant="secondary" className="ml-auto shrink-0">Você</Badge>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            {nomeGravado
              ? `Registrado por ${nomeGravado}. Seu usuário não é porteiro.`
              : "Seu usuário não está marcado como Porteiro — não é possível registrar."}
          </span>
        </div>
      )}
    </div>
  );
}

export default PorteiroSelect;
