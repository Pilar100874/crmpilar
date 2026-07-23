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
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2, Plus, X, Webhook, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

export interface WebhookVariable {
  id: string;
  name: string;
  type: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  format?: string;
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
  hasInputVariables: boolean;
  inputVariables?: WebhookVariable[];
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

interface WebhooksCRUDProps {
  estabelecimentoId?: string;
}

export function WebhooksCRUD({ estabelecimentoId }: WebhooksCRUDProps = {}) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [webhookTypes, setWebhookTypes] = useState<WebhookType[]>([
    { id: "n8n", name: "N8N" },
    { id: "evolution", name: "Evolution" },
    { id: "whatsapp", name: "WhatsApp Oficial" },
  ]);
  // Locais de uso fixos para todos os estabelecimentos
  const usageLocations: UsageLocation[] = [
    { id: "bot", name: "BOT" },
    { id: "teste", name: "TESTE DE WEBHOOK" },
    { id: "ia-chat", name: "IA CHAT" },
    { id: "ia-atendimento", name: "IA TELA ATENDIMENTO" },
    { id: "automacoes", name: "AUTOMAÇÕES" },
    { id: "resposta-automatica-chat", name: "RESPOSTA AUTOMATICA NO CHAT" },
    { id: "envio-massa", name: "ENVIO EM MASSA" },
  ];
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
    hasInputVariables: false,
    inputVariables: [] as WebhookVariable[],
  });
  const [newTypeName, setNewTypeName] = useState("");
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [newVariableName, setNewVariableName] = useState("");
  const [newVariableDescription, setNewVariableDescription] = useState("");
  const [newVariableType, setNewVariableType] = useState("json");
  const [newVariableDefaultValue, setNewVariableDefaultValue] = useState("");
  const [newVariableRequired, setNewVariableRequired] = useState(false);
  const [newVariableFormat, setNewVariableFormat] = useState("string");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  
  // Estados para variáveis de entrada
  const [newInputVariableName, setNewInputVariableName] = useState("");
  const [newInputVariableDescription, setNewInputVariableDescription] = useState("");
  const [newInputVariableType, setNewInputVariableType] = useState("json");
  const [newInputVariableDefaultValue, setNewInputVariableDefaultValue] = useState("");
  const [newInputVariableRequired, setNewInputVariableRequired] = useState(false);
  const [newInputVariableFormat, setNewInputVariableFormat] = useState("string");
  const [selectedInputFile, setSelectedInputFile] = useState<File | null>(null);
  const [editingInputVariableId, setEditingInputVariableId] = useState<string | null>(null);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);
  const [affectedBots, setAffectedBots] = useState<{name: string, id: string}[]>([]);
  const [showAffectedBotsDialog, setShowAffectedBotsDialog] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  const resetVariableForm = () => {
    setNewVariableName("");
    setNewVariableDescription("");
    if (formData.variables.length > 0) {
      setNewVariableType(formData.variables[0].type);
    } else {
      setNewVariableType("json");
    }
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
    loadWebhooks();
    loadTypesAndLocations();
  }, [estabelecimentoId]);

  const loadWebhooks = async () => {
    const estabId = await getEstabelecimentoId(estabelecimentoId);
    if (!estabId) return;

    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erro ao carregar webhooks");
      return;
    }

    const parsedWebhooks = (data || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      url: w.url,
      method: w.method,
      type: w.type,
      description: w.description || "",
      usageLocations: w.usage_locations || [],
      hasVariables: w.has_variables || false,
      variables: w.variables || [],
      hasInputVariables: w.has_input_variables || false,
      inputVariables: w.input_variables || [],
      createdAt: new Date(w.created_at),
    }));

    setWebhooks(parsedWebhooks);
  };

  const loadTypesAndLocations = async () => {
    const estabId = await getEstabelecimentoId(estabelecimentoId);
    if (!estabId) return;

    // Load webhook types
    const { data: types, error: typesError } = await supabase
      .from('webhook_types')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .order('name');

    if (typesError) {
      console.error("Erro ao carregar tipos:", typesError);
    } else {
      setWebhookTypes((types || []).map(t => ({ id: t.id, name: t.name })));
    }
  };

  const findBotsUsingWebhook = async (webhookId: string) => {
    try {
      const { data: botFlows, error } = await supabase
        .from('bot_flows')
        .select('id, name, flow_data');

      if (error) throw error;

      const botsUsingWebhook: {name: string, id: string}[] = [];

      botFlows?.forEach((bot) => {
        const flowData = bot.flow_data as any;
        
        if (flowData.nodes) {
          const hasWebhook = flowData.nodes.some((node: any) => {
            return node.data?.config?.selectedWebhookId === webhookId;
          });

          if (hasWebhook) {
            botsUsingWebhook.push({
              name: bot.name,
              id: bot.id
            });
          }
        }
      });

      return botsUsingWebhook;
    } catch (error) {
      console.error("Erro ao buscar bots:", error);
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.url || !formData.method || !formData.type || !formData.description || formData.usageLocations.length === 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const nameExists = webhooks.some((w) => 
      w.name === formData.name && w.id !== editingWebhook
    );
    if (nameExists) {
      toast.error("Já existe um webhook com este nome");
      return;
    }

    const methodUrlExists = webhooks.some((w) => 
      w.method === formData.method && w.url === formData.url && w.id !== editingWebhook
    );
    if (methodUrlExists) {
      toast.error("Já existe um webhook com este método e URL");
      return;
    }

    const estabId = await getEstabelecimentoId(estabelecimentoId);
    if (!estabId) {
      toast.error("Estabelecimento não identificado");
      return;
    }

    const webhookData = {
      name: formData.name,
      url: formData.url,
      method: formData.method,
      type: formData.type,
      description: formData.description,
      usage_locations: formData.usageLocations as any,
      has_variables: formData.hasVariables,
      variables: formData.variables as any,
      has_input_variables: formData.hasInputVariables,
      input_variables: formData.inputVariables as any,
      estabelecimento_id: estabId,
    };

    if (editingWebhook) {
      const oldWebhook = webhooks.find(w => w.id === editingWebhook);
      const variablesChanged = JSON.stringify(oldWebhook?.variables) !== JSON.stringify(formData.variables);
      
      if (variablesChanged) {
        const botsUsing = await findBotsUsingWebhook(editingWebhook);
        
        if (botsUsing.length > 0) {
          setAffectedBots(botsUsing);
          setShowAffectedBotsDialog(true);
        }
      }

      const { error } = await supabase
        .from('webhooks')
        .update(webhookData)
        .eq('id', editingWebhook);

      if (error) {
        toast.error("Erro ao atualizar webhook");
        return;
      }
      toast.success("Webhook atualizado!");
    } else {
      const { error } = await supabase
        .from('webhooks')
        .insert([webhookData]);

      if (error) {
        toast.error("Erro ao criar webhook");
        return;
      }
      toast.success("Webhook criado!");
    }

    handleCloseForm();
    loadWebhooks();
  };

  const handleDelete = async (id: string) => {
    const botsUsing = await findBotsUsingWebhook(id);
    
    if (botsUsing.length > 0) {
      setAffectedBots(botsUsing);
      setWebhookToDelete(id);
      setShowAffectedBotsDialog(true);
      return;
    }

    if (confirm("Tem certeza que deseja excluir este webhook?")) {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error("Erro ao excluir webhook");
        return;
      }

      toast.success("Webhook removido!");
      loadWebhooks();
    }
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) {
      toast.error("Digite um nome para o tipo");
      return;
    }

    const estabId = await getEstabelecimentoId(estabelecimentoId);
    if (!estabId) {
      toast.error("Estabelecimento não identificado");
      return;
    }

    const { error } = await supabase
      .from('webhook_types')
      .insert([{ name: newTypeName, estabelecimento_id: estabId }]);

    if (error) {
      toast.error("Erro ao adicionar tipo");
      return;
    }

    setNewTypeName("");
    toast.success("Tipo adicionado!");
    await loadTypesAndLocations();
  };

  const handleDeleteType = async (id: string) => {
    const isInUse = webhooks.some((w) => w.type === id);
    if (isInUse) {
      toast.error("Este tipo está em uso e não pode ser removido");
      return;
    }

    const { error } = await supabase
      .from('webhook_types')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erro ao remover tipo");
      return;
    }

    toast.success("Tipo removido!");
    await loadTypesAndLocations();
  };


  const resetForm = () => {
    setFormData({ 
      name: "", 
      url: "", 
      method: "POST", 
      type: "", 
      description: "", 
      usageLocations: [], 
      hasVariables: false, 
      variables: [],
      hasInputVariables: false,
      inputVariables: []
    });
    setEditingWebhook(null);
    setNewVariableName("");
    setNewVariableDescription("");
    setNewVariableType("json");
    setNewVariableDefaultValue("");
    setNewVariableRequired(false);
    setNewVariableFormat("string");
    setSelectedFile(null);
    
    setNewInputVariableName("");
    setNewInputVariableDescription("");
    setNewInputVariableType("json");
    setNewInputVariableDefaultValue("");
    setNewInputVariableRequired(false);
    setNewInputVariableFormat("string");
    setSelectedInputFile(null);
  };

  const handleOpenForm = () => {
    resetForm();
    setIsFormDialogOpen(true);
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
      hasInputVariables: webhook.hasInputVariables || false,
      inputVariables: webhook.inputVariables || [],
    });
    setIsFormDialogOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormDialogOpen(false);
    resetForm();
  };

  const handleAddVariable = () => {
    if (!newVariableName.trim()) {
      toast.error("Digite um nome para a variável");
      return;
    }

    if (formData.variables.length > 0 && !editingVariableId) {
      const existingType = formData.variables[0].type;
      if (newVariableType !== existingType) {
        setNewVariableType(existingType);
      }
    }

    const namePattern = /^[a-zA-Z0-9_-]+$/;
    if (!namePattern.test(newVariableName)) {
      toast.error("Nome inválido. Use apenas letras, números, underscore (_) ou hífen (-)");
      return;
    }

    if (newVariableType === "header") {
      const headerPattern = /^[a-zA-Z0-9-]+$/;
      if (!headerPattern.test(newVariableName)) {
        toast.error("Nome de header inválido");
        return;
      }
    }

    if (newVariableType === "query") {
      const queryPattern = /^[a-zA-Z0-9_]+$/;
      if (!queryPattern.test(newVariableName)) {
        toast.error("Nome de query param inválido");
        return;
      }
    }

    if (newVariableType === "path") {
      if (newVariableName.startsWith(":")) {
        toast.error("Remova o ':' do início");
        return;
      }
      const pathPattern = /^[a-zA-Z0-9_]+$/;
      if (!pathPattern.test(newVariableName)) {
        toast.error("Nome de path param inválido");
        return;
      }
    }

    if (newVariableType === "json" && newVariableDefaultValue) {
      if (newVariableFormat === "number") {
        if (isNaN(Number(newVariableDefaultValue))) {
          toast.error("Valor padrão deve ser um número");
          return;
        }
      } else if (newVariableFormat === "boolean") {
        if (newVariableDefaultValue !== "true" && newVariableDefaultValue !== "false") {
          toast.error("Para boolean use: true ou false");
          return;
        }
      } else if (newVariableFormat === "object") {
        try {
          const parsed = JSON.parse(newVariableDefaultValue);
          if (typeof parsed !== "object" || Array.isArray(parsed)) {
            toast.error("Deve ser um objeto JSON");
            return;
          }
        } catch (e) {
          toast.error("JSON inválido");
          return;
        }
      } else if (newVariableFormat === "array") {
        try {
          const parsed = JSON.parse(newVariableDefaultValue);
          if (!Array.isArray(parsed)) {
            toast.error("Deve ser um array JSON");
            return;
          }
        } catch (e) {
          toast.error("JSON inválido");
          return;
        }
      }
    }

    if (newVariableType === "query" && newVariableDefaultValue && newVariableDefaultValue.includes(" ")) {
      toast.error("Query param não pode ter espaços");
      return;
    }

    if (editingVariableId) {
      setFormData(prev => ({
        ...prev,
        variables: prev.variables.map(v => 
          v.id === editingVariableId 
            ? {
                ...v,
                name: newVariableName,
                type: newVariableType,
                description: newVariableDescription || undefined,
                defaultValue: newVariableDefaultValue || undefined,
                required: newVariableRequired,
                format: newVariableType === "json" ? newVariableFormat : undefined,
              }
            : v
        )
      }));
      
      const currentType = newVariableType;
      resetVariableForm();
      setNewVariableType(currentType);
      setEditingVariableId(null);
      
      toast.success("Variável atualizada!");
    } else {
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

      const currentType = newVariableType;
      resetVariableForm();
      setNewVariableType(currentType);

      toast.success("Variável adicionada!");
    }
  };

  const handleEditVariable = (variable: WebhookVariable) => {
    setEditingVariableId(variable.id);
    setNewVariableName(variable.name);
    setNewVariableType(variable.type);
    setNewVariableDescription(variable.description || "");
    setNewVariableDefaultValue(variable.defaultValue || "");
    setNewVariableRequired(variable.required || false);
    setNewVariableFormat(variable.format || "string");
  };

  const handleDeleteVariable = (variableId: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v.id !== variableId)
    }));
    toast.success("Variável removida!");
  };

  // Funções para gerenciar variáveis de entrada
  const resetInputVariableForm = () => {
    setNewInputVariableName("");
    setNewInputVariableDescription("");
    if (formData.inputVariables.length > 0) {
      setNewInputVariableType(formData.inputVariables[0].type);
    } else {
      setNewInputVariableType("json");
    }
    setNewInputVariableDefaultValue("");
    setNewInputVariableRequired(false);
    setNewInputVariableFormat("string");
    setSelectedInputFile(null);
  };

  const handleInputFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedInputFile(file);
      setNewInputVariableDefaultValue(file.name);
    }
  };

  const handleAddInputVariable = () => {
    if (!newInputVariableName.trim()) {
      toast.error("Digite um nome para a variável");
      return;
    }

    if (formData.inputVariables.length > 0 && !editingInputVariableId) {
      const existingType = formData.inputVariables[0].type;
      if (newInputVariableType !== existingType) {
        setNewInputVariableType(existingType);
      }
    }

    const namePattern = /^[a-zA-Z0-9_-]+$/;
    if (!namePattern.test(newInputVariableName)) {
      toast.error("Nome inválido. Use apenas letras, números, underscore (_) ou hífen (-)");
      return;
    }

    if (newInputVariableType === "header") {
      const headerPattern = /^[a-zA-Z0-9-]+$/;
      if (!headerPattern.test(newInputVariableName)) {
        toast.error("Nome de header inválido");
        return;
      }
    }

    if (newInputVariableType === "query") {
      const queryPattern = /^[a-zA-Z0-9_]+$/;
      if (!queryPattern.test(newInputVariableName)) {
        toast.error("Nome de query param inválido");
        return;
      }
    }

    if (newInputVariableType === "path") {
      if (newInputVariableName.startsWith(":")) {
        toast.error("Remova o ':' do início");
        return;
      }
      const pathPattern = /^[a-zA-Z0-9_]+$/;
      if (!pathPattern.test(newInputVariableName)) {
        toast.error("Nome de path param inválido");
        return;
      }
    }

    if (newInputVariableType === "json" && newInputVariableDefaultValue) {
      if (newInputVariableFormat === "number") {
        if (isNaN(Number(newInputVariableDefaultValue))) {
          toast.error("Valor padrão deve ser um número");
          return;
        }
      } else if (newInputVariableFormat === "boolean") {
        if (newInputVariableDefaultValue !== "true" && newInputVariableDefaultValue !== "false") {
          toast.error("Para boolean use: true ou false");
          return;
        }
      } else if (newInputVariableFormat === "object") {
        try {
          const parsed = JSON.parse(newInputVariableDefaultValue);
          if (typeof parsed !== "object" || Array.isArray(parsed)) {
            toast.error("Deve ser um objeto JSON");
            return;
          }
        } catch (e) {
          toast.error("JSON inválido");
          return;
        }
      } else if (newInputVariableFormat === "array") {
        try {
          const parsed = JSON.parse(newInputVariableDefaultValue);
          if (!Array.isArray(parsed)) {
            toast.error("Deve ser um array JSON");
            return;
          }
        } catch (e) {
          toast.error("JSON inválido");
          return;
        }
      }
    }

    if (newInputVariableType === "query" && newInputVariableDefaultValue && newInputVariableDefaultValue.includes(" ")) {
      toast.error("Query param não pode ter espaços");
      return;
    }

    if (editingInputVariableId) {
      setFormData(prev => ({
        ...prev,
        inputVariables: prev.inputVariables.map(v => 
          v.id === editingInputVariableId 
            ? {
                ...v,
                name: newInputVariableName,
                type: newInputVariableType,
                description: newInputVariableDescription || undefined,
                defaultValue: newInputVariableDefaultValue || undefined,
                required: newInputVariableRequired,
                format: newInputVariableType === "json" ? newInputVariableFormat : undefined,
              }
            : v
        )
      }));
      
      const currentType = newInputVariableType;
      resetInputVariableForm();
      setNewInputVariableType(currentType);
      setEditingInputVariableId(null);
      
      toast.success("Variável de entrada atualizada!");
    } else {
      const newVariable: WebhookVariable = {
        id: Date.now().toString(),
        name: newInputVariableName,
        type: newInputVariableType,
        description: newInputVariableDescription || undefined,
        defaultValue: newInputVariableDefaultValue || undefined,
        required: newInputVariableRequired,
        format: newInputVariableType === "json" ? newInputVariableFormat : undefined,
      };

      setFormData(prev => ({
        ...prev,
        inputVariables: [...prev.inputVariables, newVariable]
      }));

      const currentType = newInputVariableType;
      resetInputVariableForm();
      setNewInputVariableType(currentType);

      toast.success("Variável de entrada adicionada!");
    }
  };

  const handleEditInputVariable = (variable: WebhookVariable) => {
    setEditingInputVariableId(variable.id);
    setNewInputVariableName(variable.name);
    setNewInputVariableType(variable.type);
    setNewInputVariableDescription(variable.description || "");
    setNewInputVariableDefaultValue(variable.defaultValue || "");
    setNewInputVariableRequired(variable.required || false);
    setNewInputVariableFormat(variable.format || "string");
  };

  const handleDeleteInputVariable = (variableId: string) => {
    setFormData(prev => ({
      ...prev,
      inputVariables: prev.inputVariables.filter(v => v.id !== variableId)
    }));
    toast.success("Variável de entrada removida!");
  };

  const handleUpdateType = async (typeId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error("Digite um nome válido");
      return;
    }

    const { error } = await supabase
      .from('webhook_types')
      .update({ name: newName })
      .eq('id', typeId);

    if (error) {
      toast.error("Erro ao atualizar tipo");
      return;
    }

    setEditingTypeId(null);
    toast.success("Tipo atualizado!");
    await loadTypesAndLocations();
  };


  const filteredWebhooks = webhooks.filter((webhook) => {
    const matchesType = selectedTypeFilter === "all" || webhook.type === selectedTypeFilter;
    const matchesLocation = selectedLocationFilter === "all" || 
      webhook.usageLocations?.includes(selectedLocationFilter);
    return matchesType && matchesLocation;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Webhook className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Webhooks de Saída</h2>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Configure endpoints para integrar com sistemas externos
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenForm} size="lg" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingWebhook ? "Editar" : "Criar"} Webhook
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-3 mb-4 h-auto">
                  <TabsTrigger value="basic" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                    <span className="hidden sm:inline">Informações Básicas</span>
                    <span className="sm:hidden">Básico</span>
                  </TabsTrigger>
                  <TabsTrigger value="output" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                    <span className="hidden sm:inline">Variáveis de Saída</span>
                    <span className="sm:hidden">Saída</span>
                  </TabsTrigger>
                  <TabsTrigger value="input" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
                    <span className="hidden sm:inline">Variáveis de Entrada</span>
                    <span className="sm:hidden">Entrada</span>
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto pr-2 sm:pr-4">
                  {/* Informações Básicas */}
                  <TabsContent value="basic" className="space-y-4 sm:space-y-6 mt-0">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold mb-3">Configurações Gerais</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <Label htmlFor="name" className="text-sm">Nome *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Ex: Notificar N8N"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label htmlFor="type" className="text-sm">Tipo *</Label>
                            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                              <SelectTrigger className="mt-1">
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
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-base sm:text-lg font-semibold mb-3">Endpoint</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
                          <div className="sm:col-span-3">
                            <Label htmlFor="url" className="text-sm">URL *</Label>
                            <Input
                              id="url"
                              value={formData.url}
                              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                              placeholder="https://exemplo.com/webhook"
                              className="mt-1 font-mono text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor="method" className="text-sm">Método *</Label>
                            <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
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
                        </div>

                        <div className="mt-3 sm:mt-4">
                          <Label htmlFor="description" className="text-sm">Descrição *</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Descreva o propósito deste webhook"
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h3 className="text-base sm:text-lg font-semibold mb-3">Locais de Uso *</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                          {usageLocations.map((location) => (
                            <Card key={location.id} className="p-2.5 sm:p-3 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => {
                              const isChecked = formData.usageLocations.includes(location.id);
                              if (isChecked) {
                                setFormData({
                                  ...formData,
                                  usageLocations: formData.usageLocations.filter((id) => id !== location.id),
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  usageLocations: [...formData.usageLocations, location.id],
                                });
                              }
                            }}>
                              <div className="flex items-center space-x-2 sm:space-x-3">
                                <Checkbox
                                  id={`location-${location.id}`}
                                  checked={formData.usageLocations.includes(location.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFormData({
                                        ...formData,
                                        usageLocations: [...formData.usageLocations, location.id],
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        usageLocations: formData.usageLocations.filter((id) => id !== location.id),
                                      });
                                    }
                                  }}
                                />
                                <Label htmlFor={`location-${location.id}`} className="cursor-pointer font-medium text-xs sm:text-sm">
                                  {location.name}
                                </Label>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Variáveis de Saída */}
                  <TabsContent value="output" className="space-y-6 mt-0">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Variáveis de Saída</h3>
                        <p className="text-sm text-muted-foreground">Configure as variáveis que serão enviadas no webhook</p>
                      </div>
                      <Checkbox
                        id="hasVariables"
                        checked={formData.hasVariables}
                        onCheckedChange={(checked) => {
                          setFormData({ ...formData, hasVariables: checked as boolean });
                          if (!checked) {
                            setFormData(prev => ({ ...prev, variables: [] }));
                          }
                        }}
                      />
                    </div>

                    {formData.hasVariables ? (
                      <div className="space-y-6">
                        <Card className="p-4 border-2 border-dashed">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="varName">Nome da Variável *</Label>
                                <Input
                                  id="varName"
                                  value={newVariableName}
                                  onChange={(e) => setNewVariableName(e.target.value)}
                                  placeholder="Ex: user_id, status"
                                />
                              </div>

                              <div>
                                <Label htmlFor="varType">Tipo *</Label>
                                <Select 
                                  value={newVariableType} 
                                  onValueChange={setNewVariableType}
                                  disabled={formData.variables.length > 0 && !editingVariableId}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="json">JSON Body</SelectItem>
                                    <SelectItem value="query">Query Param</SelectItem>
                                    <SelectItem value="header">Header</SelectItem>
                                    <SelectItem value="path">Path Param</SelectItem>
                                    <SelectItem value="form-data">Form Data</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {newVariableType === "json" && (
                              <div>
                                <Label htmlFor="varFormat">Formato JSON</Label>
                                <Select value={newVariableFormat} onValueChange={setNewVariableFormat}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="object">Object</SelectItem>
                                    <SelectItem value="array">Array</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div>
                              <Label htmlFor="varDescription">Descrição</Label>
                              <Input
                                id="varDescription"
                                value={newVariableDescription}
                                onChange={(e) => setNewVariableDescription(e.target.value)}
                                placeholder="Descreva o uso desta variável"
                              />
                            </div>

                            <div>
                              <Label htmlFor="varDefault">Valor Padrão</Label>
                              {newVariableType === "form-data" ? (
                                <div>
                                  <input
                                    type="file"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="file-input"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('file-input')?.click()}
                                    className="w-full"
                                  >
                                    {selectedFile ? selectedFile.name : "Selecionar arquivo"}
                                  </Button>
                                </div>
                              ) : (
                                <Input
                                  id="varDefault"
                                  value={newVariableDefaultValue}
                                  onChange={(e) => setNewVariableDefaultValue(e.target.value)}
                                  placeholder={
                                    newVariableType === "json" && newVariableFormat === "object" ? '{"key": "value"}' :
                                    newVariableType === "json" && newVariableFormat === "array" ? '["item1", "item2"]' :
                                    "Valor padrão"
                                  }
                                />
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="varRequired"
                                checked={newVariableRequired}
                                onCheckedChange={(checked) => setNewVariableRequired(checked as boolean)}
                              />
                              <Label htmlFor="varRequired" className="cursor-pointer">
                                Obrigatório
                              </Label>
                            </div>

                            <Button 
                              type="button" 
                              onClick={handleAddVariable}
                              variant="default"
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {editingVariableId ? "Atualizar" : "Adicionar"} Variável
                            </Button>
                          </div>
                        </Card>

                        {formData.variables.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm">Variáveis Configuradas ({formData.variables.length})</h4>
                            <div className="max-h-[300px] overflow-y-auto pr-2 border rounded-md p-2 bg-muted/30">
                              <div className="space-y-2">
                                {formData.variables.map((variable) => (
                                  <Card key={variable.id} className="p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-mono text-sm font-semibold truncate">{variable.name}</span>
                                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md shrink-0">
                                            {variable.type === "json" ? "JSON" :
                                            variable.type === "query" ? "Query" :
                                            variable.type === "header" ? "Header" :
                                            variable.type === "path" ? "Path" :
                                            "Form Data"}
                                          </span>
                                          {variable.required && (
                                            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-md shrink-0">
                                              Obrigatório
                                            </span>
                                          )}
                                          {variable.format && (
                                            <span className="text-xs bg-secondary px-2 py-0.5 rounded-md shrink-0">
                                              {variable.format}
                                            </span>
                                          )}
                                        </div>
                                        {variable.description && (
                                          <p className="text-xs text-muted-foreground truncate">{variable.description}</p>
                                        )}
                                        {variable.defaultValue && (
                                          <p className="text-xs text-muted-foreground">
                                            Padrão: <span className="font-mono text-xs">{variable.defaultValue}</span>
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleEditVariable(variable)}
                                          disabled={editingVariableId !== null && editingVariableId !== variable.id}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleDeleteVariable(variable.id)}
                                          disabled={editingVariableId !== null}
                                        >
                                          <X className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pré-visualização da requisição */}
                        {(() => {
                          const vars = formData.variables || [];
                          const sample = (v: WebhookVariable) => {
                            const val = v.defaultValue && v.defaultValue.trim() ? v.defaultValue : `{{${v.name}}}`;
                            if (v.format === "number") return Number.isFinite(Number(val)) ? Number(val) : val;
                            if (v.format === "boolean") return val === "true" || val === "1";
                            if (v.format === "object" || v.format === "array") {
                              try { return JSON.parse(val); } catch { return val; }
                            }
                            return val;
                          };

                          let urlPreview = formData.url || "https://exemplo.com/webhook";
                          vars.filter(v => v.type === "path").forEach(v => {
                            const re = new RegExp(`(:${v.name}\\b|\\{${v.name}\\})`, "g");
                            const s = String(sample(v));
                            if (re.test(urlPreview)) urlPreview = urlPreview.replace(re, encodeURIComponent(s));
                            else urlPreview = urlPreview.replace(/\/?$/, `/${encodeURIComponent(s)}`);
                          });
                          const queryVars = vars.filter(v => v.type === "query");
                          if (queryVars.length) {
                            const qs = queryVars.map(v => `${encodeURIComponent(v.name)}=${encodeURIComponent(String(sample(v)))}`).join("&");
                            urlPreview += (urlPreview.includes("?") ? "&" : "?") + qs;
                          }

                          const headers: Record<string, string> = {};
                          vars.filter(v => v.type === "header").forEach(v => { headers[v.name] = String(sample(v)); });

                          const jsonVars = vars.filter(v => v.type === "json");
                          const formVars = vars.filter(v => v.type === "form-data");
                          let bodyLabel = "";
                          let bodyContent = "";
                          if (jsonVars.length) {
                            headers["Content-Type"] = headers["Content-Type"] || "application/json";
                            const obj: Record<string, any> = {};
                            jsonVars.forEach(v => { obj[v.name] = sample(v); });
                            bodyLabel = "Body (JSON)";
                            bodyContent = JSON.stringify(obj, null, 2);
                          } else if (formVars.length) {
                            headers["Content-Type"] = headers["Content-Type"] || "multipart/form-data";
                            bodyLabel = "Body (form-data)";
                            bodyContent = formVars.map(v => `${v.name}=${sample(v)}`).join("\n");
                          }

                          return (
                            <Card className="p-4 bg-muted/40">
                              <h4 className="text-sm font-semibold mb-3">Pré-visualização da Requisição</h4>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs text-muted-foreground">URL ({formData.method})</Label>
                                  <pre className="mt-1 p-2 rounded bg-background border font-mono text-xs whitespace-pre-wrap break-all">{formData.method} {urlPreview}</pre>
                                </div>
                                {Object.keys(headers).length > 0 && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Headers</Label>
                                    <pre className="mt-1 p-2 rounded bg-background border font-mono text-xs whitespace-pre-wrap break-all">
{Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\n")}
                                    </pre>
                                  </div>
                                )}
                                {bodyContent && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">{bodyLabel}</Label>
                                    <pre className="mt-1 p-2 rounded bg-background border font-mono text-xs whitespace-pre-wrap break-all">{bodyContent}</pre>
                                  </div>
                                )}
                                {!bodyContent && Object.keys(headers).length === 0 && queryVars.length === 0 && vars.filter(v => v.type === "path").length === 0 && (
                                  <p className="text-xs text-muted-foreground italic">Adicione variáveis acima para ver o conteúdo que será enviado.</p>
                                )}
                              </div>
                            </Card>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>Ative o checkbox acima para configurar variáveis de saída</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Variáveis de Entrada */}
                  <TabsContent value="input" className="space-y-6 mt-0">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Variáveis de Entrada</h3>
                        <p className="text-sm text-muted-foreground">Configure as variáveis que serão recebidas pelo webhook</p>
                      </div>
                      <Checkbox
                        id="hasInputVariables"
                        checked={formData.hasInputVariables}
                        onCheckedChange={(checked) => {
                          setFormData({ ...formData, hasInputVariables: checked as boolean });
                          if (!checked) {
                            setFormData(prev => ({ ...prev, inputVariables: [] }));
                          }
                        }}
                      />
                    </div>

                    {formData.hasInputVariables ? (
                      <div className="space-y-6">
                        <Card className="p-4 border-2 border-dashed">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="inputVarName">Nome da Variável *</Label>
                                <Input
                                  id="inputVarName"
                                  value={newInputVariableName}
                                  onChange={(e) => setNewInputVariableName(e.target.value)}
                                  placeholder="Ex: user_id, status"
                                />
                              </div>

                              <div>
                                <Label htmlFor="inputVarType">Tipo *</Label>
                                <Select 
                                  value={newInputVariableType} 
                                  onValueChange={setNewInputVariableType}
                                  disabled={formData.inputVariables.length > 0 && !editingInputVariableId}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="json">JSON Body</SelectItem>
                                    <SelectItem value="query">Query Param</SelectItem>
                                    <SelectItem value="header">Header</SelectItem>
                                    <SelectItem value="path">Path Param</SelectItem>
                                    <SelectItem value="form-data">Form Data</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {newInputVariableType === "json" && (
                              <div>
                                <Label htmlFor="inputVarFormat">Formato JSON</Label>
                                <Select value={newInputVariableFormat} onValueChange={setNewInputVariableFormat}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="object">Object</SelectItem>
                                    <SelectItem value="array">Array</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div>
                              <Label htmlFor="inputVarDescription">Descrição</Label>
                              <Input
                                id="inputVarDescription"
                                value={newInputVariableDescription}
                                onChange={(e) => setNewInputVariableDescription(e.target.value)}
                                placeholder="Descreva o uso desta variável"
                              />
                            </div>

                            <div>
                              <Label htmlFor="inputVarDefault">Valor Padrão</Label>
                              {newInputVariableType === "form-data" ? (
                                <div>
                                  <input
                                    type="file"
                                    onChange={handleInputFileSelect}
                                    className="hidden"
                                    id="input-file-input"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('input-file-input')?.click()}
                                    className="w-full"
                                  >
                                    {selectedInputFile ? selectedInputFile.name : "Selecionar arquivo"}
                                  </Button>
                                </div>
                              ) : (
                                <Input
                                  id="inputVarDefault"
                                  value={newInputVariableDefaultValue}
                                  onChange={(e) => setNewInputVariableDefaultValue(e.target.value)}
                                  placeholder={
                                    newInputVariableType === "json" && newInputVariableFormat === "object" ? '{"key": "value"}' :
                                    newInputVariableType === "json" && newInputVariableFormat === "array" ? '["item1", "item2"]' :
                                    "Valor padrão"
                                  }
                                />
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="inputVarRequired"
                                checked={newInputVariableRequired}
                                onCheckedChange={(checked) => setNewInputVariableRequired(checked as boolean)}
                              />
                              <Label htmlFor="inputVarRequired" className="cursor-pointer">
                                Obrigatório
                              </Label>
                            </div>

                            <Button 
                              type="button" 
                              onClick={handleAddInputVariable}
                              variant="default"
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {editingInputVariableId ? "Atualizar" : "Adicionar"} Variável
                            </Button>
                          </div>
                        </Card>

                        {formData.inputVariables.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm">Variáveis Configuradas ({formData.inputVariables.length})</h4>
                            <div className="max-h-[300px] overflow-y-auto pr-2 border rounded-md p-2 bg-muted/30">
                              <div className="space-y-2">
                                {formData.inputVariables.map((variable) => (
                                  <Card key={variable.id} className="p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-mono text-sm font-semibold truncate">{variable.name}</span>
                                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md shrink-0">
                                            {variable.type === "json" ? "JSON" :
                                            variable.type === "query" ? "Query" :
                                            variable.type === "header" ? "Header" :
                                            variable.type === "path" ? "Path" :
                                            "Form Data"}
                                          </span>
                                          {variable.required && (
                                            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-md shrink-0">
                                              Obrigatório
                                            </span>
                                          )}
                                          {variable.format && (
                                            <span className="text-xs bg-secondary px-2 py-0.5 rounded-md shrink-0">
                                              {variable.format}
                                            </span>
                                          )}
                                        </div>
                                        {variable.description && (
                                          <p className="text-xs text-muted-foreground truncate">{variable.description}</p>
                                        )}
                                        {variable.defaultValue && (
                                          <p className="text-xs text-muted-foreground">
                                            Padrão: <span className="font-mono text-xs">{variable.defaultValue}</span>
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleEditInputVariable(variable)}
                                          disabled={editingInputVariableId !== null && editingInputVariableId !== variable.id}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleDeleteInputVariable(variable.id)}
                                          disabled={editingInputVariableId !== null}
                                        >
                                          <X className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>Ative o checkbox acima para configurar variáveis de entrada</p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex gap-3 pt-4 border-t mt-4">
                <Button type="submit" className="flex-1">
                  {editingWebhook ? "Atualizar" : "Criar"} Webhook
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Tipos</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerenciar Tipos de Webhook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do novo tipo"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                />
                <Button onClick={handleAddType}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {webhookTypes.map((type) => (
                    <div key={type.id} className="flex items-center justify-between p-2 border rounded">
                      {editingTypeId === type.id ? (
                        <Input
                          value={type.name}
                          onChange={(e) => {
                            const newTypes = webhookTypes.map(t =>
                              t.id === type.id ? { ...t, name: e.target.value } : t
                            );
                            setWebhookTypes(newTypes);
                          }}
                          onBlur={() => handleUpdateType(type.id, type.name)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateType(type.id, type.name);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span>{type.name}</span>
                      )}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTypeId(type.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteType(type.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>

      {/* Filtros responsivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label className="text-sm mb-1.5 block">Filtrar por Tipo</Label>
          <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {webhookTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm mb-1.5 block">Filtrar por Local</Label>
          <Select value={selectedLocationFilter} onValueChange={setSelectedLocationFilter}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os locais</SelectItem>
              {usageLocations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de webhooks */}
      <div className="space-y-3 sm:space-y-4">
        {filteredWebhooks.map((webhook) => (
          <Card key={webhook.id} className="overflow-hidden hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/50">
            <div className="p-3 sm:p-4 lg:p-5">
              {/* Header do card - responsivo */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
                  {/* Nome e badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">
                      {webhook.name}
                    </h4>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-[10px] sm:text-xs bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-medium">
                        {webhookTypes.find((t) => t.id === webhook.type)?.name}
                      </span>
                      <span className="text-[10px] sm:text-xs bg-secondary text-secondary-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-mono font-medium">
                        {webhook.method || "POST"}
                      </span>
                    </div>
                  </div>

                  {/* URL - truncada em mobile */}
                  <div className="bg-muted/50 rounded-md px-2 sm:px-3 py-1.5 sm:py-2">
                    <p className="text-xs sm:text-sm text-muted-foreground font-mono truncate sm:break-all sm:whitespace-normal">
                      {webhook.url}
                    </p>
                  </div>

                  {/* Descrição */}
                  {webhook.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{webhook.description}</p>
                  )}

                  {/* Locais de uso */}
                  {webhook.usageLocations && webhook.usageLocations.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {webhook.usageLocations.slice(0, 4).map((locId) => {
                        const location = usageLocations.find((l) => l.id === locId);
                        return location ? (
                          <span key={locId} className="text-[10px] sm:text-xs bg-accent/50 text-accent-foreground px-1.5 sm:px-2 py-0.5 rounded">
                            {location.name}
                          </span>
                        ) : null;
                      })}
                      {webhook.usageLocations.length > 4 && (
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          +{webhook.usageLocations.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Variáveis */}
                  {webhook.hasVariables && webhook.variables && webhook.variables.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-[10px] sm:text-xs font-semibold mb-1.5 text-muted-foreground">
                        Variáveis ({webhook.variables.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {webhook.variables.slice(0, 5).map((variable) => (
                          <span 
                            key={variable.id} 
                            className="text-[10px] sm:text-xs bg-primary/5 border border-primary/20 text-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded"
                            title={`${variable.description || ''} (${variable.type.toUpperCase()})`}
                          >
                            {variable.name}
                            {variable.required && <span className="text-destructive ml-0.5">*</span>}
                          </span>
                        ))}
                        {webhook.variables.length > 5 && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground px-1">
                            +{webhook.variables.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Data de criação - hidden em mobile */}
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                    Criado em {new Date(webhook.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Botões de ação - responsivos */}
                <div className="flex sm:flex-col gap-2 justify-end sm:justify-start">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(webhook)} 
                    className="h-8 px-3 sm:h-9 sm:w-9 sm:p-0 flex items-center gap-2"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sm:hidden text-xs">Editar</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(webhook.id)} 
                    className="h-8 px-3 sm:h-9 sm:w-9 sm:p-0 flex items-center gap-2 hover:bg-destructive/10 hover:border-destructive/50"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    <span className="sm:hidden text-xs text-destructive">Excluir</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* Estado vazio com filtros */}
        {filteredWebhooks.length === 0 && webhooks.length > 0 && (
          <Card className="p-8 sm:p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-muted mb-4">
                <Webhook className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium text-sm sm:text-base">Nenhum webhook encontrado</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Não há webhooks para os filtros selecionados
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSelectedLocationFilter("all");
                  setSelectedTypeFilter("all");
                }}
                className="mt-4"
              >
                Limpar filtros
              </Button>
            </div>
          </Card>
        )}

        {/* Estado vazio sem webhooks */}
        {webhooks.length === 0 && (
          <Card className="p-8 sm:p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-muted mb-4">
                <Webhook className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium text-sm sm:text-base">Nenhum webhook cadastrado</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Clique em "Novo Webhook" para começar
              </p>
            </div>
          </Card>
        )}
      </div>

      <AlertDialog open={showAffectedBotsDialog} onOpenChange={setShowAffectedBotsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <AlertDialogTitle>Atenção: Bots Afetados</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3">
              <p>
                {webhookToDelete 
                  ? "Este webhook está sendo usado pelos seguintes bots:"
                  : "As variáveis foram alteradas. Os seguintes bots usam este webhook e podem ser afetados:"
                }
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                {affectedBots.map(bot => (
                  <li key={bot.id} className="text-sm">{bot.name}</li>
                ))}
              </ul>
              {webhookToDelete ? (
                <p className="text-destructive font-medium">
                  Se continuar, os bots podem parar de funcionar corretamente.
                </p>
              ) : (
                <p className="text-yellow-600 font-medium">
                  Certifique-se de atualizar os bots para refletir as novas variáveis.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setWebhookToDelete(null);
              setAffectedBots([]);
            }}>
              Cancelar
            </AlertDialogCancel>
            {webhookToDelete && (
              <Button
                variant="destructive"
                onClick={async () => {
                  const { error } = await supabase
                    .from('webhooks')
                    .delete()
                    .eq('id', webhookToDelete);

                  if (error) {
                    toast.error("Erro ao excluir webhook");
                  } else {
                    toast.success("Webhook removido!");
                    loadWebhooks();
                  }
                  
                  setShowAffectedBotsDialog(false);
                  setWebhookToDelete(null);
                  setAffectedBots([]);
                }}
              >
                Excluir Mesmo Assim
              </Button>
            )}
            {!webhookToDelete && (
              <Button onClick={() => setShowAffectedBotsDialog(false)}>
                Entendi
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
