import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  RefreshCw,
  Settings,
  Filter,
  MoreVertical,
  CheckSquare,
  Tag,
  Clock,
  Mail,
  MailOpen,
} from "lucide-react";

interface EmailToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCompose: () => void;
  onRefresh: () => void;
  onSettings: () => void;
  loading: boolean;
  unreadCount: number;
  totalCount: number;
  selectedCount: number;
  onMarkAsRead?: () => void;
  onMarkAsUnread?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export function EmailToolbar({
  searchQuery,
  onSearchChange,
  onCompose,
  onRefresh,
  onSettings,
  loading,
  unreadCount,
  totalCount,
  selectedCount,
  onMarkAsRead,
  onMarkAsUnread,
  onSelectAll,
  onDeselectAll,
}: EmailToolbarProps) {
  return (
    <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="p-3 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar emails..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-background/50"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Mail className="w-3 h-3" />
              {unreadCount} não lidos
            </Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            {totalCount} emails
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {selectedCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CheckSquare className="w-4 h-4" />
                  {selectedCount} selecionados
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onMarkAsRead}>
                  <MailOpen className="w-4 h-4 mr-2" />
                  Marcar como lido
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMarkAsUnread}>
                  <Mail className="w-4 h-4 mr-2" />
                  Marcar como não lido
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDeselectAll}>
                  Limpar seleção
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="default"
            onClick={onCompose}
            className="gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Escrever</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSelectAll}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Selecionar todos
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Filter className="w-4 h-4 mr-2" />
                Filtros avançados
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Tag className="w-4 h-4 mr-2" />
                Gerenciar etiquetas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSettings}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
