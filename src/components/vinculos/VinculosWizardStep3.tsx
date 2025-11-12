import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, ArrowRight } from "lucide-react";

interface Empresa {
  id: string;
  nome_fantasia: string;
  nome: string;
  cnpj: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Segmento {
  id: string;
  nome: string;
}

interface EmpresaComVinculo extends Empresa {
  usuario_vinculado_id: string | null;
  segmento_vinculado_id: string | null;
  vinculo_id: string | null;
}

interface Props {
  empresasSelecionadas: EmpresaComVinculo[];
  usuarios: Usuario[];
  segmentos: Segmento[];
  alterarUsuario: boolean;
  alterarSegmento: boolean;
  novoUsuarioId: string;
  novoSegmentoId: string;
}

export function VinculosWizardStep3({
  empresasSelecionadas,
  usuarios,
  segmentos,
  alterarUsuario,
  alterarSegmento,
  novoUsuarioId,
  novoSegmentoId,
}: Props) {
  const novoUsuario = usuarios.find((u) => u.id === novoUsuarioId);
  const novoSegmento = segmentos.find((s) => s.id === novoSegmentoId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Passo 3: Revisar Alterações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-secondary/20 rounded-lg space-y-2">
            <p className="text-sm font-medium">Resumo das Alterações:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>{empresasSelecionadas.length}</strong> empresa(s) serão alteradas</li>
              {alterarUsuario && (
                <li>
                  • Usuário será {novoUsuarioId ? "alterado" : "removido"}
                  {novoUsuario && `: ${novoUsuario.nome}`}
                </li>
              )}
              {alterarSegmento && (
                <li>
                  • Segmento será {novoSegmentoId ? "alterado" : "removido"}
                  {novoSegmento && `: ${novoSegmento.nome}`}
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview das Mudanças</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  {alterarUsuario && <TableHead>Usuário</TableHead>}
                  {alterarSegmento && <TableHead>Segmento</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresasSelecionadas.map((empresa) => {
                  const usuarioAtual = usuarios.find((u) => u.id === empresa.usuario_vinculado_id);
                  const segmentoAtual = segmentos.find((s) => s.id === empresa.segmento_vinculado_id);

                  return (
                    <TableRow key={empresa.id}>
                      <TableCell className="font-medium">
                        {empresa.nome_fantasia || empresa.nome}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {empresa.cnpj || "-"}
                      </TableCell>
                      {alterarUsuario && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {usuarioAtual ? (
                              <Badge variant="outline" className="bg-secondary/50">
                                {usuarioAtual.nome}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Nenhum</span>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            {novoUsuario ? (
                              <Badge variant="default" className="bg-primary">
                                {novoUsuario.nome}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Nenhum</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {alterarSegmento && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {segmentoAtual ? (
                              <Badge variant="outline" className="bg-secondary/50">
                                {segmentoAtual.nome}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Nenhum</span>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            {novoSegmento ? (
                              <Badge variant="default" className="bg-primary">
                                {novoSegmento.nome}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">Nenhum</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
