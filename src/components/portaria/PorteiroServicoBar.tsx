import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePorteiroServico } from "@/lib/portaria/porteiros";

/**
 * Barra "Porteiro em serviço" exibida nas telas do grupo Portaria.
 * Todos os registros feitos nessas telas gravam o porteiro indicado aqui.
 */
export function PorteiroServicoBar({ className = "" }: { className?: string }) {
  const { porteiroLogado, porteiros, porteiroAtual, definir, carregando } = usePorteiroServico();

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

  if (porteiros.length === 0) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm ${className}`}>
        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="text-amber-700 dark:text-amber-400">
          Nenhum porteiro cadastrado. Cadastre em Portaria → Porteiros para registrar quem executa os lançamentos.
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm ${className}`}>
      <ShieldCheck className={`h-4 w-4 shrink-0 ${porteiroAtual ? "text-primary" : "text-amber-600"}`} />
      <span className="text-muted-foreground">Porteiro em serviço:</span>
      <Select value={porteiroAtual?.id ?? ""} onValueChange={(v) => definir(v)}>
        <SelectTrigger className="h-8 w-[220px]">
          <SelectValue placeholder="Selecione o porteiro" />
        </SelectTrigger>
        <SelectContent>
          {porteiros.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nome}{p.turno ? ` · ${p.turno}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!porteiroAtual && (
        <span className="text-xs text-amber-700 dark:text-amber-400">Selecione para identificar os registros</span>
      )}
    </div>
  );
}

export default PorteiroServicoBar;
