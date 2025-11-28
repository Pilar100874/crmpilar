import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CampoCustomizado {
  id: string;
  nome: string;
  campo_key: string;
  tipo: string;
  opcoes: string[] | null;
  obrigatorio: boolean;
  placeholder: string | null;
  unidade: string | null;
  ativo: boolean;
}

interface DynamicProductFieldsProps {
  campos: CampoCustomizado[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function DynamicProductFields({ campos, values, onChange }: DynamicProductFieldsProps) {
  const activeCampos = campos.filter(c => c.ativo);

  if (activeCampos.length === 0) {
    return null;
  }

  const renderField = (campo: CampoCustomizado) => {
    const value = values[campo.campo_key] ?? '';
    
    switch (campo.tipo) {
      case 'texto':
        return (
          <div key={campo.id}>
            <Label>
              {campo.nome}
              {campo.obrigatorio && <span className="text-destructive ml-1">*</span>}
              {campo.unidade && <span className="text-muted-foreground ml-1">({campo.unidade})</span>}
            </Label>
            <Input
              value={value}
              onChange={(e) => onChange(campo.campo_key, e.target.value)}
              placeholder={campo.placeholder || undefined}
            />
          </div>
        );
      
      case 'numero':
        return (
          <div key={campo.id}>
            <Label>
              {campo.nome}
              {campo.obrigatorio && <span className="text-destructive ml-1">*</span>}
              {campo.unidade && <span className="text-muted-foreground ml-1">({campo.unidade})</span>}
            </Label>
            <Input
              type="number"
              step="any"
              value={value}
              onChange={(e) => onChange(campo.campo_key, e.target.value)}
              placeholder={campo.placeholder || undefined}
            />
          </div>
        );
      
      case 'textarea':
        return (
          <div key={campo.id} className="col-span-2">
            <Label>
              {campo.nome}
              {campo.obrigatorio && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              value={value}
              onChange={(e) => onChange(campo.campo_key, e.target.value)}
              placeholder={campo.placeholder || undefined}
              rows={3}
            />
          </div>
        );
      
      case 'checkbox':
        return (
          <div key={campo.id} className="flex items-center gap-2 pt-6">
            <Switch
              checked={!!value}
              onCheckedChange={(checked) => onChange(campo.campo_key, checked)}
            />
            <Label>
              {campo.nome}
              {campo.obrigatorio && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        );
      
      case 'selecao':
        return (
          <div key={campo.id}>
            <Label>
              {campo.nome}
              {campo.obrigatorio && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value || "none"}
              onValueChange={(v) => onChange(campo.campo_key, v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={campo.placeholder || "Selecione..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione...</SelectItem>
                {campo.opcoes?.map((opcao) => (
                  <SelectItem key={opcao} value={opcao}>
                    {opcao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'data':
        return (
          <div key={campo.id}>
            <Label>
              {campo.nome}
              {campo.obrigatorio && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              type="date"
              value={value}
              onChange={(e) => onChange(campo.campo_key, e.target.value)}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <h4 className="text-sm font-medium mb-3 text-muted-foreground">
        Campos do Grupo
      </h4>
      <div className="grid grid-cols-2 gap-4">
        {activeCampos.map(renderField)}
      </div>
    </div>
  );
}
