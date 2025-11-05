import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  FolderOpen, 
  Save, 
  Eye, 
  Download, 
  LogIn,
  Cloud,
  Plus,
  Link as LinkIcon
} from "lucide-react";
import { cloudAPI, type CloudFile } from "@/services/stimulsoftCloudApi";
import { toast } from "sonner";

interface StimulsoftSidebarProps {
  onNew: () => void;
  onOpenCloud: (content: string) => void;
  onSaveCloud: () => Promise<string | null>;
  onPreview: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onLoadExternalJSON: (data: any) => void;
}

export function StimulsoftSidebar({
  onNew,
  onOpenCloud,
  onSaveCloud,
  onPreview,
  onExportPDF,
  onExportExcel,
  onLoadExternalJSON,
}: StimulsoftSidebarProps) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCloudFilesOpen, setIsCloudFilesOpen] = useState(false);
  const [isExternalDataOpen, setIsExternalDataOpen] = useState(false);
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginApiKey, setLoginApiKey] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  const handleLogin = async () => {
    const success = await cloudAPI.login({
      email: loginEmail,
      password: loginPassword,
      apiKey: loginApiKey,
    });

    if (success) {
      toast.success("Login realizado com sucesso!");
      setIsLoginOpen(false);
      setLoginEmail("");
      setLoginPassword("");
      setLoginApiKey("");
    } else {
      toast.error("Falha no login. Verifique suas credenciais.");
    }
  };

  const handleOpenCloudFiles = async () => {
    if (!cloudAPI.isAuthenticated()) {
      toast.error("Faça login primeiro!");
      setIsLoginOpen(true);
      return;
    }

    const files = await cloudAPI.listReports();
    setCloudFiles(files);
    setIsCloudFilesOpen(true);
  };

  const handleOpenCloudFile = async (fileId: string) => {
    const content = await cloudAPI.openReport(fileId);
    if (content) {
      onOpenCloud(content);
      setIsCloudFilesOpen(false);
      toast.success("Relatório carregado do Cloud!");
    } else {
      toast.error("Erro ao abrir relatório do Cloud.");
    }
  };

  const handleSaveToCloud = async () => {
    if (!cloudAPI.isAuthenticated()) {
      toast.error("Faça login primeiro!");
      setIsLoginOpen(true);
      return;
    }

    const content = await onSaveCloud();
    if (!content) {
      toast.error("Erro ao obter conteúdo do relatório.");
      return;
    }

    const fileName = `Relatório ${new Date().toLocaleString('pt-BR')}`;
    const success = await cloudAPI.saveReport(fileName, content);
    
    if (success) {
      toast.success("Relatório salvo no Cloud!");
    } else {
      toast.error("Erro ao salvar no Cloud.");
    }
  };

  const handleLoadExternalData = async () => {
    if (!externalUrl) {
      toast.error("Digite uma URL válida!");
      return;
    }

    const data = await cloudAPI.loadExternalJSON(externalUrl);
    if (data) {
      onLoadExternalJSON(data);
      setIsExternalDataOpen(false);
      setExternalUrl("");
      toast.success("Dados externos carregados!");
    } else {
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

      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <LogIn className="mr-2 h-4 w-4" />
            Login Cloud
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login Stimulsoft BI Cloud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="seu-email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="sua-senha"
              />
            </div>
            <div>
              <Label htmlFor="apikey">API Key (opcional)</Label>
              <Input
                id="apikey"
                value={loginApiKey}
                onChange={(e) => setLoginApiKey(e.target.value)}
                placeholder="sua-api-key"
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              Entrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={isCloudFilesOpen} onOpenChange={setIsCloudFilesOpen}>
        <SheetTrigger asChild>
          <Button onClick={handleOpenCloudFiles} variant="outline" className="w-full justify-start">
            <FolderOpen className="mr-2 h-4 w-4" />
            Abrir do Cloud
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Relatórios do Cloud</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="space-y-2">
              {cloudFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum relatório encontrado</p>
              ) : (
                cloudFiles.map((file) => (
                  <Button
                    key={file.id}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleOpenCloudFile(file.id)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <div className="text-left flex-1">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(file.modified).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Button onClick={handleSaveToCloud} variant="outline" className="w-full justify-start">
        <Save className="mr-2 h-4 w-4" />
        Salvar no Cloud
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
