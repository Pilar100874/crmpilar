import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  usuarios_vinculados: Array<{ id: string; nome: string }>;
  segmentos_vinculados: Array<{ id: string; nome: string }>;
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

interface Props {
  contatosSelecionados: Contato[];
  usuarios: Usuario[];
  segmentos: Segmento[];
  alterarUsuario: boolean;
  alterarSegmento: boolean;
  novosUsuariosIds: string[];
  novosSegmentosIds: string[];
}

export function VinculosWizardStep3Contatos({
  contatosSelecionados,
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
          <CardTitle>Passo 3: Prévia das Alterações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              <strong>Revise as alterações antes de confirmar.</strong> As seguintes mudanças serão aplicadas aos {contatosSelecionados.length} contatos selecionados:
            </p>
          </div>

          {/* Resumo das Alterações */}
          <div className="space-y-4">
            {alterarUsuario && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alteração de Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {novosUsuarios.length > 0 ? (
                      novosUsuarios.map((usuario) => (
                        <Badge key={usuario.id} variant="default">
                          {usuario.nome}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">Nenhum usuário</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {alterarSegmento && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alteração de Segmentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {novosSegmentos.length > 0 ? (
                      novosSegmentos.map((segmento) => (
                        <Badge key={segmento.id} variant="default">
                          {segmento.nome}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">Nenhum segmento</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tabela de Preview */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  {alterarUsuario && <TableHead>Usuários</TableHead>}
                  {alterarSegmento && <TableHead>Segmentos</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contatosSelecionados.map((contato) => (
                  <TableRow key={contato.id}>
                    <TableCell className="font-medium">{contato.nome}</TableCell>
                    <TableCell>{contato.telefone}</TableCell>
                    
                    {alterarUsuario && (
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {novosUsuarios.length > 0 ? (
                            novosUsuarios.map((usuario) => (
                              <Badge key={usuario.id} variant="default">
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
                            novosSegmentos.map((segmento) => (
                              <Badge key={segmento.id} variant="default">
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
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              <strong>Atenção:</strong> Esta ação não pode ser desfeita. Certifique-se de que as alterações estão corretas antes de prosseguir.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
