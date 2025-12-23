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
  Pencil
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
        {/* Header */}
        <div className="border-b bg-card px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-semibold">
              {title}
            </h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              {description}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Botões criar na parte superior */}
        <div className="px-4 pt-4 flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => {
              setEditingItem(null);
              setActiveTab('contatos');
            }}
          >
            <Plus className="h-4 w-4" />
            <User className="h-4 w-4" />
            Criar Contato
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => {
              setEditingItem(null);
              setActiveTab('empresas');
            }}
          >
            <Plus className="h-4 w-4" />
            <Building2 className="h-4 w-4" />
            Criar Empresa
          </Button>
        </div>

        {/* Campo de busca */}
        <div className="px-4 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, tel, WhatsApp, CNPJ, CPF, email, empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>
        </div>

        {/* Resultados da busca */}
        {searchResults.length > 0 && (
          <div className="px-4 pt-3 flex-1 overflow-auto">
            <p className="text-xs text-muted-foreground mb-2">{searchResults.length} resultado(s) encontrado(s)</p>
            <ScrollArea className="h-[calc(100%-24px)]">
              <div className="space-y-2 pb-4">
                {searchResults.map((result) => (
                  <div
                    key={`${result.tipo}-${result.id}`}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        result.tipo === 'contato' ? 'bg-blue-500/10' : 'bg-amber-500/10'
                      )}>
                        {result.tipo === 'contato' ? (
                          <User className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Building2 className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{result.nome}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {result.tipo === 'contato' ? 'Contato' : 'Empresa'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {result.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {result.telefone}
                            </span>
                          )}
                          {result.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" />
                              {result.email}
                            </span>
                          )}
                          {result.cnpj && (
                            <span className="text-xs">CNPJ: {result.cnpj}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5"
                        onClick={() => handleEditResult(result)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Mensagem quando não há busca */}
        {searchResults.length === 0 && searchTerm.length < 2 && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Digite para buscar contatos ou empresas</p>
              <p className="text-xs mt-1">Pesquise por nome, telefone, email, CNPJ...</p>
            </div>
          </div>
        )}

        {/* Mensagem quando não encontra resultados */}
        {searchResults.length === 0 && searchTerm.length >= 2 && !isSearching && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Nenhum resultado encontrado</p>
              <p className="text-xs mt-1">Tente outro termo ou crie um novo cadastro</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tela com conteúdo selecionado
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setActiveTab(null);
              setEditingItem(null);
            }}
            className="h-8 px-2"
          >
            ← Voltar
          </Button>
          <div>
            <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              {currentTabItem && <currentTabItem.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
              {editingItem ? `Editar ${currentTabItem?.label?.slice(0, -1)}` : `Novo ${currentTabItem?.label?.slice(0, -1)}`}
            </h2>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
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
