import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Download, Table, Send, ArrowUp, ArrowUpDown, ArrowDownAZ, ArrowUpAZ, Search, X, MessageSquare, FileSpreadsheet } from 'lucide-react';
import { toast } from '@/lib/toast-config';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface AgentTableRendererProps {
  data: any[];
  onSendToClient?: (text: string) => void;
  onInsertToClientChat?: (text: string) => void;
  onSendFileToClient?: (fileUrl: string, fileName: string) => void;
}

function parseMarkdownTable(content: string): { text: string; tableData: any[] | null } {
  const tableRegex = /(\|[^\n]+\|\n\|[\s:-]+\|[\s:|-]*\n(?:\|[^\n]+\|\n?)+)/g;
  const match = tableRegex.exec(content);
  if (!match) return { text: content, tableData: null };

  const tableStr = match[1].trim();
  const lines = tableStr.split('\n').filter(l => l.trim());
  if (lines.length < 3) return { text: content, tableData: null };

  const parseRow = (line: string) =>
    line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length);

  const headers = parseRow(lines[0]);
  const dataRows = lines.slice(2);

  const data = dataRows.map(line => {
    const cells = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    return obj;
  });

  if (data.length === 0) return { text: content, tableData: null };

  const textBefore = content.substring(0, match.index).trim();
  const textAfter = content.substring(match.index + match[0].length).trim();

  return { text: [textBefore, textAfter].filter(Boolean).join('\n\n'), tableData: data };
}

export function parseAgentTableData(content: string): { text: string; tableData: any[] | null } {
  const startTag = '<!--TABLE_DATA_START-->';
  const endTag = '<!--TABLE_DATA_END-->';
  const startIdx = content.indexOf(startTag);
  const endIdx = content.indexOf(endTag);

  if (startIdx !== -1 && endIdx !== -1) {
    const jsonStr = content.substring(startIdx + startTag.length, endIdx).trim();
    const textBefore = content.substring(0, startIdx).trim();
    const textAfter = content.substring(endIdx + endTag.length).trim();

    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        return { text: [textBefore, textAfter].filter(Boolean).join('\n\n'), tableData: data };
      }
    } catch {}
  }

  return parseMarkdownTable(content);
}

function formatSelectedAsText(items: any[]): string {
  if (items.length === 0) return '';
  const columns = Object.keys(items[0]);

  // Calculate max width per column for alignment
  const widths: Record<string, number> = {};
  columns.forEach(col => {
    widths[col] = col.length;
    items.forEach(item => {
      const val = String(item[col] ?? '-');
      if (val.length > widths[col]) widths[col] = val.length;
    });
  });

  // Header
  const header = columns.map(col => col.padEnd(widths[col])).join(' │ ');
  const separator = columns.map(col => '─'.repeat(widths[col])).join('─┼─');

  // Rows
  const rows = items.map(item =>
    columns.map(col => String(item[col] ?? '-').padEnd(widths[col])).join(' │ ')
  );

  return '```\n' + header + '\n' + separator + '\n' + rows.join('\n') + '\n```';
}

export function AgentTableRenderer({ data, onSendToClient, onInsertToClientChat, onSendFileToClient }: AgentTableRendererProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [sendingExcel, setSendingExcel] = useState(false);
  const columns = Object.keys(data[0]);

  const filteredData = useMemo(() => {
    if (!filter.trim()) return data;
    const q = filter.toLowerCase();
    return data.filter(row =>
      columns.some(col => String(row[col] ?? '').toLowerCase().includes(q))
    );
  }, [data, filter, columns]);

  const sortedData = useMemo(() => {
    if (!sortCol) return filteredData;
    return [...filteredData].sort((a, b) => {
      const va = a[sortCol] ?? '';
      const vb = b[sortCol] ?? '';
      const na = parseFloat(String(va).replace(/[^\d.-]/g, ''));
      const nb = parseFloat(String(vb).replace(/[^\d.-]/g, ''));
      if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;
      const cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortCol(null); setSortDir('asc'); }
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const toggleRow = (idx: number) => {
    const originalIdx = data.indexOf(sortedData[idx]);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(originalIdx)) next.delete(originalIdx);
      else next.add(originalIdx);
      return next;
    });
  };

  const toggleAll = () => {
    const allOriginalIdxs = sortedData.map(row => data.indexOf(row));
    const allSelected = allOriginalIdxs.every(i => selected.has(i));
    if (allSelected) {
      setSelected(prev => { const next = new Set(prev); allOriginalIdxs.forEach(i => next.delete(i)); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); allOriginalIdxs.forEach(i => next.add(i)); return next; });
    }
  };

  const isRowSelected = (idx: number) => selected.has(data.indexOf(sortedData[idx]));
  const allVisibleSelected = sortedData.length > 0 && sortedData.every(row => selected.has(data.indexOf(row)));

  const handleDownload = (onlySelected = false) => {
    const rows = onlySelected ? data.filter((_, i) => selected.has(i)) : sortedData;
    if (rows.length === 0) { toast.error('Nenhum item selecionado'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    XLSX.writeFile(wb, `dados_${Date.now()}.xlsx`);
    toast.success('Arquivo Excel baixado!');
  };

  const handleSendExcelToWhatsApp = async () => {
    if (!onSendFileToClient) return;
    const rows = hasSelection ? selectedItems : sortedData;
    if (rows.length === 0) { toast.error('Nenhum dado para enviar'); return; }

    setSendingExcel(true);
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Dados');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const fileName = `dados_${Date.now()}.xlsx`;
      const filePath = `agent-tables/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, blob, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
      if (!urlData?.publicUrl) throw new Error('Erro ao gerar URL');

      onSendFileToClient(urlData.publicUrl, fileName);
      toast.success(`Excel com ${rows.length} registro(s) enviado ao WhatsApp!`);
    } catch (err: any) {
      toast.error(`Erro ao enviar Excel: ${err.message}`);
    } finally {
      setSendingExcel(false);
    }
  };

  const selectedItems = data.filter((_, i) => selected.has(i));
  const hasSelection = selected.size > 0;

  return (
    <div className="mt-2 space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Table className="h-3 w-3" />
            {hasSelection ? `${selected.size} de ${sortedData.length} selecionado${selected.size > 1 ? 's' : ''}` : `${sortedData.length} registro${sortedData.length > 1 ? 's' : ''}`}
            {filter && ` (filtrado de ${data.length})`}
          </span>
          <Button size="sm" variant={showFilter ? 'secondary' : 'ghost'} onClick={() => { setShowFilter(!showFilter); if (showFilter) setFilter(''); }} className="h-6 w-6 p-0">
            {showFilter ? <X className="h-3 w-3" /> : <Search className="h-3 w-3" />}
          </Button>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {hasSelection && onInsertToClientChat && (
            <Button size="sm" variant="outline" onClick={() => { onInsertToClientChat(formatSelectedAsText(selectedItems)); toast.success(`${selected.size} item(ns) inserido(s) no chat`); }} className="h-7 text-xs gap-1">
              <ArrowUp className="h-3 w-3" /> Inserir
            </Button>
          )}
          {hasSelection && onSendToClient && (
            <Button size="sm" variant="outline" onClick={() => { onSendToClient(formatSelectedAsText(selectedItems)); toast.success(`${selected.size} item(ns) enviado(s) ao cliente`); }} className="h-7 text-xs gap-1">
              <MessageSquare className="h-3 w-3" /> Texto
            </Button>
          )}
          {onSendFileToClient && (
            <Button size="sm" variant="outline" onClick={handleSendExcelToWhatsApp} disabled={sendingExcel} className="h-7 text-xs gap-1">
              <FileSpreadsheet className="h-3 w-3" /> {sendingExcel ? 'Enviando...' : hasSelection ? `Excel WhatsApp (${selected.size})` : 'Excel WhatsApp'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleDownload(hasSelection)} className="h-7 text-xs gap-1">
            <Download className="h-3 w-3" />
            {hasSelection ? `Download (${selected.size})` : 'Download'}
          </Button>
        </div>
      </div>

      {/* Filter input */}
      {showFilter && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrar em todas as colunas..."
            className="h-7 text-xs pl-7 pr-7"
            autoFocus
          />
          {filter && (
            <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Table - full height, no vertical scroll limit */}
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 w-8">
                <Checkbox checked={allVisibleSelected && sortedData.length > 0} onCheckedChange={toggleAll} className="h-3.5 w-3.5" />
              </th>
              {columns.map(col => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {sortCol === col ? (
                      sortDir === 'asc' ? <ArrowUpAZ className="h-3 w-3 text-primary" /> : <ArrowDownAZ className="h-3 w-3 text-primary" />
                    ) : (
                      <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="px-3 py-4 text-center text-muted-foreground">Nenhum resultado encontrado</td></tr>
            ) : sortedData.map((row, i) => (
              <tr
                key={i}
                className={`border-t transition-colors cursor-pointer ${isRowSelected(i) ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
                onClick={() => toggleRow(i)}
              >
                <td className="px-2 py-1.5">
                  <Checkbox checked={isRowSelected(i)} onCheckedChange={() => toggleRow(i)} className="h-3.5 w-3.5" onClick={e => e.stopPropagation()} />
                </td>
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
