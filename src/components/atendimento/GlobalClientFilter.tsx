import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Filter, X, User, Building2, Search, Loader2, UserSearch } from "lucide-react";
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
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border-b border-primary/20 backdrop-blur-sm">
        <div className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
            activeFilter.type === 'customer' 
              ? 'bg-gradient-to-br from-primary to-primary/80' 
              : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
          }`}>
            {activeFilter.type === 'customer' ? (
              <User className="h-4 w-4 text-white" />
            ) : (
              <Building2 className="h-4 w-4 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground leading-tight">Filtrando por</span>
            <span className="font-semibold text-sm text-foreground leading-tight">{activeFilter.nome}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
          onClick={clearFilter}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-9 gap-2 text-xs text-muted-foreground hover:text-foreground justify-start px-3 bg-white/50 hover:bg-white border border-border/40 rounded-lg transition-all hover:shadow-sm hover:border-primary/30"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <UserSearch className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <span>Filtrar por cliente ou empresa...</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-xl border-border/50" align="start">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Buscar Contato</p>
              <p className="text-[10px] text-muted-foreground">Filtre todas as abas por cliente ou empresa</p>
            </div>
          </div>
        </div>
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Nome, telefone, email ou CNPJ..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="border-0"
          />
          <CommandList className="max-h-[300px]">
            {searchTerm.length < 2 && (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserSearch className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm text-muted-foreground">Digite ao menos 2 caracteres</p>
              </div>
            )}
            {searchTerm.length >= 2 && loading && (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Buscando...</p>
              </div>
            )}
            {searchTerm.length >= 2 && !loading && customers.length === 0 && empresas.length === 0 && (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <Search className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
              </div>
            )}
            {customers.length > 0 && (
              <CommandGroup heading={
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <User className="h-3 w-3" />
                  Contatos
                </span>
              }>
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => handleSelectCustomer(customer)}
                    className="flex items-center gap-3 cursor-pointer py-2.5 px-2 rounded-lg mx-1 hover:bg-primary/5"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{customer.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {customer.telefone || customer.email}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {empresas.length > 0 && (
              <CommandGroup heading={
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <Building2 className="h-3 w-3" />
                  Empresas
                </span>
              }>
                {empresas.map((empresa) => (
                  <CommandItem
                    key={empresa.id}
                    value={empresa.id}
                    onSelect={() => handleSelectEmpresa(empresa)}
                    className="flex items-center gap-3 cursor-pointer py-2.5 px-2 rounded-lg mx-1 hover:bg-emerald-50"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center shadow-sm">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {empresa.nome_fantasia || empresa.nome}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {empresa.cnpj || 'Sem CNPJ'}
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
