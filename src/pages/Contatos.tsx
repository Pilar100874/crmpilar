import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, ArrowLeft, Trash2, GripVertical, Search, Filter, Calendar, X } from "lucide-react";
import { toast } from "sonner";

interface CustomField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "date" | "number";
  category: "contact" | "company";
  options?: string[];
}

interface Contact {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  position: string;
  responsible: string;
  tags: string[];
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
  customFields: Record<string, any>;
}

interface SearchFilters {
  name: string;
  dateFilter: string;
  funnel: string;
  responsible: string;
  createdBy: string;
  modifiedBy: string;
  tasks: string;
  phone: string;
  email: string;
  position: string;
  tags: string;
}

export default function Contatos() {
  const [showForm, setShowForm] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
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
  
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    name: "",
    dateFilter: "",
    funnel: "",
    responsible: "",
    createdBy: "",
    modifiedBy: "",
    tasks: "",
    phone: "",
    email: "",
    position: "",
    tags: "",
  });

  // Carregar contatos do localStorage
  useEffect(() => {
    const savedContacts = localStorage.getItem("contacts");
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  }, []);

  // Salvar contatos no localStorage
  const saveContactsToStorage = (updatedContacts: Contact[]) => {
    localStorage.setItem("contacts", JSON.stringify(updatedContacts));
    setContacts(updatedContacts);
  };

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
    if (!formData.name || !formData.phone || !formData.email) {
      toast.error("Preencha os campos obrigatórios: Nome, Telefone e E-mail");
      return;
    }

    const newContact: Contact = {
      id: editingContact?.id || `contact_${Date.now()}`,
      name: formData.name || "",
      company: formData.company_name || "",
      phone: formData.phone || "",
      email: formData.email || "",
      position: formData.position || "",
      responsible: formData.responsible || "",
      tags: [],
      createdAt: editingContact?.createdAt || new Date().toISOString(),
      createdBy: editingContact?.createdBy || "Usuário Atual",
      modifiedAt: new Date().toISOString(),
      modifiedBy: "Usuário Atual",
      customFields: formData,
    };

    if (editingContact) {
      const updatedContacts = contacts.map(c => c.id === editingContact.id ? newContact : c);
      saveContactsToStorage(updatedContacts);
      toast.success("Contato atualizado com sucesso");
    } else {
      saveContactsToStorage([...contacts, newContact]);
      toast.success("Contato salvo com sucesso");
    }
    
    setShowForm(false);
    setFormData({});
    setEditingContact(null);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setFormData(contact.customFields);
    setShowForm(true);
  };

  const handleDeleteContact = (contactId: string) => {
    const updatedContacts = contacts.filter(c => c.id !== contactId);
    saveContactsToStorage(updatedContacts);
    toast.success("Contato excluído com sucesso");
  };

  const filteredContacts = contacts.filter(contact => {
    if (searchFilters.name && !contact.name.toLowerCase().includes(searchFilters.name.toLowerCase())) {
      return false;
    }
    if (searchFilters.phone && !contact.phone.includes(searchFilters.phone)) {
      return false;
    }
    if (searchFilters.email && !contact.email.toLowerCase().includes(searchFilters.email.toLowerCase())) {
      return false;
    }
    if (searchFilters.position && !contact.position.toLowerCase().includes(searchFilters.position.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (!showForm) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background">
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">TODOS OS CONTATOS E EMPRESAS</h1>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {filteredContacts.length} elementos
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                ADICIONAR CONTATO
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Contact List */}
          <div className="w-72 border-r border-border bg-background overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-primary/10 text-primary border-primary/20 flex-1"
                >
                  Lista completa
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowSearchPanel(!showSearchPanel)}
                >
                  <Search className="w-4 h-4" />
                  Busca e filtro
                </Button>
              </div>

              <div className="space-y-1">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleEditContact(contact)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">
                          {contact.name}
                        </p>
                        {contact.company && (
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.company}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredContacts.length === 0 && (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    Nenhum contato encontrado
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          {showSearchPanel ? (
            /* Search Panel */
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="grid grid-cols-[1fr,300px] gap-6">
                  {/* Left Column - Filters */}
                  <div>
                    <div className="mb-4">
                      <Button
                        variant="ghost"
                        className="text-primary font-medium"
                      >
                        Lista completa
                      </Button>
                    </div>

                    <div className="space-y-1 mb-8">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left font-normal text-muted-foreground hover:text-foreground"
                      >
                        Contatos sem tarefas atribuí...
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left font-normal text-muted-foreground hover:text-foreground"
                      >
                        Contatos com tarefas atrasa...
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left font-normal text-muted-foreground hover:text-foreground"
                      >
                        Sem leads vinculado
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left font-normal text-muted-foreground hover:text-foreground"
                      >
                        Exluído
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <Input
                        placeholder="Nome"
                        value={searchFilters.name}
                        onChange={(e) => setSearchFilters({ ...searchFilters, name: e.target.value })}
                        className="h-9"
                      />

                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-9 text-muted-foreground"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        A qualquer hora
                      </Button>

                      <Input
                        placeholder="Funil de vendas, etapas"
                        value={searchFilters.funnel}
                        onChange={(e) => setSearchFilters({ ...searchFilters, funnel: e.target.value })}
                        className="h-9"
                      />

                      <Input
                        placeholder="Usuário responsável"
                        value={searchFilters.responsible}
                        onChange={(e) => setSearchFilters({ ...searchFilters, responsible: e.target.value })}
                        className="h-9"
                      />

                      <Input
                        placeholder="Criado por"
                        value={searchFilters.createdBy}
                        onChange={(e) => setSearchFilters({ ...searchFilters, createdBy: e.target.value })}
                        className="h-9"
                      />

                      <Input
                        placeholder="Modificado por"
                        value={searchFilters.modifiedBy}
                        onChange={(e) => setSearchFilters({ ...searchFilters, modifiedBy: e.target.value })}
                        className="h-9"
                      />

                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-9 text-muted-foreground"
                      >
                        Tarefas: Todos valores
                      </Button>
                    </div>
                  </div>

                  {/* Right Column - Tags */}
                  <div>
                    <div className="space-y-4">
                      <div className="border border-border rounded-lg p-4 bg-background">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">TAGS</span>
                          <Button variant="link" className="h-auto p-0 text-primary text-sm">
                            Gerenciar
                          </Button>
                        </div>
                        <Input
                          placeholder="Localizar tags"
                          value={searchFilters.tags}
                          onChange={(e) => setSearchFilters({ ...searchFilters, tags: e.target.value })}
                          className="h-9 mb-3"
                        />
                        <p className="text-sm text-muted-foreground">
                          Você não tem tags conectadas
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="flex-1 overflow-auto">
              {filteredContacts.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  Nenhum contato cadastrado. Clique em "ADICIONAR CONTATO" para começar.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NOME</TableHead>
                      <TableHead>EMPRESA</TableHead>
                      <TableHead>TELEFONE</TableHead>
                      <TableHead>E-MAIL</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell 
                          className="font-medium text-primary"
                          onClick={() => handleEditContact(contact)}
                        >
                          {contact.name}
                        </TableCell>
                        <TableCell onClick={() => handleEditContact(contact)}>
                          {contact.company || "-"}
                        </TableCell>
                        <TableCell onClick={() => handleEditContact(contact)}>
                          {contact.phone}
                        </TableCell>
                        <TableCell onClick={() => handleEditContact(contact)}>
                          {contact.email}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Deseja realmente excluir este contato?")) {
                                handleDeleteContact(contact.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
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
          <h1 className="text-2xl font-bold text-foreground">{editingContact ? editingContact.name : "Novo Contato"}</h1>
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
