import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  X,
  LucideIcon,
  Search,
  Phone,
  Mail,
  Loader2,
  Plus,
  Pencil,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

// Import existing components
import Contatos from '@/pages/Contatos';
import Empresas from '@/pages/Empresas';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const tabItems: TabItem[] = [
  { id: 'contatos', label: 'Contatos', icon: User, description: 'Gestão de contatos' },
  { id: 'empresas', label: 'Empresas', icon: Building2, description: 'Gestão de empresas' },
];

interface ListasPanelProps {
  onClose: () => void;
  title?: string;
  description?: string;
  defaultTab?: 'contatos' | 'empresas';
}

type TabId = 'contatos' | 'empresas';

interface SearchResult {
  id: string;
  tipo: 'contato' | 'empresa';
  nome: string;
  telefone?: string;
  email?: string;
  cnpj?: string;
}

export function ListasPanel({
  onClose,
  title = "Puxar ou criar cadastro",
  description = "Gerencie contatos e empresas",
  defaultTab = 'contatos'
}: ListasPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; tipo: 'contato' | 'empresa' } | null>(null);

  const estabelecimentoId = localStorage.getItem('estabelecimentoId');

  const currentTabItem = tabItems.find(t => t.id === activeTab);

  // Debounced search
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const performSearch = async (term: string) => {
    if (!estabelecimentoId) return;
    
    setIsSearching(true);
    try {
      const searchValue = term.toLowerCase().trim();
      const results: SearchResult[] = [];

      // Search contacts
      const { data: contatos } = await supabase
        .from('customers')
        .select('id, nome, telefone, email, tel')
        .eq('estabelecimento_id', estabelecimentoId)
        .or(`nome.ilike.%${searchValue}%,telefone.ilike.%${searchValue}%,email.ilike.%${searchValue}%,tel.ilike.%${searchValue}%`)
        .limit(10);

      if (contatos) {
        contatos.forEach(c => {
          results.push({
            id: c.id,
            tipo: 'contato',
            nome: c.nome,
            telefone: c.telefone || c.tel,
            email: c.email
          });
        });
      }

      // Search companies
      const { data: empresas } = await supabase
        .from('empresas')
        .select('id, nome, nome_fantasia, cnpj, telefone, email')
        .eq('estabelecimento_id', estabelecimentoId)
        .or(`nome.ilike.%${searchValue}%,nome_fantasia.ilike.%${searchValue}%,cnpj.ilike.%${searchValue}%,telefone.ilike.%${searchValue}%,email.ilike.%${searchValue}%`)
        .limit(10);

      if (empresas) {
        empresas.forEach(e => {
          results.push({
            id: e.id,
            tipo: 'empresa',
            nome: e.nome_fantasia || e.nome || 'Sem nome',
            telefone: e.telefone,
            email: e.email,
            cnpj: e.cnpj
          });
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Erro ao pesquisar:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEditResult = (result: SearchResult) => {
    setEditingItem({ id: result.id, tipo: result.tipo });
    if (result.tipo === 'contato') {
      setActiveTab('contatos');
    } else {
      setActiveTab('empresas');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'contatos':
        return <Contatos hideAdminButtons />;
      case 'empresas':
        return <Empresas hideAdminButtons />;
      default:
        return null;
    }
  };

  // Tela inicial com botões de seleção e busca
  if (!activeTab) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header minimalista */}
        <div className="border-b border-border/50 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-medium text-foreground truncate">
              {title}
            </h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="h-8 w-8 rounded-full hover:bg-muted shrink-0 ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <div className="p-3 sm:p-4 space-y-4">
            {/* Botões criar */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 sm:py-4 flex flex-col items-center gap-1.5 sm:gap-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => {
                  setEditingItem(null);
                  setActiveTab('contatos');
                }}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Novo Contato</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 sm:py-4 flex flex-col items-center gap-1.5 sm:gap-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => {
                  setEditingItem(null);
                  setActiveTab('empresas');
                }}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Nova Empresa</span>
              </Button>
            </div>

            {/* Divider com texto */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">ou busque existente</span>
              </div>
            </div>

            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Nome, telefone, CNPJ, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9 h-10 sm:h-11 bg-muted/30 border-border/50 focus:bg-background transition-colors"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
            </div>

            {/* Resultados da busca */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {searchResults.length} resultado(s)
                </p>
                <div className="space-y-1.5">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.tipo}-${result.id}`}
                      className="w-full p-2.5 sm:p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all text-left group"
                      onClick={() => handleEditResult(result)}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className={cn(
                          "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                          result.tipo === 'contato' ? 'bg-blue-500/10' : 'bg-amber-500/10'
                        )}>
                          {result.tipo === 'contato' ? (
                            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{result.nome}</span>
                            <Badge 
                              variant="secondary" 
                              className="text-[10px] px-1.5 py-0 h-4 shrink-0 hidden sm:inline-flex"
                            >
                              {result.tipo === 'contato' ? 'Contato' : 'Empresa'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            {result.telefone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span className="truncate max-w-[100px] sm:max-w-none">{result.telefone}</span>
                              </span>
                            )}
                            {result.email && (
                              <span className="flex items-center gap-1 hidden sm:flex">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[120px]">{result.email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state - sem busca */}
            {searchResults.length === 0 && searchTerm.length < 2 && (
              <div className="py-8 sm:py-12 text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Search className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Busque contatos ou empresas
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Por nome, telefone, email ou CNPJ
                </p>
              </div>
            )}

            {/* Empty state - sem resultados */}
            {searchResults.length === 0 && searchTerm.length >= 2 && !isSearching && (
              <div className="py-8 sm:py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum resultado para "{searchTerm}"
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Crie um novo cadastro acima
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tela com conteúdo selecionado
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header minimalista */}
      <div className="border-b border-border/50 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 shrink-0">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => {
            setActiveTab(null);
            setEditingItem(null);
          }}
          className="h-8 w-8 rounded-full hover:bg-muted shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn(
            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0",
            activeTab === 'contatos' ? 'bg-blue-500/10' : 'bg-amber-500/10'
          )}>
            {currentTabItem && (
              <currentTabItem.icon className={cn(
                "h-3.5 w-3.5 sm:h-4 sm:w-4",
                activeTab === 'contatos' ? 'text-blue-500' : 'text-amber-500'
              )} />
            )}
          </div>
          <span className="font-medium text-sm sm:text-base truncate">
            {editingItem ? `Editar ${currentTabItem?.label?.slice(0, -1)}` : `Novo ${currentTabItem?.label?.slice(0, -1)}`}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="h-8 w-8 rounded-full hover:bg-muted shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto min-h-0">
        <ScrollArea className="h-full">
          <div className="p-2 sm:p-4">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
