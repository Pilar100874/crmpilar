import { EmailOAuthConfig } from "@/components/config/EmailOAuthConfig";
import { EmailServerConfig } from "@/components/config/EmailServerConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, KeyRound } from "lucide-react";

export default function EmailConfig() {
  return (
    <div className="container max-w-4xl py-8">
      <Tabs defaultValue="external" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="external" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Servidor Externo
          </TabsTrigger>
          <TabsTrigger value="oauth" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            OAuth Gmail/Outlook
          </TabsTrigger>
        </TabsList>
        <TabsContent value="external">
          <EmailServerConfig />
        </TabsContent>
        <TabsContent value="oauth">
          <EmailOAuthConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
