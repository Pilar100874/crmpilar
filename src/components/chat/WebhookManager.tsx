import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Trash2, Edit, Plus, X } from "lucide-react";
import { WebhookConfig, WebhookType } from "@/pages/ChatWebhook";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WebhookManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhooks: WebhookConfig[];
  webhookTypes: WebhookType[];
  onWebhooksChange: (webhooks: WebhookConfig[]) => void;
  onWebhookTypesChange: (types: WebhookType[]) => void;
}

export default function WebhookManager({
  open,
  onOpenChange,
  webhooks,
  webhookTypes,
  onWebhooksChange,
  onWebhookTypesChange,
}: WebhookManagerProps) {
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [formData, setFormData] = useState({ name: "", url: "", type: "" });
  const [newTypeName, setNewTypeName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.url || !formData.type) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (editingWebhook) {
      onWebhooksChange(
        webhooks.map((w) =>
          w.id === editingWebhook.id
            ? { ...w, name: formData.name, url: formData.url, type: formData.type }
            : w
        )
      );
      toast.success("Webhook atualizado com sucesso");
    } else {
      const newWebhook: WebhookConfig = {
        id: Date.now().toString(),
        name: formData.name,
        url: formData.url,
        type: formData.type,
        createdAt: new Date(),
      };
      onWebhooksChange([...webhooks, newWebhook]);
      toast.success("Webhook criado com sucesso");
    }

    resetForm();
  };

  const handleEdit = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData({ name: webhook.name, url: webhook.url, type: webhook.type });
  };

  const handleDelete = (id: string) => {
    onWebhooksChange(webhooks.filter((w) => w.id !== id));
    toast.success("Webhook excluído com sucesso");
  };

  const handleAddType = () => {
    if (!newTypeName.trim()) {
      toast.error("Digite um nome para o tipo");
      return;
    }

    const newType: WebhookType = {
      id: newTypeName.toLowerCase().replace(/\s+/g, "_"),
      name: newTypeName,
    };

    onWebhookTypesChange([...webhookTypes, newType]);
    setNewTypeName("");
    toast.success("Tipo adicionado com sucesso");
  };

  const handleDeleteType = (id: string) => {
    // Check if any webhook uses this type
    const hasWebhooks = webhooks.some((w) => w.type === id);
    if (hasWebhooks) {
      toast.error("Não é possível excluir um tipo que está sendo usado por webhooks");
      return;
    }

    onWebhookTypesChange(webhookTypes.filter((t) => t.id !== id));
    toast.success("Tipo excluído com sucesso");
  };

  const resetForm = () => {
    setFormData({ name: "", url: "", type: "" });
    setEditingWebhook(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Webhooks</DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova webhooks e tipos de webhook
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="webhooks" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="types">Tipos de Webhook</TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Meu Webhook N8N"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                  type="url"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingWebhook ? "Atualizar" : "Adicionar"}
                </Button>
                {editingWebhook && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {webhooks.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum webhook cadastrado
                  </div>
                ) : (
                  webhooks.map((webhook) => (
                    <Card key={webhook.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold truncate">{webhook.name}</h4>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {webhookTypes.find((t) => t.id === webhook.type)?.name || webhook.type}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{webhook.url}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Criado em {format(webhook.createdAt, "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(webhook)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(webhook.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="types" className="space-y-4 mt-4">
            <div className="flex gap-2 p-4 bg-muted/50 rounded-lg">
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Nome do novo tipo"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddType();
                  }
                }}
              />
              <Button onClick={handleAddType}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {webhookTypes.map((type) => (
                  <Card key={type.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{type.name}</h4>
                        <p className="text-xs text-muted-foreground">ID: {type.id}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteType(type.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
