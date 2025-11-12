import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";

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
  novoUsuarioId: string;
  novoSegmentoId: string;
  onAlterarUsuarioChange: (value: boolean) => void;
  onAlterarSegmentoChange: (value: boolean) => void;
  onNovoUsuarioChange: (id: string) => void;
  onNovoSegmentoChange: (id: string) => void;
  selectedCount: number;
}

export function VinculosWizardStep2({
  usuarios,
  segmentos,
  alterarUsuario,
  alterarSegmento,
  novoUsuarioId,
  novoSegmentoId,
  onAlterarUsuarioChange,
  onAlterarSegmentoChange,
  onNovoUsuarioChange,
  onNovoSegmentoChange,
  selectedCount,
}: Props) {
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
              <div className="ml-8 space-y-2">
                <Label htmlFor="novo-usuario">Selecione o Usuário</Label>
                <Select value={novoUsuarioId || "none"} onValueChange={(value) => onNovoUsuarioChange(value === "none" ? "" : value)}>
                  <SelectTrigger id="novo-usuario">
                    <SelectValue placeholder="Escolha um usuário..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Remover vínculo de usuário</SelectItem>
                    {usuarios.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="ml-8 space-y-2">
                <Label htmlFor="novo-segmento">Selecione o Segmento</Label>
                <Select value={novoSegmentoId || "none"} onValueChange={(value) => onNovoSegmentoChange(value === "none" ? "" : value)}>
                  <SelectTrigger id="novo-segmento">
                    <SelectValue placeholder="Escolha um segmento..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Remover vínculo de segmento</SelectItem>
                    {segmentos.map((segmento) => (
                      <SelectItem key={segmento.id} value={segmento.id}>
                        {segmento.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
