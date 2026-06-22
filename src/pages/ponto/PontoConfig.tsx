import { Link } from "react-router-dom";
import { Building2, Cpu, Download, FileDown, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const items = [
  {
    title: "Empresas / Filiais",
    description: "Cadastro de empresas, filiais e departamentos",
    url: "/ponto/empresas",
    icon: Building2,
  },
  {
    title: "Equipamentos Control iD",
    description: "Relógios de ponto e dispositivos conectados",
    url: "/ponto/equipamentos",
    icon: Cpu,
  },
  {
    title: "Antifraude",
    description: "Geofences e redes autorizadas para validação multi-fator",
    url: "/ponto/antifraude",
    icon: ShieldCheck,
  },
  {
    title: "Coletor Desktop",
    description: "Baixar agente que captura registros dos relógios",
    url: "/ponto/coletor",
    icon: Download,
  },
  {
    title: "Exportação Domínio",
    description: "Configuração de rubricas e exportação para folha",
    url: "/ponto/exportacao",
    icon: FileDown,
  },
];

export default function PontoConfig() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes do módulo de Controle de Ponto
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.url} to={it.url} className="group">
              <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm sm:text-base">{it.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                      {it.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
