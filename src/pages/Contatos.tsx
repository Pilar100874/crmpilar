import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Settings, MoreVertical, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface CustomField {
  id: string;
  label: string;
  type: string;
  category: "contact" | "company";
}

export default function Contatos() {
  const [showForm, setShowForm] = useState(false);
  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [contactFields, setContactFields] = useState<CustomField[]>([
    { id: "name", label: "Nome de contato", type: "text", category: "contact" },
    { id: "phone", label: "Telefone", type: "text", category: "contact" },
    { id: "email", label: "E-mail", type: "email", category: "contact" },
    { id: "position", label: "Posição", type: "text", category: "contact" },
  ]);
  const [companyFields, setCompanyFields] = useState<CustomField[]>([
    { id: "company_name", label: "Nome da empresa", type: "text", category: "company" },
    { id: "company_phone", label: "Telefone", type: "text", category: "company" },
    { id: "company_email", label: "E-mail", type: "email", category: "company" },
    { id: "site", label: "Site", type: "url", category: "company" },
    { id: "address", label: "Endereço", type: "text", category: "company" },
  ]);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [activeFieldTab, setActiveFieldTab] = useState<"contact" | "company">("contact");

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      toast.error("Digite um nome para o campo");
      return;
    }

    const newField: CustomField = {
      id: `custom_${Date.now()}`,
      label: newFieldLabel,
      type: "text",
      category: activeFieldTab,
    };

    if (activeFieldTab === "contact") {
      setContactFields([...contactFields, newField]);
    } else {
      setCompanyFields([...companyFields, newField]);
    }

    setNewFieldLabel("");
    toast.success("Campo adicionado com sucesso");
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
                <Dialog open={showFieldConfig} onOpenChange={setShowFieldConfig}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Settings className="w-4 h-4" />
                      Configurar campos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Campos e grupos</DialogTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        Kamno oferece a opção de adicionar seus próprios campos personalizados. 
                        Eles são ótimos para filtrar dados e compilar relatórios.
                      </p>
                    </DialogHeader>

                    <Tabs value={activeFieldTab} onValueChange={(v) => setActiveFieldTab(v as "contact" | "company")} className="w-full">
                      <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="contact">Principal</TabsTrigger>
                        <TabsTrigger value="company">Leads</TabsTrigger>
                        <TabsTrigger value="add">
                          <Plus className="w-4 h-4" />
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="contact" className="space-y-3 mt-4">
                        {contactFields.map((field) => (
                          <div key={field.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                            <div className="flex-1">
                              <Input
                                value={field.label}
                                readOnly
                                className="bg-background"
                              />
                            </div>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-4">
                          <Input
                            placeholder="Nome do novo campo"
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                          />
                          <Button onClick={handleAddField}>
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar campo
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="company" className="space-y-3 mt-4">
                        <h4 className="text-sm font-medium text-foreground/70 mb-3">Campos da empresa</h4>
                        {companyFields.map((field) => (
                          <div key={field.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                            <div className="flex-1">
                              <Input
                                value={field.label}
                                readOnly
                                className="bg-background"
                              />
                            </div>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-4">
                          <Input
                            placeholder="Nome do novo campo"
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                          />
                          <Button onClick={handleAddField}>
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar campo
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
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
                    <Input
                      id={field.id}
                      type={field.type}
                      placeholder="..."
                      value={formData[field.id] || ""}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    />
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
                    <Input
                      id={field.id}
                      type={field.type}
                      placeholder="..."
                      value={formData[field.id] || ""}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    />
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
              <h3 className="text-lg font-semibold mb-4">Configurações do Contato</h3>
              <p className="text-sm text-muted-foreground">
                Configurações adicionais do contato aparecerão aqui.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
