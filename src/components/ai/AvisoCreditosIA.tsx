import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { CreditCard, AlertTriangle } from "lucide-react";
import {
  EVENTO_AVISO_IA,
  EVENTO_ERRO_IA,
  ErroIAInfo,
  instalarInterceptorIA,
  limparAvisoCreditos,
} from "@/lib/ai/creditosIA";

type Estado =
  | { modo: "erro"; info: ErroIAInfo; contexto?: string }
  | { modo: "aviso"; contexto?: string; resolve: (v: boolean) => void }
  | null;

export default function AvisoCreditosIA() {
  const [estado, setEstado] = useState<Estado>(null);
  const navigate = useNavigate();

  useEffect(() => {
    instalarInterceptorIA();

    const onErro = (e: Event) => {
      const { info, contexto } = (e as CustomEvent).detail || {};
      setEstado({ modo: "erro", info, contexto });
    };
    const onAviso = (e: Event) => {
      const { contexto, resolve } = (e as CustomEvent).detail || {};
      setEstado({ modo: "aviso", contexto, resolve });
    };

    window.addEventListener(EVENTO_ERRO_IA, onErro);
    window.addEventListener(EVENTO_AVISO_IA, onAviso);
    return () => {
      window.removeEventListener(EVENTO_ERRO_IA, onErro);
      window.removeEventListener(EVENTO_AVISO_IA, onAviso);
    };
  }, []);

  const fechar = (continuar = false) => {
    if (estado?.modo === "aviso") estado.resolve(continuar);
    setEstado(null);
  };

  if (!estado) return null;

  const ehAviso = estado.modo === "aviso";

  return (
    <AlertDialog open onOpenChange={(o) => !o && fechar(false)}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            {ehAviso ? (
              <AlertTriangle className="h-6 w-6 text-destructive" />
            ) : (
              <CreditCard className="h-6 w-6 text-destructive" />
            )}
          </div>
          <AlertDialogTitle className="text-center">
            {ehAviso ? "Créditos de IA podem ter acabado" : estado.info.titulo}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-2">
            {ehAviso ? (
              <>
                <span className="block">
                  Na última execução a inteligência artificial retornou <b>sem créditos</b>. Se
                  nada mudou desde então, esta ação vai falhar novamente.
                </span>
                <span className="block text-xs text-muted-foreground">
                  Adicione créditos de IA no workspace ou escolha um modelo gratuito nas
                  configurações de IA. Você pode tentar mesmo assim.
                </span>
              </>
            ) : (
              <>
                <span className="block">{estado.info.descricao}</span>
                {estado.contexto && (
                  <span className="block text-xs text-muted-foreground">
                    Recurso: {estado.contexto}
                  </span>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {ehAviso ? (
            <>
              <AlertDialogCancel onClick={() => fechar(false)}>Cancelar</AlertDialogCancel>
              <Button
                variant="outline"
                onClick={() => {
                  limparAvisoCreditos();
                  fechar(true);
                }}
              >
                Tentar mesmo assim
              </Button>
            </>
          ) : (
            <>
              <AlertDialogAction onClick={() => fechar()}>Entendi</AlertDialogAction>

            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
