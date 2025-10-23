import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

export interface WebhookVariable {
  id: string;
  name: string;
  type: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  format?: string; // Para JSON (string, number, boolean, object, array)
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: string;
  type: string;
  description: string;
  usageLocations: string[];
  hasVariables: boolean;
  variables?: WebhookVariable[];
  createdAt: Date;
}

export interface WebhookType {
  id: string;
  name: string;
}

export interface UsageLocation {
  id: string;
  name: string;
}

export function WebhooksCRUD() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [webhookTypes, setWebhookTypes] = useState<WebhookType[]>([
    { id: "n8n", name: "N8N" },
    { id: "waha", name: "WAHA" },
    { id: "whatsapp", name: "WhatsApp Oficial" },
  ]);
  const [usageLocations, setUsageLocations] = useState<UsageLocation[]>([
    { id: "bot", name: "Bot" },
    { id: "chat", name: "Chat" },
    { id: "campanha", name: "Campanha" },
    { id: "teste", name: "Teste de Webhook" },
  ]);
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    method: "POST",
    type: "",
    description: "",
    usageLocations: [] as string[],
    hasVariables: false,
    variables: [] as WebhookVariable[],
  });
  const [newTypeName, setNewTypeName] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [newVariableName, setNewVariableName] = useState("");
  const [newVariableDescription, setNewVariableDescription] = useState("");
  const [newVariableType, setNewVariableType] = useState("json");
  const [newVariableDefaultValue, setNewVariableDefaultValue] = useState("");
  const [newVariableRequired, setNewVariableRequired] = useState(false);
  const [newVariableFormat, setNewVariableFormat] = useState("string");

  const resetVariableForm = () => {
    setNewVariableName("");
    setNewVariableDescription("");
    setNewVariableType("json");
    setNewVariableDefaultValue("");
    setNewVariableRequired(false);
    setNewVariableFormat("string");
  };

  useEffect(() => {
    const savedWebhooks = localStorage.getItem("webhooks");
    const savedTypes = localStorage.getItem("webhookTypes");
    const savedLocations = localStorage.getItem("usageLocations");
    
    if (savedWebhooks) {
      const parsed = JSON.parse(savedWebhooks);
      setWebhooks(parsed.map((w: any) => ({ ...w, createdAt: new Date(w.createdAt) })));
    }
    if (savedTypes) {
      setWebhookTypes(JSON.parse(savedTypes));
    }
    if (savedLocations) {
      setUsageLocations(JSON.parse(savedLocations));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("webhooks", JSON.stringify(webhooks));
  }, [webhooks]);

  useEffect(() => {
    localStorage.setItem("webhookTypes", JSON.stringify(webhookTypes));
  }, [webhookTypes]);

  useEffect(() => {
    localStorage.setItem("usageLocations", JSON.stringify(usageLocations));
  }, [usageLocations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    if (!formData.name || !formData.url || !formData.method || !formData.type || !formData.description || formData.usageLocations.length === 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Verificar se nome já existe (excluindo o próprio webhook se estiver editando)
    const nameExists = webhooks.some((w) => 
      w.name === formData.name && w.id !== editingWebhook
    );
    if (nameExists) {
      toast.error("Já existe um webhook com este nome");
      return;
    }

    // Verificar se a combinação método + URL já existe (excluindo o próprio webhook se estiver editando)
    const methodUrlExists = webhooks.some((w) => 
      w.method === formData.method && w.url === formData.url && w.id !== editingWebhook
    );
    if (methodUrlExists) {
      toast.error("Já existe um webhook com este método e URL");
      return;
    }

    if (editingWebhook) {
      setWebhooks(
        webhooks.map((w) =>
          w.id === editingWebhook
            ? { ...w, ...formData }
            : w
        )
      );
      toast.success("Webhook atualizado!");
    } else {
      const newWebhook: WebhookConfig = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date(),
      };
      setWebhooks([...webhooks, newWebhook]);
      toast.success("Webhook criado!");
    }

    resetForm();
  };

  const handleEdit = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook.id);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      method: webhook.method || "POST",
      type: webhook.type,
      description: webhook.description,
      usageLocations: webhook.usageLocations || [],
      hasVariables: webhook.hasVariables || false,
      variables: webhook.variables || [],
    });
  };

  const handleDelete = (id: string) => {
    setWebhooks(webhooks.filter((w) => w.id !== id));
    toast.success("Webhook removido!");
  };

  const handleAddType = () => {
    if (!newTypeName.trim()) {
      toast.error("Digite um nome para o tipo");
      return;
    }

    const newType: WebhookType = {
      id: newTypeName.toLowerCase().replace(/\s+/g, "-"),
      name: newTypeName,
    };

    setWebhookTypes([...webhookTypes, newType]);
    setNewTypeName("");
    toast.success("Tipo adicionado!");
  };

  const handleDeleteType = (id: string) => {
    const isInUse = webhooks.some((w) => w.type === id);
    if (isInUse) {
      toast.error("Este tipo está em uso e não pode ser removido");
      return;
    }
    setWebhookTypes(webhookTypes.filter((t) => t.id !== id));
    toast.success("Tipo removido!");
  };

  const handleAddLocation = () => {
    if (!newLocationName.trim()) {
      toast.error("Digite um nome para o local de uso");
      return;
    }

    const newLocation: UsageLocation = {
      id: newLocationName.toLowerCase().replace(/\s+/g, "-"),
      name: newLocationName,
    };

    setUsageLocations([...usageLocations, newLocation]);
    setNewLocationName("");
    toast.success("Local de uso adicionado!");
  };

  const handleDeleteLocation = (id: string) => {
    const isInUse = webhooks.some((w) => w.usageLocations?.includes(id));
    if (isInUse) {
      toast.error("Este local está em uso e não pode ser removido");
      return;
    }
    setUsageLocations(usageLocations.filter((l) => l.id !== id));
    toast.success("Local de uso removido!");
  };

  const resetForm = () => {
    setFormData({ name: "", url: "", method: "POST", type: "", description: "", usageLocations: [], hasVariables: false, variables: [] });
    setEditingWebhook(null);
  };

  const handleAddVariable = () => {
    if (!newVariableName.trim()) {
      toast.error("Digite um nome para a variável");
      return;
    }

    const newVariable: WebhookVariable = {
      id: Date.now().toString(),
      name: newVariableName,
      type: newVariableType,
      description: newVariableDescription || undefined,
      defaultValue: newVariableDefaultValue || undefined,
      required: newVariableRequired,
      format: newVariableType === "json" ? newVariableFormat : undefined,
    };

    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, newVariable]
    }));
    resetVariableForm();
    toast.success("Variável adicionada!");
  };

  const handleDeleteVariable = (variableId: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v.id !== variableId)
    }));
    toast.success("Variável removida!");
  };

  const toggleLocation = (locationId: string) => {
    setFormData(prev => ({
      ...prev,
      usageLocations: prev.usageLocations.includes(locationId)
        ? prev.usageLocations.filter(id => id !== locationId)
        : [...prev.usageLocations, locationId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Webhook */}
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-name">Nome do Webhook *</Label>
            <Input
              id="webhook-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Webhook Principal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL do Webhook *</Label>
            <Input
              id="webhook-url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-method">Método HTTP *</Label>
            <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="webhook-type">Local do Webhook *</Label>
              <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm">
                    Gerenciar Locais
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Gerenciar Locais do Webhook</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="Nome do novo tipo"
                      />
                      <Button type="button" onClick={handleAddType}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {webhookTypes.map((type) => (
                          <div key={type.id} className="flex items-center justify-between p-2 border rounded">
                            <span>{type.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteType(type.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {webhookTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Local de Uso *</Label>
              <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm">
                    Gerenciar Locais
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Gerenciar Locais de Uso</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        placeholder="Nome do novo local"
                      />
                      <Button type="button" onClick={handleAddLocation}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {usageLocations.map((location) => (
                          <div key={location.id} className="flex items-center justify-between p-2 border rounded">
                            <span>{location.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLocation(location.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {usageLocations.map((location) => (
                <div key={location.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`location-${location.id}`}
                    checked={formData.usageLocations.includes(location.id)}
                    onCheckedChange={() => toggleLocation(location.id)}
                  />
                  <label
                    htmlFor={`location-${location.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {location.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-description">Descrição *</Label>
            <Textarea
              id="webhook-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o propósito deste webhook..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-has-variables">Possuir Variáveis *</Label>
            <Select 
              value={formData.hasVariables ? "sim" : "nao"} 
              onValueChange={(value) => setFormData({ ...formData, hasVariables: value === "sim" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.hasVariables && (
            <div className="space-y-2">
              <Label>Variáveis do Webhook</Label>
              <Card className="p-3 space-y-3">
                <div className="space-y-3">
                  {/* Tipo - Primeira opção */}
                  <div className="space-y-2">
                    <Label>Tipo de Variável *</Label>
                    <Select value={newVariableType} onValueChange={(value) => {
                      setNewVariableType(value);
                      // Resetar campos ao mudar tipo
                      setNewVariableFormat("string");
                      setNewVariableDefaultValue("");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON Body</SelectItem>
                        <SelectItem value="query">Query Params</SelectItem>
                        <SelectItem value="header">Headers</SelectItem>
                        <SelectItem value="path">Path Params</SelectItem>
                        <SelectItem value="form-data">Form Data</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {newVariableType === "json" && "Variável no corpo JSON da requisição"}
                      {newVariableType === "query" && "Parâmetro na URL (?param=valor)"}
                      {newVariableType === "header" && "Cabeçalho HTTP da requisição"}
                      {newVariableType === "path" && "Parâmetro na rota (/api/:id)"}
                      {newVariableType === "form-data" && "Campo de formulário multipart"}
                    </p>
                  </div>

                  {/* Nome da variável */}
                  <div className="space-y-2">
                    <Label>Nome da Variável *</Label>
                    <Input
                      value={newVariableName}
                      onChange={(e) => setNewVariableName(e.target.value)}
                      placeholder={
                        newVariableType === "header" ? "Ex: Authorization" :
                        newVariableType === "query" ? "Ex: page" :
                        newVariableType === "path" ? "Ex: id" :
                        newVariableType === "form-data" ? "Ex: file" :
                        "Ex: user_id"
                      }
                    />
                  </div>

                  {/* Formato - apenas para JSON */}
                  {newVariableType === "json" && (
                    <div className="space-y-2">
                      <Label>Formato do Dado *</Label>
                      <Select value={newVariableFormat} onValueChange={setNewVariableFormat}>
                        <SelectTrigger>
                          <SelectValue placeholder="Formato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String (texto)</SelectItem>
                          <SelectItem value="number">Number (número)</SelectItem>
                          <SelectItem value="boolean">Boolean (true/false)</SelectItem>
                          <SelectItem value="object">Object (objeto)</SelectItem>
                          <SelectItem value="array">Array (lista)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Descrição - opcional para todos */}
                  <div className="space-y-2">
                    <Label>Descrição (opcional)</Label>
                    <Textarea
                      value={newVariableDescription}
                      onChange={(e) => setNewVariableDescription(e.target.value)}
                      placeholder="Descreva o propósito desta variável..."
                      rows={2}
                    />
                  </div>

                  {/* Valor padrão - apenas se não for path */}
                  {newVariableType !== "path" && (
                    <div className="space-y-2">
                      <Label>Valor Padrão (opcional)</Label>
                      <Input
                        value={newVariableDefaultValue}
                        onChange={(e) => setNewVariableDefaultValue(e.target.value)}
                        placeholder={
                          newVariableType === "json" && newVariableFormat === "boolean" ? "true ou false" :
                          newVariableType === "json" && newVariableFormat === "number" ? "Ex: 0" :
                          "Valor padrão"
                        }
                      />
                    </div>
                  )}

                  {/* Checkbox obrigatório */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="variable-required"
                      checked={newVariableRequired}
                      onCheckedChange={(checked) => setNewVariableRequired(checked as boolean)}
                    />
                    <label
                      htmlFor="variable-required"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Campo obrigatório
                    </label>
                  </div>

                  <Button type="button" onClick={handleAddVariable} size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Variável
                  </Button>
                </div>
                
                {formData.variables.length > 0 && (
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {formData.variables.map((variable) => (
                        <div key={variable.id} className="flex items-start justify-between p-3 border rounded">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{variable.name}</span>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {variable.type === "json" ? "JSON" :
                                 variable.type === "query" ? "Query" :
                                 variable.type === "header" ? "Header" :
                                 variable.type === "path" ? "Path" :
                                 "Form Data"}
                              </span>
                              {variable.required && (
                                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                                  Obrigatório
                                </span>
                              )}
                              {variable.format && (
                                <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                                  {variable.format}
                                </span>
                              )}
                            </div>
                            {variable.description && (
                              <p className="text-sm text-muted-foreground">{variable.description}</p>
                            )}
                            {variable.defaultValue && (
                              <p className="text-xs text-muted-foreground">
                                Padrão: <span className="font-mono">{variable.defaultValue}</span>
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVariable(variable.id)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </Card>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {editingWebhook ? "Atualizar" : "Adicionar"} Webhook
            </Button>
            {editingWebhook && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Lista de Webhooks */}
      <div className="space-y-2">
        <h3 className="font-semibold">Webhooks Cadastrados</h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {webhooks.map((webhook) => (
              <Card key={webhook.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{webhook.name}</h4>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {webhookTypes.find((t) => t.id === webhook.type)?.name}
                      </span>
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono">
                        {webhook.method || "POST"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground break-all">{webhook.url}</p>
                    {webhook.description && (
                      <p className="text-sm text-muted-foreground mt-1">{webhook.description}</p>
                    )}
                    {webhook.usageLocations && webhook.usageLocations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {webhook.usageLocations.map((locId) => {
                          const location = usageLocations.find((l) => l.id === locId);
                          return location ? (
                            <span key={locId} className="text-xs bg-secondary px-2 py-0.5 rounded">
                              {location.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    {webhook.hasVariables && webhook.variables && webhook.variables.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-semibold mb-1">Variáveis:</div>
                        <div className="flex flex-wrap gap-1">
                          {webhook.variables.map((variable) => (
                            <span 
                              key={variable.id} 
                              className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded"
                              title={`${variable.description} (${variable.type.toUpperCase()})`}
                            >
                              {variable.name} <span className="font-mono text-[10px] opacity-70">({variable.type})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Criado em: {new Date(webhook.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(webhook)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(webhook.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {webhooks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum webhook cadastrado
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
