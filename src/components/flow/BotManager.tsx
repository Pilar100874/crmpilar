import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Folder, Trash2, Power, PowerOff, Edit2, Check, Smartphone } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";

interface Bot {
  id: string;
  name: string;
  active: boolean;
  updated_at: string;
}

interface WhatsAppSession {
  id: string;
  session_name: string;
  phone_number: string | null;
  status: string;
  bot_flow_id: string | null;
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
  const [whatsappSessions, setWhatsappSessions] = useState<WhatsAppSession[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Record<string, string>>({});

  useEffect(() => {
    loadWhatsAppSessions();
  }, []);

  useEffect(() => {
    // Load selected sessions for each bot
    const sessions: Record<string, string> = {};
    for (const bot of savedBots) {
      const session = whatsappSessions.find(s => s.bot_flow_id === bot.id);
      if (session) {
        sessions[bot.id] = session.id;
      }
    }
    setSelectedSessions(sessions);
  }, [whatsappSessions, savedBots]);

  const loadWhatsAppSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("estabelecimento_id")
        .eq("id", user.id)
        .maybeSingle();

      if (usuario) {
        const { data, error } = await supabase
          .from("whatsapp_sessions")
          .select("*")
          .eq("estabelecimento_id", usuario.estabelecimento_id);

        if (error) {
          console.error("Error loading WhatsApp sessions:", error);
        } else if (data) {
          console.log("Loaded WhatsApp sessions:", data);
          setWhatsappSessions(data);
        }
      }
    } catch (error) {
      console.error("Error loading WhatsApp sessions:", error);
    }
  };

  const handleSessionChange = async (botId: string, sessionId: string) => {
    try {
      // Clear previous assignment if exists
      const previousSession = whatsappSessions.find(s => s.bot_flow_id === botId);
      if (previousSession) {
        await supabase
          .from("whatsapp_sessions")
          .update({ bot_flow_id: null })
          .eq("id", previousSession.id);
      }

      // Assign new session
      if (sessionId) {
        await supabase
          .from("whatsapp_sessions")
          .update({ bot_flow_id: botId })
          .eq("id", sessionId);
        
        toast.success("Número WhatsApp associado com sucesso!");
      } else {
        toast.success("Número WhatsApp removido do bot!");
      }

      setSelectedSessions(prev => ({ ...prev, [botId]: sessionId }));
      await loadWhatsAppSessions();
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error("Erro ao associar número");
    }
  };

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
        <Button variant="outline" size="sm" className="bg-card dark:bg-card border-border text-foreground hover:bg-muted hover:text-foreground">
          <Folder className="w-4 h-4 mr-2" />
          Gerenciar Bots ({savedBots.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] bg-card dark:bg-card border-border text-foreground">
        <SheetHeader>
          <SheetTitle className="text-foreground">Gerenciamento de Bots</SheetTitle>
          <SheetDescription className="text-foreground/70">
            Crie, edite e gerencie seus bots de atendimento
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Current Bot Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              Bot Atual
            </label>
            <div className="flex gap-2">
              {editingName ? (
                <>
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Nome do bot"
                    autoFocus
                    onKeyPress={(e) => e.key === "Enter" && handleNameSave()}
                    className="bg-card dark:bg-card border-border text-foreground"
                  />
                  <Button size="icon" onClick={handleNameSave} className="bg-primary hover:bg-primary/90">
                    <Check className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Input 
                    value={currentBotName} 
                    disabled 
                    className="flex-1 bg-muted border-border text-foreground" 
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setTempName(currentBotName);
                      setEditingName(true);
                    }}
                    className="bg-card dark:bg-card border-border text-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* New Bot Button */}
          <Button onClick={onNewBot} className="w-full bg-primary hover:bg-primary/90">
            Criar Novo Bot
          </Button>

          {/* Saved Bots List */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Bots Salvos</label>
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
                      className={`p-3 bg-card dark:bg-card border-border hover:bg-muted transition-colors ${
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
                                <Badge variant="default" className="text-xs bg-green-600">
                                  Ativo
                                </Badge>
                              )}
                              {currentBotId === bot.id && (
                                <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                                  Atual
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Atualizado: {new Date(bot.updated_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* WhatsApp Number Selection */}
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Smartphone className="h-3 w-3" />
                            Número WhatsApp
                          </Label>
                          <Select
                            value={selectedSessions[bot.id] || ""}
                            onValueChange={(value) => handleSessionChange(bot.id, value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Nenhum número" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Nenhum</SelectItem>
                              {whatsappSessions
                                .filter(s => !s.bot_flow_id || s.bot_flow_id === bot.id)
                                .map(session => (
                                  <SelectItem key={session.id} value={session.id}>
                                    {session.phone_number || session.session_name} ({session.status})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
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
