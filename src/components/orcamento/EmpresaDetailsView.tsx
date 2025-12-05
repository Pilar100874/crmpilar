import React, { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedDetailsPanel } from "@/components/atendimento/UnifiedDetailsPanel";
import { GlobalClientFilter, GlobalFilter } from "@/components/atendimento/GlobalClientFilter";

interface EmpresaDetailsViewProps {
  empresas: any[];
  selectedEmpresa: string;
  setSelectedEmpresa: (id: string) => void;
  globalFilter: GlobalFilter | null;
  setGlobalFilter: (filter: GlobalFilter | null) => void;
}

export function EmpresaDetailsView({
  empresas,
  selectedEmpresa,
  setSelectedEmpresa,
  globalFilter,
  setGlobalFilter
}: EmpresaDetailsViewProps) {
  const [empresaData, setEmpresaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Busca dados da empresa quando selectedEmpresa muda
  useEffect(() => {
    if (!selectedEmpresa) {
      setEmpresaData(null);
      return;
    }

    // Primeiro tenta encontrar na lista local
    const empresaLocal = empresas.find(e => e.id === selectedEmpresa);
    if (empresaLocal) {
      setEmpresaData(empresaLocal);
      return;
    }

    // Se não encontrou, busca do banco
    const fetchEmpresa = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', selectedEmpresa)
          .single();

        if (!error && data) {
          setEmpresaData(data);
        }
      } catch (err) {
        console.error('Erro ao buscar empresa:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [selectedEmpresa, empresas]);

  // Sincroniza o globalFilter quando selectedEmpresa muda externamente
  useEffect(() => {
    if (selectedEmpresa && empresaData && !globalFilter) {
      setGlobalFilter({
        type: 'empresa',
        id: empresaData.id,
        nome: empresaData.nome_fantasia || empresaData.nome || 'Empresa'
      });
    }
  }, [selectedEmpresa, empresaData]);

  const handleFilterChange = (filter: GlobalFilter | null) => {
    setGlobalFilter(filter);
    if (filter?.type === 'empresa' && filter.id) {
      setSelectedEmpresa(filter.id);
    } else if (!filter) {
      // Mantém a empresa selecionada atual mesmo quando limpa o filtro
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Global Client Filter */}
      <div className="p-3 border-b">
        <GlobalClientFilter
          activeFilter={globalFilter}
          onFilterChange={handleFilterChange}
        />
      </div>
      
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-6">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
        ) : empresaData ? (
          <UnifiedDetailsPanel
            type="orcamento"
            nome={empresaData.nome_fantasia || empresaData.nome || "Empresa"}
            telefone={empresaData.telefone}
            whatsapp={empresaData.telefone}
            email={empresaData.email}
            protocolo={empresaData.cnpj}
            status={empresaData.ativo !== false ? "Ativo" : "Inativo"}
            companies={[{ empresas: empresaData, is_primary: true }]}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-6">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {selectedEmpresa 
                  ? "Empresa não encontrada" 
                  : "Busque e selecione uma empresa"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
