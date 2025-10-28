import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, X, Loader2, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { validateCPF, validateCNPJ, validateEmail, validateCEP } from "@/lib/validators";
import { maskCPF, maskCNPJ, maskCEP, maskPhone } from "@/lib/masks";
import { useAddressLookup } from "@/hooks/useAddressLookup";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Empresa {
  id: string;
  nome_fantasia: string;
  razao_social: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  custom_fields: any;
}

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  custom_fields: any;
}

export default function Empresas() {
  const [showForm, setShowForm] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados do formulário
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Estados para vincular contatos
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [contatosVinculados, setContatosVinculados] = useState<any[]>([]);
  const [buscaContato, setBuscaContato] = useState("");
  const [contatosFiltrados, setContatosFiltrados] = useState<Contato[]>([]);
  const [criarNovoContato, setCriarNovoContato] = useState(false);

  // Lookup hooks
  const { lookupCEP, loading: cepLoading } = useAddressLookup();
  const { lookupCNPJ, loading: cnpjLoading } = useCNPJLookup();

  // Carregar estabelecimento
  useEffect(() => {
    const fetchEstabelecimento = async () => {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
      if (estabId) {
        fetchEmpresas(estabId);
        fetchContatos(estabId);
      }
    };
    fetchEstabelecimento();
  }, []);

  const fetchEmpresas = async (estabId: string) => {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .order('nome_fantasia');

    if (error) {
      console.error('Erro ao carregar empresas:', error);
      return;
    }

    setEmpresas(data || []);
  };

  const fetchContatos = async (estabId: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .order('nome');

    if (error) {
      console.error('Erro ao carregar contatos:', error);
      return;
    }

    setContatos(data || []);
  };

  // Filtrar contatos na busca
  useEffect(() => {
    if (buscaContato.trim()) {
      const termo = buscaContato.toLowerCase();
      const filtrados = contatos.filter(c => 
        c.nome?.toLowerCase().includes(termo) ||
        c.email?.toLowerCase().includes(termo) ||
        c.telefone?.includes(termo)
      );
      setContatosFiltrados(filtrados);
    } else {
      setContatosFiltrados([]);
    }
  }, [buscaContato, contatos]);

  const handleEditEmpresa = async (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    
    // Carregar dados da empresa no formulário
    const data: Record<string, any> = {
      company_type: empresa.custom_fields?.company_type || "Pessoa Jurídica",
      cpf_cnpj: empresa.cnpj || "",
      company_name: empresa.razao_social || "",
      company_fantasia: empresa.nome_fantasia || "",
      phone: empresa.telefone || "",
      email: empresa.email || "",
      cep: empresa.cep || "",
      address: empresa.endereco || "",
      city: empresa.cidade || "",
      state: empresa.estado || "",
      neighborhood: empresa.custom_fields?.neighborhood || "",
      inscricao: empresa.custom_fields?.inscricao || "",
    };
    setFormData(data);

    // Carregar contatos vinculados
    const { data: vinculos } = await supabase
      .from('customer_empresas')
      .select(`
        id,
        cargo,
        departamento,
        is_primary,
        customers:customer_id (
          id,
          nome,
          telefone,
          email
        )
      `)
      .eq('empresa_id', empresa.id);

    if (vinculos) {
      setContatosVinculados(vinculos.map((v: any) => ({
        ...v,
        contato: v.customers
      })));
    }

    setShowForm(true);
  };

  const handleDeleteEmpresa = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta empresa?")) return;

    const { error } = await supabase
      .from('empresas')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erro ao excluir empresa");
      console.error(error);
      return;
    }

    toast.success("Empresa excluída!");
    if (estabelecimentoId) fetchEmpresas(estabelecimentoId);
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleCEPLookup = async (cep: string) => {
    const result = await lookupCEP(cep);
    if (result) {
      setFormData(prev => ({
        ...prev,
        address: result.logradouro,
        neighborhood: result.bairro,
        city: result.localidade,
        state: result.uf,
      }));
    }
  };

  const handleCNPJLookup = async (cnpj: string) => {
    const result = await lookupCNPJ(cnpj);
    if (result) {
      setFormData(prev => ({
        ...prev,
        company_name: result.nome,
        company_fantasia: result.fantasia,
        phone: result.telefone,
        email: result.email,
        cep: result.cep,
        address: result.logradouro,
        neighborhood: result.bairro,
        city: result.municipio,
        state: result.uf,
      }));
    }
  };

  const handleAddContatoVinculado = async (contatoId: string) => {
    const contato = contatos.find(c => c.id === contatoId);
    if (!contato) return;

    const jaVinculado = contatosVinculados.some(v => v.contato?.id === contatoId);
    if (jaVinculado) {
      toast.error("Contato já vinculado!");
      return;
    }

    // Se editando empresa, salvar vínculo no banco
    if (editingEmpresa) {
      const { error } = await supabase
        .from('customer_empresas')
        .insert([{
          customer_id: contatoId,
          empresa_id: editingEmpresa.id,
          is_primary: contatosVinculados.length === 0
        }]);

      if (error) {
        toast.error("Erro ao vincular contato");
        return;
      }

      // Atualizar tipo_operador do contato para cliente (true)
      await supabase
        .from('customers')
        .update({ tipo_operador: true })
        .eq('id', contatoId);
    }

    setContatosVinculados(prev => [...prev, { contato, cargo: "", departamento: "", is_primary: prev.length === 0 }]);
    setBuscaContato("");
    toast.success("Contato vinculado!");
  };

  const handleRemoveContatoVinculado = async (index: number) => {
    const vinculo = contatosVinculados[index];
    
    if (vinculo.id && editingEmpresa) {
      await supabase
        .from('customer_empresas')
        .delete()
        .eq('id', vinculo.id);

      // Verificar se contato tem outras empresas vinculadas
      const { data: outrosVinculos } = await supabase
        .from('customer_empresas')
        .select('id')
        .eq('customer_id', vinculo.contato.id);

      // Se não tem mais empresas, volta para prospect (false)
      if (!outrosVinculos || outrosVinculos.length === 0) {
        await supabase
          .from('customers')
          .update({ tipo_operador: false })
          .eq('id', vinculo.contato.id);
      }
    }

    setContatosVinculados(prev => prev.filter((_, i) => i !== index));
    toast.success("Contato desvinculado!");
  };

  const handleSaveEmpresa = async () => {
    const errors: Record<string, string> = {};

    // Validar campos obrigatórios
    const requiredFields = ['company_type', 'cpf_cnpj', 'company_name', 'company_fantasia', 'cep', 'address', 'city', 'state', 'inscricao'];
    requiredFields.forEach(field => {
      if (!formData[field]?.toString().trim()) {
        errors[field] = "Campo obrigatório";
      }
    });

    // Validar CPF ou CNPJ
    if (formData.cpf_cnpj) {
      if (formData.company_type === "Pessoa Física" && !validateCPF(formData.cpf_cnpj)) {
        errors.cpf_cnpj = "CPF inválido";
      }
      if (formData.company_type === "Pessoa Jurídica" && !validateCNPJ(formData.cpf_cnpj)) {
        errors.cpf_cnpj = "CNPJ inválido";
      }
    }

    // Validar CEP
    if (formData.cep && !validateCEP(formData.cep)) {
      errors.cep = "CEP inválido";
    }

    // Validar email se preenchido
    if (formData.email && !validateEmail(formData.email)) {
      errors.email = "E-mail inválido";
    }

    // Se criar novo contato, validar seus campos
    if (criarNovoContato) {
      if (!formData.contact_name?.trim()) errors.contact_name = "Nome obrigatório";
      if (!formData.contact_phone?.trim()) errors.contact_phone = "Telefone obrigatório";
      if (!formData.contact_email?.trim()) errors.contact_email = "E-mail obrigatório";
      if (formData.contact_email && !validateEmail(formData.contact_email)) {
        errors.contact_email = "E-mail inválido";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Preencha todos os campos obrigatórios corretamente");
      return;
    }

    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        toast.error("Selecione um estabelecimento");
        return;
      }

      const empresaPayload: any = {
        estabelecimento_id: estabId,
        nome_fantasia: formData.company_fantasia,
        razao_social: formData.company_name,
        cnpj: formData.company_type === "Pessoa Jurídica" ? formData.cpf_cnpj : null,
        telefone: formData.phone || null,
        email: formData.email || null,
        endereco: formData.address,
        cidade: formData.city,
        estado: formData.state,
        cep: formData.cep,
        custom_fields: {
          company_type: formData.company_type,
          neighborhood: formData.neighborhood,
          inscricao: formData.inscricao,
        }
      };

      let empresaId: string;

      if (editingEmpresa) {
        // Atualizar empresa
        empresaId = editingEmpresa.id;
        await supabase
          .from('empresas')
          .update(empresaPayload)
          .eq('id', empresaId);

        toast.success("Empresa atualizada!");
      } else {
        // Criar nova empresa
        const { data: inserted, error } = await supabase
          .from('empresas')
          .insert([empresaPayload])
          .select('id')
          .maybeSingle();

        if (error) throw error;
        empresaId = inserted!.id;

        // Se tiver contatos vinculados, criar vínculos
        if (contatosVinculados.length > 0) {
          await supabase
            .from('customer_empresas')
            .insert(
              contatosVinculados.map(v => ({
                customer_id: v.contato.id,
                empresa_id: empresaId,
                cargo: v.cargo,
                departamento: v.departamento,
                is_primary: v.is_primary
              }))
            );

          // Atualizar tipo_operador dos contatos para cliente
          await Promise.all(
            contatosVinculados.map(v =>
              supabase
                .from('customers')
                .update({ tipo_operador: true })
                .eq('id', v.contato.id)
            )
          );
        }

        toast.success("Empresa criada!");
      }

      // Criar novo contato se necessário
      if (criarNovoContato) {
        const { data: novoContato, error: contatoErr } = await supabase
          .from('customers')
          .insert([{
            estabelecimento_id: estabId,
            nome: formData.contact_name,
            telefone: formData.contact_phone,
            email: formData.contact_email,
            tipo_operador: true, // Cliente pois está vinculado a empresa
            custom_fields: {
              position: formData.contact_position || ""
            }
          }])
          .select('id')
          .maybeSingle();

        if (contatoErr) throw contatoErr;

        // Vincular novo contato à empresa
        await supabase
          .from('customer_empresas')
          .insert([{
            customer_id: novoContato!.id,
            empresa_id: empresaId,
            is_primary: contatosVinculados.length === 0
          }]);
      }

      setShowForm(false);
      setFormData({});
      setContatosVinculados([]);
      setEditingEmpresa(null);
      if (estabId) fetchEmpresas(estabId);
      if (estabId) fetchContatos(estabId);
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      toast.error("Erro ao salvar empresa");
    }
  };

  const filteredEmpresas = empresas.filter(e =>
    e.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cnpj?.includes(searchTerm) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showForm) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background">
        <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {editingEmpresa ? "Editar Empresa" : "Nova Empresa"}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => {
            setShowForm(false);
            setFormData({});
            setEditingEmpresa(null);
            setContatosVinculados([]);
            setCriarNovoContato(false);
          }}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="empresa" className="w-full">
            <TabsList>
              <TabsTrigger value="empresa">Empresa</TabsTrigger>
              <TabsTrigger value="contatos">Contatos</TabsTrigger>
            </TabsList>

            <TabsContent value="empresa" className="space-y-4 mt-4">
              <Card className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={formData.company_type || "Pessoa Jurídica"}
                      onValueChange={(v) => handleFieldChange('company_type', v)}
                    >
                      <SelectTrigger className={fieldErrors.company_type ? "border-red-500" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
                        <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>CPF/CNPJ *</Label>
                    <div className="relative">
                      <Input
                        value={formData.cpf_cnpj || ""}
                        onChange={(e) => {
                          const masked = formData.company_type === "Pessoa Física" 
                            ? maskCPF(e.target.value)
                            : maskCNPJ(e.target.value);
                          handleFieldChange('cpf_cnpj', masked);
                        }}
                        onBlur={(e) => {
                          if (formData.company_type === "Pessoa Jurídica" && e.target.value.length === 18) {
                            handleCNPJLookup(e.target.value);
                          }
                        }}
                        className={fieldErrors.cpf_cnpj ? "border-red-500" : ""}
                      />
                      {cnpjLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
                    </div>
                    {fieldErrors.cpf_cnpj && <p className="text-sm text-red-500 mt-1">{fieldErrors.cpf_cnpj}</p>}
                  </div>

                  <div>
                    <Label>Razão Social *</Label>
                    <Input
                      value={formData.company_name || ""}
                      onChange={(e) => handleFieldChange('company_name', e.target.value)}
                      className={fieldErrors.company_name ? "border-red-500" : ""}
                    />
                  </div>

                  <div>
                    <Label>Nome Fantasia *</Label>
                    <Input
                      value={formData.company_fantasia || ""}
                      onChange={(e) => handleFieldChange('company_fantasia', e.target.value)}
                      className={fieldErrors.company_fantasia ? "border-red-500" : ""}
                    />
                  </div>

                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={formData.phone || ""}
                      onChange={(e) => handleFieldChange('phone', maskPhone(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      className={fieldErrors.email ? "border-red-500" : ""}
                    />
                    {fieldErrors.email && <p className="text-sm text-red-500 mt-1">{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <Label>CEP *</Label>
                    <div className="relative">
                      <Input
                        value={formData.cep || ""}
                        onChange={(e) => handleFieldChange('cep', maskCEP(e.target.value))}
                        onBlur={(e) => {
                          if (e.target.value.length === 9) {
                            handleCEPLookup(e.target.value);
                          }
                        }}
                        className={fieldErrors.cep ? "border-red-500" : ""}
                      />
                      {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
                    </div>
                    {fieldErrors.cep && <p className="text-sm text-red-500 mt-1">{fieldErrors.cep}</p>}
                  </div>

                  <div>
                    <Label>Endereço *</Label>
                    <Input
                      value={formData.address || ""}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      className={fieldErrors.address ? "border-red-500" : ""}
                    />
                  </div>

                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={formData.neighborhood || ""}
                      onChange={(e) => handleFieldChange('neighborhood', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Cidade *</Label>
                    <Input
                      value={formData.city || ""}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className={fieldErrors.city ? "border-red-500" : ""}
                    />
                  </div>

                  <div>
                    <Label>Estado *</Label>
                    <Input
                      value={formData.state || ""}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      className={fieldErrors.state ? "border-red-500" : ""}
                    />
                  </div>

                  <div>
                    <Label>Inscrição Estadual *</Label>
                    <Input
                      value={formData.inscricao || ""}
                      onChange={(e) => handleFieldChange('inscricao', e.target.value)}
                      className={fieldErrors.inscricao ? "border-red-500" : ""}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="contatos" className="space-y-4 mt-4">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Contatos Vinculados</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCriarNovoContato(!criarNovoContato)}
                    >
                      {criarNovoContato ? "Cancelar" : "Criar Novo Contato"}
                    </Button>
                  </div>

                  {criarNovoContato && (
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                      <h4 className="font-medium text-sm">Novo Contato</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Nome *</Label>
                          <Input
                            value={formData.contact_name || ""}
                            onChange={(e) => handleFieldChange('contact_name', e.target.value)}
                            className={fieldErrors.contact_name ? "border-red-500" : ""}
                          />
                        </div>
                        <div>
                          <Label>Cargo</Label>
                          <Input
                            value={formData.contact_position || ""}
                            onChange={(e) => handleFieldChange('contact_position', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Telefone *</Label>
                          <Input
                            value={formData.contact_phone || ""}
                            onChange={(e) => handleFieldChange('contact_phone', maskPhone(e.target.value))}
                            className={fieldErrors.contact_phone ? "border-red-500" : ""}
                          />
                        </div>
                        <div>
                          <Label>E-mail *</Label>
                          <Input
                            value={formData.contact_email || ""}
                            onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                            className={fieldErrors.contact_email ? "border-red-500" : ""}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {!criarNovoContato && (
                    <div className="space-y-2">
                      <Label>Buscar Contato Existente</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Nome, e-mail ou telefone..."
                          value={buscaContato}
                          onChange={(e) => setBuscaContato(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {contatosFiltrados.length > 0 && (
                        <div className="border rounded-lg max-h-48 overflow-auto">
                          {contatosFiltrados.map(contato => (
                            <div
                              key={contato.id}
                              className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                              onClick={() => handleAddContatoVinculado(contato.id)}
                            >
                              <div className="font-medium">{contato.nome}</div>
                              <div className="text-sm text-muted-foreground">{contato.email}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {contatosVinculados.length > 0 && (
                    <div className="space-y-2">
                      <Label>Contatos</Label>
                      <div className="border rounded-lg divide-y">
                        {contatosVinculados.map((vinculo, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between">
                            <div>
                              <div className="font-medium">{vinculo.contato?.nome}</div>
                              <div className="text-sm text-muted-foreground">{vinculo.contato?.email}</div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveContatoVinculado(idx)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => {
              setShowForm(false);
              setFormData({});
              setEditingEmpresa(null);
              setContatosVinculados([]);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEmpresa}>
              Salvar Empresa
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <Button onClick={() => {
            setShowForm(true);
            setEditingEmpresa(null);
            setFormData({});
            setContatosVinculados([]);
            setCriarNovoContato(false);
          }} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Empresa
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome fantasia, razão social, CNPJ ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {filteredEmpresas.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            Nenhuma empresa cadastrada. Clique em "Nova Empresa" para começar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmpresas.map(empresa => (
                <TableRow key={empresa.id}>
                  <TableCell className="font-medium">{empresa.nome_fantasia}</TableCell>
                  <TableCell>{empresa.razao_social || "-"}</TableCell>
                  <TableCell>{empresa.cnpj || "-"}</TableCell>
                  <TableCell>{empresa.telefone || "-"}</TableCell>
                  <TableCell>{empresa.email || "-"}</TableCell>
                  <TableCell>{empresa.cidade || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditEmpresa(empresa)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteEmpresa(empresa.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
