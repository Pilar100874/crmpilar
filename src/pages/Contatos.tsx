import { useState, useEffect } from "react";
import * as React from "react";
import * as XLSX from 'xlsx';
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
import { Plus, MoreVertical, Trash2, GripVertical, Search, Calendar, X, Pencil, Check, Loader2, Edit, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Upload, Download } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { validateCPF, validateCNPJ, validateEmail, validatePhone, validateCEP, validateInscricaoEstadual, validateWhatsApp } from "@/lib/validators";
import { maskCPF, maskCNPJ, maskCEP, maskPhone, maskDate, applyCustomMask, maskWhatsApp } from "@/lib/masks";
import { useAddressLookup } from "@/hooks/useAddressLookup";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { FieldMaskConfig, type FieldMask } from "@/components/config/FieldMaskConfig";
import { SortableFieldItem } from "@/components/config/SortableFieldItem";
import { TableColumnsConfig, type TableColumn } from "@/components/config/TableColumnsConfig";
import { APIImportDialog } from "@/components/config/APIImportDialog";
import { SegmentosCRUD } from "@/components/config/SegmentosCRUD";
import { ContatoFieldsCRUD } from "@/components/config/ContatoFieldsCRUD";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface CustomField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "date" | "number";
  category: "contact" | "company";
  options?: string[];
  required?: boolean;
  locked?: boolean; // Não pode ser removido
  searchable?: boolean; // Aparece nos filtros de pesquisa
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
  active: boolean;
  segmentos?: string[];
}

interface Segmento {
  id: string;
  nome: string;
  estabelecimento_id: string;
}

interface SearchFilters {
  unifiedSearch: string;
  dateFilter: string;
  funnel: string;
  responsible: string;
  createdBy: string;
  modifiedBy: string;
  tasks: string;
  tags: string;
  [key: string]: string; // Permite campos dinâmicos customizados
}

export default function Contatos() {
  const [showForm, setShowForm] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingCell, setEditingCell] = useState<{ contactId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  
  // Gerenciamento de colunas da tabela - APENAS CAMPOS DE CONTATO
  const [tableColumns, setTableColumns] = useState<TableColumn[]>(() => {
    const saved = localStorage.getItem("contactsTableColumns");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Garantir que a coluna actions sempre existe
        const hasActions = parsed.some((col: TableColumn) => col.id === 'actions');
        if (!hasActions) {
          return [
            { id: "actions", label: "Ações", visible: true, width: 120, locked: true },
            ...parsed
          ];
        }
        // Garantir que actions está locked
        return parsed.map((col: TableColumn) => 
          col.id === 'actions' ? { ...col, locked: true, visible: true } : col
        );
      } catch {
        // Se houver erro ao parsear, usar valores padrão
      }
    }
    return [
      { id: "actions", label: "Ações", visible: true, width: 120, locked: true },
      { id: "name", label: "Nome", visible: true, width: 250, locked: true },
      { id: "phone", label: "Telefone/WhatsApp", visible: true, width: 180 },
      { id: "email", label: "E-mail", visible: true, width: 250 },
      { id: "position", label: "Cargo", visible: true, width: 150 },
    ];
  });

  // Estado de ordenação
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Salvar configurações de colunas no localStorage
  useEffect(() => {
    localStorage.setItem("contactsTableColumns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const handleColumnsChange = (newColumns: TableColumn[]) => {
    setTableColumns(newColumns);
  };

  const handleSort = (columnId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === columnId) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else {
        // Remove sort
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
  
  // Hooks para buscar CEP e CNPJ
  const { lookupCEP, loading: cepLoading } = useAddressLookup();
  const { lookupCNPJ, loading: cnpjLoading } = useCNPJLookup();
  
  // Campos obrigatórios fixos de contato (não podem ser removidos)
  const [contactFields, setContactFields] = useState<CustomField[]>([
    { id: "name", label: "Nome de contato", type: "text", category: "contact", required: true, locked: true },
    { id: "phone", label: "WhatsApp", type: "phone", category: "contact", required: true, locked: true },
    { id: "email", label: "E-mail", type: "email", category: "contact", required: true, locked: true },
    { id: "position", label: "Cargo", type: "text", category: "contact", required: true, locked: true },
  ]);
  
  // Campos obrigatórios fixos de empresa (não podem ser removidos)
  const [companyFields, setCompanyFields] = useState<CustomField[]>([
    { id: "company_type", label: "Tipo", type: "select", category: "company", options: ["Pessoa Física", "Pessoa Jurídica"], required: true, locked: true },
    { id: "cpf_cnpj", label: "CPF/CNPJ", type: "text", category: "company", required: true, locked: true },
    { id: "company_name", label: "Nome", type: "text", category: "company", required: true, locked: true },
    { id: "company_fantasia", label: "Nome Fantasia", type: "text", category: "company", required: true, locked: true },
    { id: "cep", label: "CEP", type: "text", category: "company", required: true, locked: true },
    { id: "address", label: "Endereço", type: "text", category: "company", required: true, locked: true },
    { id: "city", label: "Cidade", type: "text", category: "company", required: true, locked: true },
    { id: "neighborhood", label: "Bairro", type: "text", category: "company", required: true, locked: true },
    { id: "state", label: "UF", type: "text", category: "company", required: true, locked: true },
    { id: "inscricao", label: "Inscrição", type: "text", category: "company", required: true, locked: true },
  ]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomField["type"]>("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [activeFieldTab, setActiveFieldTab] = useState<"contact" | "company">("contact");
  const [fieldMasks, setFieldMasks] = useState<FieldMask[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  
  // Estados para gerenciar empresas
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>("");
  const [criarNovaEmpresa, setCriarNovaEmpresa] = useState(false);
  const [contatosDaEmpresa, setContatosDaEmpresa] = useState<Contact[]>([]);
  const [buscaEmpresa, setBuscaEmpresa] = useState<string>("");
  const [empresasFiltradas, setEmpresasFiltradas] = useState<any[]>([]);
  const [empresasVinculadas, setEmpresasVinculadas] = useState<any[]>([]);
  
  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    unifiedSearch: "",
    dateFilter: "",
    funnel: "",
    responsible: "",
    createdBy: "",
    modifiedBy: "",
    tasks: "",
    tags: "",
  });

  // Carregar estabelecimento e segmentos
  useEffect(() => {
    const fetchEstabelecimentoAndSegmentos = async () => {
      const estabId = await getEstabelecimentoId();
      console.log("🔍 Contatos - estabelecimentoId detectado:", estabId);
      setEstabelecimentoId(estabId);
      
      if (estabId) {
        console.log("🔍 Contatos - Buscando segmentos para estabelecimento:", estabId);
        const { data, error } = await supabase
          .from("segmentos")
          .select("*")
          .eq("estabelecimento_id", estabId)
          .order("nome");
        
        console.log("🔍 Contatos - Segmentos retornados:", data);
        if (error) {
          console.error("❌ Erro ao buscar segmentos:", error);
          toast.error("Erro ao carregar segmentos: " + error.message);
        }
        setSegmentos(data || []);

        // Carregar empresas
        const { data: empresasData, error: empresasError } = await supabase
          .from("empresas")
          .select("*")
          .eq("estabelecimento_id", estabId)
          .order("nome_fantasia");
        
        if (empresasError) {
          console.error("❌ Erro ao buscar empresas:", empresasError);
        } else {
          setEmpresas(empresasData || []);
        }
      } else {
        console.warn("⚠️ estabelecimentoId não disponível. Selecione um estabelecimento.");
      }
    };
    
    fetchEstabelecimentoAndSegmentos();
  }, []);

  // Carregar contatos do backend
  const loadContacts = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        setContacts([]);
        return;
      }

      const { data: rows, error } = await supabase
        .from('customers')
        .select(`
          *,
          empresas (
            id,
            nome_fantasia,
            nome,
            cnpj
          )
        `)
        .eq('estabelecimento_id', estabId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar contatos:', error);
        toast.error('Erro ao carregar contatos');
        return;
      }

      let segmentsByCustomer: Record<string, string[]> = {};
      if (rows && rows.length > 0) {
        const { data: segRows } = await supabase
          .from('customer_segmentos')
          .select('customer_id, segmento_id')
          .in('customer_id', rows.map((r: any) => r.id));

        (segRows || []).forEach((r: any) => {
          if (!segmentsByCustomer[r.customer_id]) segmentsByCustomer[r.customer_id] = [];
          segmentsByCustomer[r.customer_id].push(r.segmento_id);
        });
      }

      const mapped: Contact[] = (rows || []).map((r: any) => ({
        id: r.id,
        name: r.nome,
        company: r.empresas?.nome_fantasia || r.custom_fields?.company_name || '',
        phone: r.telefone,
        email: r.email,
        position: r.custom_fields?.position || '',
        responsible: r.custom_fields?.responsible || '',
        tags: r.tags || [],
        createdAt: r.created_at,
        createdBy: 'Sistema',
        modifiedAt: r.created_at,
        modifiedBy: 'Sistema',
        customFields: {
          ...r.custom_fields,
          empresa_id: r.empresa_id,
          company_name: r.empresas?.nome_fantasia || r.custom_fields?.company_name,
          company_fantasia: r.empresas?.nome_fantasia || r.custom_fields?.company_fantasia,
          cpf_cnpj: r.empresas?.cnpj || r.custom_fields?.cpf_cnpj,
        },
        active: true,
        segmentos: segmentsByCustomer[r.id] || [],
      }));


      setContacts(mapped);
    } catch (e) {
      console.error('Erro ao carregar contatos:', e);
      toast.error('Erro ao carregar contatos');
    }
  };


  useEffect(() => {
    loadContacts();
  }, []);

  // Salvar configuração de campos de empresa no Supabase
  useEffect(() => {
    const saveCompanyFieldsConfig = async () => {
      if (!estabelecimentoId) return;

      try {
        // Deletar configurações antigas
        await supabase
          .from('form_field_configs')
          .delete()
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('form_type', 'company');

        // Inserir novas configurações
        const configs = companyFields.map((field, index) => ({
          estabelecimento_id: estabelecimentoId,
          form_type: 'company',
          field_id: field.id,
          field_label: field.label,
          field_type: field.type,
          required: field.required || false,
          locked: field.locked || false,
          field_order: index,
          options: field.options ? field.options : null,
          category: field.category
        }));

        const { error } = await supabase
          .from('form_field_configs')
          .insert(configs);

        if (error) throw error;
      } catch (error) {
        console.error('Erro ao salvar configuração de campos:', error);
      }
    };

    saveCompanyFieldsConfig();
  }, [companyFields, estabelecimentoId]);

  // Filtrar empresas conforme busca
  useEffect(() => {
    if (buscaEmpresa.trim() === "") {
      setEmpresasFiltradas([]);
    } else {
      const termo = buscaEmpresa.toLowerCase();
      const filtradas = empresas.filter(e => 
        e.nome_fantasia?.toLowerCase().includes(termo) ||
        e.nome?.toLowerCase().includes(termo) ||
        e.cnpj?.toLowerCase().includes(termo) ||
        e.custom_fields?.cpf_cnpj?.toLowerCase().includes(termo)
      );
      setEmpresasFiltradas(filtradas);
    }
  }, [buscaEmpresa, empresas]);

  // Salvar contatos (inline/local configs continuam locais)
  const saveContactsToStorage = (updatedContacts: Contact[]) => {
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
      searchable: false, // Por padrão não aparece na busca
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

  const handleDragEndContact = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setContactFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndCompany = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCompanyFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleSearchable = (fieldId: string, category: "contact" | "company") => {
    if (category === "contact") {
      setContactFields(contactFields.map(f => 
        f.id === fieldId ? { ...f, searchable: !f.searchable } : f
      ));
    } else {
      setCompanyFields(companyFields.map(f => 
        f.id === fieldId ? { ...f, searchable: !f.searchable } : f
      ));
    }
  };

  const handleRemoveField = (fieldId: string, category: "contact" | "company") => {
    const fields = category === "contact" ? contactFields : companyFields;
    const field = fields.find(f => f.id === fieldId);
    
    // Não permite remover campos bloqueados
    if (field?.locked) {
      toast.error("Este campo é obrigatório e não pode ser removido");
      return;
    }
    
    if (category === "contact") {
      setContactFields(contactFields.filter(f => f.id !== fieldId));
    } else {
      setCompanyFields(companyFields.filter(f => f.id !== fieldId));
    }
    toast.success("Campo removido com sucesso");
  };

  // Buscar dados do CNPJ
  const handleCNPJLookup = async (cnpj: string) => {
    if (!validateCNPJ(cnpj)) {
      toast.error("CNPJ inválido");
      return;
    }

    const data = await lookupCNPJ(cnpj);
    if (data) {
      setFormData({
        ...formData,
        company_name: data.nome,
        company_fantasia: data.fantasia,
        cep: data.cep,
        address: data.logradouro + (data.numero ? ', ' + data.numero : ''),
        city: data.municipio,
        neighborhood: data.bairro,
        state: data.uf,
      });
      toast.success("Dados preenchidos automaticamente");
    }
  };

  // Buscar dados do CEP
  const handleCEPLookup = async (cep: string) => {
    if (!validateCEP(cep)) {
      toast.error("CEP inválido");
      return;
    }

    const data = await lookupCEP(cep);
    if (data) {
      setFormData({
        ...formData,
        address: data.logradouro,
        city: data.localidade,
        neighborhood: data.bairro,
        state: data.uf,
      });
      toast.success("Endereço preenchido automaticamente");
    }
  };

  // Aplicar máscara ao campo
  const applyFieldMask = (fieldId: string, value: string): string => {
    const mask = fieldMasks.find(m => m.fieldId === fieldId);
    if (!mask) return value;

    switch (mask.maskType) {
      case "cpf":
        return maskCPF(value);
      case "cnpj":
        return maskCNPJ(value);
      case "date":
        return maskDate(value);
      case "phone":
        return maskPhone(value);
      case "custom":
        return mask.customMask ? applyCustomMask(value, mask.customMask) : value;
      default:
        return value;
    }
  };

  const renderField = (field: CustomField) => {
    const value = formData[field.id] || "";
    
    // Aplicar máscara se configurada
    const displayValue = applyFieldMask(field.id, value);
    
    const handleFieldChange = (newValue: string) => {
      let processedValue = newValue;
      
      // Limpar erro do campo quando o usuário começar a digitar
      if (fieldErrors[field.id]) {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field.id];
          return newErrors;
        });
      }
      
      // Aplicar máscara automática baseada no ID do campo
      if (field.id === "cpf_cnpj") {
        const companyType = formData.company_type;
        if (companyType === "Pessoa Física") {
          processedValue = maskCPF(newValue);
        } else if (companyType === "Pessoa Jurídica") {
          processedValue = maskCNPJ(newValue);
        }
      } else if (field.id === "cep") {
        processedValue = maskCEP(newValue);
      } else if (field.id === "phone" || field.type === "phone") {
        processedValue = maskWhatsApp(newValue);
      }
      
      // Limpar dados da empresa ao mudar o tipo de pessoa
      if (field.id === "company_type") {
        const companyFieldIds = companyFields.map(f => f.id).filter(id => id !== "company_type");
        const clearedData: Record<string, any> = { ...formData, [field.id]: newValue };
        
        // Limpar todos os campos da empresa
        companyFieldIds.forEach(id => {
          clearedData[id] = "";
        });
        
        // Auto-preencher inscrição como "ISENTO" para pessoa física
        if (newValue === "Pessoa Física") {
          clearedData.inscricao = "ISENTO";
        }
        
        setFormData(clearedData);
      } else {
        setFormData({ ...formData, [field.id]: processedValue });
      }
    };
    
    const handleFieldBlur = () => {
      const cleanValue = value.replace(/\D/g, '');
      
      // Validar CPF/CNPJ ao sair do campo
      if (field.id === "cpf_cnpj") {
        const companyType = formData.company_type;
        if (companyType === "Pessoa Física") {
          if (cleanValue.length === 11) {
            if (!validateCPF(value)) {
              toast.error("CPF inválido");
            }
          }
        } else if (companyType === "Pessoa Jurídica") {
          if (cleanValue.length === 14) {
            if (!validateCNPJ(value)) {
              toast.error("CNPJ inválido");
            } else {
              // Auto-buscar CNPJ quando completo
              handleCNPJLookup(value);
            }
          }
        }
      }
      
      // Validar CEP ao sair do campo
      if (field.id === "cep" && cleanValue.length === 8) {
        if (!validateCEP(value)) {
          toast.error("CEP inválido");
        } else {
          // Auto-buscar CEP quando completo
          handleCEPLookup(value);
        }
      }
      
      // Validar email ao sair do campo
      if (field.type === "email" && value) {
        if (!validateEmail(value)) {
          setFieldErrors(prev => ({ ...prev, [field.id]: "E-mail inválido" }));
          toast.error("E-mail inválido. Verifique o formato (exemplo@dominio.com)");
        }
      }
      
      // Validar telefone/WhatsApp ao sair do campo
      if ((field.id === "phone" || field.type === "phone") && value) {
        if (!validateWhatsApp(value)) {
          setFieldErrors(prev => ({ ...prev, [field.id]: "WhatsApp inválido" }));
          toast.error("WhatsApp deve estar no formato +55 (XX) XXXXX-XXXX");
        }
      }
      
      // Validar inscrição estadual ao sair do campo
      if (field.id === "inscricao" && value && value.toUpperCase() !== "ISENTO") {
        if (!validateInscricaoEstadual(value)) {
          toast.error("Inscrição estadual inválida");
        }
      }
    };
    
    switch (field.type) {
      case "textarea":
        return (
          <div>
            <Textarea
              id={field.id}
              placeholder="..."
              value={value}
              onChange={(e) => {
                if (fieldErrors[field.id]) {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field.id];
                    return newErrors;
                  });
                }
                setFormData({ ...formData, [field.id]: e.target.value });
              }}
              onBlur={handleFieldBlur}
              required={field.required}
              className={fieldErrors[field.id] ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {fieldErrors[field.id] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors[field.id]}</p>
            )}
          </div>
        );
      case "select":
        return (
          <div>
            <Select value={value} onValueChange={(val) => handleFieldChange(val)}>
              <SelectTrigger className={fieldErrors[field.id] ? "border-red-500 focus-visible:ring-red-500" : ""}>
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
            {fieldErrors[field.id] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors[field.id]}</p>
            )}
          </div>
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
          <div className="relative">
            <Input
              id={field.id}
              type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
              placeholder="..."
              value={displayValue}
              onChange={(e) => handleFieldChange(e.target.value)}
              onBlur={handleFieldBlur}
              required={field.required}
              className={fieldErrors[field.id] ? "border-red-500 focus-visible:ring-red-500" : ""}
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

  const handleSaveContact = async () => {
    const errors: Record<string, string> = {};
    
    // Validar campos obrigatórios de contato
    const requiredContactFields = ['name', 'phone', 'email', 'position'];
    requiredContactFields.forEach(field => {
      if (!formData[field]?.trim()) {
        errors[field] = "Campo obrigatório";
      }
    });

    // Validar formato de email
    if (formData.email && !validateEmail(formData.email)) {
      errors.email = "E-mail inválido";
    }

    // Validar formato de WhatsApp
    if (formData.phone && !validateWhatsApp(formData.phone)) {
      errors.phone = "WhatsApp inválido";
    }

    // Se tem empresa sendo criada, validar campos da empresa
    if (criarNovaEmpresa) {
      const requiredCompanyFields = [
        'company_type', 'cpf_cnpj', 'company_name', 'company_fantasia',
        'cep', 'address', 'city', 'neighborhood', 'state', 'inscricao'
      ];
      
      requiredCompanyFields.forEach(field => {
        if (!formData[field]?.toString().trim()) {
          errors[field] = "Campo obrigatório";
        }
      });

      // Validar CPF ou CNPJ
      if (formData.cpf_cnpj) {
        const companyType = formData.company_type;
        if (companyType === "Pessoa Física" && !validateCPF(formData.cpf_cnpj)) {
          errors.cpf_cnpj = "CPF inválido";
        }
        if (companyType === "Pessoa Jurídica" && !validateCNPJ(formData.cpf_cnpj)) {
          errors.cpf_cnpj = "CNPJ inválido";
        }
      }

      // Validar CEP
      if (formData.cep && !validateCEP(formData.cep)) {
        errors.cep = "CEP inválido";
      }
    }

    // Se houver erros, mostrar e retornar
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Preencha todos os campos obrigatórios corretamente");
      return;
    }

    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        toast.error("Selecione um estabelecimento antes de salvar");
        return;
      }

      let novaEmpresaId: string | null = null;

      // Criar nova empresa se necessário
      if (criarNovaEmpresa) {
        const empresaPayload: any = {
          estabelecimento_id: estabId,
          nome_fantasia: formData.company_fantasia || formData.company_name,
          nome: formData.company_name,
          cnpj: formData.company_type === "Pessoa Jurídica" ? formData.cpf_cnpj : null,
          telefone: formData.phone || '',
          email: formData.email || '',
          endereco: formData.address,
          cidade: formData.city,
          estado: formData.state,
          cep: formData.cep,
          custom_fields: {}
        };

        // Preencher campos personalizados da empresa
        companyFields.forEach((field) => {
          const value = formData[field.id];
          if (value !== undefined && value !== '') {
            if (['company_type', 'cpf_cnpj', 'neighborhood', 'inscricao'].includes(field.id)) {
              empresaPayload.custom_fields[field.id] = value;
            } else if (!['nome_fantasia', 'nome', 'cnpj', 'telefone', 'email', 'endereco', 'cidade', 'estado', 'cep', 'company_name', 'company_fantasia', 'address', 'city', 'state'].includes(field.id)) {
              empresaPayload.custom_fields[field.id] = value;
            }
          }
        });

        const { data: novaEmpresa, error: empresaErr } = await supabase
          .from('empresas')
          .insert([empresaPayload])
          .select('id')
          .maybeSingle();

        if (empresaErr) throw empresaErr;
        novaEmpresaId = novaEmpresa?.id;
      }

      // Preparar dados do contato
      const contatoPayload: any = {
        estabelecimento_id: estabId,
        nome: formData.name,
        telefone: formData.phone,
        email: formData.email,
        empresa_id: null, // Mantém null pois usamos tabela de junção
        tipo_operador: empresasVinculadas.length > 0 ? true : false, // true = cliente, false = prospect
        custom_fields: {
          position: formData.position,
        },
        tags: [],
      };

      // Adicionar campos personalizados do contato
      contactFields.forEach((field) => {
        if (!['name', 'phone', 'email', 'position'].includes(field.id)) {
          const value = formData[field.id];
          if (value !== undefined && value !== '') {
            contatoPayload.custom_fields[field.id] = value;
          }
        }
      });

      let contatoId: string;

      if (editingContact) {
        // Atualizar contato existente
        contatoId = editingContact.id;
        await supabase
          .from('customers')
          .update(contatoPayload)
          .eq('id', contatoId);

        // Atualizar segmentos
        await supabase.from('customer_segmentos').delete().eq('customer_id', contatoId);
        if (segmentosSelecionados.length > 0) {
          await supabase.from('customer_segmentos').insert(
            segmentosSelecionados.map((sid) => ({ customer_id: contatoId, segmento_id: sid }))
          );
        }
      } else {
        // Criar novo contato
        const { data: inserted, error: insErr } = await supabase
          .from('customers')
          .insert([contatoPayload])
          .select('id')
          .maybeSingle();
        
        if (insErr) throw insErr;

        contatoId = inserted!.id;
        if (segmentosSelecionados.length > 0) {
          await supabase.from('customer_segmentos').insert(
            segmentosSelecionados.map((sid) => ({ customer_id: contatoId, segmento_id: sid }))
          );
        }
      }

      // Se criou uma nova empresa, adicionar ao vínculo
      if (novaEmpresaId) {
        await supabase.from('customer_empresas').insert([{
          customer_id: contatoId,
          empresa_id: novaEmpresaId,
          is_primary: empresasVinculadas.length === 0
        }]);
      }

      toast.success(empresasVinculadas.length > 0 ? 
        (editingContact ? "Cliente atualizado!" : "Cliente criado!") :
        (editingContact ? "Prospect atualizado!" : "Prospect criado!"));


      await loadContacts();

      setShowForm(false);
      setFormData({});
      setEditingContact(null);
      setFieldErrors({});
      setSegmentosSelecionados([]);
      setEmpresaSelecionada("");
      setCriarNovaEmpresa(false);
      setContatosDaEmpresa([]);
      setBuscaEmpresa("");
      setEmpresasFiltradas([]);
      setEmpresasVinculadas([]);
    } catch (e: any) {
      console.error('Erro ao salvar:', e);
      toast.error(e?.message || "Erro ao salvar contato");
    }
  };

  const handleEditContact = async (contact: Contact) => {
    setEditingContact(contact);
    
    // Carregar dados do contato no formData
    const baseFormData: Record<string, any> = {
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      position: contact.position,
    };

    // Adicionar campos personalizados do contato
    contactFields.forEach(f => {
      if (!['name', 'phone', 'email', 'position'].includes(f.id)) {
        baseFormData[f.id] = contact.customFields?.[f.id] || '';
      }
    });
    
    // Carregar empresas vinculadas do contato
    const { data: vinculosData } = await supabase
      .from('customer_empresas')
      .select(`
        *,
        empresas:empresa_id (
          id,
          nome_fantasia,
          nome,
          cnpj,
          custom_fields
        )
      `)
      .eq('customer_id', contact.id);
    
    if (vinculosData && vinculosData.length > 0) {
      setEmpresasVinculadas(vinculosData.map((v: any) => ({
        ...v.empresas,
        cargo: v.cargo,
        departamento: v.departamento,
        is_primary: v.is_primary,
        vinculo_id: v.id
      })));
    } else {
      setEmpresasVinculadas([]);
    }

    setFormData(baseFormData);
    setSegmentosSelecionados(contact.segmentos || []);
    setShowForm(true);
  };

  const handleDeleteContact = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    
    try {
      // Deletar vínculos com empresas
      await supabase
        .from('customer_empresas')
        .delete()
        .eq('customer_id', contactToDelete.id);

      // Deletar contato
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', contactToDelete.id);

      if (error) throw error;

      await loadContacts();
      toast.success("Contato excluído com sucesso");
    } catch (e: any) {
      console.error('Erro ao excluir contato:', e);
      toast.error(e?.message || "Erro ao excluir contato");
    }
    
    setDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  const handleAddEmpresaVinculada = async (empresaId: string) => {
    if (!editingContact) {
      // Se estiver criando novo contato, apenas adiciona à lista local
      const empresa = empresas.find(e => e.id === empresaId);
      if (empresa && !empresasVinculadas.some(ev => ev.id === empresaId)) {
        setEmpresasVinculadas([...empresasVinculadas, {
          ...empresa,
          is_primary: empresasVinculadas.length === 0
        }]);
        setEmpresaSelecionada("");
        setBuscaEmpresa("");
        toast.success("Empresa vinculada!");
      }
      return;
    }

    // Se estiver editando, salvar no banco
    try {
      const { error } = await supabase
        .from('customer_empresas')
        .insert([{
          customer_id: editingContact.id,
          empresa_id: empresaId,
          is_primary: empresasVinculadas.length === 0
        }]);

      if (error) throw error;

      const empresa = empresas.find(e => e.id === empresaId);
      if (empresa) {
        setEmpresasVinculadas([...empresasVinculadas, {
          ...empresa,
          is_primary: empresasVinculadas.length === 0
        }]);
      }

      // Atualizar tipo_operador para cliente
      await supabase
        .from('customers')
        .update({ tipo_operador: true })
        .eq('id', editingContact.id);

      setEmpresaSelecionada("");
      setBuscaEmpresa("");
      toast.success("Empresa vinculada! O vínculo também aparecerá no cadastro da empresa.");
      await loadContacts();
    } catch (e: any) {
      console.error('Erro ao vincular empresa:', e);
      toast.error(e?.message || "Erro ao vincular empresa");
    }
  };

  const handleRemoveEmpresaVinculada = async (empresaId: string, vinculoId?: string) => {
    if (!editingContact) {
      // Se estiver criando, apenas remove da lista local
      setEmpresasVinculadas(empresasVinculadas.filter(ev => ev.id !== empresaId));
      return;
    }

    // Se estiver editando, remover do banco
    try {
      if (vinculoId) {
        const { error } = await supabase
          .from('customer_empresas')
          .delete()
          .eq('id', vinculoId);

        if (error) throw error;
      }

      setEmpresasVinculadas(empresasVinculadas.filter(ev => ev.id !== empresaId));

      // Se não sobrar nenhuma empresa, atualizar para prospect
      if (empresasVinculadas.length === 1) {
        await supabase
          .from('customers')
          .update({ tipo_operador: false })
          .eq('id', editingContact.id);
      }

      toast.success("Empresa desvinculada!");
      await loadContacts();
    } catch (e: any) {
      console.error('Erro ao desvincular empresa:', e);
      toast.error(e?.message || "Erro ao desvincular empresa");
    }
  };

  const handleStartEdit = (contactId: string, field: string, value: string) => {
    setEditingCell({ contactId, field });
    setEditingValue(value);
  };

  const handleSaveInlineEdit = async () => {
    if (!editingCell) return;

    const trimmedValue = editingValue.trim();
    
    // Validar campo antes de salvar
    if (editingCell.field === 'email') {
      if (trimmedValue && !validateEmail(trimmedValue)) {
        toast.error("E-mail inválido");
        return;
      }
    }
    
    if (editingCell.field === 'phone') {
      if (trimmedValue && !validatePhone(trimmedValue)) {
        toast.error("Telefone inválido");
        return;
      }
      
      // Verificar duplicação de WhatsApp
      const duplicatePhone = contacts.find(c => 
        c.id !== editingCell.contactId && 
        c.active &&
        c.phone && 
        c.phone.replace(/\D/g, '') === trimmedValue.replace(/\D/g, '')
      );
      
      if (duplicatePhone) {
        toast.error("WhatsApp já cadastrado");
        return;
      }
    }
    
    if (editingCell.field === 'cpf_cnpj') {
      if (trimmedValue) {
        const cleanValue = trimmedValue.replace(/\D/g, '');
        if (cleanValue.length === 11) {
          if (!validateCPF(trimmedValue)) {
            toast.error("CPF inválido");
            return;
          }
        } else if (cleanValue.length === 14) {
          if (!validateCNPJ(trimmedValue)) {
            toast.error("CNPJ inválido");
            return;
          }
        } else {
          toast.error("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos");
          return;
        }
        
        // Verificar duplicação de CPF/CNPJ
        const duplicateCpfCnpj = contacts.find(c => 
          c.id !== editingCell.contactId && 
          c.active &&
          c.customFields?.cpf_cnpj && 
          c.customFields.cpf_cnpj.replace(/\D/g, '') === cleanValue
        );
        
        if (duplicateCpfCnpj) {
          toast.error("CPF/CNPJ já cadastrado");
          return;
        }
      }
    }
    
    if (editingCell.field === 'cep') {
      if (trimmedValue && !validateCEP(trimmedValue)) {
        toast.error("CEP inválido");
        return;
      }
    }
    
    // Validar campos obrigatórios
    const requiredFields = ['name', 'phone', 'email'];
    if (requiredFields.includes(editingCell.field) && !trimmedValue) {
      toast.error("Este campo é obrigatório");
      return;
    }

    try {
      const contact = contacts.find(c => c.id === editingCell.contactId);
      if (!contact) return;

      const updatedCustomFields = { ...contact.customFields };
      
      // Atualizar campo correto
      if (editingCell.field === 'name') {
        await supabase
          .from('customers')
          .update({ nome: trimmedValue })
          .eq('id', editingCell.contactId);
      } else if (editingCell.field === 'phone') {
        await supabase
          .from('customers')
          .update({ telefone: trimmedValue })
          .eq('id', editingCell.contactId);
      } else if (editingCell.field === 'email') {
        await supabase
          .from('customers')
          .update({ email: trimmedValue })
          .eq('id', editingCell.contactId);
      } else {
        // Custom field
        updatedCustomFields[editingCell.field] = trimmedValue;
        await supabase
          .from('customers')
          .update({ custom_fields: updatedCustomFields })
          .eq('id', editingCell.contactId);
      }

      await loadContacts();
      setEditingCell(null);
      setEditingValue("");
      toast.success("Campo atualizado com sucesso");
    } catch (e: any) {
      console.error('Erro ao atualizar campo:', e);
      toast.error("Erro ao atualizar campo");
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const filteredContacts = contacts.filter(contact => {
    // Filtrar apenas contatos ativos
    if (!contact.active) return false;
    
    // Busca unificada nos campos principais
    if (searchFilters.unifiedSearch) {
      const searchTerm = searchFilters.unifiedSearch.toLowerCase();
      const cpfCnpj = (contact.customFields?.cpf_cnpj || "").toString().toLowerCase();
      const companyName = (contact.customFields?.company_name || "").toString().toLowerCase();
      const companyFantasia = (contact.customFields?.company_fantasia || "").toString().toLowerCase();
      
      const matchesSearch = 
        contact.name.toLowerCase().includes(searchTerm) ||
        cpfCnpj.includes(searchTerm) ||
        companyName.includes(searchTerm) ||
        companyFantasia.includes(searchTerm) ||
        contact.phone.includes(searchTerm) ||
        contact.email.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) {
        return false;
      }
    }
    
    // Filtrar por campos customizados marcados como searchable
    const allSearchableFields = [...contactFields, ...companyFields].filter(f => f.searchable);
    for (const field of allSearchableFields) {
      const filterValue = searchFilters[field.id as keyof SearchFilters];
      const contactValue = contact.customFields[field.id];
      
      if (filterValue && contactValue) {
        const filterStr = String(filterValue).toLowerCase();
        const contactStr = String(contactValue).toLowerCase();
        
        if (!contactStr.includes(filterStr)) {
          return false;
        }
      }
    }
    
    return true;
  });

  // Aplicar ordenação
  const sortedContacts = React.useMemo(() => {
    if (!sortConfig) return filteredContacts;

    return [...filteredContacts].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Obter valores baseado na coluna
      switch (sortConfig.key) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'company':
          aValue = a.company;
          bValue = b.company;
          break;
        case 'phone':
          aValue = a.phone;
          bValue = b.phone;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'position':
          aValue = a.position;
          bValue = b.position;
          break;
        default:
          aValue = a.customFields?.[sortConfig.key] || '';
          bValue = b.customFields?.[sortConfig.key] || '';
      }

      // Converter para string para comparação
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredContacts, sortConfig]);

  if (!showForm) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background">
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">CONTATOS</h1>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfigPanel(true)} 
                className="gap-2"
              >
                <Settings2 className="w-4 h-4" />
                Configuração de Campos
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowImportPanel(true)} 
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Importação
              </Button>
              <Button onClick={() => {
                setShowForm(true);
                setEditingContact(null);
                setFormData({});
                setSegmentosSelecionados([]);
                setEmpresaSelecionada("");
                setCriarNovaEmpresa(false);
                setContatosDaEmpresa([]);
                setBuscaEmpresa("");
                setEmpresasFiltradas([]);
                setEmpresasVinculadas([]);
              }} className="gap-2">
                <Plus className="w-4 h-4" />
                ADICIONAR CONTATO
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-primary/10 text-primary border-primary/20"
            >
              Lista completa
            </Button>
            
            <TableColumnsConfig
              columns={tableColumns} 
              onColumnsChange={handleColumnsChange}
            />
            
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF/CNPJ, empresa, fantasia, WhatsApp ou e-mail..."
                  value={searchFilters.unifiedSearch}
                  onChange={(e) => setSearchFilters({ ...searchFilters, unifiedSearch: e.target.value })}
                  className="pl-10 h-9"
                />
              </div>
            </div>
            
            <div className="ml-auto text-sm text-muted-foreground">
              {sortedContacts.length} elementos
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {sortedContacts.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Nenhum contato cadastrado. Clique em "ADICIONAR CONTATO" para começar.
            </div>
          ) : (
            <div className="relative">
              <table className="w-full">
                <thead className="border-b border-border sticky top-0 bg-background z-10">
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
                              className="h-5 w-5 hover:bg-transparent"
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
                  {sortedContacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      {tableColumns.filter(col => col.visible).map((column, index) => {
                        if (column.id === 'actions') {
                          return (
                            <td key="actions" className="p-3 sticky left-0 bg-background border-r border-border">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={async () => {
                                    setEditingContact(contact);
                                    setFormData({
                                      name: contact.name,
                                      phone: contact.phone,
                                      email: contact.email,
                                      position: contact.position,
                                      ...contact.customFields
                                    });
                                    
                                    // Carregar empresas vinculadas
                                    const { data: vinculos } = await supabase
                                      .from('customer_empresas')
                                      .select(`
                                        id,
                                        is_primary,
                                        empresas:empresa_id (
                                          id,
                                          nome_fantasia,
                                          nome,
                                          cnpj,
                                          custom_fields
                                        )
                                      `)
                                      .eq('customer_id', contact.id);
                                    
                                    if (vinculos) {
                                      const empresasFormatadas = vinculos.map(v => ({
                                        id: v.empresas.id,
                                        nome_fantasia: v.empresas.nome_fantasia,
                                        nome: v.empresas.nome,
                                        cnpj: v.empresas.cnpj,
                                        custom_fields: v.empresas.custom_fields,
                                        is_primary: v.is_primary,
                                        vinculo_id: v.id
                                      }));
                                      setEmpresasVinculadas(empresasFormatadas);
                                    }
                                    
                                    setShowForm(true);
                                  }}
                                  title="Editar cadastro completo"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteContact(contact.id);
                                  }}
                                  title="Excluir contato"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          );
                        }

                        return (
                        <td 
                          key={column.id} 
                          className="p-3 group relative"
                          style={{ width: column.width, maxWidth: column.width }}
                        >
                          {editingCell?.contactId === contact.id && editingCell?.field === column.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveInlineEdit();
                                  if (e.key === "Escape") handleCancelEdit();
                                }}
                                className="h-8"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={handleSaveInlineEdit}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between min-w-0">
                              <span className={`truncate ${column.id === 'name' ? 'font-medium text-primary' : ''}`}>
                                {column.id === 'name' && contact.name}
                                {column.id === 'phone' && contact.phone}
                                {column.id === 'email' && contact.email}
                                {column.id === 'position' && (contact.position || "-")}
                                {!['name', 'phone', 'email', 'position'].includes(column.id) && (contact.customFields?.[column.id] || "-")}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  let value = "";
                                  if (column.id === 'name') value = contact.name;
                                  else if (column.id === 'phone') value = contact.phone;
                                  else if (column.id === 'email') value = contact.email;
                                  else if (column.id === 'position') value = contact.position;
                                  else value = contact.customFields?.[column.id] || "";
                                  handleStartEdit(contact.id, column.id, value);
                                }}
                                title="Edição rápida"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </div>
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

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o contato <strong>{contactToDelete?.name}</strong>?
                {"\n\n"}
                Se o contato estiver em uso no sistema (conversas, pedidos, etc.), 
                ele será inativado ao invés de excluído.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            {editingContact ? "Editar Contato" : "Novo Contato"}
          </h1>
          <Button variant="ghost" size="sm" className="gap-2 ml-auto">
            #ADICIONAR TAGS
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="contato" className="w-full">
          <div className="border-b border-border bg-card px-6">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger 
                value="contato"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
              >
                Contato
              </TabsTrigger>
              <TabsTrigger 
                value="empresa" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
              >
                Empresa
              </TabsTrigger>
              <TabsTrigger 
                value="segmentos"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
              >
                Segmentos
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="contato" className="p-6">
            <Card className="p-4">
              <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Dados do Contato
              </h3>
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
                      {renderField(field)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveContact}>
                {empresaSelecionada ? "Salvar Contato" : "Salvar Prospect"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="empresa" className="p-6">
            {/* Lista de Empresas Vinculadas */}
            {empresasVinculadas.length > 0 && (
              <Card className="p-4 mb-4">
                <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Empresas Vinculadas
                </h3>
                <div className="space-y-2">
                  {empresasVinculadas.map((empresa) => (
                    <div key={empresa.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-accent/50">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{empresa.nome_fantasia}</div>
                        <div className="text-xs text-muted-foreground">
                          {empresa.cnpj || empresa.custom_fields?.cpf_cnpj}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {empresa.is_primary && (
                          <Badge variant="secondary" className="text-xs">Principal</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => {
                            // Editar empresa
                            const empresaCompleta = empresas.find(e => e.id === empresa.id);
                            if (empresaCompleta) {
                              const data: Record<string, any> = {
                                company_type: empresaCompleta.custom_fields?.company_type || "Pessoa Jurídica",
                                cpf_cnpj: empresaCompleta.cnpj || "",
                                company_name: empresaCompleta.nome || "",
                                company_fantasia: empresaCompleta.nome_fantasia || "",
                                phone: empresaCompleta.telefone || "",
                                email: empresaCompleta.email || "",
                                cep: empresaCompleta.cep || "",
                                address: empresaCompleta.endereco || "",
                                city: empresaCompleta.cidade || "",
                                state: empresaCompleta.estado || "",
                                neighborhood: empresaCompleta.custom_fields?.neighborhood || "",
                                inscricao: empresaCompleta.custom_fields?.inscricao || "",
                              };
                              setFormData(data);
                              setCriarNovaEmpresa(true);
                            }
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleRemoveEmpresaVinculada(empresa.id, empresa.vinculo_id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Busca e Seleção de Empresa */}
            {!criarNovaEmpresa && (
              <Card className="p-4 mb-4">
                <Label className="text-xs">Vincular Empresa</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Buscar por nome, CNPJ..."
                    value={buscaEmpresa}
                    className="h-9 text-sm"
                    onChange={(e) => {
                      const valor = e.target.value;
                      setBuscaEmpresa(valor);
                      
                      if (valor.trim()) {
                        const termo = valor.toLowerCase();
                        const filtradas = empresas.filter(emp => 
                          !empresasVinculadas.some(ev => ev.id === emp.id) &&
                          (emp.nome_fantasia?.toLowerCase().includes(termo) ||
                          emp.nome?.toLowerCase().includes(termo) ||
                          emp.cnpj?.includes(termo.replace(/\D/g, '')) ||
                          emp.custom_fields?.cpf_cnpj?.includes(termo.replace(/\D/g, '')))
                        );
                        setEmpresasFiltradas(filtradas);
                      } else {
                        setEmpresasFiltradas([]);
                      }
                    }}
                    onBlur={async () => {
                      const clean = buscaEmpresa.replace(/\D/g, '');
                      if ((clean.length === 11 || clean.length === 14) && empresasFiltradas.length === 0) {
                        if (clean.length === 14) {
                          await handleCNPJLookup(buscaEmpresa);
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEmpresaSelecionada("");
                      setCriarNovaEmpresa(true);
                      setBuscaEmpresa("");
                      setEmpresasFiltradas([]);
                      setFormData({});
                    }}
                  >
                    + Nova
                  </Button>
                </div>

                {/* Lista de empresas filtradas */}
                {empresasFiltradas.length > 0 && (
                  <div className="border rounded-md max-h-[160px] overflow-y-auto mt-2">
                    {empresasFiltradas.map((empresa) => (
                      <button
                        key={empresa.id}
                        className="w-full text-left p-2 hover:bg-accent transition-colors border-b last:border-b-0"
                        onClick={() => {
                          handleAddEmpresaVinculada(empresa.id);
                          setEmpresasFiltradas([]);
                          setBuscaEmpresa("");
                        }}
                      >
                        <div className="font-medium text-sm">{empresa.nome_fantasia}</div>
                        <div className="text-xs text-muted-foreground">
                          {empresa.cnpj || empresa.custom_fields?.cpf_cnpj || 'Sem documento'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Formulário de Nova Empresa */}
            {criarNovaEmpresa && (
              <Card className="p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Nova Empresa
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setCriarNovaEmpresa(false);
                      setFormData({});
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {companyFields.map((field) => (
                    <div key={field.id}>
                      <Label 
                        htmlFor={field.id} 
                        className={`text-sm font-medium ${
                          field.id === 'company_type' || field.id === 'cpf_cnpj' 
                            ? 'text-primary font-semibold text-base' 
                            : 'text-foreground'
                        }`}
                      >
                        {field.label} {field.required && '*'}
                      </Label>
                      <div className={field.id === 'company_type' || field.id === 'cpf_cnpj' ? 'ring-2 ring-primary/30 rounded-md' : ''}>
                        {renderField(field)}
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
              <Button size="sm" onClick={handleSaveContact}>
                Salvar
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="segmentos" className="p-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Segmentos do Contato</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Selecione um ou mais segmentos para categorizar este contato.
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
                      Configure segmentos nas configurações do estabelecimento para poder categorizar seus contatos.
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

      {/* Panel de Configurações */}
      <Sheet open={showConfigPanel} onOpenChange={setShowConfigPanel}>
        <SheetContent side="right" className="w-full sm:max-w-[900px] overflow-auto" aria-describedby="config-description">
          <SheetHeader>
            <SheetTitle>Configurações de Campos de Contato</SheetTitle>
            <p id="config-description" className="sr-only">Configure campos personalizados para contatos</p>
          </SheetHeader>
          
          <div className="mt-6">
            <ContatoFieldsCRUD 
              estabelecimentoId={estabelecimentoId} 
              onChanged={() => {
                console.log('🔄 ContatoFieldsCRUD onChange triggered');
                loadContacts();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Panel de Importação */}
      <Sheet open={showImportPanel} onOpenChange={setShowImportPanel}>
        <SheetContent side="right" className="w-full sm:max-w-[900px] overflow-auto" aria-describedby="import-description">
          <SheetHeader>
            <SheetTitle>Importar Empresas e Contatos</SheetTitle>
            <p id="import-description" className="sr-only">Importe múltiplos contatos através de arquivo Excel/CSV ou integração com API</p>
          </SheetHeader>
          
          <div className="mt-6">
            <Tabs defaultValue="arquivo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="arquivo">Por Arquivo</TabsTrigger>
                <TabsTrigger value="api">Por API</TabsTrigger>
              </TabsList>

              <TabsContent value="arquivo">
                <Card className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Importar Contatos por Arquivo</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Faça upload de um arquivo CSV ou Excel para importar múltiplos contatos de uma vez.
                      </p>
                    </div>

                <div className="border-2 border-dashed border-border rounded-lg p-8">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    
                    <div className="text-center space-y-2">
                      <h4 className="font-medium">Arraste e solte seu arquivo aqui</h4>
                      <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
                      <p className="text-xs text-muted-foreground">Formatos aceitos: CSV, XLS, XLSX (máx. 10MB)</p>
                    </div>

                    <Button className="mt-4">
                      <Upload className="w-4 h-4 mr-2" />
                      Selecionar Arquivo
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Campos Obrigatórios</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">CONTATO</p>
                        <ul className="text-sm space-y-1">
                          <li>• Nome de contato</li>
                          <li>• WhatsApp</li>
                          <li>• E-mail</li>
                          <li>• Posição</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">EMPRESA</p>
                        <ul className="text-sm space-y-1">
                          <li>• Tipo (Pessoa Física ou Pessoa Jurídica)</li>
                          <li>• CPF/CNPJ</li>
                          <li>• Nome</li>
                          <li>• Nome Fantasia</li>
                          <li>• CEP</li>
                          <li>• Endereço</li>
                          <li>• Cidade</li>
                          <li>• Bairro</li>
                          <li>• UF</li>
                          <li>• Inscrição</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Instruções de Importação</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">1.</span>
                      <p>Baixe o modelo de importação clicando no botão abaixo</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">2.</span>
                      <p>Preencha todas as colunas obrigatórias (não deixe células vazias)</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">3.</span>
                      <p>Tipo deve ser exatamente: "Pessoa Física" ou "Pessoa Jurídica"</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">4.</span>
                      <p>Telefones no formato: +55 (00) 00000-0000</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">5.</span>
                      <p>CPF/CNPJ no formato: 000.000.000-00 ou 00.000.000/0000-00</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">6.</span>
                      <p>CEP no formato: 00000-000</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">7.</span>
                      <p>Inscrição: número da IE ou "ISENTO" para pessoa física</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">8.</span>
                      <p>Contatos duplicados (mesmo telefone ou e-mail) serão ignorados</p>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      const wb = XLSX.utils.book_new();
                      
                      const headers = [
                        "Nome de contato",
                        "WhatsApp",
                        "E-mail",
                        "Posição",
                        "Tipo",
                        "CPF/CNPJ",
                        "Nome",
                        "Nome Fantasia",
                        "CEP",
                        "Endereço",
                        "Cidade",
                        "Bairro",
                        "UF",
                        "Inscrição"
                      ];
                      
                      const exampleRow = [
                        "João Silva",
                        "+55 (11) 99999-9999",
                        "joao@exemplo.com",
                        "Gerente",
                        "Pessoa Jurídica",
                        "12.345.678/0001-90",
                        "Empresa Exemplo LTDA",
                        "Empresa Exemplo",
                        "01310-100",
                        "Avenida Paulista, 1000",
                        "São Paulo",
                        "Bela Vista",
                        "SP",
                        "123456789"
                      ];
                      
                      const wsData = [headers, exampleRow];
                      const ws = XLSX.utils.aoa_to_sheet(wsData);
                      
                      const colWidths = headers.map(() => ({ wch: 20 }));
                      ws['!cols'] = colWidths;
                      
                      XLSX.utils.book_append_sheet(wb, ws, "Contatos");
                      XLSX.writeFile(wb, "modelo_importacao_contatos.xlsx");
                      
                      toast.success("Modelo Excel baixado com sucesso!");
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Modelo de Importação (Excel)
                  </Button>
                </div>
              </div>
            </Card>
              </TabsContent>

              <TabsContent value="api">
                <APIImportDialog />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
