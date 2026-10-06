import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import type { PassoPrevia } from "@/lib/calendario/previaRegras";

const ROTULO = { vai_executar: "Vai executar", nao_se_aplica: "Não se aplica", desativada: "Desligada" } as const;
const VARIANTE = { vai_executar: "default", nao_se_aplica: "secondary", desativada: "outline" } as const;

interface Props {
  aberto: boolean;
  titulo: string;
  passos: PassoPrevia[];
  onCancelar: () => void;
  onConfirmar: () => void;
}

export function PreviaRegrasDialog({ aberto, titulo, passos, onCancelar, onConfirmar }: Props) {
  return (
    <AlertDialog open={aberto} onOpenChange={(o) => !o && onCancelar()}>
      <AlertDialogContent className="z-[900] max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Modo validação · {titulo}</AlertDialogTitle>
          <AlertDialogDescription>Estes são os passos que o sistema fará, nesta ordem, se você confirmar.</AlertDialogDescription>
        </AlertDialogHeader>
        <ol className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {passos.map((p, i) => (
            <li key={i} className="rounded-md border border-border bg-muted/30 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{i + 1}. {p.regra}</span>
                <Badge variant={VARIANTE[p.situacao]} className="shrink-0 text-[10px]">{ROTULO[p.situacao]}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.descricao}</p>
            </li>
          ))}
        </ol>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancelar}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>Confirmar e executar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
