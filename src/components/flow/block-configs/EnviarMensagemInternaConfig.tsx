import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Users, User } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const EnviarMensagemInternaConfig = ({ config, handleConfigChange }: ConfigProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Destinatário</Label>
        <Select
          value={config.tipo_destinatario || "usuario"}
          onValueChange={(value) => handleConfigChange("tipo_destinatario", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="usuario">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Usuário específico
              </div>
            </SelectItem>
            <SelectItem value="grupo">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Grupo de conversa
              </div>
            </SelectItem>
            <SelectItem value="role">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Por perfil
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.tipo_destinatario === "usuario" && (
        <div className="space-y-2">
          <Label>ID do Usuário</Label>
          <Input
            value={config.usuario_id || ""}
            onChange={(e) => handleConfigChange("usuario_id", e.target.value)}
            placeholder="ID do usuário ou {{variavel}}"
          />
        </div>
      )}

      {config.tipo_destinatario === "grupo" && (
        <div className="space-y-2">
          <Label>ID do Grupo</Label>
          <Input
            value={config.grupo_id || ""}
            onChange={(e) => handleConfigChange("grupo_id", e.target.value)}
            placeholder="ID do grupo de conversa"
          />
        </div>
      )}

      {config.tipo_destinatario === "role" && (
        <div className="space-y-2">
          <Label>Perfis</Label>
          <Input
            value={config.roles?.join(", ") || ""}
            onChange={(e) => handleConfigChange("roles", e.target.value.split(",").map(s => s.trim()))}
            placeholder="admin, gestor"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Mensagem</Label>
        <Textarea
          value={config.mensagem || ""}
          onChange={(e) => handleConfigChange("mensagem", e.target.value)}
          placeholder="Conteúdo da mensagem..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Use {"{{variavel}}"} para inserir valores dinâmicos
        </p>
      </div>

      <div className="space-y-2">
        <Label>Título da Conversa (opcional)</Label>
        <Input
          value={config.titulo_conversa || ""}
          onChange={(e) => handleConfigChange("titulo_conversa", e.target.value)}
          placeholder="Será usado ao criar nova conversa"
        />
      </div>

      <div className="bg-muted/50 p-3 rounded-lg">
        <div className="flex items-start gap-2">
          <MessageCircle className="h-4 w-4 text-primary mt-0.5" />
          <p className="text-xs text-muted-foreground">
            A mensagem será enviada no chat interno do sistema. 
            Se não existir uma conversa, uma nova será criada automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
};
