import { useState, useEffect } from "react";
import { geocodeAndSaveEmpresa } from "@/hooks/useGeocodingService";
import * as React from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, Trash2, Search, X, Loader2, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Upload, Download, Pencil, Edit, GripVertical, Phone } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { validateCPF, validateCNPJ, validateEmail, validateCEP, validateWhatsApp } from "@/lib/validators";
import { maskCPF, maskCNPJ, maskCEP, maskPhone, maskWhatsApp } from "@/lib/masks";
import { useAddressLookup } from "@/hooks/useAddressLookup";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { TableColumnsConfig, type TableColumn } from "@/components/config/TableColumnsConfig";
import { EmpresaFieldsCRUD } from "@/components/config/EmpresaFieldsCRUD";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { APIImportDialogEmpresas } from "@/components/config/APIImportDialogEmpresas";
import { SoftphoneDialog } from "@/components/softphone/SoftphoneDialog";
import { ConvertProspectDialog } from "@/components/empresas/ConvertProspectDialog";
import { UserCheck } from "lucide-react";



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
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  custom_fields: any;
  created_at?: string;
  emails_vinculados?: string[];
  whatsapps_vinculados?: string[];
}

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  custom_fields: any;
}

interface EmpresasProps {
  hideAdminButtons?: boolean;
  variant?: "empresa" | "vendedor" | "transportadora";
}

export default function Empresas({ hideAdminButtons = false, variant = "empresa" }: EmpresasProps) {
  const entityConfig = {
    empresa: { singular: "Empresa", plural: "Empresas", tipo_cliente: "B2B", subtitle: "Gerencie sua carteira de clientes", showSegmento: true, showTipoCliente: true },
    vendedor: { singular: "Vendedor", plural: "Vendedores", tipo_cliente: "vendedor", subtitle: "Gerencie seus vendedores", showSegmento: true, showTipoCliente: false },
    transportadora: { singular: "Transportadora", plural: "Transportadoras", tipo_cliente: "transportadora", subtitle: "Gerencie suas transportadoras", showSegmento: false, showTipoCliente: false },
  }[variant];
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresasParaVincular, setEmpresasParaVincular] = useState<Array<{ id: string; nome_fantasia: string; nome: string; cnpj?: string }>>([]);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("nao_prospect");
  
  // Estados para confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<Empresa | null>(null);
  
  // Estados para CNPJ/CPF duplicado
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateEmpresa, setDuplicateEmpresa] = useState<Empresa | null>(null);

  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string }>>([]);
  const [vendedoresLista, setVendedoresLista] = useState<Array<{ id: string; nome_fantasia: string; nome: string }>>([]);
  const [vinculos, setVinculos] = useState<any[]>([]);
  const [segmentos, setSegmentos] = useState<Array<{ id: string; nome: string; is_prospect?: boolean }>>([]);
  
  // Estados para gerenciar vínculos na aba
  const [novosUsuariosVinculo, setNovosUsuariosVinculo] = useState<string[]>([]);
  const [novosVendedoresVinculo, setNovosVendedoresVinculo] = useState<string[]>([]);
  const [novosSegmentosVinculo, setNovosSegmentosVinculo] = useState<string[]>([]);
  const [novasEmpresasVinculo, setNovasEmpresasVinculo] = useState<string[]>([]);
  
  // Estado para dialog de importação via API
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Estado para softphone
  const [softphoneOpen, setSoftphoneOpen] = useState(false);
  const [convertProspect, setConvertProspect] = useState<Empresa | null>(null);
  const [softphoneNumber, setSoftphoneNumber] = useState("");
  
  // Estados para emails e WhatsApps vinculados
  const [emailsVinculados, setEmailsVinculados] = useState<string[]>([]);
  const [whatsappsVinculados, setWhatsappsVinculados] = useState<string[]>([]);

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
      { id: "whatsapp", label: "WhatsApp", visible: false, width: 150 },
      { id: "email", label: "E-mail", visible: true, width: 250 },
      { id: "cidade", label: "Cidade", visible: false, width: 150 },
      { id: "estado", label: "UF", visible: false, width: 80 },
      { id: "endereco", label: "Endereço", visible: false, width: 220 },
      { id: "bairro", label: "Bairro", visible: false, width: 160 },
      { id: "cep", label: "CEP", visible: false, width: 120 },
      { id: "company_type", label: "Tipo", visible: false, width: 140 },
      { id: "tipo_cliente", label: "Tipo Cliente", visible: true, width: 100 },
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
    { id: "tipo_cliente", label: "Tipo de Cliente", type: "select", category: "company", options: ["B2B", "B2C", "B2G"], required: true, locked: false },
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
    { id: "whatsapp", label: "WhatsApp", type: "phone", category: "company", required: false, locked: true },
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

  // Detectar se há um ID de empresa para editar vindo da navegação (via state ou URL params)
  useEffect(() => {
    const state = location.state as { editEmpresaId?: string };
    const idFromUrl = searchParams.get('id');
    const empresaIdToEdit = state?.editEmpresaId || idFromUrl;
    
    if (empresaIdToEdit && empresas.length > 0) {
      const empresaToEdit = empresas.find(e => e.id === empresaIdToEdit);
      if (empresaToEdit) {
        handleEditEmpresa(empresaToEdit);
        // Limpar o state após usar
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, searchParams, empresas]);

  const fetchEmpresas = async (estabId: string) => {
    let query = supabase
      .from('empresas')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .order('nome_fantasia');

    if (variant === "empresa") {
      // Excluir vendedores e transportadoras da lista de empresas
      query = query.not('tipo_cliente', 'in', '("vendedor","transportadora")');
    } else {
      query = query.eq('tipo_cliente', entityConfig.tipo_cliente);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao carregar empresas:', error);
      return;
    }

    setEmpresas(data || []);

    // Carregar usuários
    const { data: usuariosData, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, nome')
      .eq('estabelecimento_id', estabId)
      .order('nome');

    if (!usuariosError) {
      setUsuarios(usuariosData || []);
    }

    // Carregar vendedores (empresas com tipo_cliente = vendedor)
    const { data: vendedoresData } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, nome')
      .eq('estabelecimento_id', estabId)
      .eq('tipo_cliente', 'vendedor')
      .order('nome_fantasia');
    setVendedoresLista(vendedoresData || []);

    // Carregar empresas reais (para uso na aba de vínculos em vendedor/transportadora)
    if (variant !== "empresa") {
      const { data: empresasReaisData } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, nome, cnpj')
        .eq('estabelecimento_id', estabId)
        .not('tipo_cliente', 'in', '("vendedor","transportadora")')
        .order('nome_fantasia');
      setEmpresasParaVincular(empresasReaisData || []);
    } else {
      setEmpresasParaVincular([]);
    }

    // Carregar vínculos
    const { data: vinculosData, error: vinculosError } = await supabase
      .from('empresa_vinculos')
      .select('*')
      .eq('estabelecimento_id', estabId);

    if (!vinculosError) {
      setVinculos(vinculosData || []);
    }
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
      .select('id, nome, is_prospect')
      .eq('estabelecimento_id', estabId)
      .order('nome');

    if (error) {
      console.error('Erro ao carregar segmentos:', error);
      return;
    }

    setSegmentos((data as any) || []);
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
      tipo_cliente: (empresa as any).tipo_cliente || "B2B",
      cpf_cnpj: empresa.cnpj || "",
      company_name: empresa.nome || "",
      company_fantasia: empresa.nome_fantasia || "",
      telefone: empresa.telefone || "",
      whatsapp: (empresa as any).whatsapp || "",
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

    // Carregar emails e WhatsApps vinculados
    setEmailsVinculados(empresa.emails_vinculados || []);
    setWhatsappsVinculados(empresa.whatsapps_vinculados || []);

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

    try {
      // Verificar se há orçamentos vinculados
      const { data: orcamentos, error: orcamentosError } = await supabase
        .from('orcamentos')
        .select('id')
        .eq('empresa_id', empresaToDelete.id)
        .limit(1);

      if (orcamentosError) {
        console.error('Erro ao verificar orçamentos:', orcamentosError);
      }

      if (orcamentos && orcamentos.length > 0) {
        toast.error("Não é possível excluir esta empresa pois existem orçamentos vinculados a ela");
        setDeleteDialogOpen(false);
        setEmpresaToDelete(null);
        return;
      }

      // Deletar vínculos com contatos
      const { error: vinculosError } = await supabase
        .from('customer_empresas')
        .delete()
        .eq('empresa_id', empresaToDelete.id);

      if (vinculosError) {
        toast.error("Erro ao remover vínculos da empresa");
        console.error(vinculosError);
        return;
      }

      // Deletar a empresa
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
    } catch (err) {
      toast.error("Erro ao excluir empresa");
      console.error(err);
    }
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
      const standardFields = ['company_type', 'tipo_cliente', 'cpf_cnpj', 'company_name', 'company_fantasia', 'cep', 'address', 'city', 'neighborhood', 'state', 'inscricao', 'telefone', 'whatsapp', 'email'];
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
        cnpj: formData.cpf_cnpj || null,
        telefone: formData.telefone || null,
        whatsapp: formData.whatsapp || null,
        email: formData.email || null,
        endereco: formData.address,
        cidade: formData.city,
        estado: formData.state,
        cep: formData.cep,
        bairro: formData.neighborhood || null,
        tipo_cliente: variant !== "empresa" ? entityConfig.tipo_cliente : (formData.tipo_cliente || "B2B"),
        custom_fields: customFieldsData,
        emails_vinculados: emailsVinculados,
        whatsapps_vinculados: whatsappsVinculados
      };

      let empresaId: string;

      if (editingEmpresa) {
        empresaId = editingEmpresa.id;
        await supabase
          .from('empresas')
          .update(empresaPayload)
          .eq('id', empresaId);

        // Geocodificar e salvar coordenadas automaticamente
        geocodeAndSaveEmpresa(
          supabase,
          empresaId,
          formData.address,
          formData.city,
          formData.state,
          formData.cep
        );

        toast.success("Empresa atualizada!");
      } else {
        const { data: inserted, error } = await supabase
          .from('empresas')
          .insert([empresaPayload])
          .select('id')
          .maybeSingle();

        if (error) throw error;
        empresaId = inserted!.id;

        // Geocodificar e salvar coordenadas automaticamente
        geocodeAndSaveEmpresa(
          supabase,
          empresaId,
          formData.address,
          formData.city,
          formData.state,
          formData.cep
        );

        // Nota: empresa_vinculos agora só armazena segmentos, não usuários
        // O vínculo do usuário é feito no customer_vinculos do contato

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

        // Vincular automaticamente o contato ao usuário que criou
        const { data: { user } } = await supabase.auth.getUser();
        if (user && novoContato) {
          await supabase.from('customer_vinculos').insert({
            customer_id: novoContato.id,
            estabelecimento_id: estabId,
            usuario_id: user.id
          });
        }

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
      setEmailsVinculados([]);
      setWhatsappsVinculados([]);
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

  const handleAdicionarVinculo = async () => {
    if (!estabelecimentoId || !editingEmpresa || novosSegmentosVinculo.length === 0) {
      toast.error("Selecione pelo menos um segmento");
      return;
    }

    try {
      const vinculos = [];
      
      // Criar vínculos independentes para segmentos
      for (const segmentoId of novosSegmentosVinculo) {
        vinculos.push({
          empresa_id: editingEmpresa.id,
          usuario_id: null,
          segmento_id: segmentoId,
          estabelecimento_id: estabelecimentoId,
        });
      }

      const { error } = await supabase
        .from("empresa_vinculos")
        .insert(vinculos);

      if (error) throw error;

      // Sincronizar segmentos com os contatos vinculados à empresa
      const { data: contatosEmpresa } = await supabase
        .from("customer_empresas")
        .select("customer_id")
        .eq("empresa_id", editingEmpresa.id);

      if (contatosEmpresa && contatosEmpresa.length > 0) {
        const customerIds = contatosEmpresa.map(c => c.customer_id);
        
        // Adicionar segmentos aos contatos que ainda não os têm
        for (const customerId of customerIds) {
          for (const segmentoId of novosSegmentosVinculo) {
            const { data: existing } = await supabase
              .from("customer_vinculos")
              .select("id")
              .eq("customer_id", customerId)
              .eq("segmento_id", segmentoId)
              .maybeSingle();
            
            if (!existing) {
              await supabase.from("customer_vinculos").insert({
                customer_id: customerId,
                usuario_id: null,
                segmento_id: segmentoId,
                estabelecimento_id: estabelecimentoId,
              });
            }
          }
        }
      }

      toast.success("Segmentos adicionados!");
      setNovosSegmentosVinculo([]);
      await fetchEmpresas(estabelecimentoId);
    } catch (error: any) {
      if (error.message.includes("duplicate")) {
        toast.error("Um ou mais vínculos já existem");
      } else {
        toast.error("Erro ao adicionar vínculos: " + error.message);
      }
    }
  };

  const handleAdicionarUsuariosVinculo = async () => {
    if (!estabelecimentoId || !editingEmpresa || novosUsuariosVinculo.length === 0) {
      toast.error("Selecione pelo menos um usuário");
      return;
    }
    try {
      const rows = novosUsuariosVinculo.map((uid) => ({
        empresa_id: editingEmpresa.id,
        usuario_id: uid,
        segmento_id: null,
        vendedor_id: variant === "vendedor" ? editingEmpresa.id : null,
        transportadora_id: variant === "transportadora" ? editingEmpresa.id : null,
        estabelecimento_id: estabelecimentoId,
      }));
      const { error } = await supabase.from("empresa_vinculos").insert(rows);
      if (error) throw error;
      toast.success("Usuários vinculados!");
      setNovosUsuariosVinculo([]);
      await fetchEmpresas(estabelecimentoId);
    } catch (error: any) {
      toast.error("Erro ao vincular usuários: " + error.message);
    }
  };

  const handleAdicionarVendedoresVinculo = async () => {
    if (!estabelecimentoId || !editingEmpresa || novosVendedoresVinculo.length === 0) {
      toast.error("Selecione pelo menos um vendedor");
      return;
    }
    try {
      const rows = novosVendedoresVinculo.map((vid) => ({
        empresa_id: editingEmpresa.id,
        vendedor_id: vid,
        usuario_id: null,
        segmento_id: null,
        estabelecimento_id: estabelecimentoId,
      }));
      const { error } = await supabase.from("empresa_vinculos").insert(rows);
      if (error) throw error;
      toast.success("Vendedores vinculados!");
      setNovosVendedoresVinculo([]);
      await fetchEmpresas(estabelecimentoId);
    } catch (error: any) {
      toast.error("Erro ao vincular vendedores: " + error.message);
    }
  };

  const handleAdicionarEmpresasVinculo = async () => {
    if (!estabelecimentoId || !editingEmpresa || novasEmpresasVinculo.length === 0) {
      toast.error("Selecione pelo menos uma empresa");
      return;
    }
    try {
      const rows = novasEmpresasVinculo.map((eid) => ({
        empresa_id: eid,
        vendedor_id: variant === "vendedor" ? editingEmpresa.id : null,
        transportadora_id: variant === "transportadora" ? editingEmpresa.id : null,
        usuario_id: null,
        segmento_id: null,
        estabelecimento_id: estabelecimentoId,
      }));
      const { error } = await supabase.from("empresa_vinculos").insert(rows);
      if (error) throw error;
      toast.success("Empresas vinculadas!");
      setNovasEmpresasVinculo([]);
      await fetchEmpresas(estabelecimentoId);
    } catch (error: any) {
      toast.error("Erro ao vincular empresas: " + error.message);
    }
  };

  const handleRemoverVinculoSimples = async (vinculoId: string) => {
    try {
      const { error } = await supabase.from("empresa_vinculos").delete().eq("id", vinculoId);
      if (error) throw error;
      toast.success("Vínculo removido!");
      await fetchEmpresas(estabelecimentoId!);
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };


  const handleRemoverVinculo = async (vinculoId: string) => {
    try {
      // Primeiro buscar os dados do vínculo para saber o segmento_id
      const { data: vinculoData } = await supabase
        .from("empresa_vinculos")
        .select("segmento_id")
        .eq("id", vinculoId)
        .maybeSingle();

      const segmentoId = vinculoData?.segmento_id;

      // Remover o vínculo da empresa
      const { error } = await supabase
        .from("empresa_vinculos")
        .delete()
        .eq("id", vinculoId);

      if (error) throw error;

      // Se for um segmento, remover também dos contatos vinculados à empresa
      if (editingEmpresa && segmentoId) {
        const { data: contatosEmpresa } = await supabase
          .from("customer_empresas")
          .select("customer_id")
          .eq("empresa_id", editingEmpresa.id);

        if (contatosEmpresa && contatosEmpresa.length > 0) {
          const customerIds = contatosEmpresa.map(c => c.customer_id);
          
          // Remover o segmento dos contatos vinculados
          await supabase
            .from("customer_vinculos")
            .delete()
            .in("customer_id", customerIds)
            .eq("segmento_id", segmentoId);
        }
      }

      toast.success("Segmento removido!");
      await fetchEmpresas(estabelecimentoId);
    } catch (error: any) {
      toast.error("Erro ao remover vínculo: " + error.message);
    }
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
              className={`${fieldErrors[field.id] ? "border-red-500 focus-visible:ring-red-500" : ""} ${isDisabled ? "bg-muted/50 cursor-not-allowed" : ""} ${field.type === "phone" || field.id === "telefone" ? "pr-10" : ""}`}
            />
            {fieldErrors[field.id] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors[field.id]}</p>
            )}
            {(field.id === "cpf_cnpj" && cnpjLoading) || (field.id === "cep" && cepLoading) ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            ) : null}
            {(field.type === "phone" || field.id === "telefone") && displayValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-primary/10"
                onClick={() => {
                  setSoftphoneNumber(displayValue);
                  setSoftphoneOpen(true);
                }}
                disabled={isDisabled}
              >
                <Phone className="w-4 h-4 text-primary" />
              </Button>
            )}
          </div>
        );
    }
  };

  const filteredEmpresas = empresas.filter(e => {
    const status = (e as any).status_comercial || null;
    if (statusFilter === "nao_prospect" && status === "prospect") return false;
    if (statusFilter === "somente_prospect" && status !== "prospect") return false;
    if (statusFilter !== "all" && statusFilter !== "nao_prospect" && statusFilter !== "somente_prospect") {
      if (status !== statusFilter) return false;
    }
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      e.nome_fantasia?.toLowerCase().includes(term) ||
      e.nome?.toLowerCase().includes(term) ||
      e.cnpj?.includes(searchTerm) ||
      e.email?.toLowerCase().includes(term)
    );
  });

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
        <div className="border-b bg-card/80 backdrop-blur-sm px-3 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">{entityConfig.plural}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{entityConfig.subtitle}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Button onClick={() => {
                setShowForm(true);
                setEditingEmpresa(null);
                setFormData({});
                setContatosVinculados([]);
                setCriarNovoContato(false);
              }} className="gap-2 shadow-sm text-xs sm:text-sm h-9 sm:h-10">
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                {variant === "empresa" ? "Nova Empresa" : (variant === "vendedor" ? "Novo Vendedor" : "Nova Transportadora")}
              </Button>
              {!hideAdminButtons && (
                <Button 
                  onClick={() => setImportDialogOpen(true)} 
                  variant="outline" 
                  className="gap-2 shadow-sm text-xs sm:text-sm h-9 sm:h-10"
                >
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                  Importar via API
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {!hideAdminButtons && (
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
            )}
            
            <div className="flex-1 w-full sm:max-w-md">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar empresas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 h-9 sm:h-10 border-border/40 focus-visible:ring-1 bg-background/50 text-xs sm:text-sm"
                />
              </div>
            </div>

            {variant === "empresa" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao_prospect">Ocultar prospects</SelectItem>
                  <SelectItem value="all">Todos (incluir prospects)</SelectItem>
                  <SelectItem value="somente_prospect">Somente prospects</SelectItem>
                  <SelectItem value="cliente_ativo">Clientes ativos</SelectItem>
                  <SelectItem value="cliente_inativo">Clientes inativos</SelectItem>
                  <SelectItem value="lead_qualificado">Leads qualificados</SelectItem>
                  <SelectItem value="perdido">Perdidos</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Limpar</span>
              </Button>
            )}
            
            <div className="ml-auto text-xs sm:text-sm font-light text-muted-foreground whitespace-nowrap">
              {sortedEmpresas.length} {sortedEmpresas.length === 1 ? 'empresa' : 'empresas'}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          {sortedEmpresas.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" />
                </div>
                <p className="text-base sm:text-lg font-light text-foreground mb-2">Nenhuma empresa encontrada</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Adicione sua primeira empresa para começar</p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border/40 shadow-lg overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="border-b border-border/40 bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm">
                  <tr>
                    {tableColumns.filter(col => col.visible).map((column, index) => (
                      <th
                        key={column.id}
                         className={`text-left px-3 sm:px-4 py-2.5 sm:py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground/80 relative ${
                          index === 0 && column.id === 'actions' ? 'sticky left-0 bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm border-r border-border/30 z-20 text-center text-foreground' : index === 0 ? 'sticky left-0 bg-gradient-to-r from-muted/40 to-muted/20 border-r border-border/40 z-20' : ''
                        }`}
                        style={{ width: column.width, minWidth: column.width }}
                      >
                        <div className="flex items-center justify-between gap-2 pr-4">
                          <span>{column.label}</span>
                          {column.id !== 'actions' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-background/50 rounded-full"
                              onClick={() => handleSort(column.id)}
                            >
                              {getSortIcon(column.id)}
                            </Button>
                          )}
                        </div>
                        {column.id !== 'actions' && (
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
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedEmpresas.map((empresa) => (
                    <tr key={empresa.id} className="border-b border-border/30 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 hover:shadow-sm transition-all duration-200 group">
                      {tableColumns.filter(col => col.visible).map((column, index) => {
                        if (column.id === 'actions') {
                          return (
                              <td key="actions" className="p-3 sticky left-0 bg-gradient-to-l from-background via-background to-background/95 border-r border-border/30 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)] transition-all duration-200">
                               <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-200 border-primary/20"
                                  onClick={() => handleEditEmpresa(empresa)}
                                  title="Editar empresa"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                {((empresa as any).status_comercial === 'prospect' || (empresa as any).status_comercial === 'lead_qualificado') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2 rounded-full hover:bg-green-600 hover:text-white transition-all duration-200 border-green-600/30 text-green-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConvertProspect(empresa);
                                    }}
                                    title="Converter em cliente"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 border-destructive/20"
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
                        
                        let cellValue: string | React.ReactNode = "";
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
                            cellValue = empresa.telefone ? (
                              <div className="flex items-center gap-2">
                                <span>{empresa.telefone}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSoftphoneNumber(empresa.telefone || "");
                                    setSoftphoneOpen(true);
                                  }}
                                >
                                  <Phone className="w-4 h-4 text-primary" />
                                </Button>
                              </div>
                            ) : "-";
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
                          case 'tipo_cliente':
                            cellValue = (empresa as any).tipo_cliente || "B2B";
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
                            {column.id === 'telefone' ? (
                              cellValue
                            ) : (
                              <span className="truncate block text-sm">{cellValue}</span>
                            )}
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
              {editingEmpresa ? `Editar ${entityConfig.singular}` : `${variant === "transportadora" ? "Nova" : (variant === "vendedor" ? "Novo" : "Nova")} ${entityConfig.singular}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {editingEmpresa ? `Atualize as informações` : `Preencha os dados`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <Tabs defaultValue="empresa" className="w-full max-w-6xl mx-auto">
          <TabsList className="bg-muted/30 border border-border/40 p-1 rounded-lg mb-6">
            <TabsTrigger 
              value="empresa"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
            >
              Dados {variant === "empresa" ? "da Empresa" : (variant === "vendedor" ? "do Vendedor" : "da Transportadora")}
            </TabsTrigger>
            <TabsTrigger 
              value="contatos"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              onClick={() => setCriarNovoContato(false)}
            >
              Contatos Vinculados
            </TabsTrigger>
            {entityConfig.showSegmento && (
              <TabsTrigger 
                value="vinculos"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                Segmentos
              </TabsTrigger>
            )}
            {entityConfig.showSegmento && (
              <TabsTrigger 
                value="segmentos-prospect"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                Segmento Prospect
              </TabsTrigger>
            )}
            {(variant === "empresa" || variant === "vendedor" || variant === "transportadora") && (
              <TabsTrigger
                value="usuarios"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                Usuários
              </TabsTrigger>
            )}
            {variant === "empresa" && (
              <TabsTrigger
                value="vendedores"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                Vendedores
              </TabsTrigger>
            )}
            {(variant === "vendedor" || variant === "transportadora") && (
              <TabsTrigger
                value="empresas-vinculadas"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
              >
                Empresas Vinculadas
              </TabsTrigger>
            )}
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
                  const isPessoaFisica = formData.company_type === "Pessoa Física";
                  
                  // CPF/CNPJ só habilita após selecionar o tipo (apenas em cadastro novo)
                  const isDisabled = editingEmpresa ? false : (
                    field.id === "cpf_cnpj" ? !tipoSelecionado :
                    field.id === "company_type" ? false :
                    (isPessoaFisica ? false : !cnpjPreenchido)
                  );

                  // Pessoa Física não tem lookup automático — todos os campos são editáveis
                  // Em edição, também liberamos os campos travados para permitir ajustes
                  const fieldLocked = isPessoaFisica || editingEmpresa ? false : field.locked;
                  
                  // Rótulos dinâmicos para Pessoa Física
                  let displayLabel = field.label;
                  if (isPessoaFisica) {
                    if (field.id === "company_name") displayLabel = "Nome";
                    if (field.id === "company_fantasia") displayLabel = "Como prefere ser chamado";
                  } else {
                    if (field.id === "company_name") displayLabel = "Razão Social";
                  }
                  
                  // Para campos auto-preenchidos, desabilitar sempre
                  const finalDisabled = fieldLocked || isDisabled;
                  
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
                        {displayLabel} 
                        {field.required && <span className="text-destructive ml-1">*</span>}
                        {fieldLocked && <span className="text-xs text-muted-foreground ml-2">(preenchido automaticamente)</span>}
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
                {editingEmpresa ? "Salvar Alterações" : `Criar ${entityConfig.singular}`}
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
          
          <TabsContent value="vinculos" className="p-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Segmentos da Empresa</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Gerencie os segmentos desta empresa. Os segmentos adicionados aqui serão automaticamente aplicados aos contatos vinculados.
                  </p>
                </div>

                {editingEmpresa ? (() => {
                  const segmentosNormais = segmentos.filter(s => !s.is_prospect);
                  const idsNormais = new Set(segmentosNormais.map(s => s.id));
                  const vinculosDaEmpresa = vinculos.filter(v => v.empresa_id === editingEmpresa.id);
                  const vinculosSegmentos = vinculosDaEmpresa.filter(v => v.segmento_id !== null && idsNormais.has(v.segmento_id));

                  return (
                    <div className="space-y-4">
                      {/* Adicionar novos segmentos */}
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4 space-y-4">
                          <h4 className="text-sm font-semibold">Adicionar Segmentos</h4>
                          
                          <div className="space-y-2">
                            <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2 bg-background">
                              {segmentosNormais.map((segmento) => (
                                <div key={segmento.id} className="flex items-center space-x-2 p-1.5 hover:bg-accent/50 rounded">
                                  <Checkbox
                                    id={`new-seg-${segmento.id}`}
                                    checked={novosSegmentosVinculo.includes(segmento.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setNovosSegmentosVinculo([...novosSegmentosVinculo, segmento.id]);
                                      } else {
                                        setNovosSegmentosVinculo(novosSegmentosVinculo.filter(id => id !== segmento.id));
                                      }
                                    }}
                                  />
                                  <label htmlFor={`new-seg-${segmento.id}`} className="text-sm cursor-pointer flex-1">
                                    {segmento.nome}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Button 
                            onClick={async () => {
                              if (novosSegmentosVinculo.length === 0) {
                                toast.error("Selecione pelo menos um segmento");
                                return;
                              }
                              await handleAdicionarVinculo();
                            }} 
                            className="w-full" 
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Segmentos Selecionados
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Lista de segmentos vinculados */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Segmentos Vinculados</h4>
                        {vinculosSegmentos.length > 0 ? (
                          <div className="space-y-2">
                            {vinculosSegmentos.map((vinculo) => {
                              const segmento = segmentos.find(s => s.id === vinculo.segmento_id);

                              return (
                                <div key={vinculo.id} className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between group hover:border-primary/30 transition-colors">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {segmento?.nome || <span className="text-muted-foreground">Segmento não encontrado</span>}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoverVinculo(vinculo.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 border rounded-lg bg-muted/30 text-center">
                            <p className="text-sm text-muted-foreground">Nenhum segmento vinculado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Salve a empresa primeiro para gerenciar os segmentos.
                  </p>
                )}
              </div>
            </Card>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-border/40">
                Fechar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="segmentos-prospect" className="p-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Segmentos de Prospect</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Segmentos usados especificamente para classificar prospects. Novos prospects trazidos via Cloud Code / Cursor / ChatGPT são automaticamente vinculados aqui pelo nome de segmento retornado pela IA. Use a tela <strong>Vínculo Segmento Prospect x Usuário</strong> para direcionar o atendimento desses segmentos a usuários.
                  </p>
                </div>

                {editingEmpresa ? (() => {
                  const segmentosProspect = segmentos.filter(s => s.is_prospect);
                  const idsProspect = new Set(segmentosProspect.map(s => s.id));
                  const vinculosDaEmpresa = vinculos.filter(v => v.empresa_id === editingEmpresa.id);
                  const vinculosSegmentos = vinculosDaEmpresa.filter(v => v.segmento_id !== null && idsProspect.has(v.segmento_id));
                  const idsJaVinculados = new Set(vinculosSegmentos.map(v => v.segmento_id));
                  const disponiveis = segmentosProspect.filter(s => !idsJaVinculados.has(s.id));

                  return (
                    <div className="space-y-4">
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4 space-y-4">
                          <h4 className="text-sm font-semibold">Adicionar Segmentos de Prospect</h4>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2 bg-background">
                            {disponiveis.length === 0 ? (
                              <p className="text-xs text-muted-foreground p-2">
                                Nenhum segmento de prospect disponível. Segmentos de prospect são criados automaticamente ao importar registros da Prospecção via Cloud Code / Cursor / ChatGPT.
                              </p>
                            ) : disponiveis.map((segmento) => (
                              <div key={segmento.id} className="flex items-center space-x-2 p-1.5 hover:bg-accent/50 rounded">
                                <Checkbox
                                  id={`new-segp-${segmento.id}`}
                                  checked={novosSegmentosVinculo.includes(segmento.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setNovosSegmentosVinculo([...novosSegmentosVinculo, segmento.id]);
                                    } else {
                                      setNovosSegmentosVinculo(novosSegmentosVinculo.filter(id => id !== segmento.id));
                                    }
                                  }}
                                />
                                <label htmlFor={`new-segp-${segmento.id}`} className="text-sm cursor-pointer flex-1">
                                  {segmento.nome}
                                </label>
                              </div>
                            ))}
                          </div>
                          <Button
                            onClick={async () => {
                              if (novosSegmentosVinculo.length === 0) {
                                toast.error("Selecione pelo menos um segmento");
                                return;
                              }
                              await handleAdicionarVinculo();
                            }}
                            className="w-full"
                            size="sm"
                            disabled={disponiveis.length === 0}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Segmentos Selecionados
                          </Button>
                        </CardContent>
                      </Card>

                      <div>
                        <h4 className="text-sm font-semibold mb-3">Segmentos de Prospect Vinculados</h4>
                        {vinculosSegmentos.length > 0 ? (
                          <div className="space-y-2">
                            {vinculosSegmentos.map((vinculo) => {
                              const segmento = segmentos.find(s => s.id === vinculo.segmento_id);
                              return (
                                <div key={vinculo.id} className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between group hover:border-primary/30 transition-colors">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {segmento?.nome || <span className="text-muted-foreground">Segmento não encontrado</span>}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoverVinculo(vinculo.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 border rounded-lg bg-muted/30 text-center">
                            <p className="text-sm text-muted-foreground">Nenhum segmento de prospect vinculado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Salve a empresa primeiro para gerenciar os segmentos de prospect.
                  </p>
                )}
              </div>
            </Card>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-border/40">
                Fechar
              </Button>
            </div>
          </TabsContent>

          {(variant === "empresa" || variant === "vendedor" || variant === "transportadora") && (
            <TabsContent value="usuarios" className="p-6">
              <Card className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Usuários do Sistema Vinculados</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Vincule usuários do sistema responsáveis por esta empresa.
                    </p>
                  </div>
                  {editingEmpresa ? (() => {
                    const vinculosDaEmpresa = vinculos.filter(v => v.empresa_id === editingEmpresa.id);
                    const vinculosUsuarios = vinculosDaEmpresa.filter(v => v.usuario_id !== null);
                    const idsJaVinculados = new Set(vinculosUsuarios.map(v => v.usuario_id));
                    const usuariosDisponiveis = usuarios.filter(u => !idsJaVinculados.has(u.id));
                    const nomeVendedorPorId = (vid: string) => {
                      const e = empresas.find(x => x.id === vid) as any;
                      return e?.nome_fantasia || e?.nome || "vendedor";
                    };
                    return (
                      <div className="space-y-4">
                        <Card className="border-primary/20 bg-primary/5">
                          <CardContent className="p-4 space-y-4">
                            <h4 className="text-sm font-semibold">Adicionar Usuários</h4>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2 bg-background">
                              {usuariosDisponiveis.length === 0 && (
                                <p className="text-xs text-muted-foreground p-2">Nenhum usuário disponível.</p>
                              )}
                              {usuariosDisponiveis.map((u) => (
                                <div key={u.id} className="flex items-center space-x-2 p-1.5 hover:bg-accent/50 rounded">
                                  <Checkbox
                                    id={`new-user-${u.id}`}
                                    checked={novosUsuariosVinculo.includes(u.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) setNovosUsuariosVinculo([...novosUsuariosVinculo, u.id]);
                                      else setNovosUsuariosVinculo(novosUsuariosVinculo.filter(id => id !== u.id));
                                    }}
                                  />
                                  <label htmlFor={`new-user-${u.id}`} className="text-sm cursor-pointer flex-1">
                                    {u.nome}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <Button onClick={handleAdicionarUsuariosVinculo} className="w-full" size="sm">
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar Usuários Selecionados
                            </Button>
                          </CardContent>
                        </Card>
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Usuários Vinculados</h4>
                          {vinculosUsuarios.length > 0 ? (
                            <div className="space-y-2">
                               {vinculosUsuarios.map((v) => {
                                 const u = usuarios.find(x => x.id === v.usuario_id);
                                 const isAuto = !!v.auto_via_vendedor_id;
                                 return (
                                   <div key={v.id} className={`p-3 border rounded-lg flex items-center justify-between group transition-colors ${isAuto ? "bg-blue-500/5 border-blue-500/30" : "bg-muted/30 hover:border-primary/30"}`}>
                                     <div className="flex items-center gap-2 flex-wrap">
                                       <p className="text-sm font-medium">{u?.nome || "Usuário não encontrado"}</p>
                                       {isAuto && (
                                         <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-600 dark:text-blue-400" title={`Vinculado automaticamente por estar no vendedor ${nomeVendedorPorId(v.auto_via_vendedor_id)}`}>
                                           Auto · via {nomeVendedorPorId(v.auto_via_vendedor_id)}
                                         </Badge>
                                       )}
                                     </div>
                                     {isAuto ? (
                                       <span className="text-[10px] text-muted-foreground italic pr-2">gerenciado pelo vendedor</span>
                                     ) : (
                                       <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoverVinculoSimples(v.id)}>
                                         <Trash2 className="w-4 h-4 text-destructive" />
                                       </Button>
                                     )}
                                   </div>
                                 );
                               })}
                            </div>
                          ) : (
                            <div className="p-4 border rounded-lg bg-muted/30 text-center">
                              <p className="text-sm text-muted-foreground">Nenhum usuário vinculado</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })() : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Salve a empresa primeiro para gerenciar os usuários.
                    </p>
                  )}
                </div>
              </Card>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowForm(false)} className="border-border/40">Fechar</Button>
              </div>
            </TabsContent>
          )}

          {variant === "empresa" && (
            <TabsContent value="vendedores" className="p-6">
              <Card className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Vendedores Vinculados</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Vincule os vendedores responsáveis por esta empresa.
                    </p>
                  </div>
                  {editingEmpresa ? (() => {
                    const vinculosDaEmpresa = vinculos.filter(v => v.empresa_id === editingEmpresa.id);
                    const vinculosVendedores = vinculosDaEmpresa.filter(v => v.vendedor_id !== null && v.vendedor_id !== undefined);
                    const idsJaVinculados = new Set(vinculosVendedores.map(v => v.vendedor_id));
                    const vendedoresDisponiveis = vendedoresLista.filter(v => !idsJaVinculados.has(v.id));
                    return (
                      <div className="space-y-4">
                        <Card className="border-primary/20 bg-primary/5">
                          <CardContent className="p-4 space-y-4">
                            <h4 className="text-sm font-semibold">Adicionar Vendedores</h4>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2 bg-background">
                              {vendedoresDisponiveis.length === 0 && (
                                <p className="text-xs text-muted-foreground p-2">Nenhum vendedor disponível. Cadastre em Listas → Vendedores.</p>
                              )}
                              {vendedoresDisponiveis.map((v) => (
                                <div key={v.id} className="flex items-center space-x-2 p-1.5 hover:bg-accent/50 rounded">
                                  <Checkbox
                                    id={`new-vend-${v.id}`}
                                    checked={novosVendedoresVinculo.includes(v.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) setNovosVendedoresVinculo([...novosVendedoresVinculo, v.id]);
                                      else setNovosVendedoresVinculo(novosVendedoresVinculo.filter(id => id !== v.id));
                                    }}
                                  />
                                  <label htmlFor={`new-vend-${v.id}`} className="text-sm cursor-pointer flex-1">
                                    {v.nome_fantasia || v.nome}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <Button onClick={handleAdicionarVendedoresVinculo} className="w-full" size="sm">
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar Vendedores Selecionados
                            </Button>
                          </CardContent>
                        </Card>
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Vendedores Vinculados</h4>
                          {vinculosVendedores.length > 0 ? (
                            <div className="space-y-2">
                              {vinculosVendedores.map((v) => {
                                const vend = vendedoresLista.find(x => x.id === v.vendedor_id);
                                return (
                                  <div key={v.id} className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between group hover:border-primary/30 transition-colors">
                                    <p className="text-sm font-medium">{vend?.nome_fantasia || vend?.nome || "Vendedor não encontrado"}</p>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoverVinculoSimples(v.id)}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 border rounded-lg bg-muted/30 text-center">
                              <p className="text-sm text-muted-foreground">Nenhum vendedor vinculado</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })() : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Salve a empresa primeiro para gerenciar os vendedores.
                    </p>
                  )}
                </div>
              </Card>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowForm(false)} className="border-border/40">Fechar</Button>
              </div>
            </TabsContent>
          )}
          {(variant === "vendedor" || variant === "transportadora") && (
            <TabsContent value="empresas-vinculadas" className="p-6">
              <Card className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Empresas Vinculadas</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Vincule as empresas atendidas por {variant === "vendedor" ? "este vendedor" : "esta transportadora"}.
                    </p>
                  </div>
                  {editingEmpresa ? (() => {
                    const key = variant === "vendedor" ? "vendedor_id" : "transportadora_id";
                    const vinculosDesta = vinculos.filter((v) => v[key] === editingEmpresa.id);
                     const idsJaVinculados = new Set(vinculosDesta.map((v) => v.empresa_id));
                    const listaEmpresasReais = empresasParaVincular;
                    const empresasDisponiveis = listaEmpresasReais.filter((e) => !idsJaVinculados.has(e.id));
                    return (
                      <div className="space-y-4">
                        <Card className="border-primary/20 bg-primary/5">
                          <CardContent className="p-4 space-y-4">
                            <h4 className="text-sm font-semibold">Adicionar Empresas</h4>
                            <div className="space-y-2 max-h-[240px] overflow-y-auto border rounded-lg p-2 bg-background">
                              {empresasDisponiveis.length === 0 && (
                                <p className="text-xs text-muted-foreground p-2">Nenhuma empresa disponível.</p>
                              )}
                              {empresasDisponiveis.map((e) => (
                                <div key={e.id} className="flex items-center space-x-2 p-1.5 hover:bg-accent/50 rounded">
                                  <Checkbox
                                    id={`new-emp-${e.id}`}
                                    checked={novasEmpresasVinculo.includes(e.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) setNovasEmpresasVinculo([...novasEmpresasVinculo, e.id]);
                                      else setNovasEmpresasVinculo(novasEmpresasVinculo.filter((id) => id !== e.id));
                                    }}
                                  />
                                  <label htmlFor={`new-emp-${e.id}`} className="text-sm cursor-pointer flex-1">
                                    {e.nome_fantasia || e.nome}
                                    {e.cnpj && <span className="text-xs text-muted-foreground ml-2">{e.cnpj}</span>}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <Button onClick={handleAdicionarEmpresasVinculo} className="w-full" size="sm">
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar Empresas Selecionadas
                            </Button>
                          </CardContent>
                        </Card>
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Empresas Vinculadas ({vinculosDesta.length})</h4>
                          {vinculosDesta.length > 0 ? (
                            <div className="space-y-2">
                              {vinculosDesta.map((v) => {
                                const emp = listaEmpresasReais.find((x) => x.id === v.empresa_id);
                                return (
                                  <div key={v.id} className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between group hover:border-primary/30 transition-colors">
                                    <div>
                                      <p className="text-sm font-medium">{emp?.nome_fantasia || emp?.nome || "Empresa não encontrada"}</p>
                                      {emp?.cnpj && <p className="text-xs text-muted-foreground">{emp.cnpj}</p>}
                                    </div>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoverVinculoSimples(v.id)}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 border rounded-lg bg-muted/30 text-center">
                              <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })() : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Salve primeiro para gerenciar as empresas vinculadas.
                    </p>
                  )}
                </div>
              </Card>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowForm(false)} className="border-border/40">Fechar</Button>
              </div>
            </TabsContent>
          )}
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

      {/* Dialog de Importação via API */}
      {estabelecimentoId && (
        <APIImportDialogEmpresas
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImportComplete={() => fetchEmpresas(estabelecimentoId)}
          estabelecimentoId={estabelecimentoId}
        />
      )}
      
      {/* Softphone Dialog */}
      <SoftphoneDialog 
        open={softphoneOpen}
        onOpenChange={setSoftphoneOpen}
        initialNumber={softphoneNumber}
      />

      <ConvertProspectDialog
        empresa={convertProspect}
        open={!!convertProspect}
        onOpenChange={(v) => !v && setConvertProspect(null)}
        onConverted={() => estabelecimentoId && fetchEmpresas(estabelecimentoId)}
      />
    </>
  );
}
