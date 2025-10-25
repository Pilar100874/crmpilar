import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Workflow, ArrowRight } from "lucide-react";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";

export default function BotCreate() {
  const navigate = useNavigate();
  const { openSubmenu } = useLayout();

  return (
    <div className="p-8 space-y-8 animate-fade-in bg-white min-h-full">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <SubMenuHeader 
              title="Bot"
              onOpenSubmenu={() => openSubmenu("Bot Test")}
            />
            <h1 className="text-lg font-bold text-foreground">Criar Bot</h1>
          </div>
          <p className="text-muted-foreground">
            Crie e configure novos bots para automação de atendimento
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/bot-builder")}>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Workflow className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Bot de Fluxo</CardTitle>
              <CardDescription>
                Crie um bot usando o editor visual de fluxos. Ideal para automações complexas com múltiplas ramificações.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Criar Novo Bot
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
