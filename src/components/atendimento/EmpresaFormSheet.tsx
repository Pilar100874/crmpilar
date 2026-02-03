import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, Building2, Phone, Mail, MapPin, FileText, Plus, Trash2, Search, User } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { maskCNPJ, maskCPF, maskCEP, maskPhone, maskWhatsApp } from "@/lib/masks";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface CustomField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "date" | "number";
  options?: string[];
  required?: boolean;
}

interface EmpresaFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (empresaId: string) => void;
  initialData?: {
    nome?: string;
    cnpj?: string;
  };
}

export function EmpresaFormSheet({ open, onOpenChange, onSuccess, initialData }: EmpresaFormSheetProps) {
  const [saving, setSaving] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("empresa");
  
  // Form data
  const [formData, setFormData] = useState<Record<string, any>>({
    company_type: "Pessoa Jurídica",
    cpf_cnpj: initialData?.cnpj || "",
    nome: "",
    nome_fantasia: initialData?.nome || "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    inscricao: "",
    telefone: "",
    email: "",
  });
  
  // Custom fields
  const [companyFields, setCompanyFields] = useState<CustomField[]>([]);
  
  // Contatos
  const [contatos, setContatos] = useState<any[]>([]);
  const [contatosVinculados, setContatosVinculados] = useState<any[]>([]);
  const [buscaContato, setBuscaContato] = useState("");
  const [contatosFiltrados, setContatosFiltrados] = useState<any[]>([]);
  
  // Criar novo contato inline
  const [criarNovoContato, setCriarNovoContato] = useState(false);
  const [novoContatoData, setNovoContatoData] = useState({
    nome: "",
    telefone: "",
    email: "",
    cargo: "",
  });

  useEffect(() => {
    const init = async () => {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
      if (estabId) {
        loadCustomFields(estabId);
        loadContatos(estabId);
      }
    };
    if (open) {
      init();
    }
  }, [open]);
  
  // Reset form when opening
  useEffect(() => {
    if (open) {
      setFormData({
        company_type: "Pessoa Jurídica",
        cpf_cnpj: initialData?.cnpj || "",
        nome: "",
        nome_fantasia: initialData?.nome || "",
        cep: "",
        endereco: "",
        numero: "",
        bairro: "",
        cidade: "",
        estado: "",
        inscricao: "",
        telefone: "",
        email: "",
      });
      setContatosVinculados([]);
      setCriarNovoContato(false);
      setNovoContatoData({ nome: "", telefone: "", email: "", cargo: "" });
      setActiveTab("empresa");
    }
  }, [open, initialData]);
  
  // Filter contatos
  useEffect(() => {
    if (buscaContato.trim()) {
      const termo = buscaContato.toLowerCase();
      const filtrados = contatos.filter(c => 
        c.nome?.toLowerCase().includes(termo) ||
        c.telefone?.includes(termo) ||
        c.email?.toLowerCase().includes(termo)
      );
      setContatosFiltrados(filtrados.slice(0, 10));
    } else {
      setContatosFiltrados([]);
    }
  }, [buscaContato, contatos]);

  const loadCustomFields = async (estabId: string) => {
    const { data } = await supabase
      .from("form_field_configs")
      .select("*")
      .eq("form_type", "empresa")
      .eq("estabelecimento_id", estabId)
      .order("field_order", { ascending: true });
    
    if (data) {
      const mapped: CustomField[] = data.map((campo) => {
        let opts = (campo.options as any)?.options || [];
        if (campo.field_id === 'company_type' && opts.length === 0) {
          opts = ['Pessoa Física', 'Pessoa Jurídica'];
        }
        return {
          id: campo.field_id,
          label: campo.field_label,
          type: campo.field_type as CustomField["type"],
          options: opts,
          required: campo.required || false,
        };
      });
      setCompanyFields(mapped);
    }
  };
  
  const loadContatos = async (estabId: string) => {
    const { data } = await supabase
      .from("customers")
      .select("id, nome, telefone, email")
      .eq("estabelecimento_id", estabId)
      .order("nome");
    setContatos(data || []);
  };
  
  const handleCepBlur = async () => {
    const cepClean = formData.cep?.replace(/\D/g, "");
    if (cepClean?.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch (error) {
      console.error("Error looking up CEP:", error);
    }
  };

  const formatCnpjCpf = (value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 11) {
      return maskCPF(value);
    }
    return maskCNPJ(value);
  };
  
  const handleAddContato = (contato: any) => {
    if (!contatosVinculados.some(c => c.id === contato.id)) {
      setContatosVinculados([...contatosVinculados, { ...contato, is_primary: contatosVinculados.length === 0 }]);
      setBuscaContato("");
    }
  };
  
  const handleRemoveContato = (contatoId: string) => {
    setContatosVinculados(contatosVinculados.filter(c => c.id !== contatoId));
  };

  const handleSave = async () => {
    if (!formData.nome_fantasia?.trim()) {
      toast.error("Nome Fantasia é obrigatório");
      return;
    }

    setSaving(true);
    try {
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      // Preparar custom_fields
      const customFieldsData: Record<string, any> = {};
      if (formData.numero) customFieldsData.numero = formData.numero;
      if (formData.company_type) customFieldsData.company_type = formData.company_type;
      if (formData.inscricao) customFieldsData.inscricao = formData.inscricao;

      // Criar empresa
      const { data: newEmpresa, error } = await supabase
        .from("empresas")
        .insert({
          nome: formData.nome?.trim() || formData.nome_fantasia?.trim(),
          nome_fantasia: formData.nome_fantasia?.trim(),
          cnpj: formData.cpf_cnpj?.trim() || null,
          email: formData.email?.trim() || null,
          telefone: formData.telefone?.trim() || null,
          cep: formData.cep?.trim() || null,
          endereco: formData.endereco?.trim() || null,
          bairro: formData.bairro?.trim() || null,
          cidade: formData.cidade?.trim() || null,
          estado: formData.estado?.trim() || null,
          estabelecimento_id: estabelecimentoId,
          custom_fields: Object.keys(customFieldsData).length > 0 ? customFieldsData : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Criar novo contato se estiver criando
      if (criarNovoContato && novoContatoData.nome?.trim()) {
        const { data: newContato, error: contatoError } = await supabase
          .from("customers")
          .insert({
            nome: novoContatoData.nome.trim(),
            telefone: novoContatoData.telefone?.trim() || null,
            email: novoContatoData.email?.trim() || null,
            estabelecimento_id: estabelecimentoId,
            custom_fields: novoContatoData.cargo ? { position: novoContatoData.cargo } : null,
          })
          .select()
          .single();

        if (!contatoError && newContato) {
          // Vincular automaticamente
          await supabase.from("customer_empresas").insert({
            customer_id: newContato.id,
            empresa_id: newEmpresa.id,
            is_primary: true,
            cargo: novoContatoData.cargo || null,
          });
        }
      }

      // Vincular contatos existentes
      if (contatosVinculados.length > 0) {
        const vinculos = contatosVinculados.map((c, idx) => ({
          customer_id: c.id,
          empresa_id: newEmpresa.id,
          is_primary: idx === 0,
        }));
        await supabase.from("customer_empresas").insert(vinculos);
      }

      toast.success("Empresa criada com sucesso!");
      onSuccess?.(newEmpresa.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating empresa:", error);
      toast.error("Erro ao criar empresa: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-emerald-50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <SheetTitle className="text-lg">Nova Empresa</SheetTitle>
                <p className="text-xs text-muted-foreground">Cadastro completo</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="empresa">Empresa</TabsTrigger>
              <TabsTrigger value="contatos">Contatos</TabsTrigger>
            </TabsList>

            <TabsContent value="empresa" className="space-y-4">
              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={formData.company_type} 
                  onValueChange={(v) => setFormData({ ...formData, company_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                    <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CPF/CNPJ */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  {formData.company_type === "Pessoa Física" ? "CPF" : "CNPJ"}
                </Label>
                <Input
                  value={formData.cpf_cnpj}
                  onChange={(e) => setFormData({ ...formData, cpf_cnpj: formatCnpjCpf(e.target.value) })}
                  placeholder={formData.company_type === "Pessoa Física" ? "000.000.000-00" : "00.000.000/0000-00"}
                />
              </div>

              {/* Nome Fantasia */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  Nome Fantasia *
                </Label>
                <Input
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  placeholder="Nome fantasia da empresa"
                />
              </div>

              {/* Razão Social */}
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Razão social"
                />
              </div>

              {/* Inscrição */}
              <div className="space-y-2">
                <Label>Inscrição Estadual</Label>
                <Input
                  value={formData.inscricao}
                  onChange={(e) => setFormData({ ...formData, inscricao: e.target.value })}
                  placeholder="Inscrição estadual"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  E-mail
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="empresa@exemplo.com"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Telefone
                </Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
                  placeholder="(00) 0000-0000"
                />
              </div>

              {/* CEP */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  CEP
                </Label>
                <Input
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                />
              </div>

              {/* Endereço + Número */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2">
                  <Label>Endereço</Label>
                  <Input
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, Avenida..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    placeholder="Nº"
                  />
                </div>
              </div>

              {/* Bairro */}
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  placeholder="Bairro"
                />
              </div>

              {/* Cidade + UF */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase().slice(0, 2) })}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contatos" className="space-y-4">
              {/* Buscar contato existente */}
              {!criarNovoContato && (
                <Card className="p-4">
                  <Label className="text-xs mb-2 block">Vincular Contato Existente</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={buscaContato}
                        onChange={(e) => setBuscaContato(e.target.value)}
                        placeholder="Buscar contato..."
                        className="pl-9"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCriarNovoContato(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Novo
                    </Button>
                  </div>
                  
                  {contatosFiltrados.length > 0 && (
                    <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                      {contatosFiltrados.map((contato) => (
                        <div
                          key={contato.id}
                          className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center justify-between"
                          onClick={() => handleAddContato(contato)}
                        >
                          <div>
                            <span className="text-sm font-medium">{contato.nome}</span>
                            <span className="text-xs text-muted-foreground ml-2">{contato.telefone || contato.email}</span>
                          </div>
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Criar novo contato */}
              {criarNovoContato && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs">Novo Contato</Label>
                    <Button variant="ghost" size="sm" onClick={() => setCriarNovoContato(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <Input
                      value={novoContatoData.nome}
                      onChange={(e) => setNovoContatoData({ ...novoContatoData, nome: e.target.value })}
                      placeholder="Nome do contato *"
                    />
                    <Input
                      value={novoContatoData.telefone}
                      onChange={(e) => setNovoContatoData({ ...novoContatoData, telefone: maskWhatsApp(e.target.value) })}
                      placeholder="WhatsApp"
                    />
                    <Input
                      type="email"
                      value={novoContatoData.email}
                      onChange={(e) => setNovoContatoData({ ...novoContatoData, email: e.target.value })}
                      placeholder="E-mail"
                    />
                    <Input
                      value={novoContatoData.cargo}
                      onChange={(e) => setNovoContatoData({ ...novoContatoData, cargo: e.target.value })}
                      placeholder="Cargo"
                    />
                  </div>
                </Card>
              )}

              {/* Contatos vinculados */}
              {contatosVinculados.length > 0 && (
                <Card className="p-4">
                  <Label className="text-xs mb-2 block">Contatos Vinculados</Label>
                  <div className="space-y-2">
                    {contatosVinculados.map((contato) => (
                      <div key={contato.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{contato.nome}</span>
                          {contato.is_primary && (
                            <Badge variant="secondary" className="text-[10px]">Principal</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveContato(contato.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
