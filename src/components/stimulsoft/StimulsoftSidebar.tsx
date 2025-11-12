import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus,
  Eye, 
  Download,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "@/lib/toast-config";

interface StimulsoftSidebarProps {
  onNew: () => void;
  onPreview: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onLoadExternalJSON: (data: any) => void;
}

export function StimulsoftSidebar({
  onNew,
  onPreview,
  onExportPDF,
  onExportExcel,
  onLoadExternalJSON,
}: StimulsoftSidebarProps) {
  const [isExternalDataOpen, setIsExternalDataOpen] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");

  const handleLoadExternalData = async () => {
    if (!externalUrl) {
      toast.error("Digite uma URL válida!");
      return;
    }

    try {
      const response = await fetch(externalUrl);
      if (!response.ok) {
        throw new Error('Falha ao carregar dados externos');
      }
      const data = await response.json();
      onLoadExternalJSON(data);
      setIsExternalDataOpen(false);
      setExternalUrl("");
      toast.success("Dados externos carregados!");
    } catch (error) {
      console.error('Erro ao carregar dados externos:', error);
      toast.error("Erro ao carregar dados externos.");
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 border-r bg-background min-w-[240px]">
      <h2 className="text-lg font-semibold mb-2">Stimulsoft Editor</h2>

      <Button onClick={onNew} variant="outline" className="w-full justify-start">
        <Plus className="mr-2 h-4 w-4" />
        Novo Relatório
      </Button>

      <Dialog open={isExternalDataOpen} onOpenChange={setIsExternalDataOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <LinkIcon className="mr-2 h-4 w-4" />
            Carregar JSON Externo
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregar Dados JSON</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="jsonurl">URL do JSON</Label>
              <Input
                id="jsonurl"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://api.exemplo.com/dados.json"
              />
            </div>
            <Button onClick={handleLoadExternalData} className="w-full">
              Carregar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <hr className="my-2" />

      <Button onClick={onPreview} variant="outline" className="w-full justify-start">
        <Eye className="mr-2 h-4 w-4" />
        Visualizar
      </Button>

      <Button onClick={onExportPDF} variant="outline" className="w-full justify-start">
        <Download className="mr-2 h-4 w-4" />
        Exportar PDF
      </Button>

      <Button onClick={onExportExcel} variant="outline" className="w-full justify-start">
        <Download className="mr-2 h-4 w-4" />
        Exportar Excel
      </Button>
    </div>
  );
}
