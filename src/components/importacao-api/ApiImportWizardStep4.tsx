import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Package, Database } from "lucide-react";

interface ProdutoGrupo {
  id: string;
  nome: string;
}

interface Props {
  selectedGrupoId: string;
  onGrupoChange: (grupoId: string) => void;
  apiData?: any[];
  selectedFields?: string[];
}

export function ApiImportWizardStep4({ 
  selectedGrupoId, 
  onGrupoChange,
  apiData = [],
  selectedFields = []
}: Props) {
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGrupos();
  }, []);

  const loadGrupos = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from("produto_grupos")
        .select("id, nome")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");

      if (error) throw error;
      setGrupos(data || []);

      // Se não tem grupo selecionado e existe algum, selecionar o primeiro
      if (!selectedGrupoId && data && data.length > 0) {
        onGrupoChange(data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedGrupo = grupos.find(g => g.id === selectedGrupoId);

  // Mostrar apenas os campos selecionados ou todos os campos disponíveis
  const displayFields = selectedFields.length > 0 ? selectedFields : (apiData.length > 0 ? Object.keys(apiData[0]) : []);
  const displayData = apiData.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Seleção do Grupo de Produtos</h3>
        <p className="text-sm text-muted-foreground">
          Selecione o grupo de produtos para usar os campos customizados correspondentes
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Grupo de Produtos</Label>
            <Select
              value={selectedGrupoId}
              onValueChange={onGrupoChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Carregando..." : "Selecione um grupo..."} />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((grupo) => (
                  <SelectItem key={grupo.id} value={grupo.id}>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {grupo.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedGrupo && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Grupo selecionado</Badge>
                <span className="font-medium">{selectedGrupo.nome}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Na próxima etapa, você poderá mapear os campos da API para os campos padrão do produto 
                e também para os campos customizados deste grupo.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Prévia dos dados da API */}
      {apiData.length > 0 && displayFields.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Prévia dos Dados da API</span>
            <Badge variant="outline" className="ml-auto">
              {apiData.length} registros
            </Badge>
          </div>
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {displayFields.slice(0, 6).map((field) => (
                    <TableHead key={field} className="min-w-[100px]">
                      {field}
                    </TableHead>
                  ))}
                  {displayFields.length > 6 && (
                    <TableHead className="text-muted-foreground">
                      +{displayFields.length - 6} campos
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                    {displayFields.slice(0, 6).map((field) => (
                      <TableCell key={field} className="text-xs max-w-[150px] truncate">
                        {row[field] !== undefined && row[field] !== null
                          ? String(row[field])
                          : "-"}
                      </TableCell>
                    ))}
                    {displayFields.length > 6 && (
                      <TableCell className="text-muted-foreground text-xs">...</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          {apiData.length > 10 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Mostrando 10 de {apiData.length} registros
            </p>
          )}
        </Card>
      )}

      {grupos.length === 0 && !loading && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Nenhum grupo de produtos encontrado. Crie um grupo em Configurações &gt; Estabelecimento &gt; Grupos de Produtos.
          </p>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Dica:</strong> Os campos customizados do grupo selecionado serão disponibilizados 
          para mapeamento na próxima etapa, junto com os campos padrão do cadastro de produtos.
        </p>
      </div>
    </div>
  );
}
