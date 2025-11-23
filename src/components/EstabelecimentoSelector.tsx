import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

interface Estabelecimento {
  id: string;
  nome: string;
  cnpj: string;
}

interface EstabelecimentoSelectorProps {
  open: boolean;
  onSelectEstabelecimento: (estabelecimentoId: string) => void;
  onClose?: () => void;
}

export function EstabelecimentoSelector({ open, onSelectEstabelecimento, onClose }: EstabelecimentoSelectorProps) {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [selectedEstabelecimento, setSelectedEstabelecimento] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEstabelecimentos();
      // Verificar se já tem um estabelecimento selecionado anteriormente
      const savedEstabelecimentoId = localStorage.getItem("selectedEstabelecimentoId");
      if (savedEstabelecimentoId) {
        setSelectedEstabelecimento(savedEstabelecimentoId);
      }
    }
  }, [open]);

  const fetchEstabelecimentos = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("estabelecimentos")
      .select("id, nome, cnpj")
      .order("nome");

    if (!error && data) {
      setEstabelecimentos(data);
    }
    setIsLoading(false);
  };

  const handleConfirm = () => {
    if (selectedEstabelecimento) {
      localStorage.setItem("selectedEstabelecimentoId", selectedEstabelecimento);
      onSelectEstabelecimento(selectedEstabelecimento);
    }
  };

  const formatCNPJ = (cnpj: string) => {
    const numbers = cnpj.replace(/\D/g, "");
    if (numbers.length <= 14) {
      return numbers
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return cnpj;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Selecionar Estabelecimento
          </DialogTitle>
          <DialogDescription>
            Escolha o estabelecimento para gerenciar os dados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="estabelecimento">Estabelecimento</Label>
            <Select value={selectedEstabelecimento} onValueChange={setSelectedEstabelecimento}>
              <SelectTrigger id="estabelecimento">
                <SelectValue placeholder="Selecione um estabelecimento" />
              </SelectTrigger>
              <SelectContent>
                {estabelecimentos.map((est) => (
                  <SelectItem key={est.id} value={est.id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{est.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        CNPJ: {formatCNPJ(est.cnpj)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!selectedEstabelecimento || isLoading}
            className="w-full"
          >
            Confirmar Seleção
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
