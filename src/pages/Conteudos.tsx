import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Link2, File } from "lucide-react";

export default function Conteudos() {
  const contents = [
    { id: 1, titulo: "Política de Trocas", tipo: "faq", tags: ["Vendas", "Pós-venda"], url: null },
    { id: 2, titulo: "Manual do Produto", tipo: "pdf", tags: ["Suporte", "Documentação"], url: "/docs/manual.pdf" },
    { id: 3, titulo: "Script de Atendimento", tipo: "script", tags: ["Treinamento"], url: null },
  ];

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case "pdf": return File;
      case "link": return Link2;
      default: return FileText;
    }
  };

  const getTypeLabel = (tipo: string) => {
    switch (tipo) {
      case "pdf": return "PDF";
      case "link": return "Link";
      case "script": return "Script";
      case "faq": return "FAQ";
      default: return tipo;
    }
  };

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in bg-white min-h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-foreground">Conteúdos</h1>
            <p className="text-muted-foreground">
              Base de conhecimento e materiais de apoio
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Conteúdo
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar conteúdos..." className="pl-10" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contents.map((content) => {
            const TypeIcon = getTypeIcon(content.tipo);
            return (
              <Card key={content.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-gradient-primary/10 text-primary">
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {getTypeLabel(content.tipo)}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-4">{content.titulo}</CardTitle>
                  <CardDescription>
                    {content.url ? (
                      <a href={content.url} className="text-primary hover:underline text-xs">
                        Ver documento
                      </a>
                    ) : (
                      <span className="text-xs">Conteúdo interno</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {content.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4" size="sm">
                    Editar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
