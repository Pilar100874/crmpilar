import { Button } from '@/components/ui/button';
import { Download, Table } from 'lucide-react';
import { toast } from '@/lib/toast-config';
import * as XLSX from 'xlsx';

interface AgentTableRendererProps {
  data: any[];
}

export function parseAgentTableData(content: string): { text: string; tableData: any[] | null } {
  const startTag = '<!--TABLE_DATA_START-->';
  const endTag = '<!--TABLE_DATA_END-->';
  const startIdx = content.indexOf(startTag);
  const endIdx = content.indexOf(endTag);

  if (startIdx === -1 || endIdx === -1) return { text: content, tableData: null };

  const jsonStr = content.substring(startIdx + startTag.length, endIdx).trim();
  const textBefore = content.substring(0, startIdx).trim();
  const textAfter = content.substring(endIdx + endTag.length).trim();

  try {
    const data = JSON.parse(jsonStr);
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      return { text: [textBefore, textAfter].filter(Boolean).join('\n\n'), tableData: data };
    }
  } catch {}
  return { text: content, tableData: null };
}

export function AgentTableRenderer({ data }: AgentTableRendererProps) {
  const columns = Object.keys(data[0]);

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    XLSX.writeFile(wb, `dados_${Date.now()}.xlsx`);
    toast.success('Arquivo Excel baixado!');
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Table className="h-3 w-3" />
          {data.length} registro{data.length > 1 ? 's' : ''}
        </span>
        <Button size="sm" variant="outline" onClick={handleDownload} className="h-7 text-xs gap-1">
          <Download className="h-3 w-3" />
          Excel
        </Button>
      </div>
      <div className="overflow-auto max-h-[300px] rounded-lg border bg-background">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                {columns.map(col => (
                  <td key={col} className="px-3 py-1.5 whitespace-nowrap">{row[col] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
