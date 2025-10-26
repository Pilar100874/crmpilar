import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface NewBotDialogProps {
  onCreateBot: (name: string) => Promise<boolean>;
}

export const NewBotDialog = ({ onCreateBot }: NewBotDialogProps) => {
  const [open, setOpen] = useState(false);
  const [botName, setBotName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    const success = await onCreateBot(botName);
    setIsCreating(false);
    
    if (success) {
      setBotName("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-9 w-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          title="Criar novo bot"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Bot</DialogTitle>
          <DialogDescription>
            Digite um nome único para o novo bot de atendimento.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="bot-name">Nome do Bot</Label>
            <Input
              id="bot-name"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="Ex: Bot de Vendas"
              onKeyDown={(e) => {
                if (e.key === "Enter" && botName.trim()) {
                  handleCreate();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setBotName("");
              setOpen(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleCreate}
            disabled={!botName.trim() || isCreating}
          >
            {isCreating ? "Criando..." : "Criar Bot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
