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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const resetVariableForm = () => {
    setNewVariableName("");
    setNewVariableDescription("");
    setNewVariableType("json");
    setNewVariableDefaultValue("");
    setNewVariableRequired(false);
    setNewVariableFormat("string");
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setNewVariableDefaultValue(file.name);
    }
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

    // Validações específicas por tipo
    
    // 1. Validar nome da variável (sem caracteres especiais problemáticos)
    const namePattern = /^[a-zA-Z0-9_-]+$/;
    if (!namePattern.test(newVariableName)) {
      toast.error("Nome inválido. Use apenas letras, números, underscore (_) ou hífen (-). Exemplo: user_id, user-name");
      return;
    }

    // 2. Validar Headers (não pode ter espaços ou caracteres especiais no nome)
    if (newVariableType === "header") {
      const headerPattern = /^[a-zA-Z0-9-]+$/;
      if (!headerPattern.test(newVariableName)) {
        toast.error("Nome de header inválido. Correto: Authorization, X-API-Key, Content-Type");
        return;
      }
    }

    // 3. Validar Query Params (formato de parâmetro URL)
    if (newVariableType === "query") {
      const queryPattern = /^[a-zA-Z0-9_]+$/;
      if (!queryPattern.test(newVariableName)) {
        toast.error("Nome de query param inválido. Correto: page, user_id, filter_status");
        return;
      }
    }

    // 4. Validar Path Params (não pode começar com :)
    if (newVariableType === "path") {
      if (newVariableName.startsWith(":")) {
        toast.error("Remova o ':' do início. Correto: id, userId, productId (sem ':'");
        return;
      }
      const pathPattern = /^[a-zA-Z0-9_]+$/;
      if (!pathPattern.test(newVariableName)) {
        toast.error("Nome de path param inválido. Correto: id, userId, product_id");
        return;
      }
    }

    // 5. Validar valor padrão para JSON com formato específico
    if (newVariableType === "json" && newVariableDefaultValue) {
      if (newVariableFormat === "number") {
        if (isNaN(Number(newVariableDefaultValue))) {
          toast.error(`Valor padrão deve ser um número. Você digitou: "${newVariableDefaultValue}". Correto: 123, 45.67, -10`);
          return;
        }
      } else if (newVariableFormat === "boolean") {
        if (newVariableDefaultValue !== "true" && newVariableDefaultValue !== "false") {
          toast.error(`Valor inválido: "${newVariableDefaultValue}". Para boolean use exatamente: true ou false`);
          return;
        }
      } else if (newVariableFormat === "object") {
        try {
          const parsed = JSON.parse(newVariableDefaultValue);
          if (typeof parsed !== "object" || Array.isArray(parsed)) {
            toast.error('Deve ser um objeto JSON. Correto: {"name": "João", "age": 30}');
            return;
          }
        } catch (e) {
          toast.error(`JSON inválido: "${newVariableDefaultValue}". Correto: {"chave": "valor", "numero": 123}`);
          return;
        }
      } else if (newVariableFormat === "array") {
        try {
          const parsed = JSON.parse(newVariableDefaultValue);
          if (!Array.isArray(parsed)) {
            toast.error('Deve ser um array JSON. Correto: ["item1", "item2", "item3"] ou [1, 2, 3]');
            return;
          }
        } catch (e) {
          toast.error(`JSON inválido: "${newVariableDefaultValue}". Correto: ["item1", "item2"] ou [1, 2, 3]`);
          return;
        }
      }
    }

    // 6. Validar Query Params - valor padrão não pode ter espaços
    if (newVariableType === "query" && newVariableDefaultValue) {
      if (newVariableDefaultValue.includes(" ")) {
        toast.error(`Query param não pode ter espaços. Você digitou: "${newVariableDefaultValue}". Use: active, pendente, usuario-ativo`);
        return;
      }
    }

    // 7. Validar Form Data - se não tem arquivo e não tem valor padrão
    if (newVariableType === "form-data" && !selectedFile && !newVariableDefaultValue) {
      // Permite criar sem valor padrão
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
                    <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                      {newVariableType === "json" && (
                        <>
                          <strong>Exemplo:</strong> {`{ "user_id": "12345" }`}
                        </>
                      )}
                      {newVariableType === "query" && (
                        <>
                          <strong>Exemplo:</strong> https://api.com/users?page=1&limit=10
                        </>
                      )}
                      {newVariableType === "header" && (
                        <>
                          <strong>Exemplo:</strong> Authorization: Bearer token123
                        </>
                      )}
                      {newVariableType === "path" && (
                        <>
                          <strong>Exemplo:</strong> https://api.com/users/:id/profile
                        </>
                      )}
                      {newVariableType === "form-data" && (
                        <>
                          <strong>Exemplo:</strong> Content-Type: multipart/form-data
                        </>
                      )}
                    </div>
                  </div>

                  {/* Nome da variável */}
                  <div className="space-y-2">
                    <Label>Nome da Variável *</Label>
                    <Input
                      value={newVariableName}
                      onChange={(e) => setNewVariableName(e.target.value)}
                      placeholder={
                        newVariableType === "header" ? "Authorization, Content-Type, X-API-Key..." :
                        newVariableType === "query" ? "page, limit, search, filter..." :
                        newVariableType === "path" ? "id, userId, productId..." :
                        newVariableType === "form-data" ? "file, image, document..." :
                        "user_id, email, name, phone..."
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {newVariableType === "header" && "Use apenas letras, números e hífen (ex: X-API-Key)"}
                      {newVariableType === "query" && "Use apenas letras, números e underscore (ex: user_id)"}
                      {newVariableType === "path" && "Use apenas letras, números e underscore, sem ':' (ex: userId)"}
                      {newVariableType === "form-data" && "Use apenas letras, números, underscore ou hífen"}
                      {newVariableType === "json" && "Use apenas letras, números, underscore ou hífen"}
                    </p>
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
                      <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                        {newVariableFormat === "string" && (
                          <><strong>Exemplo:</strong> "João Silva", "user@email.com"</>
                        )}
                        {newVariableFormat === "number" && (
                          <><strong>Exemplo:</strong> 123, 45.67, -10 (somente números)</>
                        )}
                        {newVariableFormat === "boolean" && (
                          <><strong>Exemplo:</strong> true ou false (exatamente assim)</>
                        )}
                        {newVariableFormat === "object" && (
                          <><strong>Exemplo JSON:</strong> {`{"name": "João", "age": 30}`}</>
                        )}
                        {newVariableFormat === "array" && (
                          <><strong>Exemplo JSON:</strong> ["item1", "item2", "item3"]</>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Descrição - opcional para todos */}
                  <div className="space-y-2">
                    <Label>Descrição (opcional)</Label>
                    <Textarea
                      value={newVariableDescription}
                      onChange={(e) => setNewVariableDescription(e.target.value)}
                      placeholder={
                        newVariableType === "header" ? "Ex: Token de autenticação do usuário" :
                        newVariableType === "query" ? "Ex: Número da página para paginação" :
                        newVariableType === "path" ? "Ex: ID único do usuário no sistema" :
                        newVariableType === "form-data" ? "Ex: Arquivo de imagem do perfil" :
                        "Ex: Identificador único do usuário no sistema"
                      }
                      rows={2}
                    />
                  </div>

                  {/* Valor padrão - apenas se não for path */}
                  {newVariableType !== "path" && (
                    <div className="space-y-2">
                      <Label>Valor Padrão (opcional)</Label>
                      
                      {newVariableType === "form-data" ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              type="file"
                              onChange={handleFileSelect}
                              className="flex-1"
                              accept="*/*"
                            />
                            {selectedFile && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedFile(null);
                                  setNewVariableDefaultValue("");
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {selectedFile && (
                            <div className="text-xs bg-secondary/50 p-2 rounded flex items-center gap-2">
                              <span className="font-medium">Arquivo selecionado:</span>
                              <span className="font-mono">{selectedFile.name}</span>
                              <span className="text-muted-foreground">
                                ({(selectedFile.size / 1024).toFixed(2)} KB)
                              </span>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Selecione um arquivo que será usado como padrão quando nenhum for fornecido
                          </p>
                        </div>
                      ) : (
                        <>
                          <Input
                            value={newVariableDefaultValue}
                            onChange={(e) => setNewVariableDefaultValue(e.target.value)}
                            placeholder={
                              newVariableType === "header" ? "Bearer token123, application/json..." :
                              newVariableType === "query" ? "1, 10, active..." :
                              newVariableType === "json" && newVariableFormat === "boolean" ? "true ou false" :
                              newVariableType === "json" && newVariableFormat === "number" ? "0, 1, 100..." :
                              newVariableType === "json" && newVariableFormat === "string" ? "Não informado, N/A, Vazio..." :
                              "Valor que será usado se nenhum for fornecido"
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Valor usado quando a variável não for fornecida na requisição
                          </p>
                        </>
                      )}
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
