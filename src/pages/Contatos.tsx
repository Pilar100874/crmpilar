import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, MoreVertical, ArrowLeft, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface CustomField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "date" | "number";
  category: "contact" | "company";
  options?: string[];
}

export default function Contatos() {
  const [showForm, setShowForm] = useState(false);
  const [contactFields, setContactFields] = useState<CustomField[]>([
    { id: "name", label: "Nome de contato", type: "text", category: "contact" },
    { id: "phone", label: "Telefone", type: "phone", category: "contact" },
    { id: "email", label: "E-mail", type: "email", category: "contact" },
    { id: "position", label: "Posição", type: "text", category: "contact" },
  ]);
  const [companyFields, setCompanyFields] = useState<CustomField[]>([
    { id: "company_name", label: "Nome da empresa", type: "text", category: "company" },
    { id: "company_phone", label: "Telefone", type: "phone", category: "company" },
    { id: "company_email", label: "E-mail", type: "email", category: "company" },
    { id: "site", label: "Site", type: "text", category: "company" },
    { id: "address", label: "Endereço", type: "text", category: "company" },
  ]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomField["type"]>("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [activeFieldTab, setActiveFieldTab] = useState<"contact" | "company">("contact");

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      toast.error("Digite um nome para o campo");
      return;
    }

    const newField: CustomField = {
      id: `custom_${Date.now()}`,
      label: newFieldLabel,
      type: newFieldType,
      category: activeFieldTab,
      options: newFieldType === "select" && newFieldOptions ? newFieldOptions.split(",").map(o => o.trim()) : undefined,
    };

    if (activeFieldTab === "contact") {
      setContactFields([...contactFields, newField]);
    } else {
      setCompanyFields([...companyFields, newField]);
    }

    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldOptions("");
    toast.success("Campo adicionado com sucesso");
  };

  const handleRemoveField = (fieldId: string, category: "contact" | "company") => {
    if (category === "contact") {
      setContactFields(contactFields.filter(f => f.id !== fieldId));
    } else {
      setCompanyFields(companyFields.filter(f => f.id !== fieldId));
    }
    toast.success("Campo removido com sucesso");
  };

  const renderField = (field: CustomField) => {
    const value = formData[field.id] || "";
    
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={field.id}
            placeholder="..."
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
          />
        );
      case "select":
        return (
          <Select value={value} onValueChange={(val) => setFormData({ ...formData, [field.id]: val })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true}
              onCheckedChange={(checked) => setFormData({ ...formData, [field.id]: checked })}
            />
            <label htmlFor={field.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Sim
            </label>
          </div>
        );
      default:
        return (
          <Input
            id={field.id}
            type={field.type}
            placeholder="..."
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
          />
        );
    }
  };

  const handleSaveContact = () => {
    toast.success("Contato salvo com sucesso");
    setShowForm(false);
    setFormData({});
  };

  if (!showForm) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background">
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Contato
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="text-center text-muted-foreground py-12">
            Nenhum contato cadastrado. Clique em "Novo Contato" para começar.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowForm(false)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Nome completo</h1>
          <Button variant="ghost" size="sm" className="gap-2 ml-auto">
            #ADICIONAR TAGS
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="principal" className="w-full">
          <div className="border-b border-border bg-card px-6">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger 
                value="principal" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
              >
                Principal
              </TabsTrigger>
              <TabsTrigger 
                value="leads"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
              >
                Leads
              </TabsTrigger>
              <TabsTrigger 
                value="configuracoes"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
              >
                Configurações
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="principal" className="p-6 space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground/70">INFORMAÇÕES DO CONTATO</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="responsible">Usuário responsável</Label>
                  <Input
                    id="responsible"
                    placeholder="Marcos P"
                    value={formData.responsible || ""}
                    onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  />
                </div>

                {contactFields.map((field) => (
                  <div key={field.id}>
                    <Label htmlFor={field.id}>{field.label}</Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground/70">Adicionar empresa</h3>
              </div>

              <div className="space-y-4">
                {companyFields.map((field) => (
                  <div key={field.id}>
                    <Label htmlFor={field.id}>{field.label}</Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>

              <Button variant="link" className="text-muted-foreground p-0 h-auto">
                cancelar
              </Button>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveContact}>
                Salvar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="leads" className="p-6">
            <div className="text-center text-muted-foreground py-12">
              Nenhum lead associado a este contato
            </div>
          </TabsContent>

          <TabsContent value="configuracoes" className="p-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Campos e grupos</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Adicione seus próprios campos personalizados. Eles são ótimos para filtrar dados e compilar relatórios.
                  </p>
                </div>

                <Tabs value={activeFieldTab} onValueChange={(v) => setActiveFieldTab(v as "contact" | "company")} className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="contact">Campos de Contato</TabsTrigger>
                    <TabsTrigger value="company">Campos de Empresa</TabsTrigger>
                  </TabsList>

                  <TabsContent value="contact" className="space-y-4 mt-6">
                    <div className="space-y-3">
                      {contactFields.map((field) => (
                        <div key={field.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{field.label}</span>
                              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                                {field.type}
                              </span>
                            </div>
                            {field.options && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Opções: {field.options.join(", ")}
                              </div>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveField(field.id, "contact")}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-6 space-y-4">
                      <h4 className="text-sm font-semibold">Adicionar novo campo</h4>
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="newFieldLabel">Nome do campo</Label>
                          <Input
                            id="newFieldLabel"
                            placeholder="Ex: Cargo, Departamento..."
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="newFieldType">Tipo de campo</Label>
                          <Select value={newFieldType} onValueChange={(val: any) => setNewFieldType(val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="phone">Telefone</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="textarea">Texto longo</SelectItem>
                              <SelectItem value="select">Lista de opções</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {newFieldType === "select" && (
                          <div>
                            <Label htmlFor="newFieldOptions">Opções (separadas por vírgula)</Label>
                            <Input
                              id="newFieldOptions"
                              placeholder="Opção 1, Opção 2, Opção 3"
                              value={newFieldOptions}
                              onChange={(e) => setNewFieldOptions(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Digite as opções separadas por vírgula
                            </p>
                          </div>
                        )}

                        <Button onClick={handleAddField} className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar campo
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="company" className="space-y-4 mt-6">
                    <div className="space-y-3">
                      {companyFields.map((field) => (
                        <div key={field.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{field.label}</span>
                              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                                {field.type}
                              </span>
                            </div>
                            {field.options && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Opções: {field.options.join(", ")}
                              </div>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveField(field.id, "company")}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-6 space-y-4">
                      <h4 className="text-sm font-semibold">Adicionar novo campo</h4>
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="newFieldLabel">Nome do campo</Label>
                          <Input
                            id="newFieldLabel"
                            placeholder="Ex: CNPJ, Setor..."
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="newFieldType">Tipo de campo</Label>
                          <Select value={newFieldType} onValueChange={(val: any) => setNewFieldType(val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="phone">Telefone</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="textarea">Texto longo</SelectItem>
                              <SelectItem value="select">Lista de opções</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {newFieldType === "select" && (
                          <div>
                            <Label htmlFor="newFieldOptions">Opções (separadas por vírgula)</Label>
                            <Input
                              id="newFieldOptions"
                              placeholder="Opção 1, Opção 2, Opção 3"
                              value={newFieldOptions}
                              onChange={(e) => setNewFieldOptions(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Digite as opções separadas por vírgula
                            </p>
                          </div>
                        )}

                        <Button onClick={handleAddField} className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar campo
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
