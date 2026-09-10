// Pergunta "tem certeza?" antes de acionar um elemento, quando configurado.
import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bloco } from "@/lib/automacao/api";

export function useConfirmacaoBloco(bloco: Bloco) {
  const cfg = (bloco.config ?? {}) as { confirmar?: boolean; textoConfirmacao?: string };
  const [aberto, setAberto] = useState(false);
  const acaoRef = useRef<null | (() => unknown)>(null);

  /** Executa direto ou abre a confirmação, conforme a configuração do elemento. */
  const pedir = (acao: () => void | Promise<void>) => {
    if (cfg.confirmar !== true) {
      void acao();
      return;
    }
    acaoRef.current = acao;
    setAberto(true);
  };

  const dialogo = (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogContent
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
          <AlertDialogDescription>
            {cfg.textoConfirmacao?.trim() ||
              `Deseja mesmo acionar "${bloco.nome}"?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const acao = acaoRef.current;
              acaoRef.current = null;
              void acao?.();
            }}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { pedir, dialogo };
}
