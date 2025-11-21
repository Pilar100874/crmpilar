import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useChatStatus } from "@/hooks/useChatStatus";

interface EncerrarChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  onSuccess?: () => void;
}

const MOTIVOS_COMUNS = [
  "Problema resolvido",
  "Cliente não respondeu",
  "Transferido para outro canal",
  "Solicitação atendida",
  "Fora do escopo",
  "Cliente desistiu",
  "Outro"
];

export const EncerrarChatDialog = ({
  open,
  onOpenChange,
  chatId,
  onSuccess
}: EncerrarChatDialogProps) => {
  const [motivoSelecionado, setMotivoSelecionado] = useState(MOTIVOS_COMUNS[0]);
  const [motivoCustomizado, setMotivoCustomizado] = useState("");
  const { encerrarChat, loading } = useChatStatus();

  const handleEncerrar = async () => {
    const motivoFinal = motivoSelecionado === "Outro" ? motivoCustomizado : motivoSelecionado;

    if (!motivoFinal.trim()) {
      return;
    }

    const success = await encerrarChat(chatId, motivoFinal);
    
    if (success) {
      onOpenChange(false);
      setMotivoSelecionado(MOTIVOS_COMUNS[0]);
      setMotivoCustomizado("");
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar Atendimento</DialogTitle>
          <DialogDescription>
            Selecione o motivo do encerramento deste chat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Motivo do Encerramento</Label>
            <RadioGroup
              value={motivoSelecionado}
              onValueChange={setMotivoSelecionado}
              className="mt-2 space-y-2"
            >
              {MOTIVOS_COMUNS.map((motivo) => (
                <div key={motivo} className="flex items-center space-x-2">
                  <RadioGroupItem value={motivo} id={motivo} />
                  <Label htmlFor={motivo} className="cursor-pointer font-normal">
                    {motivo}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {motivoSelecionado === "Outro" && (
            <div>
              <Label htmlFor="motivo-customizado">Descreva o motivo</Label>
              <Textarea
                id="motivo-customizado"
                value={motivoCustomizado}
                onChange={(e) => setMotivoCustomizado(e.target.value)}
                placeholder="Digite o motivo do encerramento..."
                rows={3}
                className="mt-2"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleEncerrar}
            disabled={loading || (motivoSelecionado === "Outro" && !motivoCustomizado.trim())}
          >
            {loading ? "Encerrando..." : "Encerrar Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
