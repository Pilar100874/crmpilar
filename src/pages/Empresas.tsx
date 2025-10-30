import { useState, useEffect } from "react";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, Trash2, Search, X, Loader2, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Upload, Download, Pencil, Edit, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { validateCPF, validateCNPJ, validateEmail, validateCEP, validateWhatsApp } from "@/lib/validators";
import { maskCPF, maskCNPJ, maskCEP, maskPhone, maskWhatsApp } from "@/lib/masks";
import { useAddressLookup } from "@/hooks/useAddressLookup";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { TableColumnsConfig, type TableColumn } from "@/components/config/TableColumnsConfig";
import { EmpresaFieldsCRUD } from "@/components/config/EmpresaFieldsCRUD";


interface CustomField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "date" | "number";
  category: "company" | "contact";
  options?: string[];
  required?: boolean;
  locked?: boolean;
}

interface Empresa {
  id: string;
  nome_fantasia: string;
  nome: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  custom_fields: any;
  created_at?: string;
}

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  custom_fields: any;
}

export default function Empresas() {
  const location = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<Empresa | null>(null);
  
  // Estados para CNPJ/CPF duplicado
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateEmpresa, setDuplicateEmpresa] = useState<Empresa | null>(null);

  // Gerenciamento de colunas da tabela
  const [tableColumns, setTableColumns] = useState<TableColumn[]>(() => {
    const saved = localStorage.getItem("empresasTableColumns");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: "actions", label: "Ações", visible: true, width: 120, locked: true },
      { id: "nome_fantasia", label: "Nome Fantasia", visible: true, width: 250, locked: true },
      { id: "nome", label: "Nome", visible: true, width: 250 },
      { id: "cnpj", label: "CNPJ", visible: true, width: 180 },
      { id: "telefone", label: "Telefone", visible: true, width: 150 },
      { id: "email", label: "E-mail", visible: true, width: 250 },
      { id: "cidade", label: "Cidade", visible: false, width: 150 },
      { id: "estado", label: "UF", visible: false, width: 80 },
      { id: "endereco", label: "Endereço", visible: false, width: 220 },
      { id: "bairro", label: "Bairro", visible: false, width: 160 },
      { id: "cep", label: "CEP", visible: false, width: 120 },
      { id: "company_type", label: "Tipo", visible: false, width: 140 },
      { id: "inscricao", label: "Inscrição", visible: false, width: 160 },
    ];
  });

  // Estado de ordenação
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    localStorage.setItem("empresasTableColumns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  // Estados do formulário
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Campos obrigatórios fixos de empresa
  const [companyFields, setCompanyFields] = useState<CustomField[]>([
    { id: "company_type", label: "Tipo", type: "select", category: "company", options: ["Pessoa Física", "Pessoa Jurídica"], required: true, locked: false },
    { id: "cpf_cnpj", label: "CPF/CNPJ", type: "text", category: "company", required: true, locked: false },
    { id: "company_name", label: "Nome", type: "text", category: "company", required: true, locked: true },
    { id: "company_fantasia", label: "Nome Fantasia", type: "text", category: "company", required: true, locked: true },
    { id: "cep", label: "CEP", type: "text", category: "company", required: true, locked: false },
    { id: "address", label: "Endereço", type: "text", category: "company", required: true, locked: true },
    { id: "city", label: "Cidade", type: "text", category: "company", required: true, locked: true },
    { id: "neighborhood", label: "Bairro", type: "text", category: "company", required: true, locked: true },
    { id: "state", label: "UF", type: "text", category: "company", required: true, locked: true },
    { id: "inscricao", label: "Inscrição", type: "text", category: "company", required: false, locked: true },
    { id: "telefone", label: "Telefone", type: "phone", category: "company", required: false, locked: true },
    { id: "email", label: "E-mail", type: "email", category: "company", required: false, locked: true },
  ]);

  const [contactFields, setContactFields] = useState<CustomField[]>([
    { id: "name", label: "Nome", type: "text", category: "contact", required: true, locked: true },
    { id: "phone", label: "WhatsApp", type: "phone", category: "contact", required: true, locked: true },
    { id: "email", label: "E-mail", type: "email", category: "contact", required: true, locked: true },
    { id: "position", label: "Cargo", type: "text", category: "contact", required: false, locked: true },
  ]);

  // Estados para carregar/salvar configs no banco
const [fieldConfigsFromDB, setFieldConfigsFromDB] = useState<any[]>([]);

  // Lista final de campos para renderização (prioriza configurações do banco)
  const formFieldsToRender = React.useMemo(() => {
    if (fieldConfigsFromDB && fieldConfigsFromDB.length > 0) {
      return fieldConfigsFromDB.map((cfg: any): CustomField => {
        let optionsParsed: any = cfg.options;
        try {
          if (typeof optionsParsed === 'string') {
            optionsParsed = JSON.parse(optionsParsed);
          }
        } catch {}
        let opts: string[] | undefined;
        if (optionsParsed?.options && Array.isArray(optionsParsed.options)) {
          opts = optionsParsed.options;
        } else if (Array.isArray(optionsParsed)) {
          opts = optionsParsed;
        }
        if (cfg.field_id === 'company_type' && (!opts || opts.length === 0)) {
          opts = ['Pessoa Física', 'Pessoa Jurídica'];
        }
        return {
          id: cfg.field_id,
          label: cfg.field_label,
          type: cfg.field_type,
          category: 'company',
          options: opts,
          required: cfg.field_id === 'telefone' ? false : !!cfg.required,
          locked: !!cfg.locked,
        };
      });
    }
    return companyFields;
  }, [fieldConfigsFromDB, companyFields]);

  // Carregar configurações de campos de empresa do banco
  const loadFieldConfigs = async (estabId: string) => {
    console.log('🔄 Carregando configs do banco...');
    const { data, error } = await supabase
      .from('form_field_configs')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .eq('form_type', 'empresa')
      .order('field_order');

    if (error) {
      console.error('❌ Erro ao carregar configs:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Configs carregadas:', data.map(d => ({ 
        id: d.field_id, 
        required: d.required,
        locked: d.locked 
      })));
      
      setFieldConfigsFromDB([...data]); // Force new array reference
      
      // Atualizar companyFields com os dados do banco
      setCompanyFields(prev => prev.map(field => {
        const dbConfig = data.find((c: any) => c.field_id === field.id);
        if (dbConfig) {
          return {
            ...field,
            required: field.id === 'telefone' ? false : dbConfig.required,
            locked: dbConfig.locked,
          };
        }
        return field;
      }));
      
      // Carregar também os campos de contato
      await loadContactFieldConfigs(estabId);

      // Atualizar colunas da tabela com campos customizados
      const customFieldColumns = data
        .map((cfg: any): TableColumn => ({
          id: cfg.field_id,
          label: cfg.field_label,
          visible: false,
          width: 150,
        }));

      // Mesclar com colunas existentes (sem perder customizações)
      setTableColumns(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const toAdd = customFieldColumns.filter(c => !existingIds.has(c.id));
        return [...prev, ...toAdd];
      });
    } else {
      // Se não tem configs no banco, criar padrão
      await createDefaultFieldConfigs(estabId);
    }
  };

  // Carregar configurações de campos de contato do banco
  const loadContactFieldConfigs = async (estabId: string) => {
    console.log('🔄 Carregando campos de contato do banco...');
    const { data, error } = await supabase
      .from('form_field_configs')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .eq('form_type', 'contato')
      .order('field_order');

    if (error) {
      console.error('❌ Erro ao carregar campos de contato:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Campos de contato carregados:', data.length);
      const mappedFields: CustomField[] = data.map((campo) => {
        const options = campo.options as any;
        return {
          id: campo.field_id,
          label: campo.field_label,
          type: campo.field_type as CustomField["type"],
          category: "contact",
          options: options?.options || [],
          required: campo.required || false,
          locked: campo.locked || false,
        };
      });
      setContactFields(mappedFields);
    }
  };

  const createDefaultFieldConfigs = async (estabId: string) => {
    const defaultConfigs = companyFields.map((field, index) => ({
      estabelecimento_id: estabId,
      form_type: 'empresa',
      field_id: field.id,
      field_label: field.label,
      field_type: field.type,
      required: field.required || false,
      locked: field.locked || false,
      field_order: index,
      options: field.options ? JSON.stringify(field.options) : null,
    }));

    const { error } = await supabase
      .from('form_field_configs')
      .insert(defaultConfigs);

    if (error) {
      console.error('Erro ao criar configs padrão:', error);
    } else {
      loadFieldConfigs(estabId);
    }
  };

  const updateFieldConfig = async (fieldId: string, updates: { required?: boolean; locked?: boolean }) => {
    if (!estabelecimentoId) return;

    const { error } = await supabase
      .from('form_field_configs')
      .update(updates)
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('form_type', 'empresa')
      .eq('field_id', fieldId);

    if (error) {
      console.error('Erro ao atualizar config:', error);
      toast.error('Erro ao salvar configuração');
      return;
    }

    // Atualizar estado local
    setCompanyFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
    
    toast.success('Configuração salva!');
  };

  // Estados para vincular contatos
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [contatosVinculados, setContatosVinculados] = useState<any[]>([]);
  const [buscaContato, setBuscaContato] = useState("");
  const [contatosFiltrados, setContatosFiltrados] = useState<Contato[]>([]);
  const [criarNovoContato, setCriarNovoContato] = useState(false);
  
  // Estados para segmentos
  const [segmentos, setSegmentos] = useState<Array<{ id: string; nome: string; estabelecimento_id: string }>>([]);
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);

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
        loadFieldConfigs(estabId);
        fetchSegmentos(estabId);
      }
    };
    fetchEstabelecimento();
  }, []);

  // Detectar se há um ID de empresa para editar vindo da navegação
  useEffect(() => {
    const state = location.state as { editEmpresaId?: string };
    if (state?.editEmpresaId && empresas.length > 0) {
      const empresaToEdit = empresas.find(e => e.id === state.editEmpresaId);
      if (empresaToEdit) {
        handleEditEmpresa(empresaToEdit);
        // Limpar o state após usar
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, empresas]);

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
  
  const fetchSegmentos = async (estabId: string) => {
    const { data, error } = await supabase
      .from('segmentos')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .order('nome');

    if (error) {
      console.error('Erro ao carregar segmentos:', error);
      return;
    }

    setSegmentos(data || []);
  };

  // Filtrar contatos na busca
  useEffect(() => {
    if (buscaContato.trim()) {
      const termo = buscaContato.toLowerCase();
      const termoNumerico = termo.replace(/\D/g, ''); // Remove caracteres não-numéricos para buscar telefone/WhatsApp
      const filtrados = contatos.filter(c => {
        const nomeMatch = c.nome?.toLowerCase().includes(termo);
        const emailMatch = c.email?.toLowerCase().includes(termo);
        const telefoneMatch = c.telefone?.replace(/\D/g, '').includes(termoNumerico);
        return nomeMatch || emailMatch || telefoneMatch;
      });
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
      company_name: empresa.nome || "",
      company_fantasia: empresa.nome_fantasia || "",
      telefone: empresa.telefone || "",
      email: empresa.email || "",
      cep: empresa.cep || "",
      address: empresa.endereco || "",
      city: empresa.cidade || "",
      state: empresa.estado || "",
      neighborhood: (empresa as any).bairro || empresa.custom_fields?.neighborhood || "",
      inscricao: empresa.custom_fields?.inscricao || "",
    };
    
    // Carregar campos customizados do custom_fields
    if (empresa.custom_fields) {
      Object.keys(empresa.custom_fields).forEach(key => {
        if (!data[key]) {
          data[key] = empresa.custom_fields[key];
        }
      });
    }
    
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
          email,
          custom_fields
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

  const handleDeleteEmpresa = (id: string) => {
    const empresa = empresas.find(e => e.id === id);
    if (!empresa) return;
    
    setEmpresaToDelete(empresa);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteEmpresa = async () => {
    if (!empresaToDelete) return;

    const { error } = await supabase
      .from('empresas')
      .delete()
      .eq('id', empresaToDelete.id);

    if (error) {
      toast.error("Erro ao excluir empresa");
      console.error(error);
      return;
    }

    toast.success("Empresa excluída!");
    setDeleteDialogOpen(false);
    setEmpresaToDelete(null);
    if (estabelecimentoId) fetchEmpresas(estabelecimentoId);
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };
  
  const checkDuplicateCnpjCpf = async (cnpjCpf: string) => {
    if (!estabelecimentoId) return;
    
    // Limpar formatação
    const cleanValue = cnpjCpf.replace(/\D/g, '');
    if (cleanValue.length < 11) return; // Aguardar entrada completa
    
    // Verificar se é uma edição do mesmo registro
    if (editingEmpresa && editingEmpresa.cnpj?.replace(/\D/g, '') === cleanValue) {
      return;
    }
    
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId);
    
    if (error) {
      console.error('Erro ao verificar CNPJ/CPF:', error);
      return;
    }
    
    // Comparar valores limpos
    const duplicate = data?.find(emp => emp.cnpj?.replace(/\D/g, '') === cleanValue);
    
    if (duplicate) {
      setDuplicateEmpresa(duplicate);
      setDuplicateDialogOpen(true);
    }
  };

  const handleCEPLookup = async (cep: string) => {
    const result = await lookupCEP(cep);
    if (result) {
      setFormData(prev => ({
        ...prev,
        cep: maskCEP(result.cep),
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
        telefone: maskWhatsApp(result.telefone),
        email: result.email,
        cep: maskCEP(result.cep),
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

      await supabase
        .from('customers')
        .update({ tipo_operador: true })
        .eq('id', contatoId);
      
      // Recarregar empresas para atualizar contatos vinculados
      if (estabelecimentoId) {
        await fetchEmpresas(estabelecimentoId);
      }
    }

    setContatosVinculados(prev => [...prev, { contato, cargo: "", departamento: "", is_primary: prev.length === 0 }]);
    setBuscaContato("");
    toast.success("Contato vinculado! O vínculo também aparecerá no cadastro do contato.");
  };

  const handleRemoveContatoVinculado = async (index: number) => {
    const vinculo = contatosVinculados[index];
    
    if (vinculo.id && editingEmpresa) {
      await supabase
        .from('customer_empresas')
        .delete()
        .eq('id', vinculo.id);

      const { data: outrosVinculos } = await supabase
        .from('customer_empresas')
        .select('id')
        .eq('customer_id', vinculo.contato.id);

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

    // Validar campos obrigatórios da empresa com base na configuração
    const requiredIds = formFieldsToRender.filter(f => f.required).map(f => f.id);
    requiredIds.forEach((fieldId) => {
      if (!formData[fieldId]?.toString().trim()) {
        errors[fieldId] = "Campo obrigatório";
      }
    });

    if (formData.cpf_cnpj) {
      if (formData.company_type === "Pessoa Física" && !validateCPF(formData.cpf_cnpj)) {
        errors.cpf_cnpj = "CPF inválido";
      }
      if (formData.company_type === "Pessoa Jurídica" && !validateCNPJ(formData.cpf_cnpj)) {
        errors.cpf_cnpj = "CNPJ inválido";
      }
    }

    if (formData.cep && !validateCEP(formData.cep)) {
      errors.cep = "CEP inválido";
    }

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
      if (formData.contact_phone && !validateWhatsApp(formData.contact_phone)) {
        errors.contact_phone = "WhatsApp inválido";
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

      // Separar campos padrão de campos customizados
      const standardFields = ['company_type', 'cpf_cnpj', 'company_name', 'company_fantasia', 'cep', 'address', 'city', 'neighborhood', 'state', 'inscricao', 'telefone', 'email'];
      const customFieldsData: any = {
        company_type: formData.company_type,
        neighborhood: formData.neighborhood,
        inscricao: formData.inscricao,
      };
      
      // Adicionar campos customizados do formulário
      Object.keys(formData).forEach(key => {
        if (!standardFields.includes(key) && !key.startsWith('contact_')) {
          customFieldsData[key] = formData[key];
        }
      });

      const empresaPayload: any = {
        estabelecimento_id: estabId,
        nome_fantasia: formData.company_fantasia,
        nome: formData.company_name,
        cnpj: formData.company_type === "Pessoa Jurídica" ? formData.cpf_cnpj : null,
        telefone: formData.telefone || null,
        email: formData.email || null,
        endereco: formData.address,
        cidade: formData.city,
        estado: formData.state,
        cep: formData.cep,
        bairro: formData.neighborhood || null,
        custom_fields: customFieldsData
      };

      let empresaId: string;

      if (editingEmpresa) {
        empresaId = editingEmpresa.id;
        await supabase
          .from('empresas')
          .update(empresaPayload)
          .eq('id', empresaId);

        toast.success("Empresa atualizada!");
      } else {
        const { data: inserted, error } = await supabase
          .from('empresas')
          .insert([empresaPayload])
          .select('id')
          .maybeSingle();

        if (error) throw error;
        empresaId = inserted!.id;

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
        // Preparar custom_fields com todos os campos de contato (exceto name, phone, email)
        const customFieldsData: Record<string, any> = {};
        contactFields.forEach(field => {
          if (!['name', 'phone', 'email'].includes(field.id) && formData[field.id]) {
            customFieldsData[field.id] = formData[field.id];
          }
        });

        const { data: novoContato, error: contatoErr } = await supabase
          .from('customers')
          .insert([{
            estabelecimento_id: estabId,
            nome: formData.name,
            telefone: formData.phone,
            email: formData.email,
            tipo_operador: true,
            custom_fields: customFieldsData
          }])
          .select('id')
          .maybeSingle();

        if (contatoErr) throw contatoErr;

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
      setCriarNovoContato(false);
      if (estabId) fetchEmpresas(estabId);
      if (estabId) fetchContatos(estabId);
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      toast.error("Erro ao salvar empresa");
    }
  };

  const handleColumnsChange = (newColumns: TableColumn[]) => {
    setTableColumns(newColumns);
  };

  const handleSort = (columnId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === columnId) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else {
        setSortConfig(null);
        return;
      }
    }
    
    setSortConfig({ key: columnId, direction });
  };

  const getSortIcon = (columnId: string) => {
    if (!sortConfig || sortConfig.key !== columnId) {
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
    }
    
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const renderContactField = (field: CustomField) => {
    const displayValue = formData[field.id] || "";

    const handleContactFieldChange = (value: any) => {
      let maskedValue = value;
      
      if (field.type === "phone" || field.id === "phone") {
        maskedValue = maskWhatsApp(value);
      }
      
      if (field.type === "email" || field.id === "email") {
        maskedValue = value.toLowerCase().replace(/\s/g, '');
      }

      setFormData(prev => ({ ...prev, [field.id]: maskedValue }));
      setFieldErrors(prev => ({ ...prev, [field.id]: '' }));
    };

    const handleContactFieldBlur = async () => {
      const value = formData[field.id];
      if (!value || !estabelecimentoId) return;
      
      // Verificar duplicidade de WhatsApp
      if ((field.type === "phone" || field.id === "phone") && value) {
        const cleanPhone = value.replace(/\D/g, '');
        const { data } = await supabase
          .from('customers')
          .select('id, nome, telefone, email')
          .eq('estabelecimento_id', estabelecimentoId);
        
        const duplicate = data?.find(c => {
          const existingPhone = c.telefone?.replace(/\D/g, '') || '';
          return existingPhone === cleanPhone;
        });
        
        if (duplicate) {
          setFieldErrors(prev => ({ ...prev, [field.id]: 'WhatsApp já cadastrado' }));
          toast.error(`WhatsApp já cadastrado para ${duplicate.nome}`);
        }
      }
      
      // Verificar duplicidade de E-mail
      if ((field.type === "email" || field.id === "email") && value) {
        const { data } = await supabase
          .from('customers')
          .select('id, nome, telefone, email')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('email', value.toLowerCase());
        
        if (data && data.length > 0) {
          setFieldErrors(prev => ({ ...prev, [field.id]: 'E-mail já cadastrado' }));
          toast.error(`E-mail já cadastrado para ${data[0].nome}`);
        }
      }
    };

    switch (field.type) {
      case "select":
        return (
          <Select
            value={displayValue}
            onValueChange={(value) => handleContactFieldChange(value)}
          >
            <SelectTrigger className={fieldErrors[field.id] ? "border-red-500" : ""}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "textarea":
        return (
          <Textarea
            value={displayValue}
            onChange={(e) => handleContactFieldChange(e.target.value)}
            placeholder="..."
            className={fieldErrors[field.id] ? "border-red-500" : ""}
          />
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.id}
              checked={!!displayValue}
              onCheckedChange={(checked) => handleContactFieldChange(checked)}
            />
            <label htmlFor={field.id} className="text-sm cursor-pointer">
              {field.label}
            </label>
          </div>
        );
      default:
        return (
          <div className="relative">
            <Input
              id={field.id}
              type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
              placeholder="..."
              value={displayValue}
              onChange={(e) => handleContactFieldChange(e.target.value)}
              onBlur={handleContactFieldBlur}
              required={field.required}
              className={fieldErrors[field.id] ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {fieldErrors[field.id] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors[field.id]}</p>
            )}
          </div>
        );
    }
  };

  const renderField = (field: CustomField, isDisabled: boolean = false) => {
    const displayValue = formData[field.id] || "";

    const handleFieldBlur = () => {
      if (field.id === "cep" && formData.cep?.length === 9) {
        handleCEPLookup(formData.cep);
      }
      if (field.id === "cpf_cnpj") {
        const cleanValue = formData.cpf_cnpj?.replace(/\D/g, '') || '';
        // Verifica duplicação se tiver pelo menos 11 dígitos (CPF ou CNPJ)
        if (cleanValue.length >= 11) {
          checkDuplicateCnpjCpf(formData.cpf_cnpj);
        }
        // Consulta CNPJ na API se for Pessoa Jurídica e tiver 14 dígitos
        if (formData.company_type === "Pessoa Jurídica" && formData.cpf_cnpj?.length === 18) {
          handleCNPJLookup(formData.cpf_cnpj);
        }
      }
    };

    const handleFieldChange = (value: any) => {
      let maskedValue = value;

      if (field.id === "cpf_cnpj") {
        maskedValue = formData.company_type === "Pessoa Física" ? maskCPF(value) : maskCNPJ(value);
      } else if (field.id === "cep") {
        maskedValue = maskCEP(value);
      } else if (field.type === "phone") {
        maskedValue = maskWhatsApp(value);
      } else if (field.id === "phone") {
        maskedValue = maskPhone(value);
      }

      setFormData(prev => ({ ...prev, [field.id]: maskedValue }));
      setFieldErrors(prev => ({ ...prev, [field.id]: '' }));
    };

    switch (field.type) {
      case "select":
        return (
          <Select
            value={displayValue}
            onValueChange={(value) => handleFieldChange(value)}
            disabled={isDisabled}
          >
            <SelectTrigger className={`${fieldErrors[field.id] ? "border-red-500" : ""} ${isDisabled ? "bg-muted/50 cursor-not-allowed" : ""}`}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "textarea":
        return (
          <Textarea
            value={displayValue}
            onChange={(e) => handleFieldChange(e.target.value)}
            placeholder="..."
            disabled={isDisabled}
            className={`${fieldErrors[field.id] ? "border-red-500" : ""} ${isDisabled ? "bg-muted/50 cursor-not-allowed" : ""}`}
          />
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.id}
              checked={!!displayValue}
              onCheckedChange={(checked) => handleFieldChange(checked)}
              disabled={isDisabled}
            />
            <label htmlFor={field.id} className="text-sm cursor-pointer">
              {field.label}
            </label>
          </div>
        );
      default:
        return (
          <div className="relative">
            <Input
              id={field.id}
              type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
              placeholder="..."
              value={displayValue}
              onChange={(e) => handleFieldChange(e.target.value)}
              onBlur={handleFieldBlur}
              required={field.required}
              disabled={isDisabled}
              className={`${fieldErrors[field.id] ? "border-red-500 focus-visible:ring-red-500" : ""} ${isDisabled ? "bg-muted/50 cursor-not-allowed" : ""}`}
            />
            {fieldErrors[field.id] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors[field.id]}</p>
            )}
            {(field.id === "cpf_cnpj" && cnpjLoading) || (field.id === "cep" && cepLoading) ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        );
    }
  };

  const filteredEmpresas = empresas.filter(e =>
    e.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cnpj?.includes(searchTerm) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedEmpresas = React.useMemo(() => {
    if (!sortConfig) return filteredEmpresas;

    return [...filteredEmpresas].sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortConfig.key) {
        case 'nome_fantasia':
          aValue = a.nome_fantasia || '';
          bValue = b.nome_fantasia || '';
          break;
        case 'nome':
          aValue = a.nome || '';
          bValue = b.nome || '';
          break;
        case 'cnpj':
          aValue = a.cnpj || '';
          bValue = b.cnpj || '';
          break;
        case 'telefone':
          aValue = a.telefone || '';
          bValue = b.telefone || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'cidade':
          aValue = a.cidade || '';
          bValue = b.cidade || '';
          break;
        case 'estado':
          aValue = a.estado || '';
          bValue = b.estado || '';
          break;
        default:
          // Campos customizados vêm do custom_fields
          aValue = a.custom_fields?.[sortConfig.key] || '';
          bValue = b.custom_fields?.[sortConfig.key] || '';
      }

      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredEmpresas, sortConfig]);

  return (
    <>
      {!showForm ? (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-background to-muted/20">
        <div className="border-b bg-card/80 backdrop-blur-sm px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-light tracking-tight text-foreground">Empresas</h1>
              <p className="text-sm text-muted-foreground mt-1">Gerencie sua carteira de clientes</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => {
                setShowForm(true);
                setEditingEmpresa(null);
                setFormData({});
                setContatosVinculados([]);
                setCriarNovoContato(false);
              }} className="gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                Nova Empresa
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <TableColumnsConfig 
              columns={tableColumns} 
              onColumnsChange={handleColumnsChange}
              fieldsTabLabel="Campos da Empresa"
              fieldsConfigComponent={
                estabelecimentoId ? (
                  <EmpresaFieldsCRUD 
                    estabelecimentoId={estabelecimentoId} 
                    onChanged={async () => {
                      if (estabelecimentoId) {
                        await loadFieldConfigs(estabelecimentoId);
                      }
                    }}
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    Carregando configurações...
                  </div>
                )
              }
            />
            
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 border-border/40 focus-visible:ring-1 bg-background/50"
                />
              </div>
            </div>
            
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
                Limpar
              </Button>
            )}
            
            <div className="ml-auto text-sm font-light text-muted-foreground">
              {sortedEmpresas.length} {sortedEmpresas.length === 1 ? 'empresa' : 'empresas'}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {sortedEmpresas.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-lg font-light text-foreground mb-2">Nenhuma empresa encontrada</p>
                <p className="text-sm text-muted-foreground">Adicione sua primeira empresa para começar</p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-border/40 bg-muted/30">
                  <tr>
                    {tableColumns.filter(col => col.visible).map((column, index) => (
                      <th
                        key={column.id}
                        className={`text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground relative ${
                          index === 0 ? 'sticky left-0 bg-muted/30 border-r border-border/40 z-20' : ''
                        }`}
                        style={{ width: column.width, minWidth: column.width }}
                      >
                        <div className="flex items-center justify-between gap-2 pr-4">
                          <span>{column.label}</span>
                          {column.id !== 'actions' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-background/50"
                              onClick={() => handleSort(column.id)}
                            >
                              {getSortIcon(column.id)}
                            </Button>
                          )}
                        </div>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize hover:bg-primary/60 hover:w-1 bg-border/30 z-20 transition-all"
                          style={{ touchAction: 'none' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startWidth = column.width;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              moveEvent.preventDefault();
                              const diff = moveEvent.clientX - startX;
                              const newWidth = Math.max(80, startWidth + diff);
                              setTableColumns(prev =>
                                prev.map(col =>
                                  col.id === column.id ? { ...col, width: newWidth } : col
                                )
                              );
                            };

                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                              document.body.style.cursor = '';
                              document.body.style.userSelect = '';
                            };

                            document.body.style.cursor = 'col-resize';
                            document.body.style.userSelect = 'none';
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedEmpresas.map((empresa) => (
                    <tr key={empresa.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                      {tableColumns.filter(col => col.visible).map((column, index) => {
                        if (column.id === 'actions') {
                          return (
                            <td key="actions" className="p-3 sticky left-0 bg-card group-hover:bg-muted/30 border-r border-border/40">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                  onClick={() => handleEditEmpresa(empresa)}
                                  title="Editar empresa"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEmpresa(empresa.id);
                                  }}
                                  title="Excluir empresa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          );
                        }
                        
                        let cellValue = "";
                        switch (column.id) {
                          case 'nome_fantasia':
                            cellValue = empresa.nome_fantasia || "-";
                            break;
                          case 'nome':
                            cellValue = empresa.nome || "-";
                            break;
                          case 'cnpj':
                            cellValue = empresa.cnpj || "-";
                            break;
                          case 'telefone':
                            cellValue = empresa.telefone || "-";
                            break;
                          case 'email':
                            cellValue = empresa.email || "-";
                            break;
                          case 'cidade':
                            cellValue = empresa.cidade || "-";
                            break;
                          case 'estado':
                            cellValue = empresa.estado || "-";
                            break;
                          case 'endereco':
                            cellValue = empresa.endereco || "-";
                            break;
                          case 'cep':
                            cellValue = empresa.cep || "-";
                            break;
                          case 'bairro':
                            cellValue = (empresa as any).bairro || "-";
                            break;
                          case 'company_type':
                            cellValue = empresa.custom_fields?.company_type || "-";
                            break;
                          case 'inscricao':
                            cellValue = empresa.custom_fields?.inscricao || "-";
                            break;
                          default:
                            // Campos customizados vêm do custom_fields
                            cellValue = empresa.custom_fields?.[column.id] || "-";
                        }
                        
                        return (
                          <td 
                            key={column.id} 
                            className={`p-4 ${column.id === 'nome_fantasia' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                            style={{ width: column.width, maxWidth: column.width }}
                          >
                            <span className="truncate block text-sm">{cellValue}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-background to-muted/20">
      <div className="border-b bg-card/80 backdrop-blur-sm px-8 py-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowForm(false)}
            className="hover:bg-accent/50"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-light tracking-tight text-foreground">
              {editingEmpresa ? "Editar Empresa" : "Nova Empresa"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {editingEmpresa ? "Atualize as informações da empresa" : "Preencha os dados da nova empresa"}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <Plus className="w-4 h-4" />
            Tags
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <Tabs defaultValue="empresa" className="w-full max-w-6xl mx-auto">
          <TabsList className="bg-muted/30 border border-border/40 p-1 rounded-lg mb-6">
            <TabsTrigger 
              value="empresa"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
            >
              Dados da Empresa
            </TabsTrigger>
            <TabsTrigger 
              value="contatos"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              onClick={() => setCriarNovoContato(false)}
            >
              Contatos Vinculados
            </TabsTrigger>
            <TabsTrigger 
              value="segmentos"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
            >
              Segmentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa" className="space-y-6">
            <Card className="border-border/40 shadow-sm">
              <div className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wide">
                  Informações Principais
                </h3>
                <div className="grid grid-cols-2 gap-4">
                {formFieldsToRender.map((field) => {
                  // Lógica de liberação progressiva
                  const tipoSelecionado = !!formData.company_type;
                  const cnpjPreenchido = !!formData.cpf_cnpj;
                  
                  // CPF/CNPJ só habilita após selecionar o tipo
                  const isDisabled = field.id === "cpf_cnpj" ? !tipoSelecionado : 
                                     field.id === "company_type" ? false :
                                     !cnpjPreenchido;
                  
                  // Para campos auto-preenchidos, desabilitar sempre
                  const finalDisabled = field.locked || isDisabled;
                  
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label 
                        htmlFor={field.id} 
                        className={`text-sm font-medium ${
                          field.id === 'company_type' || field.id === 'cpf_cnpj' 
                            ? 'text-primary font-semibold text-base' 
                            : 'text-foreground'
                        }`}
                      >
                        {field.label} 
                        {field.required && <span className="text-destructive ml-1">*</span>}
                        {field.locked && <span className="text-xs text-muted-foreground ml-2">(preenchido automaticamente)</span>}
                      </Label>
                      <div className={field.id === 'company_type' || field.id === 'cpf_cnpj' ? 'ring-2 ring-primary/30 rounded-md' : ''}>
                        {renderField(field, finalDisabled)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowForm(false)}
                className="border-border/40"
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveEmpresa} className="shadow-sm">
                {editingEmpresa ? "Salvar Alterações" : "Criar Empresa"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="contatos" className="p-6">
            {/* Lista de Contatos Vinculados */}
            {contatosVinculados.length > 0 && (
              <Card className="p-4 mb-4">
                <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Contatos Vinculados
                </h3>
                <div className="space-y-2">
                  {contatosVinculados.map((vinculo, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded-md hover:bg-accent/50">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{vinculo.contato?.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {vinculo.contato?.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {vinculo.is_primary && (
                          <Badge variant="secondary" className="text-xs">Principal</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => {
                            // Editar contato - preservar dados da empresa
                            const contatoCompleto = contatos.find(c => c.id === vinculo.contato?.id);
                            if (contatoCompleto) {
                              // Salvar dados atuais da empresa antes de trocar
                              const empresaData = {
                                company_type: formData.company_type,
                                cpf_cnpj: formData.cpf_cnpj,
                                company_name: formData.company_name,
                                company_fantasia: formData.company_fantasia,
                                phone: formData.phone,
                                email: formData.email,
                                cep: formData.cep,
                                address: formData.address,
                                city: formData.city,
                                state: formData.state,
                                neighborhood: formData.neighborhood,
                                inscricao: formData.inscricao,
                              };
                              
                              // Carregar dados do contato + preservar empresa
                              // Carregar dados do contato
                              const data: Record<string, any> = {
                                ...empresaData,
                                name: contatoCompleto.nome,
                                phone: contatoCompleto.telefone,
                                email: contatoCompleto.email,
                                ...contatoCompleto.custom_fields,
                              };
                              setFormData(data);
                              setCriarNovoContato(true);
                            }
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleRemoveContatoVinculado(idx)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Busca e Seleção de Contato */}
            {!criarNovoContato && (
              <Card className="p-4 mb-4">
                <Label className="text-xs">Vincular Contato</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Buscar por nome, e-mail ou WhatsApp..."
                    value={buscaContato}
                    className="h-9 text-sm"
                    onChange={(e) => setBuscaContato(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCriarNovoContato(true);
                    }}
                  >
                    + Novo
                  </Button>
                </div>

                {/* Lista de contatos filtrados */}
                {contatosFiltrados.length > 0 && (
                  <div className="border rounded-md max-h-[160px] overflow-y-auto mt-2">
                    {contatosFiltrados.map((contato) => (
                      <button
                        key={contato.id}
                        className="w-full text-left p-2 hover:bg-accent transition-colors border-b last:border-b-0"
                        onClick={() => {
                          handleAddContatoVinculado(contato.id);
                          setContatosFiltrados([]);
                          setBuscaContato("");
                        }}
                      >
                        <div className="font-medium text-sm">{contato.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {contato.email} {contato.telefone && `• ${contato.telefone}`}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Formulário de Novo Contato - igual à tela de Contatos */}
            {criarNovoContato && (
              <Card className="p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Cadastrar Contato
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setCriarNovoContato(false);
                      setFormData(prev => {
                        const newData = { ...prev };
                        contactFields.forEach(field => {
                          delete newData[field.id];
                        });
                        return newData;
                      });
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {contactFields.map((field) => (
                    <div key={field.id}>
                      <Label 
                        htmlFor={field.id} 
                        className={`text-sm font-medium ${
                          field.id === 'name' || field.id === 'phone' 
                            ? 'text-primary font-semibold text-base' 
                            : 'text-foreground'
                        }`}
                      >
                        {field.label} {field.required && '*'}
                      </Label>
                      <div className={field.id === 'name' || field.id === 'phone' ? 'ring-2 ring-primary/30 rounded-md' : ''}>
                        {renderContactField(field)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveEmpresa}>
                Salvar
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="segmentos" className="p-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Segmentos da Empresa</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Selecione um ou mais segmentos para categorizar esta empresa.
                  </p>
                </div>

                {segmentos.length > 0 ? (
                  <div className="space-y-2">
                    {segmentos.map((segmento) => (
                      <div key={segmento.id} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-accent transition-colors">
                        <Checkbox
                          id={`seg-tab-${segmento.id}`}
                          checked={segmentosSelecionados.includes(segmento.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSegmentosSelecionados([...segmentosSelecionados, segmento.id]);
                            } else {
                              setSegmentosSelecionados(segmentosSelecionados.filter(id => id !== segmento.id));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`seg-tab-${segmento.id}`}
                          className="text-base font-normal cursor-pointer flex-1"
                        >
                          {segmento.nome}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">
                      Nenhum segmento cadastrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Configure segmentos nas configurações do estabelecimento para poder categorizar suas empresas.
                    </p>
                  </div>
                )}

                {segmentosSelecionados.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Segmentos selecionados: <span className="font-semibold">{segmentosSelecionados.length}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {segmentosSelecionados.map((segId) => {
                        const seg = segmentos.find(s => s.id === segId);
                        return seg ? (
                          <Badge key={segId} variant="secondary">
                            {seg.nome}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
        </div>
      )}

      {/* Dialog de confirmação de exclusão - renderizado em ambas as visualizações */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa <strong>{empresaToDelete?.nome_fantasia || empresaToDelete?.nome}</strong>?
              {"\n\n"}
              Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEmpresa}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dialog de CNPJ/CPF duplicado */}
      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>CNPJ/CPF já cadastrado</AlertDialogTitle>
            <AlertDialogDescription>
              Este CNPJ/CPF já está cadastrado para a empresa <strong>{duplicateEmpresa?.nome_fantasia || duplicateEmpresa?.nome}</strong>.
              {"\n\n"}
              Deseja ir para o cadastro existente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDuplicateDialogOpen(false);
              setDuplicateEmpresa(null);
              setFormData(prev => ({ ...prev, cpf_cnpj: '' }));
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (duplicateEmpresa) {
                handleEditEmpresa(duplicateEmpresa);
              }
              setDuplicateDialogOpen(false);
              setDuplicateEmpresa(null);
            }}>
              Ir para o cadastro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
