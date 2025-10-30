import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NovaEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovaEmpresaDialog({ open, onOpenChange }: NovaEmpresaDialogProps) {
  const navigate = useNavigate();
  
  const handleGoToEmpresas = () => {
    onOpenChange(false);
    navigate('/empresas');
    // Aguardar navegação e então abrir o formulário
    setTimeout(() => {
      const addButton = document.querySelector('[class*="Nova Empresa"]');
      if (addButton) {
        (addButton as HTMLElement).click();
      }
    }, 100);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="border-b pb-4 mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Nova Empresa</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para adicionar uma nova empresa com todos os campos disponíveis, você será redirecionado para a página principal de Empresas.
          </p>
          <Button 
            onClick={handleGoToEmpresas}
            className="w-full"
          >
            Ir para Empresas
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
