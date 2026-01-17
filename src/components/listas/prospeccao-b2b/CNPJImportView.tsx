import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, FileText, Database, Download, ExternalLink, 
  Loader2, CheckCircle, AlertTriangle, Info, Trash2,
  BookOpen, HelpCircle, Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CNPJImportViewProps {
  estabelecimentoId: string;
  onImportComplete?: () => void;
}

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
}

const UF_LIST = [
  { value: '', label: 'Todos os estados' },
  { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' }, { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' }, { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' }, { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' }, { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' }, { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' }, { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' }, { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];

const CNPJImportView: React.FC<CNPJImportViewProps> = ({
  estabelecimentoId,
  onImportComplete
}) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filterUF, setFilterUF] = useState('');
  const [filterCNAE, setFilterCNAE] = useState('');
  const [filterSituacao, setFilterSituacao] = useState('ATIVA');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estatísticas da base local
  const [localStats, setLocalStats] = useState<{total: number, ufs: string[]}>({
    total: 0,
    ufs: []
  });

  useEffect(() => {
    loadLocalStats();
  }, [estabelecimentoId]);

  const loadLocalStats = async () => {
    if (!estabelecimentoId) return;
    
    try {
      const { count } = await supabase
        .from('cnpj_base_local')
        .select('*', { count: 'exact', head: true })
        .eq('estabelecimento_id', estabelecimentoId);
      
      const { data: ufsData } = await supabase
        .from('cnpj_base_local')
        .select('uf')
        .eq('estabelecimento_id', estabelecimentoId)
        .limit(1000);
      
      const uniqueUFs = [...new Set(ufsData?.map(r => r.uf).filter(Boolean) || [])];
      
      setLocalStats({
        total: count || 0,
        ufs: uniqueUFs.sort()
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStats(null);
      setProgress(0);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  };

  const handleImport = async () => {
    if (!file || !estabelecimentoId) return;

    setImporting(true);
    setProgress(0);
    setStats({ total: 0, imported: 0, skipped: 0, errors: 0 });

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      // Detectar se é arquivo de Estabelecimentos ou Empresas
      const isEstabelecimentos = file.name.toLowerCase().includes('estabelecimento');
      
      setTotalRecords(lines.length - 1); // -1 para header
      
      const batchSize = 100;
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 1; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, Math.min(i + batchSize, lines.length));
        const records: any[] = [];

        for (const line of batch) {
          try {
            const cols = parseCSVLine(line);
            
            if (isEstabelecimentos && cols.length >= 20) {
              // Arquivo de Estabelecimentos da Receita Federal
              // Formato: CNPJ_BASICO;CNPJ_ORDEM;CNPJ_DV;...
              const cnpjBasico = cols[0]?.padStart(8, '0');
              const cnpjOrdem = cols[1]?.padStart(4, '0');
              const cnpjDv = cols[2]?.padStart(2, '0');
              const cnpjCompleto = `${cnpjBasico}${cnpjOrdem}${cnpjDv}`;
              const situacao = cols[5];
              const uf = cols[19];
              const cnae = cols[11];

              // Aplicar filtros
              if (filterUF && uf !== filterUF) {
                skipped++;
                continue;
              }
              if (filterSituacao && situacao !== filterSituacao.substring(0, 2)) {
                skipped++;
                continue;
              }
              if (filterCNAE && !cnae?.startsWith(filterCNAE)) {
                skipped++;
                continue;
              }

              records.push({
                estabelecimento_id: estabelecimentoId,
                cnpj: cnpjCompleto,
                cnpj_basico: cnpjBasico,
                situacao_cadastral: situacao === '02' ? 'ATIVA' : situacao === '01' ? 'NULA' : 
                                    situacao === '03' ? 'SUSPENSA' : situacao === '04' ? 'INAPTA' : 
                                    situacao === '08' ? 'BAIXADA' : situacao,
                cnae_fiscal: cnae,
                logradouro: cols[13],
                numero: cols[14],
                complemento: cols[15],
                bairro: cols[16],
                cep: cols[17],
                uf: uf,
                municipio: cols[20], // código do município
                telefone1: cols[21] ? `${cols[21]}${cols[22] || ''}` : null,
                telefone2: cols[23] ? `${cols[23]}${cols[24] || ''}` : null,
                email: cols[27]?.toLowerCase() || null
              });
            }
          } catch (err) {
            errors++;
          }
        }

        if (records.length > 0) {
          const { error } = await supabase
            .from('cnpj_base_local')
            .upsert(records, { 
              onConflict: 'estabelecimento_id,cnpj',
              ignoreDuplicates: true 
            });

          if (error) {
            console.error('Erro ao inserir batch:', error);
            errors += records.length;
          } else {
            imported += records.length;
          }
        }

        const currentProgress = Math.round(((i + batch.length) / lines.length) * 100);
        setProgress(currentProgress);
        setStats({ total: lines.length - 1, imported, skipped, errors });
      }

      toast.success(`Importação concluída: ${imported} registros importados`);
      loadLocalStats();
      onImportComplete?.();

    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar arquivo');
    } finally {
      setImporting(false);
    }
  };

  const handleClearBase = async () => {
    if (!confirm('Tem certeza que deseja limpar toda a base de CNPJs importados?')) return;

    try {
      const { error } = await supabase
        .from('cnpj_base_local')
        .delete()
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;

      toast.success('Base de CNPJs limpa com sucesso');
      loadLocalStats();
    } catch (error) {
      console.error('Erro ao limpar base:', error);
      toast.error('Erro ao limpar base');
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Manual de Uso
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importar Base
          </TabsTrigger>
        </TabsList>

        {/* Manual de Uso */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Como Baixar a Base de CNPJs
              </CardTitle>
              <CardDescription>
                Passo a passo para baixar e importar a base de dados abertos da Receita Federal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {/* Passo 1 */}
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="secondary">1</Badge>
                      Acessar o Portal de Dados Abertos
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Acesse o portal oficial de dados abertos do governo:
                    </p>
                    <a
                      href="https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                    >
                      dados.gov.br - Base CNPJ
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Passo 2 */}
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="secondary">2</Badge>
                      Baixar os Arquivos Necessários
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      A base é dividida em vários arquivos. Para prospecção, você precisa do arquivo de <strong>Estabelecimentos</strong>:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
                      <li><strong>Estabelecimentos*.zip</strong> - Contém CNPJ, endereço, telefone, email, situação</li>
                      <li>Empresas*.zip - Contém razão social (opcional)</li>
                      <li>CNAEs*.zip - Descrição das atividades (opcional)</li>
                    </ul>
                    <Alert className="mt-2">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Os arquivos são grandes (vários GB cada). Baixe apenas os estados que você precisa.
                        Cada arquivo .zip contém um arquivo .CSV.
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Passo 3 */}
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="secondary">3</Badge>
                      Extrair e Preparar o Arquivo
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Após baixar, extraia o arquivo .zip para obter o arquivo .CSV.
                    </p>
                    <div className="bg-muted p-3 rounded text-sm">
                      <p className="font-medium">Formato do arquivo de Estabelecimentos:</p>
                      <code className="text-xs">
                        CNPJ_BASICO;CNPJ_ORDEM;CNPJ_DV;...;UF;MUNICIPIO;TELEFONE1;...;EMAIL
                      </code>
                    </div>
                  </div>

                  {/* Passo 4 */}
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="secondary">4</Badge>
                      Importar no Sistema
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Use a aba "Importar Base" para fazer upload do arquivo CSV.
                      Você pode aplicar filtros para importar apenas empresas de estados ou CNAEs específicos.
                    </p>
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        <strong>Dica:</strong> Filtre por UF e situação "ATIVA" para reduzir o volume de dados.
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Passo 5 */}
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Badge variant="secondary">5</Badge>
                      Usar na Prospecção
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Após importar, a busca por município na aba "Buscar" utilizará sua base local,
                      permitindo buscas ilimitadas sem custo.
                    </p>
                  </div>

                  {/* Links úteis */}
                  <div className="border-t pt-4 space-y-2">
                    <h3 className="font-semibold">Links Úteis</h3>
                    <div className="space-y-2">
                      <a
                        href="https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/consultas/dados-publicos-cnpj"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline text-sm"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Página oficial da Receita Federal sobre dados públicos
                      </a>
                      <a
                        href="https://basedosdados.org/dataset/br-me-cnpj"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline text-sm"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Base dos Dados (alternativa tratada)
                      </a>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Importar Base */}
        <TabsContent value="import" className="space-y-4">
          {/* Estatísticas da base local */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5" />
                Base Local de CNPJs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">
                    {localStats.total.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-sm text-muted-foreground">CNPJs importados</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold">
                    {localStats.ufs.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Estados cobertos</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">UFs na base:</div>
                  <div className="flex flex-wrap gap-1">
                    {localStats.ufs.length > 0 ? (
                      localStats.ufs.map(uf => (
                        <Badge key={uf} variant="secondary" className="text-xs">{uf}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Nenhuma</span>
                    )}
                  </div>
                </div>
              </div>
              
              {localStats.total > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button variant="destructive" size="sm" onClick={handleClearBase}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Base
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload de arquivo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importar Arquivo CSV
              </CardTitle>
              <CardDescription>
                Faça upload do arquivo de Estabelecimentos da Receita Federal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    Filtrar por UF
                  </Label>
                  <Select value={filterUF} onValueChange={setFilterUF}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os estados" />
                    </SelectTrigger>
                    <SelectContent>
                      {UF_LIST.map(uf => (
                        <SelectItem key={uf.value} value={uf.value}>
                          {uf.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Filtrar por CNAE (início)</Label>
                  <Input
                    value={filterCNAE}
                    onChange={(e) => setFilterCNAE(e.target.value)}
                    placeholder="Ex: 47 (varejo)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Situação Cadastral</Label>
                  <Select value={filterSituacao} onValueChange={setFilterSituacao}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      <SelectItem value="ATIVA">Ativa</SelectItem>
                      <SelectItem value="BAIXADA">Baixada</SelectItem>
                      <SelectItem value="SUSPENSA">Suspensa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seleção de arquivo */}
              <div className="space-y-2">
                <Label>Arquivo CSV</Label>
                <div className="flex gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={importing}
                  />
                  <Button 
                    onClick={handleImport} 
                    disabled={!file || importing}
                  >
                    {importing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {file && (
                  <p className="text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 inline mr-1" />
                    {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Progresso */}
              {importing && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Importando... {progress}%</span>
                    <span>{stats?.imported.toLocaleString('pt-BR')} / {totalRecords.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              )}

              {/* Estatísticas da importação */}
              {stats && !importing && stats.total > 0 && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-muted rounded">
                    <div className="font-semibold">{stats.total.toLocaleString('pt-BR')}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded">
                    <div className="font-semibold text-green-700 dark:text-green-300">
                      {stats.imported.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-green-600">Importados</div>
                  </div>
                  <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded">
                    <div className="font-semibold text-amber-700 dark:text-amber-300">
                      {stats.skipped.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-amber-600">Filtrados</div>
                  </div>
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded">
                    <div className="font-semibold text-red-700 dark:text-red-300">
                      {stats.errors.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-red-600">Erros</div>
                  </div>
                </div>
              )}

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Importante:</strong> Arquivos grandes podem demorar para processar. 
                  Use os filtros para importar apenas os dados necessários.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CNPJImportView;
