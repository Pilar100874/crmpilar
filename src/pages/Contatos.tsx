import { useState, useEffect, useRef } from "react";
import * as React from "react";
import * as XLSX from 'xlsx';
import { useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, Trash2, GripVertical, Search, Calendar, X, Pencil, Check, Loader2, Edit, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Upload, Download, Eye } from "lucide-react";
import { ContatoDetailsPanel } from "@/components/contatos/ContatoDetailsPanel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/lib/toast-config";
import { validateCPF, validateCNPJ, validateEmail, validatePhone, validateCEP, validateInscricaoEstadual, validateWhatsApp } from "@/lib/validators";
import { maskCPF, maskCNPJ, maskCEP, maskPhone, maskDate, applyCustomMask, maskWhatsApp } from "@/lib/masks";
import { useAddressLookup } from "@/hooks/useAddressLookup";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { geocodeAndSaveEmpresa } from "@/hooks/useGeocodingService";
import { FieldMaskConfig, type FieldMask } from "@/components/config/FieldMaskConfig";
import { SortableFieldItem } from "@/components/config/SortableFieldItem";
import { TableColumnsConfig, type TableColumn } from "@/components/config/TableColumnsConfig";
import { APIImportDialog } from "@/components/config/APIImportDialog";
import { ImportContatosWizard } from "@/components/contatos/ImportContatosWizard";
import { SegmentosCRUD } from "@/components/config/SegmentosCRUD";
import { ContatoFieldsCRUD } from "@/components/config/ContatoFieldsCRUD";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  tel: string;
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

interface ContatosProps {
  hideAdminButtons?: boolean;
}

export default function Contatos({ hideAdminButtons = false }: ContatosProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null); // Contato selecionado para visualização no painel lateral
  const [editingCell, setEditingCell] = useState<{ contactId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<{ id: string; category: "contact" | "company"; label: string } | null>(null);
  
  // Estados para validação de duplicidade
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateContact, setDuplicateContact] = useState<any | null>(null);
  const [duplicateField, setDuplicateField] = useState<'phone' | 'email' | null>(null);
  const [shouldCheckDuplicate, setShouldCheckDuplicate] = useState(true);
  const [isClosingForm, setIsClosingForm] = useState(false);
  const isClosingRef = useRef(false);
  
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string }>>([]);
  const [vinculos, setVinculos] = useState<any[]>([]);
  
  // Estados para gerenciar vínculos na aba
  const [novosUsuariosVinculo, setNovosUsuariosVinculo] = useState<string[]>([]);
  const [novosSegmentosVinculo, setNovosSegmentosVinculo] = useState<string[]>([]);
  
  // Gerenciamento de colunas da tabela - APENAS CAMPOS DE CONTATO
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([
    { id: "actions", label: "Ações", visible: true, width: 120, locked: true },
    { id: "name", label: "Nome", visible: true, width: 250, locked: true },
    { id: "phone", label: "WhatsApp", visible: true, width: 180 },
    { id: "tel", label: "Telefone", visible: true, width: 150 },
    { id: "email", label: "E-mail", visible: true, width: 250 },
    { id: "position", label: "Cargo", visible: true, width: 150 },
  ]);

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
    { id: "tel", label: "Telefone", type: "phone", category: "contact", required: false, locked: true },
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
  const [tipoContatoFilter, setTipoContatoFilter] = useState<'all' | 'clientes' | 'prospects'>('all');


  // Campos base obrigatórios de contato (sempre devem existir)
  const baseContactFields: CustomField[] = [
    { id: "name", label: "Nome de contato", type: "text", category: "contact", required: true, locked: true },
    { id: "phone", label: "WhatsApp", type: "phone", category: "contact", required: true, locked: true },
    { id: "tel", label: "Telefone", type: "phone", category: "contact", required: false, locked: true },
    { id: "email", label: "E-mail", type: "email", category: "contact", required: true, locked: true },
    { id: "position", label: "Cargo", type: "text", category: "contact", required: true, locked: true },
  ];

  // Carregar campos customizados de contato do banco
  const loadContactFields = async (estabId: string) => {
    try {
      const { data: campos, error } = await supabase
        .from("form_field_configs")
        .select("*")
        .eq("form_type", "contato")
        .eq("estabelecimento_id", estabId)
        .order("field_order", { ascending: true });

      if (error) {
        console.error("❌ Erro ao buscar campos de contato:", error);
        return;
      }

      if (campos && campos.length > 0) {
        // Mapear os campos do banco para o formato usado no formulário
        const mappedFields: CustomField[] = campos.map((campo) => {
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
        
        // Garantir que os campos base sempre existam
        const baseFieldIds = baseContactFields.map(f => f.id);
        const missingBaseFields = baseContactFields.filter(
          baseField => !mappedFields.some(f => f.id === baseField.id)
        );
        
        // Adicionar campos base faltantes no início, na ordem correta
        const finalFields = [...missingBaseFields, ...mappedFields];
        
        // Reordenar para manter campos base na ordem correta no início
        const sortedFields = finalFields.sort((a, b) => {
          const aBaseIndex = baseFieldIds.indexOf(a.id);
          const bBaseIndex = baseFieldIds.indexOf(b.id);
          
          // Se ambos são campos base, ordenar pela ordem base
          if (aBaseIndex !== -1 && bBaseIndex !== -1) {
            return aBaseIndex - bBaseIndex;
          }
          // Campos base vêm primeiro
          if (aBaseIndex !== -1) return -1;
          if (bBaseIndex !== -1) return 1;
          // Manter ordem original para campos customizados
          return 0;
        });
        
        console.log("✅ Campos customizados carregados:", sortedFields.length);
        setContactFields(sortedFields);
      } else {
        // Se não há campos no banco, usar os campos base
        setContactFields(baseContactFields);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar campos customizados:", error);
    }
  };

  // Carregar campos customizados de empresa do banco
  const loadCompanyFields = async (estabId: string) => {
    try {
      const { data: campos, error } = await supabase
        .from("form_field_configs")
        .select("*")
        .eq("form_type", "empresa")
        .eq("estabelecimento_id", estabId)
        .order("field_order", { ascending: true });

      if (error) {
        console.error("❌ Erro ao buscar campos de empresa:", error);
        return;
      }

      if (campos && campos.length > 0) {
        const mappedFields: CustomField[] = campos.map((campo) => {
          const options = campo.options as any;
          return {
            id: campo.field_id,
            label: campo.field_label,
            type: campo.field_type as CustomField["type"],
            category: "company",
            options: options?.options || [],
            required: campo.required || false,
            locked: campo.locked || false,
          };
        });
        
        console.log("✅ Campos de empresa carregados:", mappedFields.length);
        setCompanyFields(mappedFields);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar campos de empresa:", error);
    }
  };

  // Carregar colunas da tabela baseadas nos campos de contato configurados
  const loadTableColumns = async (estabId: string) => {
    try {
      const { data: campos, error } = await supabase
        .from("form_field_configs")
        .select("*")
        .eq("form_type", "contato")
        .eq("estabelecimento_id", estabId)
        .order("field_order", { ascending: true });

      if (error) {
        console.error("❌ Erro ao buscar campos de contato:", error);
        return;
      }

      const saved = localStorage.getItem("contactsTableColumns");
      let savedColumns: TableColumn[] = [];
      
      if (saved) {
        try {
          savedColumns = JSON.parse(saved);
        } catch (e) {
          console.error("Erro ao parsear colunas salvas:", e);
        }
      }

      // Criar colunas baseadas nos campos configurados
      const newColumns: TableColumn[] = [
        { id: "actions", label: "Ações", visible: true, width: 120, locked: true }
      ];

      campos?.forEach((campo) => {
        const savedColumn = savedColumns.find(col => col.id === campo.field_id);
        
        newColumns.push({
          id: campo.field_id,
          label: campo.field_label,
          visible: savedColumn?.visible ?? (campo.field_id === 'name' || campo.field_id === 'phone' || campo.field_id === 'tel' || campo.field_id === 'email' || campo.field_id === 'position'),
          width: savedColumn?.width ?? 180,
          locked: campo.field_id === 'name',
        });
      });

      setTableColumns(newColumns);
      localStorage.setItem("contactsTableColumns", JSON.stringify(newColumns));
    } catch (error) {
      console.error("❌ Erro ao carregar colunas:", error);
    }
  };

  // Carregar estabelecimento e segmentos
  useEffect(() => {
    const fetchEstabelecimentoAndSegmentos = async () => {
      const estabId = await getEstabelecimentoId();
      console.log("🔍 Contatos - estabelecimentoId detectado:", estabId);
      setEstabelecimentoId(estabId);
      
      if (estabId) {
        console.log("🔍 Contatos - Buscando segmentos para estabelecimento:", estabId);
        
        // Carregar campos customizados para o formulário
        await loadContactFields(estabId);
        await loadCompanyFields(estabId);
        
        // Carregar colunas baseadas nos campos configurados
        await loadTableColumns(estabId);
        
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

  // Detectar se há um ID de contato para editar vindo da navegação (via state ou URL params)
  useEffect(() => {
    const state = location.state as { editContactId?: string };
    const idFromUrl = searchParams.get('id');
    const contactIdToEdit = state?.editContactId || idFromUrl;
    
    if (contactIdToEdit && contacts.length > 0) {
      const contactToEdit = contacts.find(c => c.id === contactIdToEdit);
      if (contactToEdit) {
        handleEditContact(contactToEdit);
        // Limpar o state após usar
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, searchParams, contacts]);

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

      // Carregar usuários
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('estabelecimento_id', estabId)
        .order('nome');

      if (!usuariosError) {
        setUsuarios(usuariosData || []);
      }

      // Carregar vínculos
      const { data: vinculosData, error: vinculosError } = await supabase
        .from('customer_vinculos')
        .select('*')
        .eq('estabelecimento_id', estabId);

      if (!vinculosError) {
        setVinculos(vinculosData || []);
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
        tel: r.tel || '',
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
          tipo_operador: r.tipo_operador,
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

  const handleAdicionarVinculo = async () => {
    if (!estabelecimentoId || !editingContact || novosUsuariosVinculo.length === 0) {
      toast.error("Selecione pelo menos um usuário");
      return;
    }

    try {
      const vinculos = [];
      
      // Criar vínculos independentes para usuários
      for (const usuarioId of novosUsuariosVinculo) {
        vinculos.push({
          customer_id: editingContact.id,
          usuario_id: usuarioId,
          segmento_id: null,
          estabelecimento_id: estabelecimentoId,
        });
      }

      const { error } = await supabase
        .from("customer_vinculos")
        .insert(vinculos);

      if (error) throw error;

      toast.success("Vínculos adicionados!");
      setNovosUsuariosVinculo([]);
      await loadContacts();
    } catch (error: any) {
      if (error.message.includes("duplicate")) {
        toast.error("Um ou mais vínculos já existem");
      } else {
        toast.error("Erro ao adicionar vínculos: " + error.message);
      }
    }
  };

  const handleRemoverVinculo = async (vinculoId: string) => {
    try {
      // Remover o vínculo do contato
      const { error } = await supabase
        .from("customer_vinculos")
        .delete()
        .eq("id", vinculoId);

      if (error) throw error;

      toast.success("Vínculo removido!");
      await loadContacts();
    } catch (error: any) {
      toast.error("Erro ao remover vínculo: " + error.message);
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

    // Solicita confirmação antes de excluir
    setFieldToDelete({ id: fieldId, category, label: field?.label || "campo" });
  };

  const confirmRemoveField = () => {
    if (!fieldToDelete) return;
    const { id, category } = fieldToDelete;
    if (category === "contact") {
      setContactFields(contactFields.filter(f => f.id !== id));
    } else {
      setCompanyFields(companyFields.filter(f => f.id !== id));
    }
    toast.success("Campo removido com sucesso");
    setFieldToDelete(null);
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
        cep: maskCEP(data.cep),
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

  const renderCompanyField = (field: CustomField) => {
    const value = formData[field.id] || "";
    
    const displayValue = applyFieldMask(field.id, value);
    
    const handleCompanyFieldChange = (newValue: string) => {
      let processedValue = newValue;
      
      if (fieldErrors[field.id]) {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field.id];
          return newErrors;
        });
      }
      
      if (field.id === "cpf_cnpj") {
        const companyType = formData.company_type;
        if (companyType === "Pessoa Física") {
          processedValue = maskCPF(newValue);
        } else if (companyType === "Pessoa Jurídica") {
          processedValue = maskCNPJ(newValue);
        }
      } else if (field.id === "cep") {
        processedValue = maskCEP(newValue);
      } else if (field.type === "phone") {
        processedValue = maskWhatsApp(newValue);
      }
      
      if (field.id === "company_type") {
        const companyFieldIds = companyFields.map(f => f.id).filter(id => id !== "company_type");
        const clearedData: Record<string, any> = { ...formData, [field.id]: newValue };
        
        companyFieldIds.forEach(id => {
          clearedData[id] = "";
        });
        
        if (newValue === "Pessoa Física") {
          clearedData.inscricao = "ISENTO";
        }
        
        setFormData(clearedData);
      } else {
        setFormData({ ...formData, [field.id]: processedValue });
      }
    };
    
    const handleCompanyFieldBlur = () => {
      const cleanValue = value.replace(/\D/g, '');
      
      if (field.id === "cpf_cnpj") {
        const companyType = formData.company_type;
        if (companyType === "Pessoa Física") {
          if (cleanValue.length === 11 && !validateCPF(value)) {
            toast.error("CPF inválido");
          }
        } else if (companyType === "Pessoa Jurídica") {
          if (cleanValue.length === 14) {
            if (!validateCNPJ(value)) {
              toast.error("CNPJ inválido");
            } else {
              handleCNPJLookup(value);
            }
          }
        }
      }
      
      if (field.id === "cep" && cleanValue.length === 8) {
        if (!validateCEP(value)) {
          toast.error("CEP inválido");
        } else {
          handleCEPLookup(value);
        }
      }
    };
    
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={field.id}
            placeholder="..."
            value={value}
            onChange={(e) => handleCompanyFieldChange(e.target.value)}
            onBlur={handleCompanyFieldBlur}
            required={field.required}
            className={fieldErrors[field.id] ? "border-red-500" : ""}
          />
        );
      case "select":
        return (
          <Select value={value} onValueChange={(val) => handleCompanyFieldChange(val)}>
            <SelectTrigger className={fieldErrors[field.id] ? "border-red-500" : ""}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
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
              onCheckedChange={(checked) => handleCompanyFieldChange(String(checked))}
            />
            <label htmlFor={field.id} className="text-sm">Sim</label>
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
              onChange={(e) => handleCompanyFieldChange(e.target.value)}
              onBlur={handleCompanyFieldBlur}
              required={field.required}
              className={fieldErrors[field.id] ? "border-red-500" : ""}
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
        } else {
          // Só verificar duplicidade se o email for válido
          if (field.id === "email") {
            checkDuplicate('email', value);
          }
        }
      }
      
      // Validar telefone/WhatsApp ao sair do campo
      if ((field.id === "phone" || field.type === "phone") && value) {
        if (!validateWhatsApp(value)) {
          setFieldErrors(prev => ({ ...prev, [field.id]: "WhatsApp inválido" }));
          toast.error("WhatsApp deve estar no formato +55 (XX) XXXXX-XXXX");
        } else {
          // Só verificar duplicidade se o telefone for válido
          if (field.id === "phone") {
            checkDuplicate('phone', value);
          }
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
    
    // Validar campos obrigatórios de contato com base na configuração
    const requiredContactFieldIds = contactFields
      .filter(f => f.required)
      .map(f => f.id);
    
    requiredContactFieldIds.forEach(field => {
      if (!formData[field]?.toString().trim()) {
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

    // Se tem empresa sendo criada, validar campos da empresa com base na configuração
    if (criarNovaEmpresa) {
      const requiredCompanyFieldIds = companyFields
        .filter(f => f.required)
        .map(f => f.id);
      
      requiredCompanyFieldIds.forEach(field => {
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

      // Checagem de duplicidade no banco de dados antes de salvar
      const emailLower = (formData.email || '').toLowerCase().trim();
      const phoneClean = (formData.phone || '').replace(/\D/g, '');
      
      // Verificar duplicidade de e-mail no banco
      if (emailLower) {
        const { data: existingByEmail, error: emailError } = await supabase
          .from('customers')
          .select('id, nome, email')
          .eq('estabelecimento_id', estabId)
          .ilike('email', emailLower);
        
        // Filtrar para excluir o contato atual (se estiver editando)
        const duplicateEmail = existingByEmail?.find(c => c.id !== editingContact?.id);
        
        if (duplicateEmail) {
          setDuplicateContact(duplicateEmail as any);
          setDuplicateField('email');
          setDuplicateDialogOpen(true);
          toast.error('E-mail já cadastrado em outro contato');
          return;
        }
      }

      // Verificar duplicidade de WhatsApp no banco
      if (phoneClean && phoneClean.length >= 8) {
        // Buscar todos os contatos e verificar manualmente para maior precisão
        const { data: allContacts, error: phoneError } = await supabase
          .from('customers')
          .select('id, nome, telefone, tel')
          .eq('estabelecimento_id', estabId);
        
        // Verificar se algum contato tem o mesmo telefone (limpando os caracteres)
        const duplicatePhone = allContacts?.find(c => {
          if (c.id === editingContact?.id) return false;
          const existingPhone = (c.telefone || '').replace(/\D/g, '');
          const existingTel = (c.tel || '').replace(/\D/g, '');
          return existingPhone === phoneClean || existingTel === phoneClean;
        });
        
        if (duplicatePhone) {
          setDuplicateContact(duplicatePhone as any);
          setDuplicateField('phone');
          setDuplicateDialogOpen(true);
          toast.error('WhatsApp já cadastrado em outro contato');
          return;
        }
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
          bairro: formData.neighborhood,
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

        // Geocodificar e salvar coordenadas automaticamente
        if (novaEmpresaId) {
          geocodeAndSaveEmpresa(
            supabase,
            novaEmpresaId,
            formData.address,
            formData.city,
            formData.state,
            formData.cep
          );
        }

        // Nota: empresa_vinculos agora só armazena segmentos, não usuários
        // O vínculo do usuário é feito no customer_vinculos do contato
      }

      // Preparar dados do contato
      const contatoPayload: any = {
        estabelecimento_id: estabId,
        nome: formData.name || '',
        telefone: formData.phone || '',
        tel: formData.tel || null,
        email: formData.email || '',
        empresa_id: null, // Mantém null pois usamos tabela de junção
        tipo_operador: empresasVinculadas.length > 0 ? true : false, // true = cliente, false = prospect
        custom_fields: {
          position: formData.position,
        },
        tags: [],
      };

      // Adicionar campos personalizados do contato
      contactFields.forEach((field) => {
        if (!['name', 'phone', 'tel', 'email', 'position'].includes(field.id)) {
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

        // Vincular automaticamente o contato ao usuário que criou
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('customer_vinculos').insert({
            customer_id: contatoId,
            estabelecimento_id: estabId,
            usuario_id: user.id
          });
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
      tel: contact.tel,
      email: contact.email,
      position: contact.position,
    };

    // Adicionar campos personalizados do contato
    contactFields.forEach(f => {
      if (!['name', 'phone', 'tel', 'email', 'position'].includes(f.id)) {
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
    setShouldCheckDuplicate(true);
    setIsClosingForm(false);
    setShowForm(true);
  };

  const [contactDeps, setContactDeps] = useState<Record<string, number> | null>(null);
  const [checkingDeps, setCheckingDeps] = useState(false);
  const [clearingDepKey, setClearingDepKey] = useState<string | null>(null);

  const refreshContactDeps = async (contactId: string) => {
    setCheckingDeps(true);
    try {
      const { data, error } = await supabase.rpc('check_customer_dependencies', { p_customer_id: contactId });
      if (error) throw error;
      setContactDeps((data as any) || {});
    } catch (e: any) {
      console.error('Erro ao verificar dependências:', e);
      const msg = e?.message || e?.details || e?.hint || 'erro desconhecido';
      toast.error(`Não foi possível verificar vínculos: ${msg}`);
      setContactDeps({});
    } finally {
      setCheckingDeps(false);
    }
  };

  const handleClearContactDep = async (depKey: string) => {
    if (!contactToDelete) return;
    setClearingDepKey(depKey);
    try {
      const { error } = await supabase.rpc('clear_entity_dependency', {
        p_entity: 'contato',
        p_id: contactToDelete.id,
        p_dep_key: depKey,
      });
      if (error) throw error;
      toast.success('Vínculo removido');
      await refreshContactDeps(contactToDelete.id);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao remover vínculo');
    } finally {
      setClearingDepKey(null);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    setContactToDelete(contact);
    setContactDeps(null);
    setDeleteDialogOpen(true);
    await refreshContactDeps(contactId);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    try {
      const { data, error } = await supabase
        .rpc('delete_customer_cascade', { p_customer_id: contactToDelete.id });
      if (error) throw error;
      if (data === false) throw new Error('Não foi possível excluir o contato.');
      await loadContacts();
      toast.success("Contato excluído com sucesso");
    } catch (e: any) {
      console.error('Erro ao excluir contato:', e);
      toast.error(e?.message || "Erro ao excluir contato");
    }
    setDeleteDialogOpen(false);
    setContactToDelete(null);
    setContactDeps(null);
  };

  const confirmInactivate = async () => {
    if (!contactToDelete) return;
    try {
      const { error } = await supabase.rpc('inactivate_customer', { p_customer_id: contactToDelete.id });
      if (error) throw error;
      await loadContacts();
      toast.success("Contato inativado");
    } catch (e: any) {
      console.error('Erro ao inativar contato:', e);
      toast.error(e?.message || "Erro ao inativar contato");
    }
    setDeleteDialogOpen(false);
    setContactToDelete(null);
    setContactDeps(null);
  };


  // Função para verificar duplicidade de WhatsApp ou Email
  const checkDuplicate = async (field: 'phone' | 'email', value: string) => {
    if (!value || !estabelecimentoId || !shouldCheckDuplicate || isClosingForm || isClosingRef.current) return;
    
    // Se estamos editando e o valor não mudou, não verificar
    if (editingContact && editingContact[field] === value) return;
    
    // Limpar o valor para comparação
    const cleanValue = field === 'phone' ? value.replace(/\D/g, '') : value.toLowerCase().trim();
    if (!cleanValue) return;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId);
      
      if (error) throw error;
      
      // Verificar se existe um contato com o mesmo valor
      const duplicate = data?.find(contact => {
        if (field === 'phone') {
          const contactPhone = contact.telefone?.replace(/\D/g, '');
          return contactPhone === cleanValue && contact.id !== editingContact?.id;
        } else {
          const contactEmail = contact.email?.toLowerCase().trim();
          return contactEmail === cleanValue && contact.id !== editingContact?.id;
        }
      });
      
      if (duplicate) {
        setDuplicateContact(duplicate);
        setDuplicateField(field);
        setDuplicateDialogOpen(true);
      }
    } catch (error) {
      console.error('Erro ao verificar duplicidade:', error);
    }
  };

  const loadDuplicateContact = async () => {
    if (!duplicateContact) return;
    
    // Carregar dados do contato duplicado no formulário
    const baseFormData: Record<string, any> = {
      name: duplicateContact.nome,
      phone: duplicateContact.telefone,
      tel: duplicateContact.tel || "",
      email: duplicateContact.email,
      position: duplicateContact.custom_fields?.position || "",
    };
    
    // Carregar campos customizados
    if (duplicateContact.custom_fields) {
      Object.keys(duplicateContact.custom_fields).forEach(key => {
        if (!['position'].includes(key)) {
          baseFormData[key] = duplicateContact.custom_fields[key];
        }
      });
    }
    
    setEditingContact({
      id: duplicateContact.id,
      name: duplicateContact.nome,
      phone: duplicateContact.telefone,
      tel: duplicateContact.tel || "",
      email: duplicateContact.email,
      position: duplicateContact.custom_fields?.position || "",
      customFields: duplicateContact.custom_fields || {},
      company: "",
      segmentos: [],
      active: true,
      createdAt: duplicateContact.created_at,
      responsible: "",
      tags: duplicateContact.tags || [],
      createdBy: "",
      modifiedAt: "",
      modifiedBy: ""
    });
    setFormData(baseFormData);
    
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
      .eq('customer_id', duplicateContact.id);
    
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
    
    setDuplicateDialogOpen(false);
    setDuplicateContact(null);
    setDuplicateField(null);
    
    toast.info(`Cadastro de ${duplicateContact.nome} carregado!`);
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
      } else if (editingCell.field === 'tel') {
        await supabase
          .from('customers')
          .update({ tel: trimmedValue })
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

    // Filtro cliente/prospect
    if (tipoContatoFilter === 'clientes' && contact.customFields?.tipo_operador === false) return false;
    if (tipoContatoFilter === 'prospects' && contact.customFields?.tipo_operador !== false) return false;


    
    // Busca unificada apenas em nome, telefone/WhatsApp e e-mail
    if (searchFilters.unifiedSearch) {
      const searchTerm = searchFilters.unifiedSearch.toLowerCase();
      
      const matchesSearch = 
        contact.name.toLowerCase().includes(searchTerm) ||
        contact.phone.includes(searchTerm) ||
        (contact.tel || '').includes(searchTerm) ||
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
      <div className="flex-1 flex h-full bg-gradient-to-br from-background to-muted/20">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b bg-card/80 backdrop-blur-sm px-3 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">Contatos</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Gerencie seus contatos e clientes</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {!hideAdminButtons && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowImportPanel(true)} 
                  className="gap-2 shadow-sm text-xs sm:text-sm h-9 sm:h-10"
                >
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                  Importação
                </Button>
              )}
              <Button onClick={() => {
                setShouldCheckDuplicate(true);
                setIsClosingForm(false);
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
              }} className="gap-2 shadow-sm text-xs sm:text-sm h-9 sm:h-10">
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                Novo Contato
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {!hideAdminButtons && (
              <TableColumnsConfig
                columns={tableColumns} 
                onColumnsChange={handleColumnsChange}
                fieldsConfigComponent={
                  estabelecimentoId ? (
                    <ContatoFieldsCRUD 
                      estabelecimentoId={estabelecimentoId} 
                      onChanged={async () => {
                        console.log('🔄 ContatoFieldsCRUD onChange triggered');
                        // Recarregar campos customizados no formulário
                        await loadContactFields(estabelecimentoId);
                        // Recarregar colunas da tabela
                        await loadTableColumns(estabelecimentoId);
                        // Recarregar lista de contatos
                        await loadContacts();
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
                  placeholder="Buscar contatos..."
                  value={searchFilters.unifiedSearch}
                  onChange={(e) => setSearchFilters({ ...searchFilters, unifiedSearch: e.target.value })}
                  className="pl-8 sm:pl-10 h-9 sm:h-10 border-border/40 focus-visible:ring-1 bg-background/50 text-xs sm:text-sm"
                />
              </div>
            </div>
            
            {searchFilters.unifiedSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchFilters({ ...searchFilters, unifiedSearch: "" })}
                className="gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Limpar</span>
              </Button>
            )}
            
            <Select value={tipoContatoFilter} onValueChange={(v: any) => setTipoContatoFilter(v)}>
              <SelectTrigger className="w-[180px] h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os contatos</SelectItem>
                <SelectItem value="clientes">Somente clientes</SelectItem>
                <SelectItem value="prospects">Somente prospects</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto text-xs sm:text-sm font-light text-muted-foreground whitespace-nowrap">
              {sortedContacts.length} {sortedContacts.length === 1 ? 'contato' : 'contatos'}
            </div>
          </div>
        </div>


        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          {sortedContacts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" />
                </div>
                <p className="text-base sm:text-lg font-light text-foreground mb-2">Nenhum contato encontrado</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Adicione seu primeiro contato para começar</p>
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
                  {sortedContacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-border/30 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 hover:shadow-sm transition-all duration-200 group">
                      {tableColumns.filter(col => col.visible).map((column, index) => {
                        if (column.id === 'actions') {
                          return (
                            <td key="actions" className="p-3 sticky left-0 bg-gradient-to-l from-background via-background to-background/95 border-r border-border/30 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)] transition-all duration-200">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`h-8 px-2 rounded-full transition-all duration-200 ${
                                    selectedContact?.id === contact.id 
                                      ? 'bg-primary text-primary-foreground border-primary' 
                                      : 'hover:bg-primary/10 border-primary/20'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedContact(selectedContact?.id === contact.id ? null : contact);
                                  }}
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-200 border-primary/20"
                                  onClick={async () => {
                                    setEditingContact(contact);
                                    setFormData({
                                      name: contact.name,
                                      phone: contact.phone,
                                      tel: contact.tel,
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
                                    
                                    setShouldCheckDuplicate(true);
                                    setIsClosingForm(false);
                                    setShowForm(true);
                                  }}
                                  title="Editar cadastro completo"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 border-destructive/20"
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
                                {column.id === 'tel' && (contact.tel || "-")}
                                {column.id === 'email' && contact.email}
                                {column.id === 'position' && (contact.position || "-")}
                                {!['name', 'phone', 'tel', 'email', 'position'].includes(column.id) && (contact.customFields?.[column.id] || "-")}
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
                                  else if (column.id === 'tel') value = contact.tel || "";
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
              <AlertDialogTitle>
                {contactDeps && Object.keys(contactDeps).length > 0
                  ? 'Contato em uso no sistema'
                  : 'Confirmar exclusão'}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  {checkingDeps ? (
                    <div>Verificando vínculos de <strong>{contactToDelete?.name}</strong>...</div>
                  ) : contactDeps && Object.keys(contactDeps).length > 0 ? (
                    <>
                      <div>
                        O contato <strong>{contactToDelete?.name}</strong> está sendo utilizado no sistema. Remova os vínculos abaixo para liberar a exclusão. Vínculos de <strong>orçamentos</strong> são protegidos — nesse caso use <strong>Inativar</strong>.
                      </div>
                      <div className="rounded-md border bg-muted/40 divide-y max-h-72 overflow-y-auto">
                        {Object.entries(contactDeps).map(([k, v]) => {
                          const labels: Record<string, string> = {
                            conversas: 'Conversas / Atendimentos',
                            mensagens: 'Mensagens',
                            orcamentos: 'Orçamentos',
                            pedidos_ecommerce: 'Pedidos do e-commerce',
                            negociacoes_funil: 'Negociações do funil',
                            tickets_portal: 'Tickets do portal',
                            tarefas_agenda: 'Tarefas da agenda',
                            envio_massa: 'Envios em massa',
                            vendas_atribuidas: 'Vendas atribuídas',
                            respostas_pesquisa: 'Respostas de pesquisa',
                            carrinhos_ativos: 'Carrinhos ativos',
                          };
                          const isProtected = /or[çc]amento/i.test(k);
                          return (
                            <div key={k} className="flex items-center justify-between gap-2 p-2 text-sm">
                              <span className="flex-1 truncate">{labels[k] || k}</span>
                              <span className="font-mono font-semibold min-w-[2rem] text-right">{v as number}</span>
                              {isProtected ? (
                                <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold px-2">Protegido</span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-destructive hover:bg-destructive/10"
                                  disabled={!!clearingDepKey}
                                  onClick={() => handleClearContactDep(k)}
                                >
                                  {clearingDepKey === k ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3 mr-1" />
                                  )}
                                  Excluir vínculos
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div>
                      Tem certeza que deseja excluir o contato <strong>{contactToDelete?.name}</strong>? Nenhum vínculo foi encontrado.
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              {!checkingDeps && contactDeps && Object.keys(contactDeps).length > 0 ? (
                <AlertDialogAction onClick={confirmInactivate}>
                  Inativar contato
                </AlertDialogAction>
              ) : (
                <AlertDialogAction onClick={confirmDelete} disabled={checkingDeps}>
                  Excluir
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        {/* Confirmação de exclusão de campo personalizado */}
        <AlertDialog open={!!fieldToDelete} onOpenChange={(o) => !o && setFieldToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir campo personalizado</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o campo <strong>{fieldToDelete?.label}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRemoveField}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de contato duplicado */}
        <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Contato já cadastrado</AlertDialogTitle>
              <AlertDialogDescription>
                Já existe um contato cadastrado com este {duplicateField === 'phone' ? 'WhatsApp' : 'e-mail'}:
                <br /><br />
                <strong>{duplicateContact?.nome}</strong>
                <br />
                WhatsApp: {duplicateContact?.telefone}
                <br />
                E-mail: {duplicateContact?.email}
                <br /><br />
                Deseja carregar o cadastro existente?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDuplicateDialogOpen(false);
                setDuplicateContact(null);
                setDuplicateField(null);
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={loadDuplicateContact}>
                Sim, carregar cadastro
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Panel de Importação - dentro do bloco !showForm */}
        <Dialog open={showImportPanel} onOpenChange={setShowImportPanel}>
          <DialogContent className="max-w-[95vw] sm:max-w-[900px] max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Importar Empresas e Contatos</DialogTitle>
              <DialogDescription>
                Importe múltiplos contatos através de arquivo Excel/CSV ou integração com API
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              <Tabs defaultValue="arquivo" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="arquivo">Por Arquivo</TabsTrigger>
                  <TabsTrigger value="api">Por API</TabsTrigger>
                </TabsList>

                <TabsContent value="arquivo">
                  <ImportContatosWizard 
                    onClose={() => setShowImportPanel(false)}
                    onImportComplete={async () => {
                      await loadContacts();
                    }}
                  />
                </TabsContent>

                <TabsContent value="api">
                  <APIImportDialog />
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
        </div>

        {/* Painel lateral de detalhes do contato */}
        {selectedContact && (
          <ContatoDetailsPanel
            contato={selectedContact}
            onClose={() => setSelectedContact(null)}
            onEditContato={async (contatoId) => {
              const contact = contacts.find(c => c.id === contatoId);
              if (contact) {
                setEditingContact(contact);
                setFormData({
                  name: contact.name,
                  phone: contact.phone,
                  tel: contact.tel,
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
                
                setShouldCheckDuplicate(true);
                setIsClosingForm(false);
                setShowForm(true);
              }
            }}
            onCompaniesUpdated={() => loadContacts()}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="border-b bg-card/80 backdrop-blur-sm px-3 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onMouseDown={() => {
              // Garante que dispare antes do onBlur dos inputs
              setIsClosingForm(true);
              isClosingRef.current = true;
              setShouldCheckDuplicate(false);
            }}
            onClick={() => {
              setShowForm(false);
              setTimeout(() => {
                setIsClosingForm(false);
                isClosingRef.current = false;
                setShouldCheckDuplicate(true);
              }, 150);
            }}
            className="hover:bg-accent/50 h-8 w-8 sm:h-9 sm:w-9"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-foreground">
              {editingContact ? "Editar Contato" : "Novo Contato"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {editingContact ? "Atualize as informações do contato" : "Preencha os dados do novo contato"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-6 md:p-8">
        <Tabs defaultValue="contato" className="w-full max-w-6xl mx-auto">
          <TabsList className="bg-muted/30 border border-border/40 p-1 rounded-lg mb-4 sm:mb-6 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <TabsTrigger 
              value="contato"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              Dados do Contato
            </TabsTrigger>
            <TabsTrigger 
              value="empresa" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs sm:text-sm px-3 sm:px-4 py-2"
              onClick={() => setCriarNovaEmpresa(false)}
            >
              Empresa
            </TabsTrigger>
            <TabsTrigger 
              value="vinculos"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              Vínculos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contato" className="space-y-4 sm:space-y-6">
            <Card className="border-border/40 shadow-sm">
              <div className="p-3 sm:p-4 md:p-6">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-4 sm:mb-6 uppercase tracking-wide">
                  Informações do Contato
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {contactFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label 
                        htmlFor={field.id} 
                        className={`text-sm font-medium ${
                          field.id === 'name' || field.id === 'phone' 
                            ? 'text-primary font-semibold text-base' 
                            : 'text-foreground'
                        }`}
                      >
                        {field.label} {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                    <div className={field.id === 'name' || field.id === 'phone' ? 'ring-2 ring-primary/30 rounded-md' : ''}>
                      {renderField(field)}
                    </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onMouseDown={() => {
                  // Previne verificação de duplicidade no blur ao cancelar
                  setIsClosingForm(true);
                  isClosingRef.current = true;
                  setShouldCheckDuplicate(false);
                }}
                onClick={() => {
                  setShowForm(false);
                  setTimeout(() => {
                    setIsClosingForm(false);
                    isClosingRef.current = false;
                    setShouldCheckDuplicate(true);
                  }, 150);
                }}
                className="border-border/40"
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveContact} className="shadow-sm">
                Salvar
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
                      setCriarNovaEmpresa(true);
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

            {/* Formulário de Nova Empresa - igual à tela de Empresas */}
            {criarNovaEmpresa && (
              <Card className="p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Cadastrar Empresa
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setCriarNovaEmpresa(false);
                      setFormData(prev => {
                        const newData = { ...prev };
                        companyFields.forEach(field => {
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
                        {renderCompanyField(field)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onMouseDown={() => {
                  setIsClosingForm(true);
                  isClosingRef.current = true;
                  setShouldCheckDuplicate(false);
                }}
                onClick={() => {
                  setShowForm(false);
                  setTimeout(() => {
                    setIsClosingForm(false);
                    isClosingRef.current = false;
                    setShouldCheckDuplicate(true);
                  }, 150);
                }}
                className="border-border/40"
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveContact} className="shadow-sm">
                Salvar
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="vinculos" className="p-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Vínculos do Contato</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Gerencie os usuários responsáveis por este contato.
                  </p>
                </div>

                {editingContact ? (() => {
                  const vinculosDoContato = vinculos.filter(v => v.customer_id === editingContact.id);
                  const vinculosUsuarios = vinculosDoContato.filter(v => v.usuario_id !== null);

                  return (
                    <div className="space-y-4">
                      {/* Adicionar novos usuários */}
                      <Card className="border-primary/20 bg-primary/5">
                          <CardContent className="p-4 space-y-4">
                            <h4 className="text-sm font-semibold">Adicionar Usuários</h4>
                            
                            <div className="space-y-2">
                              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-2 bg-background">
                                {usuarios.map((usuario) => (
                                  <div key={usuario.id} className="flex items-center space-x-2 p-1.5 hover:bg-accent/50 rounded">
                                    <Checkbox
                                      id={`new-user-${usuario.id}`}
                                      checked={novosUsuariosVinculo.includes(usuario.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setNovosUsuariosVinculo([...novosUsuariosVinculo, usuario.id]);
                                        } else {
                                          setNovosUsuariosVinculo(novosUsuariosVinculo.filter(id => id !== usuario.id));
                                        }
                                      }}
                                    />
                                    <label htmlFor={`new-user-${usuario.id}`} className="text-sm cursor-pointer flex-1">
                                      {usuario.nome}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <Button 
                              onClick={async () => {
                                if (novosUsuariosVinculo.length === 0) {
                                  toast.error("Selecione pelo menos um usuário");
                                  return;
                                }
                                await handleAdicionarVinculo();
                              }} 
                              className="w-full" 
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar Usuários Selecionados
                            </Button>
                          </CardContent>
                        </Card>

                        {/* Lista de usuários vinculados */}
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Usuários Vinculados</h4>
                          {vinculosUsuarios.length > 0 ? (
                            <div className="space-y-2">
                              {vinculosUsuarios.map((vinculo) => {
                                const usuario = usuarios.find(u => u.id === vinculo.usuario_id);

                                return (
                                  <div key={vinculo.id} className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between group hover:border-primary/30 transition-colors">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">
                                        {usuario?.nome || <span className="text-muted-foreground">Usuário não encontrado</span>}
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
                              <p className="text-sm text-muted-foreground">Nenhum usuário vinculado</p>
                            </div>
                          )}
                        </div>
                    </div>
                  );
                })() : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Salve o contato primeiro para gerenciar os vínculos.
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
        </Tabs>
      </div>

      {/* Panel de Importação */}
      <Dialog open={showImportPanel} onOpenChange={setShowImportPanel}>
        <DialogContent className="max-w-[95vw] sm:max-w-[900px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Importar Empresas e Contatos</DialogTitle>
            <DialogDescription>
              Importe múltiplos contatos através de arquivo Excel/CSV ou integração com API
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <Tabs defaultValue="arquivo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="arquivo">Por Arquivo</TabsTrigger>
                <TabsTrigger value="api">Por API</TabsTrigger>
              </TabsList>

              <TabsContent value="arquivo">
                <ImportContatosWizard 
                  onClose={() => setShowImportPanel(false)}
                  onImportComplete={async () => {
                    await loadContacts();
                  }}
                />
              </TabsContent>

              <TabsContent value="api">
                <APIImportDialog />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
