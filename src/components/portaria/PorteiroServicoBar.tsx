import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePorteiroContexto } from "@/lib/portaria/porteiros";

/**
 * Barra "Porteiro em serviço" das telas da Portaria.
 * O porteiro é o usuário logado marcado com o flag "Porteiro"
 * no cadastro de usuários. Sem o flag, as movimentações são bloqueadas.
 */
export function PorteiroServicoBar({ className = "" }: { className?: string }) {
  const { porteiroLogado, carregando } = usePorteiroContexto();

  if (carregando) return null;

  if (porteiroLogado) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm ${className}`}>
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        <span className="text-muted-foreground">Porteiro em serviço:</span>
        <span className="font-medium truncate">{porteiroLogado.nome}</span>
        <Badge variant="secondary" className="ml-auto shrink-0">Você</Badge>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm ${className}`}>
      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
      <span className="text-amber-700 dark:text-amber-400">
        Seu usuário não está marcado como <strong>Porteiro</strong>. Consulta liberada, mas registros de movimentação
        ficam bloqueados. Ative o flag Porteiro em Configurações → Usuários.
      </span>
    </div>
  );
}

export default PorteiroServicoBar;
