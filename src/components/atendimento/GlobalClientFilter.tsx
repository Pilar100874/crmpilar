import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Filter, X, User, Building2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Customer {
  id: string;
  nome: string;
  telefone: string;
  email: string;
}

interface Empresa {
  id: string;
  nome_fantasia: string | null;
  nome: string | null;
  cnpj: string | null;
}

export interface GlobalFilter {
  type: 'customer' | 'empresa';
  id: string;
  nome: string;
}

interface GlobalClientFilterProps {
  activeFilter: GlobalFilter | null;
  onFilterChange: (filter: GlobalFilter | null) => void;
}

export function GlobalClientFilter({ activeFilter, onFilterChange }: GlobalClientFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchEntities();
    } else {
      setCustomers([]);
      setEmpresas([]);
    }
  }, [searchTerm]);

  const searchEntities = async () => {
    setLoading(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      // Search customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, nome, telefone, email')
        .eq('estabelecimento_id', estabId)
        .or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(5);

      // Search empresas
      const { data: empresasData } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, nome, cnpj')
        .eq('estabelecimento_id', estabId)
        .or(`nome_fantasia.ilike.%${searchTerm}%,nome.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%`)
        .limit(5);

      setCustomers(customersData || []);
      setEmpresas(empresasData || []);
    } catch (error) {
      console.error('Erro ao buscar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onFilterChange({
      type: 'customer',
      id: customer.id,
      nome: customer.nome
    });
    setOpen(false);
    setSearchTerm("");
  };

  const handleSelectEmpresa = (empresa: Empresa) => {
    onFilterChange({
      type: 'empresa',
      id: empresa.id,
      nome: empresa.nome_fantasia || empresa.nome || 'Empresa'
    });
    setOpen(false);
    setSearchTerm("");
  };

  const clearFilter = () => {
    onFilterChange(null);
  };

  if (activeFilter) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-primary/20">
        <Badge 
          variant="secondary" 
          className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/20 text-primary border-0"
        >
          {activeFilter.type === 'customer' ? (
            <User className="h-3 w-3" />
          ) : (
            <Building2 className="h-3 w-3" />
          )}
          <span className="font-medium text-xs">{activeFilter.nome}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 ml-1 hover:bg-primary/30 rounded-full"
            onClick={clearFilter}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
        <span className="text-xs text-muted-foreground">
          Filtrando todas as abas
        </span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Filter className="h-3.5 w-3.5" />
          Filtrar por cliente/empresa
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar contato ou empresa..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {searchTerm.length < 2 && (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                Digite ao menos 2 caracteres para buscar
              </CommandEmpty>
            )}
            {searchTerm.length >= 2 && loading && (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                Buscando...
              </CommandEmpty>
            )}
            {searchTerm.length >= 2 && !loading && customers.length === 0 && empresas.length === 0 && (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado
              </CommandEmpty>
            )}
            {customers.length > 0 && (
              <CommandGroup heading="Contatos">
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => handleSelectCustomer(customer)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{customer.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {customer.telefone || customer.email}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {empresas.length > 0 && (
              <CommandGroup heading="Empresas">
                {empresas.map((empresa) => (
                  <CommandItem
                    key={empresa.id}
                    value={empresa.id}
                    onSelect={() => handleSelectEmpresa(empresa)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {empresa.nome_fantasia || empresa.nome}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {empresa.cnpj}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
