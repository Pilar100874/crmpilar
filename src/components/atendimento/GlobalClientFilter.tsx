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
  email: string | null;
}

export interface GlobalFilter {
  type: 'customer' | 'empresa';
  id: string;
  nome: string;
  email?: string;
}

interface GlobalClientFilterProps {
  activeFilter: GlobalFilter | null;
  onFilterChange: (filter: GlobalFilter | null) => void;
  compact?: boolean;
}

export function GlobalClientFilter({ activeFilter, onFilterChange, compact = false }: GlobalClientFilterProps) {
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
        .select('id, nome_fantasia, nome, cnpj, email')
        .eq('estabelecimento_id', estabId)
        .or(`nome_fantasia.ilike.%${searchTerm}%,nome.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
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
      nome: customer.nome,
      email: customer.email
    });
    setOpen(false);
    setSearchTerm("");
  };

  const handleSelectEmpresa = (empresa: Empresa) => {
    onFilterChange({
      type: 'empresa',
      id: empresa.id,
      nome: empresa.nome_fantasia || empresa.nome || 'Empresa',
      email: empresa.email || undefined
    });
    setOpen(false);
    setSearchTerm("");
  };

  const clearFilter = () => {
    onFilterChange(null);
  };

  // Compact mode - icon only with active indicator
  if (compact) {
    if (activeFilter) {
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 rounded-xl bg-primary/10 border-primary/30 hover:bg-primary/20 relative flex-shrink-0"
            >
              {activeFilter.type === 'customer' ? (
                <User className="h-5 w-5 text-primary" />
              ) : (
                <Building2 className="h-5 w-5 text-emerald-600" />
              )}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-32px)] sm:w-80 p-0 shadow-xl border-border/50 rounded-xl" align="end" sideOffset={8}>
            {/* Active filter info */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/30 rounded-t-xl">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 ${
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
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-muted-foreground block leading-tight">Filtrando por</span>
                <span className="font-semibold text-sm text-foreground truncate block">{activeFilter.nome}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); clearFilter(); setOpen(false); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Search for new filter */}
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Buscar outro contato..." 
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="border-0 h-11"
              />
              <CommandList className="max-h-[40vh]">
                {renderSearchResults()}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0 rounded-xl bg-card/80 dark:bg-card/80 hover:bg-card dark:hover:bg-card border-border/50 hover:border-primary/30 transition-all flex-shrink-0"
          >
            <UserSearch className="h-5 w-5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-32px)] sm:w-80 p-0 shadow-xl border-border/50 rounded-xl" align="end" sideOffset={8}>
          <div className="bg-gradient-to-r from-primary/10 to-transparent p-3 border-b border-border/30 rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Search className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Filtrar por Contato</p>
                <p className="text-[10px] text-muted-foreground">Filtre todas as abas</p>
              </div>
            </div>
          </div>
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Nome, telefone, email ou CNPJ..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="border-0 h-11"
            />
            <CommandList className="max-h-[40vh]">
              {renderSearchResults()}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // Full mode - original display
  if (activeFilter) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 mx-2 sm:mx-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 ${
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
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-muted-foreground block leading-tight">Filtrando</span>
          <span className="font-semibold text-xs text-foreground truncate block">{activeFilter.nome}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
          onClick={clearFilter}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Helper function to render search results
  function renderSearchResults() {
    return (
      <>
        {searchTerm.length < 2 && (
          <div className="py-6 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center">
              <UserSearch className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs text-muted-foreground">Digite ao menos 2 caracteres</p>
          </div>
        )}
        {searchTerm.length >= 2 && loading && (
          <div className="py-6 text-center">
            <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Buscando...</p>
          </div>
        )}
        {searchTerm.length >= 2 && !loading && customers.length === 0 && empresas.length === 0 && (
          <div className="py-6 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs text-muted-foreground">Nenhum resultado</p>
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
                className="flex items-center gap-3 cursor-pointer py-3 px-2 rounded-xl mx-1 hover:bg-primary/5 active:bg-primary/10"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm flex-shrink-0">
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
                className="flex items-center gap-3 cursor-pointer py-3 px-2 rounded-xl mx-1 hover:bg-emerald-50 active:bg-emerald-100"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center shadow-sm flex-shrink-0">
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
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-2 text-xs text-muted-foreground hover:text-foreground justify-start px-3 bg-card/80 dark:bg-card/80 hover:bg-card dark:hover:bg-card border border-border/50 rounded-xl transition-all hover:shadow-md hover:border-primary/30 w-[calc(100%-16px)] mx-2 sm:w-full sm:mx-0"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20 flex-shrink-0">
            <UserSearch className="h-4 w-4 text-primary" />
          </div>
          <span className="flex-1 text-left truncate">Filtrar por cliente ou empresa...</span>
          <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-32px)] sm:w-80 p-0 shadow-xl border-border/50 rounded-xl" align="center" sideOffset={8}>
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-3 border-b border-border/30 rounded-t-xl">
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
            className="border-0 h-11"
          />
          <CommandList className="max-h-[50vh] sm:max-h-[300px]">
            {renderSearchResults()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
