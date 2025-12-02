import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { MultiUserSelector } from "./UserSelector";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const EnviarAvisoSistemaConfig = ({ config, handleConfigChange }: ConfigProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Título do Aviso</Label>
        <Input
          value={config.titulo || ""}
          onChange={(e) => handleConfigChange("titulo", e.target.value)}
          placeholder="Ex: Novo pedido recebido"
        />
      </div>

      <div className="space-y-2">
        <Label>Mensagem</Label>
        <Textarea
          value={config.mensagem || ""}
          onChange={(e) => handleConfigChange("mensagem", e.target.value)}
          placeholder="Conteúdo do aviso..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Use {"{{variavel}}"} para inserir valores dinâmicos
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tipo do Aviso</Label>
        <Select
          value={config.tipo || "info"}
          onValueChange={(value) => handleConfigChange("tipo", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Informação
              </div>
            </SelectItem>
            <SelectItem value="sucesso">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Sucesso
              </div>
            </SelectItem>
            <SelectItem value="alerta">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Alerta
              </div>
            </SelectItem>
            <SelectItem value="urgente">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Urgente
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Destinatários</Label>
        <Select
          value={config.destinatarios_tipo || "todos"}
          onValueChange={(value) => handleConfigChange("destinatarios_tipo", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os usuários</SelectItem>
            <SelectItem value="roles">Por perfil</SelectItem>
            <SelectItem value="usuarios_especificos">Usuários específicos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.destinatarios_tipo === "roles" && (
        <div className="space-y-2">
          <Label>Perfis</Label>
          <Input
            value={config.destinatarios_roles?.join(", ") || ""}
            onChange={(e) => handleConfigChange("destinatarios_roles", e.target.value.split(",").map(s => s.trim()))}
            placeholder="admin, gestor, atendente"
          />
        </div>
      )}

      {config.destinatarios_tipo === "usuarios_especificos" && (
        <MultiUserSelector
          value={config.destinatarios_ids || []}
          onChange={(value) => handleConfigChange("destinatarios_ids", value)}
          label="Selecione os Usuários"
        />
      )}

      <div className="space-y-2">
        <Label>Expiração (horas)</Label>
        <Input
          type="number"
          value={config.expira_horas || ""}
          onChange={(e) => handleConfigChange("expira_horas", parseInt(e.target.value) || null)}
          placeholder="Deixe vazio para não expirar"
        />
      </div>
    </div>
  );
};