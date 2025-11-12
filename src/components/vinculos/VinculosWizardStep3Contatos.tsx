import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  usuario_vinculado_id: string | null;
  segmento_vinculado_id: string | null;
  vinculo_id: string | null;
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
  novoUsuarioId: string;
  novoSegmentoId: string;
}

export function VinculosWizardStep3Contatos({
  contatosSelecionados,
  usuarios,
  segmentos,
  alterarUsuario,
  alterarSegmento,
  novoUsuarioId,
  novoSegmentoId,
}: Props) {
  const getUsuarioNome = (id: string | null) => {
    if (!id) return "Nenhum";
    const usuario = usuarios.find((u) => u.id === id);
    return usuario?.nome || "Desconhecido";
  };

  const getSegmentoNome = (id: string | null) => {
    if (!id) return "Nenhum";
    const segmento = segmentos.find((s) => s.id === id);
    return segmento?.nome || "Desconhecido";
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alterarUsuario && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alteração de Usuário</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Novo usuário:</span>
                    <Badge variant="default">{getUsuarioNome(novoUsuarioId)}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {alterarSegmento && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alteração de Segmento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Novo segmento:</span>
                    <Badge variant="default">{getSegmentoNome(novoSegmentoId)}</Badge>
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
                  {alterarUsuario && (
                    <>
                      <TableHead>Usuário Atual</TableHead>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Novo Usuário</TableHead>
                    </>
                  )}
                  {alterarSegmento && (
                    <>
                      <TableHead>Segmento Atual</TableHead>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Novo Segmento</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contatosSelecionados.map((contato) => (
                  <TableRow key={contato.id}>
                    <TableCell className="font-medium">{contato.nome}</TableCell>
                    <TableCell>{contato.telefone}</TableCell>
                    
                    {alterarUsuario && (
                      <>
                        <TableCell>
                          <Badge variant="outline">
                            {getUsuarioNome(contato.usuario_vinculado_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {getUsuarioNome(novoUsuarioId)}
                          </Badge>
                        </TableCell>
                      </>
                    )}
                    
                    {alterarSegmento && (
                      <>
                        <TableCell>
                          <Badge variant="outline">
                            {getSegmentoNome(contato.segmento_vinculado_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {getSegmentoNome(novoSegmentoId)}
                          </Badge>
                        </TableCell>
                      </>
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
