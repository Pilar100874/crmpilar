import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, Trash2, Power, PowerOff, Edit2, Check } from "lucide-react";
import { toast } from "sonner";

interface Bot {
  id: string;
  name: string;
  active: boolean;
  updated_at: string;
}

interface BotManagerProps {
  savedBots: Bot[];
  currentBotId: string | null;
  currentBotName: string;
  onNewBot: () => void;
  onLoadBot: (botId: string) => void;
  onToggleActive: (botId: string, currentActive: boolean) => void;
  onDeleteBot: (botId: string) => void;
  onNameChange: (name: string) => void;
}

export const BotManager = ({
  savedBots,
  currentBotId,
  currentBotName,
  onNewBot,
  onLoadBot,
  onToggleActive,
  onDeleteBot,
  onNameChange,
}: BotManagerProps) => {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(currentBotName);

  const handleNameSave = () => {
    if (tempName.trim()) {
      onNameChange(tempName.trim());
      setEditingName(false);
      toast.success("Nome atualizado!");
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Folder className="w-4 h-4 mr-2" />
          Gerenciar Bots ({savedBots.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Gerenciamento de Bots</SheetTitle>
          <SheetDescription>
            Crie, edite e gerencie seus bots de atendimento
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Current Bot Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bot Atual</label>
            <div className="flex gap-2">
              {editingName ? (
                <>
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Nome do bot"
                    autoFocus
                    onKeyPress={(e) => e.key === "Enter" && handleNameSave()}
                  />
                  <Button size="icon" onClick={handleNameSave}>
                    <Check className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Input value={currentBotName} disabled className="flex-1" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setTempName(currentBotName);
                      setEditingName(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* New Bot Button */}
          <Button onClick={onNewBot} className="w-full">
            Criar Novo Bot
          </Button>

          {/* Saved Bots List */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bots Salvos</label>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {savedBots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum bot salvo ainda</p>
                  </div>
                ) : (
                  savedBots.map((bot) => (
                    <Card
                      key={bot.id}
                      className={`p-3 hover:bg-accent/50 transition-colors ${
                        currentBotId === bot.id ? "border-primary" : ""
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4
                                className="font-medium truncate cursor-pointer hover:text-primary"
                                onClick={() => onLoadBot(bot.id)}
                              >
                                {bot.name}
                              </h4>
                              {bot.active && (
                                <Badge variant="default" className="text-xs">
                                  Ativo
                                </Badge>
                              )}
                              {currentBotId === bot.id && (
                                <Badge variant="outline" className="text-xs">
                                  Atual
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Atualizado: {new Date(bot.updated_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => onLoadBot(bot.id)}
                          >
                            Carregar
                          </Button>
                          <Button
                            variant={bot.active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => onToggleActive(bot.id, bot.active)}
                            title={bot.active ? "Desativar" : "Ativar"}
                          >
                            {bot.active ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteBot(bot.id)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
