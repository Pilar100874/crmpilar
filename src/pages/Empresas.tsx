import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Empresas() {
  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Empresa
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="text-center text-muted-foreground py-12">
          Nenhuma empresa cadastrada. Clique em "Nova Empresa" para começar.
        </div>
      </div>
    </div>
  );
}
