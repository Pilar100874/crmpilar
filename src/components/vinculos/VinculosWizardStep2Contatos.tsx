import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { FilteredCheckboxList } from "@/components/common/FilteredCheckboxList";

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
            <FilteredCheckboxList
              idPrefix="usuario"
              items={usuarios.map((u) => ({ id: u.id, label: u.nome, extra: u.email }))}
              selected={novosUsuariosIds}
              onToggle={(id) => handleUsuarioToggle(id)}
              searchPlaceholder="Buscar usuário..."
              emptyText="Nenhum usuário disponível."
              maxHeightClass="max-h-[300px]"
            />
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
