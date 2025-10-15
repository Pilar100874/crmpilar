import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User } from "lucide-react";

export default function Clientes() {
  const customers = [
    { id: 1, nome: "Ana Silva", email: "ana@email.com", telefone: "+55 11 99999-1111", tags: ["VIP", "Ativo"] },
    { id: 2, nome: "Carlos Santos", email: "carlos@email.com", telefone: "+55 11 99999-2222", tags: ["Novo"] },
    { id: 3, nome: "Maria Oliveira", email: "maria@email.com", telefone: "+55 11 99999-3333", tags: ["Recorrente"] },
  ];

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">Clientes</h1>
            <p className="text-white/70">
              Gerencie sua base de clientes
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
            <Input placeholder="Buscar clientes..." className="pl-10 bg-slate-800 border-slate-700 text-white" />
          </div>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Todos os Clientes</CardTitle>
            <CardDescription className="text-white/70">
              Lista completa de clientes cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1 text-white">{customer.nome}</h3>
                      <div className="flex gap-4 text-sm text-white/70">
                        <span>{customer.email}</span>
                        <span>{customer.telefone}</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {customer.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-slate-900 border-slate-700 text-white hover:bg-slate-700">
                    Ver Detalhes
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
