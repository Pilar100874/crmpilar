import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NovoContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovoContatoDialog({ open, onOpenChange }: NovoContatoDialogProps) {
  const navigate = useNavigate();
  
  const handleGoToContatos = () => {
    onOpenChange(false);
    navigate('/contatos');
    // Aguardar navegação e então abrir o formulário
    setTimeout(() => {
      const addButton = document.querySelector('[class*="ADICIONAR CONTATO"]');
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
            <SheetTitle>Novo Contato</SheetTitle>
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
            Para adicionar um novo contato com todos os campos disponíveis, você será redirecionado para a página principal de Contatos.
          </p>
          <Button 
            onClick={handleGoToContatos}
            className="w-full"
          >
            Ir para Contatos
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
