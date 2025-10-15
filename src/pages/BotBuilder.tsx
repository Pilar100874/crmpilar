import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Play, Save, GitBranch } from "lucide-react";

export default function BotBuilder() {
  return (
    <Layout>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b bg-card flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Bot Builder</h2>
            <p className="text-sm text-muted-foreground">
              Crie fluxos de atendimento automatizado
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
            <Button size="sm">
              <Play className="w-4 h-4 mr-2" />
              Testar
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Blocks Library */}
          <div className="w-64 border-r bg-card p-4 overflow-auto">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Blocos Disponíveis
            </h3>
            <div className="space-y-2">
              {[
                "Mensagem",
                "Pergunta",
                "Condição",
                "API",
                "Handoff",
                "Delay",
                "Intent",
              ].map((block) => (
                <Card
                  key={block}
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{block}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-muted/20 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle>Editor de Fluxo</CardTitle>
                  <CardDescription>
                    Arraste blocos da biblioteca para criar seu fluxo de atendimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-hero rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                    <div className="text-center text-muted-foreground">
                      <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Canvas do fluxo</p>
                      <p className="text-xs">Implementação completa em breve</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="w-80 border-l bg-card p-4 overflow-auto">
            <h3 className="font-medium mb-4">Propriedades</h3>
            <p className="text-sm text-muted-foreground">
              Selecione um bloco para editar suas propriedades
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
