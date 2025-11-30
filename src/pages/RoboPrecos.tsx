import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Database, FileSpreadsheet, BarChart3, Settings, Link2, Search } from "lucide-react";
import { FontesPesquisaCRUD } from "@/components/robo-precos/FontesPesquisaCRUD";
import { MapeamentoProdutoFonte } from "@/components/robo-precos/MapeamentoProdutoFonte";
import { ImportarArquivoPrecos } from "@/components/robo-precos/ImportarArquivoPrecos";
import { DashboardPrecos } from "@/components/robo-precos/DashboardPrecos";
import { LogsMonitorPreco } from "@/components/robo-precos/LogsMonitorPreco";
import { BuscaManualPrecos } from "@/components/robo-precos/BuscaManualPrecos";

export default function RoboPrecos() {
  const [activeTab, setActiveTab] = useState("busca");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/60">
            <Bot className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Robô de Preços
            </h1>
            <p className="text-muted-foreground">
              Monitore preços de concorrentes automaticamente
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
            <TabsTrigger value="busca" className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Buscar</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="fontes" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Fontes</span>
            </TabsTrigger>
            <TabsTrigger value="mapeamento" className="gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Mapeamento</span>
            </TabsTrigger>
            <TabsTrigger value="importar" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Importar</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="busca">
            <BuscaManualPrecos />
          </TabsContent>

          <TabsContent value="dashboard">
            <DashboardPrecos />
          </TabsContent>

          <TabsContent value="fontes">
            <FontesPesquisaCRUD />
          </TabsContent>

          <TabsContent value="mapeamento">
            <MapeamentoProdutoFonte />
          </TabsContent>

          <TabsContent value="importar">
            <ImportarArquivoPrecos />
          </TabsContent>

          <TabsContent value="logs">
            <LogsMonitorPreco />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
