import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Download, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface RendaImporterProps {
  onImportComplete?: () => void;
}

interface ColumnMapping {
  municipio: string;
  uf: string;
  renda_media: string;
  pib_per_capita?: string;
  idh?: string;
  populacao?: string;
}

export const RendaImporter: React.FC<RendaImporterProps> = ({ onImportComplete }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    municipio: '',
    uf: '',
    renda_media: ''
  });
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        
        if (jsonData.length > 0) {
          const headerRow = jsonData[0].map(h => String(h || '').trim());
          setHeaders(headerRow);
          
          // Preview das primeiras 5 linhas
          const preview = jsonData.slice(1, 6).map(row => {
            const obj: any = {};
            headerRow.forEach((h, i) => {
              obj[h] = row[i];
            });
            return obj;
          });
          setPreviewData(preview);

          // Auto-mapear colunas comuns
          const autoMapping: ColumnMapping = { municipio: '', uf: '', renda_media: '' };
          headerRow.forEach(h => {
            const lower = h.toLowerCase();
            if (lower.includes('munic') || lower.includes('cidade')) {
              autoMapping.municipio = h;
            } else if (lower === 'uf' || lower.includes('estado') || lower.includes('sigla')) {
              autoMapping.uf = h;
            } else if (lower.includes('renda') && lower.includes('med')) {
              autoMapping.renda_media = h;
            } else if (lower.includes('pib') && lower.includes('capita')) {
              autoMapping.pib_per_capita = h;
            } else if (lower.includes('idh')) {
              autoMapping.idh = h;
            } else if (lower.includes('pop')) {
              autoMapping.populacao = h;
            }
          });
          setColumnMapping(autoMapping);
        }
      } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        toast.error('Erro ao ler arquivo');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  }, []);

  const handleImport = useCallback(async () => {
    if (!file || !columnMapping.municipio || !columnMapping.uf || !columnMapping.renda_media) {
      toast.error('Mapeie as colunas obrigatórias');
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

        const batchSize = 100;
        let processed = 0;
        let inserted = 0;

        for (let i = 0; i < jsonData.length; i += batchSize) {
          const batch = jsonData.slice(i, i + batchSize);
          
          const records = batch.map(row => ({
            municipio: String(row[columnMapping.municipio] || '').trim(),
            uf: String(row[columnMapping.uf] || '').trim().toUpperCase(),
            renda_media: parseFloat(String(row[columnMapping.renda_media] || '0').replace(',', '.')) || null,
            pib_per_capita: columnMapping.pib_per_capita 
              ? parseFloat(String(row[columnMapping.pib_per_capita] || '0').replace(',', '.')) || null 
              : null,
            idh: columnMapping.idh 
              ? parseFloat(String(row[columnMapping.idh] || '0').replace(',', '.')) || null 
              : null,
            populacao: columnMapping.populacao 
              ? parseInt(String(row[columnMapping.populacao] || '0').replace(/\D/g, '')) || null 
              : null
          })).filter(r => r.municipio && r.uf);

          const { error } = await supabase
            .from('municipios_renda')
            .upsert(records, { onConflict: 'municipio,uf' });

          if (error) {
            console.error('Erro no batch:', error);
          } else {
            inserted += records.length;
          }

          processed += batch.length;
          setProgress(Math.round((processed / jsonData.length) * 100));
        }

        toast.success(`${inserted} municípios importados com sucesso!`);
        setOpen(false);
        setFile(null);
        setHeaders([]);
        setPreviewData([]);
        onImportComplete?.();
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro durante a importação');
    } finally {
      setImporting(false);
    }
  }, [file, columnMapping, onImportComplete]);

  const isValid = columnMapping.municipio && columnMapping.uf && columnMapping.renda_media;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <DollarSign className="h-4 w-4" />
          Importar Renda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Dados de Renda por Município</DialogTitle>
          <DialogDescription>
            Importe dados de renda média do IBGE para análise comercial
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Links úteis */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-sm font-medium">Fontes de dados gratuitas:</p>
            <a 
              href="https://www.ibge.gov.br/estatisticas/sociais/rendimento-despesa-e-consumo/9107-pesquisa-de-orcamentos-familiares.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Download className="h-3 w-3" /> IBGE - Pesquisa de Orçamentos Familiares
            </a>
            <a 
              href="https://www.atlasbrasil.org.br/ranking" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Download className="h-3 w-3" /> Atlas Brasil - IDH Municipal
            </a>
          </div>

          {/* Upload */}
          <div>
            <Label>Arquivo (CSV ou Excel)</Label>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="mt-1"
            />
          </div>

          {/* Mapeamento de colunas */}
          {headers.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Município *</Label>
                <Select value={columnMapping.municipio} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, municipio: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>UF *</Label>
                <Select value={columnMapping.uf} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, uf: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Renda Média *</Label>
                <Select value={columnMapping.renda_media} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, renda_media: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>PIB per Capita</Label>
                <Select value={columnMapping.pib_per_capita || ''} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, pib_per_capita: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>IDH</Label>
                <Select value={columnMapping.idh || ''} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, idh: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>População</Label>
                <Select value={columnMapping.populacao || ''} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, populacao: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="border rounded-lg overflow-auto max-h-40">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    {headers.map(h => <th key={h} className="p-2 text-left">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="border-t">
                      {headers.map(h => <td key={h} className="p-2">{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">{progress}% importado</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={!isValid || importing}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
