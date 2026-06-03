import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Flame, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdvancedHeatmapView } from "@/components/heatmap/AdvancedHeatmapView";
import { HeatmapConfigDialog } from "@/components/heatmap/HeatmapConfigDialog";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EcommerceMapaCalor() {
  const navigate = useNavigate();
  const [carts, setCarts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("ecom_active_carts" as any)
        .select("*")
        .order("last_activity_at", { ascending: false })
        .limit(200);
      if (mounted) setCarts((data as any) || []);
    })();
    return () => { mounted = false; };
  }, []);

  const abandonedCarts = carts.filter(
    (c) => c.status === "active" && c.item_count > 0 && new Date(c.last_activity_at).getTime() < Date.now() - 30 * 60 * 1000
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" /> Mapa de Calor — Loja Virtual
          </h1>
          <p className="text-muted-foreground text-sm">
            Comportamento dos visitantes, carrinhos abandonados e análise de frustração.
          </p>
        </div>
      </div>

      <Tabs defaultValue="advanced">
        <TabsList>
          <TabsTrigger value="advanced">🔥 Heatmap Avançado</TabsTrigger>
          <TabsTrigger value="carts">Carrinhos Abandonados ({abandonedCarts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="advanced" className="mt-4">
          <AdvancedHeatmapView
            scope="ecommerce"
            title="Análise Comportamental — Loja"
            description="Cliques, movimento, scroll, frustração e segmentação por dispositivo/navegador/origem."
          />
        </TabsContent>

        <TabsContent value="carts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Carrinhos abandonados (mais de 30min sem atividade)</CardTitle>
              <CardDescription>{abandonedCarts.length} carrinhos · valor potencial de recuperação</CardDescription>
            </CardHeader>
            <CardContent>
              {abandonedCarts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum carrinho abandonado no momento.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left px-2 py-1">Cliente</th>
                      <th className="text-right px-2 py-1">Itens</th>
                      <th className="text-right px-2 py-1">Total</th>
                      <th className="text-right px-2 py-1">Última atividade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abandonedCarts.map((c) => (
                      <tr key={c.id} className="border-b">
                        <td className="px-2 py-1">{c.customer_email || c.customer_phone || c.session_id.slice(0, 12)}</td>
                        <td className="text-right px-2">{c.item_count}</td>
                        <td className="text-right px-2 font-medium">{brl(Number(c.total))}</td>
                        <td className="text-right px-2 text-muted-foreground">
                          {Math.round((Date.now() - new Date(c.last_activity_at).getTime()) / 60000)} min atrás
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
