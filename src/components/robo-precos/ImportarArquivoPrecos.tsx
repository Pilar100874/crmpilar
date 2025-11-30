import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Check, Loader2, Info, History } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ParsedRow {
  [key: string]: any;
}

export function ImportarArquivoPrecos() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFonte, setSelectedFonte] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    coluna_nome: "",
    coluna_sku: "",
    coluna_ean: "",
    coluna_preco: ""
  });
  const [step, setStep] = useState<'select' | 'upload' | 'mapping' | 'preview' | 'done'>('select');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: fontes } = useQuery({
    queryKey: ['fontes_arquivo'],
    queryFn: async () => {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('fontes_pesquisa_precos')
        .select('id, nome_fonte')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('tipo', 'arquivo_importado')
        .eq('ativo', true)
        .order('nome_fonte');
      if (error) throw error;
      return data;
    }
  });

  const { data: arquivosRecentes } = useQuery({
    queryKey: ['arquivos_recentes'],
    queryFn: async () => {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('arquivos_precos_importados')
        .select('*, fonte:fontes_pesquisa_precos(nome_fonte)')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('data_importacao', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet);
        
        if (jsonData.length > 0) {
          const cols = Object.keys(jsonData[0]);
          setColumns(cols);
          setParsedData(jsonData);
          setStep('mapping');
        } else {
          toast.error("Arquivo vazio ou formato inválido");
        }
      } catch (error) {
        toast.error("Erro ao processar arquivo");
        console.error(error);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    if (!mapping.coluna_nome || !mapping.coluna_preco) {
      toast.error("Coluna de nome e preço são obrigatórias");
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const estabelecimentoId = await getEstabelecimentoId();

      // Criar registro do arquivo
      const { data: arquivo, error: arquivoError } = await supabase
        .from('arquivos_precos_importados')
        .insert({
          estabelecimento_id: estabelecimentoId,
          fonte_id: selectedFonte,
          nome_arquivo: file?.name || 'arquivo.xlsx',
          mapeamento_colunas_json: mapping
        })
        .select()
        .single();

      if (arquivoError) throw arquivoError;

      // Inserir linhas em lotes
      const batchSize = 100;
      const total = parsedData.length;
      
      for (let i = 0; i < total; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize).map(row => ({
          arquivo_id: arquivo.id,
          nome_produto: row[mapping.coluna_nome] || null,
          sku: mapping.coluna_sku ? row[mapping.coluna_sku] : null,
          ean: mapping.coluna_ean ? row[mapping.coluna_ean] : null,
          preco: parseFloat(String(row[mapping.coluna_preco]).replace(/[^\d.,]/g, '').replace(',', '.')) || null,
          raw_json: row
        }));

        const { error: batchError } = await supabase
          .from('linhas_arquivo_precos')
          .insert(batch);

        if (batchError) throw batchError;

        setProgress(Math.round(((i + batchSize) / total) * 100));
      }

      queryClient.invalidateQueries({ queryKey: ['arquivos_recentes'] });
      setStep('done');
      toast.success(`${total} linhas importadas com sucesso`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setParsedData([]);
    setColumns([]);
    setMapping({ coluna_nome: "", coluna_sku: "", coluna_ean: "", coluna_preco: "" });
    setStep('select');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Arquivo de Preços
          </CardTitle>
          <CardDescription>
            Importe planilhas CSV/Excel com preços de concorrentes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'select' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione a Fonte</Label>
                <Select value={selectedFonte} onValueChange={(v) => {
                  setSelectedFonte(v);
                  setStep('upload');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma fonte do tipo 'Arquivo'" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontes?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome_fonte}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {fontes?.length === 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Nenhuma fonte do tipo "Arquivo Importado" encontrada. 
                    Crie uma fonte primeiro na aba "Fontes".
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Clique para selecionar um arquivo</p>
                <p className="text-sm text-muted-foreground">CSV ou Excel (.xlsx, .xls)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <Button variant="outline" onClick={resetImport}>Voltar</Button>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Arquivo:</strong> {file?.name} ({parsedData.length} linhas)
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Coluna Nome do Produto *</Label>
                  <Select value={mapping.coluna_nome} onValueChange={(v) => setMapping(p => ({ ...p, coluna_nome: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna Preço *</Label>
                  <Select value={mapping.coluna_preco} onValueChange={(v) => setMapping(p => ({ ...p, coluna_preco: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna SKU (opcional)</Label>
                  <Select value={mapping.coluna_sku || "none"} onValueChange={(v) => setMapping(p => ({ ...p, coluna_sku: v === "none" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna EAN (opcional)</Label>
                  <Select value={mapping.coluna_ean || "none"} onValueChange={(v) => setMapping(p => ({ ...p, coluna_ean: v === "none" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetImport}>Cancelar</Button>
                <Button onClick={() => setStep('preview')} disabled={!mapping.coluna_nome || !mapping.coluna_preco}>
                  Visualizar
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Prévia das primeiras 5 linhas:
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>EAN</TableHead>
                    <TableHead>Preço</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row[mapping.coluna_nome]}</TableCell>
                      <TableCell>{mapping.coluna_sku ? row[mapping.coluna_sku] : "-"}</TableCell>
                      <TableCell>{mapping.coluna_ean ? row[mapping.coluna_ean] : "-"}</TableCell>
                      <TableCell>{row[mapping.coluna_preco]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {importing && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Importando... {progress}%
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('mapping')} disabled={importing}>
                  Voltar
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar {parsedData.length} linhas
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-lg font-medium">Importação concluída!</p>
              <p className="text-muted-foreground">{parsedData.length} linhas importadas com sucesso.</p>
              <Button onClick={resetImport}>Nova Importação</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de importações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Arquivos Importados Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {arquivosRecentes?.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum arquivo importado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arquivosRecentes?.map((arq: any) => (
                  <TableRow key={arq.id}>
                    <TableCell className="font-medium">{arq.nome_arquivo}</TableCell>
                    <TableCell>{arq.fonte?.nome_fonte}</TableCell>
                    <TableCell>
                      {format(new Date(arq.data_importacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
