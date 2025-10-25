import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter } from "lucide-react";

export default function Todos() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Todos os Contatos e Empresas</h1>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtrar
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos e empresas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="border-b border-border bg-card px-6">
          <TabsList className="bg-transparent h-auto p-0">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
            >
              Todos
            </TabsTrigger>
            <TabsTrigger 
              value="contacts"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
            >
              Contatos
            </TabsTrigger>
            <TabsTrigger 
              value="companies"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
            >
              Empresas
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 p-6">
          <div className="text-center text-muted-foreground py-12">
            Nenhum contato ou empresa encontrado
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 p-6">
          <div className="text-center text-muted-foreground py-12">
            Nenhum contato encontrado
          </div>
        </TabsContent>

        <TabsContent value="companies" className="flex-1 p-6">
          <div className="text-center text-muted-foreground py-12">
            Nenhuma empresa encontrada
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
