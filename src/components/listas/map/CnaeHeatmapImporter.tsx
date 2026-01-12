import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportedRow {
  cnae: string;
  cnae_descricao?: string;
  uf: string;
  municipio: string;
  codigo_municipio?: string;
  quantidade: number;
}

interface CnaeHeatmapImporterProps {
  onImportComplete?: () => void;
}

export const CnaeHeatmapImporter: React.FC<CnaeHeatmapImporterProps> = ({
  onImportComplete
}) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    cnae: '',
    cnae_descricao: '',
    uf: '',
    municipio: '',
    codigo_municipio: '',
    quantidade: ''
  });
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, imported: 0, errors: 0 });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
          setColumns(headers);
          
          // Preview das primeiras 5 linhas
          const preview = jsonData.slice(1, 6).map((row: any) => {
            const obj: Record<string, any> = {};
            headers.forEach((h, i) => {
              obj[h] = row[i];
            });
            return obj;
          });
          setPreviewData(preview);
          
          // Auto-mapping baseado em nomes comuns
          const autoMapping: Record<string, string> = { ...mapping };
          headers.forEach(h => {
            const lower = h.toLowerCase();
            if (lower.includes('cnae') && !lower.includes('desc')) autoMapping.cnae = h;
            if (lower.includes('cnae') && lower.includes('desc')) autoMapping.cnae_descricao = h;
            if (lower === 'uf' || lower === 'estado' || lower === 'sigla_uf') autoMapping.uf = h;
            if (lower.includes('munic') || lower === 'cidade') autoMapping.municipio = h;
            if (lower.includes('cod') && lower.includes('munic')) autoMapping.codigo_municipio = h;
            if (lower.includes('quant') || lower === 'qtd' || lower === 'total' || lower === 'count') autoMapping.quantidade = h;
          });
          setMapping(autoMapping);
        }
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        toast.error('Erro ao processar arquivo. Verifique o formato.');
      }
    };
    reader.readAsBinaryString(selectedFile);
  }, [mapping]);

  const handleImport = useCallback(async () => {
    if (!file || !mapping.cnae || !mapping.uf || !mapping.municipio || !mapping.quantidade) {
      toast.error('Mapeie os campos obrigatórios: CNAE, UF, Município e Quantidade');
      return;
    }

    setImporting(true);
    setProgress(0);
    setStats({ total: 0, imported: 0, errors: 0 });

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
        
        const totalRows = jsonData.length;
        setStats(prev => ({ ...prev, total: totalRows }));
        
        const batchSize = 100;
        let imported = 0;
        let errors = 0;

        for (let i = 0; i < totalRows; i += batchSize) {
          const batch = jsonData.slice(i, i + batchSize);
          const rows: ImportedRow[] = batch.map(row => ({
            cnae: String(row[mapping.cnae] || '').replace(/\D/g, ''),
            cnae_descricao: mapping.cnae_descricao ? String(row[mapping.cnae_descricao] || '') : undefined,
            uf: String(row[mapping.uf] || '').toUpperCase().substring(0, 2),
            municipio: String(row[mapping.municipio] || ''),
            codigo_municipio: mapping.codigo_municipio ? String(row[mapping.codigo_municipio] || '') : undefined,
            quantidade: parseInt(String(row[mapping.quantidade] || '0').replace(/\D/g, '')) || 0
          })).filter(r => r.cnae && r.uf && r.municipio);

          if (rows.length > 0) {
            const { error } = await supabase
              .from('empresas_cnae_municipios')
              .upsert(rows.map(r => ({
                cnae: r.cnae,
                cnae_descricao: r.cnae_descricao,
                uf: r.uf,
                municipio: r.municipio,
                codigo_municipio: r.codigo_municipio,
                quantidade: r.quantidade
              })), {
                onConflict: 'cnae,uf,municipio'
              });

            if (error) {
              console.error('Erro ao importar batch:', error);
              errors += batch.length;
            } else {
              imported += rows.length;
            }
          }

          setProgress(Math.round(((i + batch.length) / totalRows) * 100));
          setStats({ total: totalRows, imported, errors });
        }

        if (imported > 0) {
          toast.success(`Importação concluída! ${imported} registros importados.`);
          onImportComplete?.();
        }
        
        if (errors > 0) {
          toast.warning(`${errors} registros com erro.`);
        }

        setImporting(false);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro durante a importação');
      setImporting(false);
    }
  }, [file, mapping, onImportComplete]);

  const requiredFields = ['cnae', 'uf', 'municipio', 'quantidade'];
  const isValid = requiredFields.every(f => mapping[f]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Dados CNAE
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Dados de Empresas por CNAE/Município
          </DialogTitle>
          <DialogDescription>
            Importe um arquivo CSV/Excel com dados de empresas agrupados por CNAE e município para gerar o mapa de calor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-auto">
          {/* Links para download */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">📥 Onde baixar os dados:</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="gap-1">
                <a href="https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  Receita Federal
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-1">
                <a href="https://brasil.io/dataset/socios-brasil/empresas/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  Brasil.io
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O arquivo deve conter colunas com: CNAE, UF, Município e Quantidade de empresas.
            </p>
          </div>

          {/* Upload */}
          <div className="space-y-2">
            <Label>Arquivo (CSV ou Excel)</Label>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={importing}
            />
          </div>

          {/* Mapeamento de colunas */}
          {columns.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Mapeamento de Colunas</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries({
                  cnae: 'CNAE *',
                  cnae_descricao: 'Descrição CNAE',
                  uf: 'UF *',
                  municipio: 'Município *',
                  codigo_municipio: 'Cód. Município',
                  quantidade: 'Quantidade *'
                }).map(([field, label]) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Select
                      value={mapping[field]}
                      onValueChange={(value) => setMapping(prev => ({ ...prev, [field]: value }))}
                      disabled={importing}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preview (primeiras 5 linhas)</Label>
              <ScrollArea className="h-[120px] border rounded-md">
                <div className="p-2 text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        {columns.slice(0, 6).map(col => (
                          <th key={col} className="px-2 py-1 text-left font-medium">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          {columns.slice(0, 6).map(col => (
                            <td key={col} className="px-2 py-1 truncate max-w-[100px]">
                              {String(row[col] || '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importando...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Total: {stats.total}</span>
                <span className="text-green-600">Importados: {stats.imported}</span>
                {stats.errors > 0 && <span className="text-red-600">Erros: {stats.errors}</span>}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isValid ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Pronto para importar
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Mapeie os campos obrigatórios
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!isValid || importing}>
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
