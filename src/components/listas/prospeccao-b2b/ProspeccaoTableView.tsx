import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Download, 
  Send, 
  MoreHorizontal, 
  ExternalLink,
  Phone,
  Globe,
  Star,
  Trash2,
  ArrowUpDown,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { ProspectB2B } from './types';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

interface ProspeccaoTableViewProps {
  prospects: ProspectB2B[];
  loading: boolean;
  updateProspectStatus: (id: string, status: string) => Promise<void>;
  deleteProspect: (id: string) => Promise<void>;
  importarParaEmpresas?: (ids: string[]) => Promise<{ ok: number; fail: number; jaImportados: number }>;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  contatado: { label: 'Contatado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  qualificado: { label: 'Qualificado', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  nao_interessado: { label: 'Não interessado', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  cliente: { label: 'Cliente', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' }
};

const ProspeccaoTableView: React.FC<ProspeccaoTableViewProps> = ({
  prospects,
  loading,
  updateProspectStatus,
  deleteProspect,
  importarParaEmpresas
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'nome' | 'rating' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  const filteredProspects = useMemo(() => {
    let result = [...prospects];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(p =>
        p.nome.toLowerCase().includes(searchLower) ||
        p.cidade?.toLowerCase().includes(searchLower) ||
        p.categoria?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status_lead === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'nome':
          comparison = a.nome.localeCompare(b.nome);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'created_at':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [prospects, search, statusFilter, sortBy, sortOrder]);

  const exportToExcel = () => {
    const data = filteredProspects.map(p => ({
      Nome: p.nome,
      Categoria: p.categoria,
      Endereço: p.endereco_completo,
      Cidade: p.cidade,
      Estado: p.estado,
      CEP: p.cep,
      Telefone: p.telefone,
      Website: p.website,
      Rating: p.rating,
      Avaliações: p.total_avaliacoes,
      Status: statusLabels[p.status_lead || 'novo']?.label,
      'Google Maps': p.google_maps_link,
      Fonte: p.fonte_dados
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prospects');
    XLSX.writeFile(wb, `prospects_b2b_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ title: 'Exportado', description: `${data.length} prospects exportados para Excel` });
  };

  const exportToCSV = () => {
    const data = filteredProspects.map(p => ({
      Nome: p.nome,
      Categoria: p.categoria,
      Endereço: p.endereco_completo,
      Cidade: p.cidade,
      Estado: p.estado,
      Telefone: p.telefone,
      Website: p.website,
      Rating: p.rating,
      Status: statusLabels[p.status_lead || 'novo']?.label
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prospects_b2b_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({ title: 'Exportado', description: `${data.length} prospects exportados para CSV` });
  };

  const sendWebhook = async () => {
    const webhookUrl = prompt('Digite a URL do webhook:');
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: filteredProspects })
      });
      toast({ title: 'Enviado', description: 'Dados enviados via webhook' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao enviar webhook', variant: 'destructive' });
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <CardTitle className="flex items-center gap-2">
            Prospects ({filteredProspects.length})
          </CardTitle>
          
          <div className="flex gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportToCSV}>
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel}>
                  Exportar Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={sendWebhook}>
              <Send className="h-4 w-4 mr-2" />
              Webhook
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cidade ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusLabels).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort('nome')}
                >
                  <div className="flex items-center gap-1">
                    Nome
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort('rating')}
                >
                  <div className="flex items-center gap-1">
                    Rating
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredProspects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum prospect encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredProspects.map((prospect) => (
                  <TableRow key={prospect.id}>
                    <TableCell>
                      <div className="font-medium">{prospect.nome}</div>
                      {prospect.endereco_completo && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {prospect.endereco_completo}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {prospect.categoria?.split(',')[0]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {prospect.cidade && (
                        <span className="text-sm">
                          {prospect.cidade}{prospect.estado && ` - ${prospect.estado}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {prospect.telefone && (
                          <a href={`tel:${prospect.telefone}`} className="text-primary">
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {prospect.website && (
                          <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-primary">
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        {prospect.google_maps_link && (
                          <a href={prospect.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-primary">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {prospect.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{prospect.rating}</span>
                          <span className="text-xs text-muted-foreground">
                            ({prospect.total_avaliacoes})
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={prospect.status_lead || 'novo'}
                        onValueChange={(value) => updateProspectStatus(prospect.id, value)}
                      >
                        <SelectTrigger className="h-7 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {prospect.google_maps_link && (
                            <DropdownMenuItem asChild>
                              <a href={prospect.google_maps_link} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver no Google Maps
                              </a>
                            </DropdownMenuItem>
                          )}
                          {importarParaEmpresas && (
                            (prospect as any).empresa_id ? (
                              <DropdownMenuItem disabled>
                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                                Já importado no CRM
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => importarParaEmpresas([prospect.id])}>
                                <Building2 className="h-4 w-4 mr-2" />
                                Importar para Empresas (prospect)
                              </DropdownMenuItem>
                            )
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteProspect(prospect.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProspeccaoTableView;
