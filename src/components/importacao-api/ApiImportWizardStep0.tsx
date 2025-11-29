import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface Props {
  reportName: string;
  reportDate: string;
  onReportNameChange: (name: string) => void;
  onReportDateChange: (date: string) => void;
}

export function ApiImportWizardStep0({
  reportName,
  reportDate,
  onReportNameChange,
  onReportDateChange,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Configuração do Relatório</h2>
        <p className="text-muted-foreground">
          Defina o nome e a data de criação do relatório de importação
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="reportName">Nome do Relatório *</Label>
          <Input
            id="reportName"
            placeholder="Ex: Importação Produtos API Janeiro 2024"
            value={reportName}
            onChange={(e) => onReportNameChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reportDate">Data de Criação *</Label>
          <Input
            id="reportDate"
            type="date"
            value={reportDate}
            onChange={(e) => onReportDateChange(e.target.value)}
          />
        </div>
      </Card>
    </div>
  );
}
