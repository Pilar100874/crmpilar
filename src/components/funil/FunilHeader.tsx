import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Filter,
  Zap,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FunilHeaderProps {
  leadsAtivos: number;
  totalValue: number;
  onNewLead: () => void;
  onSearch: (query: string) => void;
  onFilterChange: (filters: any) => void;
  onConfigureStages: () => void;
}

export function FunilHeader({
  leadsAtivos,
  totalValue,
  onNewLead,
  onSearch,
  onFilterChange,
  onConfigureStages,
}: FunilHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Linha principal */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Título e status */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 text-lg font-bold">
                FUNIL DE VENDAS
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Funil Principal</DropdownMenuItem>
              <DropdownMenuItem>Funil de Renovação</DropdownMenuItem>
              <DropdownMenuItem>Funil de Upsell</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <span className="font-semibold">{leadsAtivos}</span> Leads
            </Badge>
            <Badge className="gap-1 bg-primary">
              <span className="font-semibold">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
            </Badge>
          </div>
        </div>

        {/* Ações principais */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </Button>

          <Button variant="outline" size="sm" className="gap-2">
            <Zap className="w-4 h-4" />
            AUTOMATIZE
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Exportar funil</DropdownMenuItem>
              <DropdownMenuItem onClick={onConfigureStages}>
                Configurar etapas
              </DropdownMenuItem>
              <DropdownMenuItem>Relatórios</DropdownMenuItem>
              <DropdownMenuItem>Playbooks</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button className="gap-2" onClick={onNewLead}>
            <Plus className="w-4 h-4" />
            NOVO LEAD
          </Button>
        </div>
      </div>

      {/* Busca e filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Busca e filtro"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {showFilters && (
          <>
            <Select onValueChange={(value) => onFilterChange({ responsavel: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="marcos">Marcos</SelectItem>
                <SelectItem value="joao">João</SelectItem>
                <SelectItem value="maria">Maria</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => onFilterChange({ origem: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="site">Site</SelectItem>
                <SelectItem value="indicacao">Indicação</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => onFilterChange({ status: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="parado">Parado</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </div>
  );
}
