import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { FilteredCheckboxList } from "@/components/common/FilteredCheckboxList";

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
  usuarios: Usuario[];
  segmentos: Segmento[];
  alterarUsuario: boolean;
  alterarSegmento: boolean;
  novosUsuariosIds: string[];
  novosSegmentosIds: string[];
  onAlterarUsuarioChange: (value: boolean) => void;
  onAlterarSegmentoChange: (value: boolean) => void;
  onNovosUsuariosChange: (ids: string[]) => void;
  onNovosSegmentosChange: (ids: string[]) => void;
  selectedCount: number;
}

export function VinculosWizardStep2({
  usuarios,
  segmentos,
  alterarUsuario,
  alterarSegmento,
  novosUsuariosIds,
  novosSegmentosIds,
  onAlterarUsuarioChange,
  onAlterarSegmentoChange,
  onNovosUsuariosChange,
  onNovosSegmentosChange,
  selectedCount,
}: Props) {
  const handleUsuarioToggle = (usuarioId: string) => {
    const newIds = novosUsuariosIds.includes(usuarioId)
      ? novosUsuariosIds.filter(id => id !== usuarioId)
      : [...novosUsuariosIds, usuarioId];
    onNovosUsuariosChange(newIds);
  };

  const handleSegmentoToggle = (segmentoId: string) => {
    const newIds = novosSegmentosIds.includes(segmentoId)
      ? novosSegmentosIds.filter(id => id !== segmentoId)
      : [...novosSegmentosIds, segmentoId];
    onNovosSegmentosChange(newIds);
  };
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Passo 2: Definir Alterações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-secondary/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Você selecionou <strong>{selectedCount} empresa(s)</strong>. 
              Defina abaixo quais vínculos deseja alterar.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <Checkbox
                id="alterar-usuario"
                checked={alterarUsuario}
                onCheckedChange={(checked) => onAlterarUsuarioChange(checked === true)}
              />
              <div className="flex-1">
                <label
                  htmlFor="alterar-usuario"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Alterar Usuário
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  Vincular as empresas selecionadas a um usuário
                </p>
              </div>
            </div>

            {alterarUsuario && (
              <div className="ml-8 space-y-3">
                <Label>Selecione os Usuários</Label>
                <FilteredCheckboxList
                  idPrefix="usuario"
                  items={usuarios.map((u) => ({ id: u.id, label: u.nome, extra: u.email }))}
                  selected={novosUsuariosIds}
                  onToggle={(id) => handleUsuarioToggle(id)}
                  searchPlaceholder="Buscar usuário..."
                  emptyText="Nenhum usuário disponível."
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
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <Checkbox
                id="alterar-segmento"
                checked={alterarSegmento}
                onCheckedChange={(checked) => onAlterarSegmentoChange(checked === true)}
              />
              <div className="flex-1">
                <label
                  htmlFor="alterar-segmento"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Alterar Segmento
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  Vincular as empresas selecionadas a um segmento
                </p>
              </div>
            </div>

            {alterarSegmento && (
              <div className="ml-8 space-y-3">
                <Label>Selecione os Segmentos</Label>
                <FilteredCheckboxList
                  idPrefix="segmento"
                  items={segmentos.map((s) => ({ id: s.id, label: s.nome }))}
                  selected={novosSegmentosIds}
                  onToggle={(id) => handleSegmentoToggle(id)}
                  searchPlaceholder="Buscar segmento..."
                  emptyText="Nenhum segmento disponível."
                />
                {novosSegmentosIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {novosSegmentosIds.map(id => {
                      const segmento = segmentos.find(s => s.id === id);
                      return segmento ? (
                        <Badge key={id} variant="secondary">
                          {segmento.nome}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {!alterarUsuario && !alterarSegmento && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                Selecione pelo menos uma opção para continuar
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
