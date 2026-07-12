import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Key, Link2 } from "lucide-react";
import AdsPlatformApps from "./AdsPlatformApps";
import AdsCredentials from "./AdsCredentials";
import { AdsOAuthButtons } from "@/components/ads/AdsOAuthButtons";

export default function AdsConexoes() {
  const [tab, setTab] = useState("accounts");
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <b>Conexões</b> reúne os dois níveis de configuração:{" "}
          <b>Apps do Desenvolvedor</b> (chaves do seu app em cada plataforma — cadastradas uma vez) e{" "}
          <b>Contas de Anúncio</b> (as contas específicas que serão monitoradas).
        </AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="accounts" className="gap-2">
            <Link2 className="h-4 w-4" /> Contas de Anúncio
          </TabsTrigger>
          <TabsTrigger value="apps" className="gap-2">
            <Key className="h-4 w-4" /> Apps do Desenvolvedor
          </TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="mt-4 space-y-4">
          <AdsOAuthButtons />
          <AdsCredentials />
        </TabsContent>
        <TabsContent value="apps" className="mt-4">
          <AdsPlatformApps />
        </TabsContent>
      </Tabs>
    </div>
  );
}
