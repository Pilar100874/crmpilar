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
  usuarios_vinculados: Array<{ id: string; nome: string }>;
  segmentos_vinculados: Array<{ id: string; nome: string }>;
}

interface Props {
  empresasSelecionadas: EmpresaComVinculo[];
  usuarios: Usuario[];
  segmentos: Segmento[];
  alterarUsuario: boolean;
  alterarSegmento: boolean;
  novosUsuariosIds: string[];
  novosSegmentosIds: string[];
}

export function VinculosWizardStep3({
  empresasSelecionadas,
  usuarios,
  segmentos,
  alterarUsuario,
  alterarSegmento,
  novosUsuariosIds,
  novosSegmentosIds,
}: Props) {
  const novosUsuarios = usuarios.filter((u) => novosUsuariosIds.includes(u.id));
  const novosSegmentos = segmentos.filter((s) => novosSegmentosIds.includes(s.id));

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
                  • {novosUsuariosIds.length > 0 ? `${novosUsuariosIds.length} gerente(s) vinculado(s)` : "Gerentes serão removidos"}
                  {novosUsuarios.length > 0 && `: ${novosUsuarios.map(u => u.nome).join(", ")}`}
                </li>
              )}
              {alterarSegmento && (
                <li>
                  • {novosSegmentosIds.length > 0 ? `${novosSegmentosIds.length} segmento(s) vinculado(s)` : "Segmentos serão removidos"}
                  {novosSegmentos.length > 0 && `: ${novosSegmentos.map(s => s.nome).join(", ")}`}
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
                          <div className="flex flex-col gap-2">
                            {novosUsuarios.length > 0 ? (
                              novosUsuarios.map(usuario => (
                                <Badge key={usuario.id} variant="default" className="bg-primary">
                                  {usuario.nome}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-xs">Nenhum</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {alterarSegmento && (
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {novosSegmentos.length > 0 ? (
                              novosSegmentos.map(segmento => (
                                <Badge key={segmento.id} variant="default" className="bg-primary">
                                  {segmento.nome}
                                </Badge>
                              ))
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
