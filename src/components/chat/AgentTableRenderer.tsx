import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Table, Send, ArrowUp } from 'lucide-react';
import { toast } from '@/lib/toast-config';
import * as XLSX from 'xlsx';

interface AgentTableRendererProps {
  data: any[];
  onSendToClient?: (text: string) => void;
  onInsertToClientChat?: (text: string) => void;
}

function parseMarkdownTable(content: string): { text: string; tableData: any[] | null } {
  // Match markdown tables: | header | header |\n|---|---|\n| data | data |
  const tableRegex = /(\|[^\n]+\|\n\|[\s:-]+\|[\s:|-]*\n(?:\|[^\n]+\|\n?)+)/g;
  const match = tableRegex.exec(content);
  if (!match) return { text: content, tableData: null };

  const tableStr = match[1].trim();
  const lines = tableStr.split('\n').filter(l => l.trim());
  if (lines.length < 3) return { text: content, tableData: null };

  const parseRow = (line: string) =>
    line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length);

  const headers = parseRow(lines[0]);
  // lines[1] is the separator row (|---|---|)
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
  // First try JSON tags
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

  // Fallback: try parsing markdown tables
  return parseMarkdownTable(content);
}

function formatSelectedAsText(items: any[]): string {
  if (items.length === 0) return '';
  const columns = Object.keys(items[0]);
  return items.map((item, i) => {
    return columns.map(col => `${col}: ${item[col] ?? '-'}`).join(' | ');
  }).join('\n');
}

export function AgentTableRenderer({ data, onSendToClient, onInsertToClientChat }: AgentTableRendererProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const columns = Object.keys(data[0]);

  const toggleRow = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((_, i) => i)));
    }
  };

  const handleDownload = (onlySelected = false) => {
    const rows = onlySelected ? data.filter((_, i) => selected.has(i)) : data;
    if (rows.length === 0) {
      toast.error('Nenhum item selecionado');
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    XLSX.writeFile(wb, `dados_${Date.now()}.xlsx`);
    toast.success('Arquivo Excel baixado!');
  };

  const selectedItems = data.filter((_, i) => selected.has(i));
  const hasSelection = selected.size > 0;
  const canInteract = !!(onSendToClient || onInsertToClientChat);

  return (
    <div className="mt-2 space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Table className="h-3 w-3" />
          {hasSelection ? `${selected.size} de ${data.length} selecionado${selected.size > 1 ? 's' : ''}` : `${data.length} registro${data.length > 1 ? 's' : ''}`}
        </span>
        <div className="flex items-center gap-1">
          {hasSelection && onInsertToClientChat && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const text = formatSelectedAsText(selectedItems);
                onInsertToClientChat(text);
                toast.success(`${selected.size} item(ns) inserido(s) no chat`);
              }}
              className="h-7 text-xs gap-1"
            >
              <ArrowUp className="h-3 w-3" />
              Inserir no chat
            </Button>
          )}
          {hasSelection && onSendToClient && (
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                const text = formatSelectedAsText(selectedItems);
                onSendToClient(text);
                toast.success(`${selected.size} item(ns) enviado(s) ao cliente`);
              }}
              className="h-7 text-xs gap-1"
            >
              <Send className="h-3 w-3" />
              Enviar ao cliente
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleDownload(hasSelection)} className="h-7 text-xs gap-1">
            <Download className="h-3 w-3" />
            {hasSelection ? `Excel (${selected.size})` : 'Excel'}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[300px] rounded-lg border bg-background">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0">
            <tr>
              {canInteract && (
                <th className="px-2 py-2 w-8">
                  <Checkbox
                    checked={selected.size === data.length}
                    onCheckedChange={toggleAll}
                    className="h-3.5 w-3.5"
                  />
                </th>
              )}
              {columns.map(col => (
                <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className={`border-t transition-colors cursor-pointer ${selected.has(i) ? 'bg-primary/10' : 'hover:bg-muted/30'}`}
                onClick={canInteract ? () => toggleRow(i) : undefined}
              >
                {canInteract && (
                  <td className="px-2 py-1.5">
                    <Checkbox
                      checked={selected.has(i)}
                      onCheckedChange={() => toggleRow(i)}
                      className="h-3.5 w-3.5"
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                )}
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
