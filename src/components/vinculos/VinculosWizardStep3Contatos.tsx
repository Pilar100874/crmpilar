import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  usuarios_vinculados: Array<{ id: string; nome: string }>;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Props {
  contatosSelecionados: Contato[];
  usuarios: Usuario[];
  alterarUsuario: boolean;
  novosUsuariosIds: string[];
}

export function VinculosWizardStep3Contatos({
  contatosSelecionados,
  usuarios,
  alterarUsuario,
  novosUsuariosIds,
}: Props) {
  const novosUsuarios = usuarios.filter((u) => novosUsuariosIds.includes(u.id));

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
          </div>

          {/* Tabela de Preview */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  {alterarUsuario && <TableHead>Usuários</TableHead>}
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
