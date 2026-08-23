import { useState } from "react";
import { DoorOpen, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { abrirAcesso, STATUS_CORES } from "@/lib/portaria/api";

export interface AcessoCard {
  id: string;
  nome: string;
  tipo: string;
  confirmar_abertura: boolean;
  device?: {
    id: string;
    nome: string;
    status: string | null;
    habilitado: boolean | null;
    ultima_comunicacao: string | null;
  } | null;
  ultimo_acionamento?: string | null;
}

export default function BotaoAbrirAcesso({ acesso, onAberto }: { acesso: AcessoCard; onAberto?: () => void }) {
  const { toast } = useToast();
  const [enviando, setEnviando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [ultimo, setUltimo] = useState<"ok" | "erro" | null>(null);

  const status = acesso.device?.habilitado === false ? "offline" : (acesso.device?.status || "offline");
  const indisponivel = !acesso.device || acesso.device.habilitado === false;

  const executar = async () => {
    setEnviando(true);
    const r = await abrirAcesso(acesso.id);
    setEnviando(false);
    setUltimo(r.ok ? "ok" : "erro");
    toast({
      title: r.ok ? `${acesso.nome} liberado` : "Não foi possível abrir",
      description: r.ok ? new Date().toLocaleTimeString("pt-BR") : r.mensagem,
      variant: r.ok ? undefined : "destructive",
    });
    onAberto?.();
    setTimeout(() => setUltimo(null), 4000);
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <DoorOpen className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{acesso.nome}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2 w-2 rounded-full ${STATUS_CORES[status] ?? "bg-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground capitalize">{status}</span>
              <Badge variant="outline" className="text-[10px] capitalize">{acesso.tipo}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {acesso.ultimo_acionamento
                ? `Último acionamento: ${new Date(acesso.ultimo_acionamento).toLocaleString("pt-BR")}`
                : "Sem acionamentos recentes"}
            </p>
          </div>
        </div>

        <Button
          className="w-full mt-4 h-12 text-base font-semibold"
          disabled={enviando || indisponivel}
          variant={ultimo === "erro" ? "destructive" : "default"}
          onClick={() => (acesso.confirmar_abertura ? setConfirmar(true) : executar())}
        >
          {enviando ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
          {ultimo === "ok" ? <Check className="h-5 w-5 mr-2" /> : null}
          {ultimo === "erro" ? <X className="h-5 w-5 mr-2" /> : null}
          {enviando ? "Enviando..." : `ABRIR ${acesso.tipo === "porta" ? "PORTA" : "PORTÃO"}`}
        </Button>
      </div>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar abertura</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente abrir <strong>{acesso.nome}</strong>? A ação será registrada no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executar}>Abrir agora</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
