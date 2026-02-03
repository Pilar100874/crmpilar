import { ContatoFormSheet } from "@/components/atendimento/ContatoFormSheet";

interface NovoContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (customerId: string) => void;
}

export function NovoContatoDialog({ open, onOpenChange, onSuccess }: NovoContatoDialogProps) {
  return (
    <ContatoFormSheet
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  );
}
