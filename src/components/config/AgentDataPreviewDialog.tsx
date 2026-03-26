import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estabelecimentoId: string;
  type: 'estoque' | 'importados' | 'api';
  apiEndpointId?: string;
  apiEndpointName?: string;
}

export default function AgentDataPreviewDialog({ open, onOpenChange, estabelecimentoId, type, apiEndpointId, apiEndpointName }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setData([]); setColumns([]); return; }
    console.log('[AgentDataPreview] Loading data:', { type, open, apiEndpointId, estabelecimentoId });
    const loadData = async () => {
      setLoading(true);
      try {
        if (type === 'estoque') {
          const { data: rows } = await supabase
            .from('produtos')
            .select('nome, codigo, marca, gramatura, largura, comprimento, estoque, preco_tabela, preco_minimo, material, ativo')
            .eq('estabelecimento_id', estabelecimentoId)
            .limit(200);
          const d = rows || [];
          setData(d);
          setColumns(d.length ? Object.keys(d[0]) : []);
        } else if (type === 'importados') {
          const { data: rows } = await supabase
            .from('produtos_importados')
            .select('nome, tipo, gramatura, largura, comprimento, diametro, embalagem, quantidade, obs')
            .eq('estabelecimento_id', estabelecimentoId)
            .limit(200);
          const d = rows || [];
          setData(d);
          setColumns(d.length ? Object.keys(d[0]) : []);
        } else if (type === 'api' && apiEndpointId) {
          const { data: ep } = await supabase
            .from('api_endpoints')
            .select('*')
            .eq('id', apiEndpointId)
            .single();
          if (ep) {
            try {
              const { data: result } = await supabase.rpc('execute_sql', { sql_query: ep.query });
              const rows = Array.isArray(result) ? result : [];
              setData(rows.slice(0, 200));
              setColumns(rows.length ? Object.keys(rows[0]) : []);
            } catch {
              toast.error('Erro ao executar query da API');
            }
          }
        }
      } catch {
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [open, type, apiEndpointId, estabelecimentoId]);

  const exportExcel = () => {
    if (!data.length) return;
    const label = type === 'estoque' ? 'Estoque_Sistema' : type === 'importados' ? 'Produtos_Importados' : `API_${apiEndpointName || 'dados'}`;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, label.substring(0, 31));
    XLSX.writeFile(wb, `${label}.xlsx`);
    toast.success('Excel exportado!');
  };

  const title = type === 'estoque' ? 'Estoque do Sistema' : type === 'importados' ? 'Produtos Importados de Terceiros' : `API: ${apiEndpointName || ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end -mt-2">
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={!data.length}>
            <Download className="h-4 w-4 mr-1" /> Exportar Excel
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhum dado encontrado.</div>
        ) : (
          <ScrollArea className="h-[55vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(col => <TableHead key={col} className="whitespace-nowrap text-xs">{col}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={i}>
                    {columns.map(col => (
                      <TableCell key={col} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                        {row[col] != null ? String(row[col]) : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.length >= 200 && (
              <p className="text-xs text-muted-foreground text-center py-2">Mostrando primeiros 200 registros</p>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
