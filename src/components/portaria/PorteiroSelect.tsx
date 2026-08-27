import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";
import { usePorteiroContexto } from "@/lib/portaria/porteiros";

interface PorteiroSelectProps {
  /** ID do porteiro selecionado (null quando ainda não escolhido). */
  value: string | null | undefined;
  /** Recebe o id e o nome do porteiro escolhido/fixado. */
  onChange: (porteiroId: string | null, porteiroNome: string) => void;
  label?: string;
  /** Nome já gravado no registro (usado quando o porteiro foi excluído do cadastro). */
  nomeGravado?: string | null;
  disabled?: boolean;
  className?: string;
}

/**
 * Identifica o porteiro que está executando o registro.
 * - Usuário logado vinculado a um porteiro: nome fixo, sem escolha.
 * - Demais usuários: seleção entre os porteiros ativos.
 */
export function PorteiroSelect({
  value,
  onChange,
  label = "Porteiro responsável",
  nomeGravado,
  disabled,
  className,
}: PorteiroSelectProps) {
  const { porteiroLogado, porteiros, fixo, carregando } = usePorteiroContexto();

  useEffect(() => {
    if (fixo && porteiroLogado && value !== porteiroLogado.id) {
      onChange(porteiroLogado.id, porteiroLogado.nome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixo, porteiroLogado?.id]);

  if (fixo && porteiroLogado) {
    return (
      <div className={className}>
        <Label>{label}</Label>
        <div className="flex items-center gap-2 mt-1 rounded-md border bg-muted/40 px-3 h-10">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{porteiroLogado.nome}</span>
          <Badge variant="secondary" className="ml-auto shrink-0">Você</Badge>
        </div>
      </div>
    );
  }

  const semCadastro = !carregando && porteiros.length === 0;

  return (
    <div className={className}>
      <Label>{label}</Label>
      {semCadastro ? (
        <Input
          value={nomeGravado || ""}
          onChange={(e) => onChange(null, e.target.value)}
          placeholder="Nenhum porteiro cadastrado — informe o nome"
          disabled={disabled}
        />
      ) : (
        <Select
          value={value || ""}
          onValueChange={(v) => {
            const p = porteiros.find((x) => x.id === v);
            onChange(v, p?.nome ?? "");
          }}
          disabled={disabled || carregando}
        >
          <SelectTrigger>
            <SelectValue placeholder={nomeGravado || "Selecione o porteiro"} />
          </SelectTrigger>
          <SelectContent>
            {porteiros.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}{p.turno ? ` · ${p.turno}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export default PorteiroSelect;
