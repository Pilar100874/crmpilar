import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Desenho() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Desenho</h1>
          <p className="text-slate-400">
            Visualize e edite seus fluxos de conversação
          </p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Área de Desenho</CardTitle>
            <CardDescription className="text-slate-400">
              Crie e personalize seus fluxos aqui
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[400px] flex items-center justify-center">
            <p className="text-slate-500">
              Conteúdo da tela de desenho será adicionado aqui
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
