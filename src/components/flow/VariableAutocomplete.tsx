import { useState, useEffect, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Variable, User, MessageSquare, Calendar, FileText, Map, Building, Phone, Mail } from "lucide-react";

interface VariableOption {
  value: string;
  label: string;
  category: string;
  icon?: any;
}

interface VariableAutocompleteProps {
  searchTerm: string;
  position: { top: number; left: number };
  onSelect: (variable: string) => void;
  onClose: () => void;
}

const getAvailableVariables = (): VariableOption[] => {
  return [
    // Variáveis do usuário
    { value: "{{nome}}", label: "Nome", category: "Usuário", icon: User },
    { value: "{{telefone}}", label: "Telefone", category: "Usuário", icon: Phone },
    { value: "{{email}}", label: "Email", category: "Usuário", icon: Mail },
    
    // Variáveis de CEP
    { value: "{{cep}}", label: "CEP", category: "Endereço", icon: Map },
    { value: "{{logradouro}}", label: "Logradouro", category: "Endereço", icon: Map },
    { value: "{{complemento}}", label: "Complemento", category: "Endereço", icon: Map },
    { value: "{{bairro}}", label: "Bairro", category: "Endereço", icon: Map },
    { value: "{{localidade}}", label: "Cidade", category: "Endereço", icon: Map },
    { value: "{{uf}}", label: "Estado (UF)", category: "Endereço", icon: Map },
    
    // Variáveis de CNPJ
    { value: "{{cnpj}}", label: "CNPJ", category: "Empresa", icon: Building },
    { value: "{{razao_social}}", label: "Razão Social", category: "Empresa", icon: Building },
    { value: "{{nome_fantasia}}", label: "Nome Fantasia", category: "Empresa", icon: Building },
    { value: "{{cnae_principal}}", label: "CNAE Principal", category: "Empresa", icon: Building },
    { value: "{{natureza_juridica}}", label: "Natureza Jurídica", category: "Empresa", icon: Building },
    { value: "{{porte}}", label: "Porte", category: "Empresa", icon: Building },
    { value: "{{capital_social}}", label: "Capital Social", category: "Empresa", icon: Building },
    { value: "{{regime_tributario}}", label: "Regime Tributário", category: "Empresa", icon: Building },
    { value: "{{data_abertura}}", label: "Data de Abertura", category: "Empresa", icon: Calendar },
    { value: "{{situacao}}", label: "Situação", category: "Empresa", icon: FileText },
    
    // Variáveis de endereço da empresa
    { value: "{{empresa_logradouro}}", label: "Logradouro (Empresa)", category: "Endereço Empresa", icon: Map },
    { value: "{{empresa_numero}}", label: "Número (Empresa)", category: "Endereço Empresa", icon: Map },
    { value: "{{empresa_complemento}}", label: "Complemento (Empresa)", category: "Endereço Empresa", icon: Map },
    { value: "{{empresa_bairro}}", label: "Bairro (Empresa)", category: "Endereço Empresa", icon: Map },
    { value: "{{empresa_municipio}}", label: "Município (Empresa)", category: "Endereço Empresa", icon: Map },
    { value: "{{empresa_uf}}", label: "UF (Empresa)", category: "Endereço Empresa", icon: Map },
    { value: "{{empresa_cep}}", label: "CEP (Empresa)", category: "Endereço Empresa", icon: Map },
    
    // Variáveis do sistema
    { value: "{{data_hoje}}", label: "Data de Hoje", category: "Sistema", icon: Calendar },
    { value: "{{hora_atual}}", label: "Hora Atual", category: "Sistema", icon: Calendar },
    { value: "{{conversa_id}}", label: "ID da Conversa", category: "Sistema", icon: MessageSquare },
  ];
};

export const VariableAutocomplete = ({ 
  searchTerm, 
  position, 
  onSelect, 
  onClose 
}: VariableAutocompleteProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  
  const allVariables = getAvailableVariables();
  
  // Filtrar variáveis baseado no termo de pesquisa
  const filteredVariables = searchTerm
    ? allVariables.filter((v) =>
        v.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allVariables;

  // Agrupar por categoria
  const groupedVariables = filteredVariables.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<string, VariableOption[]>);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredVariables.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredVariables[selectedIndex]) {
          onSelect(filteredVariables[selectedIndex].value);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, filteredVariables, onSelect, onClose]);

  if (filteredVariables.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute z-50 w-80 bg-popover border border-border rounded-lg shadow-lg"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <Command className="rounded-lg border-0">
        <CommandList ref={listRef} className="max-h-80">
          {Object.keys(groupedVariables).length === 0 ? (
            <CommandEmpty>Nenhuma variável encontrada.</CommandEmpty>
          ) : (
            Object.entries(groupedVariables).map(([category, variables]) => (
              <CommandGroup key={category} heading={category}>
                {variables.map((variable, index) => {
                  const globalIndex = filteredVariables.indexOf(variable);
                  const Icon = variable.icon || Variable;
                  return (
                    <CommandItem
                      key={variable.value}
                      value={variable.value}
                      onSelect={() => onSelect(variable.value)}
                      className={globalIndex === selectedIndex ? "bg-accent" : ""}
                    >
                      <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium">{variable.label}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {variable.value}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))
          )}
        </CommandList>
      </Command>
    </div>
  );
};
