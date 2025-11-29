import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  headers: string[];
  selectedFields: string[];
  onSelectFields: (fields: string[]) => void;
  data?: any[];
}

export function ApiImportWizardStep2({ headers, selectedFields, onSelectFields, data = [] }: Props) {
  const handleToggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      onSelectFields(selectedFields.filter(f => f !== field));
    } else {
      onSelectFields([...selectedFields, field]);
    }
  };

  const handleSelectAll = () => {
    if (selectedFields.length === headers.length) {
      onSelectFields([]);
    } else {
      onSelectFields([...headers]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Seleção de Campos da API</h3>
        <p className="text-sm text-muted-foreground">
          Selecione os campos da API que deseja importar
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectedFields.length === headers.length}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="font-semibold cursor-pointer">
            Selecionar todos
          </Label>
        </div>
        <Badge variant="secondary">
          {selectedFields.length} de {headers.length} selecionados
        </Badge>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {headers.map((header) => (
            <div
              key={header}
              className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={header}
                checked={selectedFields.includes(header)}
                onCheckedChange={() => handleToggleField(header)}
              />
              <Label
                htmlFor={header}
                className="flex-1 cursor-pointer font-medium"
              >
                {header}
              </Label>
            </div>
          ))}
        </div>
      </Card>

      {selectedFields.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Selecione pelo menos um campo para continuar
          </p>
        </div>
      )}

      {selectedFields.length > 0 && data.length > 0 && (
        <Card className="p-4">
          <div className="space-y-2 mb-4">
            <h4 className="font-semibold">Prévia dos Dados</h4>
            <p className="text-sm text-muted-foreground">
              Mostrando até 5 linhas dos campos selecionados
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectedFields.map((field) => (
                    <TableHead key={field}>{field}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 5).map((row, index) => (
                  <TableRow key={index}>
                    {selectedFields.map((field) => (
                      <TableCell key={field}>
                        {row[field] !== undefined && row[field] !== null
                          ? String(row[field])
                          : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
