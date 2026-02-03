import { EmpresaFormSheet } from "@/components/atendimento/EmpresaFormSheet";

interface NovaEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (empresaId: string) => void;
}

export function NovaEmpresaDialog({ open, onOpenChange, onSuccess }: NovaEmpresaDialogProps) {
  return (
    <EmpresaFormSheet
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  );
}
