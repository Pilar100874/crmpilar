import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { Search, User, Building2, Plus, Phone, Mail, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom debounce hook
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

interface Customer {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo_operador?: boolean;
}

interface Empresa {
  id: string;
  nome: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
}

interface CustomerSearchCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: 'customer' | 'empresa', data: Customer | Empresa) => void;
  mode?: 'both' | 'customer' | 'empresa';
  title?: string;
  description?: string;
}

export function CustomerSearchCreateDialog({
  open,
  onOpenChange,
  onSelect,
  mode = 'both',
  title = "Selecionar Contato",
  description = "Busque um contato existente ou crie um novo"
}: CustomerSearchCreateDialogProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'create'>('search');
  const [searchType, setSearchType] = useState<'customer' | 'empresa'>(mode === 'empresa' ? 'empresa' : 'customer');
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounceValue(searchTerm, 300);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form states for creating new
  const [newCustomer, setNewCustomer] = useState({
    nome: "",
    telefone: "",
    email: ""
  });
  
  const [newEmpresa, setNewEmpresa] = useState({
    nome: "",
    nome_fantasia: "",
    cnpj: "",
    telefone: "",
    email: ""
  });

  // Search customers/empresas
  const searchContacts = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setCustomers([]);
      setEmpresas([]);
      return;
    }
    
    setLoading(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      if (mode !== 'empresa') {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, nome, email, telefone, tipo_operador')
          .eq('estabelecimento_id', estabId)
          .or(`nome.ilike.%${term}%,telefone.ilike.%${term}%,email.ilike.%${term}%`)
          .limit(20);

        if (!customersError && customersData) {
          setCustomers(customersData);
        }
      }

      if (mode !== 'customer') {
        const { data: empresasData, error: empresasError } = await supabase
          .from('empresas')
          .select('id, nome, nome_fantasia, cnpj, telefone, email')
          .eq('estabelecimento_id', estabId)
          .or(`nome.ilike.%${term}%,nome_fantasia.ilike.%${term}%,cnpj.ilike.%${term}%`)
          .limit(20);

        if (!empresasError && empresasData) {
          setEmpresas(empresasData);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar contatos:", error);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    searchContacts(debouncedSearch);
  }, [debouncedSearch, searchContacts]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setCustomers([]);
      setEmpresas([]);
      setActiveTab('search');
      setNewCustomer({ nome: "", telefone: "", email: "" });
      setNewEmpresa({ nome: "", nome_fantasia: "", cnpj: "", telefone: "", email: "" });
    }
  }, [open]);

  const handleCreateCustomer = async () => {
    if (!newCustomer.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setCreating(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .insert({
          estabelecimento_id: estabId,
          nome: newCustomer.nome.trim(),
          telefone: newCustomer.telefone.trim() || "",
          email: newCustomer.email.trim() || ""
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar contato: " + error.message);
        return;
      }

      toast.success("Contato criado com sucesso!");
      onSelect('customer', data);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar contato:", error);
      toast.error("Erro ao criar contato");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateEmpresa = async () => {
    if (!newEmpresa.nome?.trim() && !newEmpresa.nome_fantasia?.trim()) {
      toast.error("Nome ou Nome Fantasia é obrigatório");
      return;
    }

    setCreating(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      const { data, error } = await supabase
        .from('empresas')
        .insert({
          estabelecimento_id: estabId,
          nome: newEmpresa.nome.trim() || null,
          nome_fantasia: newEmpresa.nome_fantasia.trim() || null,
          cnpj: newEmpresa.cnpj.trim() || null,
          telefone: newEmpresa.telefone.trim() || null,
          email: newEmpresa.email.trim() || null
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar empresa: " + error.message);
        return;
      }

      toast.success("Empresa criada com sucesso!");
      onSelect('empresa', data);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar empresa:", error);
      toast.error("Erro ao criar empresa");
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = (type: 'customer' | 'empresa', data: Customer | Empresa) => {
    onSelect(type, data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'create')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Criar Novo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 mt-4">
            {/* Search Type Toggle */}
            {mode === 'both' && (
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <Button
                  size="sm"
                  variant={searchType === 'customer' ? "default" : "ghost"}
                  onClick={() => setSearchType('customer')}
                  className="flex-1"
                >
                  <User className="h-4 w-4 mr-2" />
                  Pessoas
                </Button>
                <Button
                  size="sm"
                  variant={searchType === 'empresa' ? "default" : "ghost"}
                  onClick={() => setSearchType('empresa')}
                  className="flex-1"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Empresas
                </Button>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Results */}
            <ScrollArea className="h-[300px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchTerm.length < 2 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Digite pelo menos 2 caracteres para buscar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Customer Results */}
                  {(mode !== 'empresa' && (searchType === 'customer' || mode === 'customer')) && customers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleSelect('customer', customer)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent hover:border-primary/30",
                        "flex items-start gap-3"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{customer.nome}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {customer.telefone && (
                            <Badge variant="outline" className="text-xs">
                              <Phone className="h-3 w-3 mr-1" />
                              {customer.telefone}
                            </Badge>
                          )}
                          {customer.email && (
                            <Badge variant="outline" className="text-xs">
                              <Mail className="h-3 w-3 mr-1" />
                              {customer.email}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empresa Results */}
                  {(mode !== 'customer' && (searchType === 'empresa' || mode === 'empresa')) && empresas.map((empresa) => (
                    <div
                      key={empresa.id}
                      onClick={() => handleSelect('empresa', empresa)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent hover:border-primary/30",
                        "flex items-start gap-3"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{empresa.nome_fantasia || empresa.nome}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {empresa.cnpj && (
                            <Badge variant="secondary" className="text-xs">
                              CNPJ: {empresa.cnpj}
                            </Badge>
                          )}
                          {empresa.telefone && (
                            <Badge variant="outline" className="text-xs">
                              <Phone className="h-3 w-3 mr-1" />
                              {empresa.telefone}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* No Results */}
                  {searchTerm.length >= 2 && 
                   ((searchType === 'customer' && customers.length === 0) ||
                    (searchType === 'empresa' && empresas.length === 0)) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum resultado encontrado</p>
                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => setActiveTab('create')}
                      >
                        Criar novo cadastro
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            {/* Create Type Toggle */}
            {mode === 'both' && (
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <Button
                  size="sm"
                  variant={searchType === 'customer' ? "default" : "ghost"}
                  onClick={() => setSearchType('customer')}
                  className="flex-1"
                >
                  <User className="h-4 w-4 mr-2" />
                  Pessoa
                </Button>
                <Button
                  size="sm"
                  variant={searchType === 'empresa' ? "default" : "ghost"}
                  onClick={() => setSearchType('empresa')}
                  className="flex-1"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Empresa
                </Button>
              </div>
            )}

            {/* Create Customer Form */}
            {(searchType === 'customer' || mode === 'customer') && mode !== 'empresa' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    placeholder="Nome completo"
                    value={newCustomer.nome}
                    onChange={(e) => setNewCustomer({ ...newCustomer, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    placeholder="(00) 00000-0000"
                    value={newCustomer.telefone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateCustomer}
                  disabled={creating || !newCustomer.nome.trim()}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Pessoa
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Create Empresa Form */}
            {(searchType === 'empresa' || mode === 'empresa') && mode !== 'customer' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="empresa-nome">Razão Social</Label>
                    <Input
                      id="empresa-nome"
                      placeholder="Razão Social"
                      value={newEmpresa.nome}
                      onChange={(e) => setNewEmpresa({ ...newEmpresa, nome: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="empresa-fantasia">Nome Fantasia *</Label>
                    <Input
                      id="empresa-fantasia"
                      placeholder="Nome Fantasia"
                      value={newEmpresa.nome_fantasia}
                      onChange={(e) => setNewEmpresa({ ...newEmpresa, nome_fantasia: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa-cnpj">CNPJ</Label>
                  <Input
                    id="empresa-cnpj"
                    placeholder="00.000.000/0000-00"
                    value={newEmpresa.cnpj}
                    onChange={(e) => setNewEmpresa({ ...newEmpresa, cnpj: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="empresa-telefone">Telefone</Label>
                    <Input
                      id="empresa-telefone"
                      placeholder="(00) 0000-0000"
                      value={newEmpresa.telefone}
                      onChange={(e) => setNewEmpresa({ ...newEmpresa, telefone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="empresa-email">E-mail</Label>
                    <Input
                      id="empresa-email"
                      type="email"
                      placeholder="email@empresa.com"
                      value={newEmpresa.email}
                      onChange={(e) => setNewEmpresa({ ...newEmpresa, email: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateEmpresa}
                  disabled={creating || (!newEmpresa.nome?.trim() && !newEmpresa.nome_fantasia?.trim())}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Empresa
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
