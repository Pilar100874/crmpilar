import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Props {
  usuarios: Usuario[];
  novosUsuariosIds: string[];
  onNovosUsuariosChange: (ids: string[]) => void;
  selectedCount: number;
}

export function VinculosWizardStep2Contatos({
  usuarios,
  novosUsuariosIds,
  onNovosUsuariosChange,
  selectedCount,
}: Props) {
  const handleUsuarioToggle = (usuarioId: string) => {
    const newIds = novosUsuariosIds.includes(usuarioId)
      ? novosUsuariosIds.filter(id => id !== usuarioId)
      : [...novosUsuariosIds, usuarioId];
    onNovosUsuariosChange(newIds);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Passo 2: Selecionar Usuários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-secondary/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Você selecionou <strong>{selectedCount} contato(s)</strong>. 
              Selecione abaixo os usuários que serão responsáveis por estes contatos.
            </p>
          </div>

          <div className="space-y-4">
            <Label>Selecione os Usuários</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
              {usuarios.map((usuario) => (
                <div key={usuario.id} className="flex items-center space-x-3 p-2 hover:bg-accent/50 rounded">
                  <Checkbox
                    id={`usuario-${usuario.id}`}
                    checked={novosUsuariosIds.includes(usuario.id)}
                    onCheckedChange={() => handleUsuarioToggle(usuario.id)}
                  />
                  <label
                    htmlFor={`usuario-${usuario.id}`}
                    className="flex-1 text-sm font-medium cursor-pointer"
                  >
                    {usuario.nome}
                  </label>
                </div>
              ))}
            </div>
            {novosUsuariosIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {novosUsuariosIds.map(id => {
                  const usuario = usuarios.find(u => u.id === id);
                  return usuario ? (
                    <Badge key={id} variant="secondary">
                      {usuario.nome}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {novosUsuariosIds.length === 0 && (
            <div className="p-4 bg-muted/50 border border-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Selecione pelo menos um usuário para continuar
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
