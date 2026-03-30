import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Trash2, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import FlyToAnimation from "@/components/ecommerce/FlyToAnimation";
import { supabase } from "@/integrations/supabase/client";

export default function EcommerceWishlist() {
  const { items, removeItem } = useWishlist();
  const { addItem } = useCart();
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (items.length === 0) return;
    const ids = items.map(i => i.productId);
    supabase.from("produtos").select("id, estoque").in("id", ids).then(({ data }) => {
      if (data) {
        const map: Record<string, number> = {};
        data.forEach(p => { map[p.id] = p.estoque ?? 0; });
        setStockMap(map);
      }
    });
  }, [items]);
  const [flyAnim, setFlyAnim] = useState<{ startRect: DOMRect; target: string; image?: string; icon?: "heart" | "cart" } | null>(null);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
        <Heart className="h-16 w-16 mx-auto text-muted-foreground/30" />
        <h1 className="text-2xl font-bold">Sua lista de favoritos está vazia</h1>
        <p className="text-muted-foreground">Explore nossos produtos e adicione seus favoritos!</p>
        <Link to="/ecommerce/catalogo">
          <Button className="rounded-full mt-2">Ver Catálogo</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Heart className="h-6 w-6 text-red-500 fill-red-500" /> Meus Favoritos ({items.length})
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => (
          <Card key={item.id} className="group overflow-hidden">
            <Link to={`/ecommerce/produto/${item.productId}`}>
              <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <Heart className="h-12 w-12 text-muted-foreground/20" />
                )}
              </div>
            </Link>
            <CardContent className="p-3 space-y-2">
              <Link to={`/ecommerce/produto/${item.productId}`}>
                <p className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors">{item.name}</p>
              </Link>
              {item.price != null && (
                <p className="text-sm font-bold text-primary">R$ {item.price.toFixed(2)}</p>
              )}
              {item.price == null && (
                <p className="text-sm font-bold text-muted-foreground">---</p>
              )}
              <div className="flex items-center gap-1.5">
                {(stockMap[item.productId] ?? 0) > 0 ? (
                  <Button size="sm" variant="outline" className="flex-1 min-w-0 text-xs gap-1 truncate" onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setFlyAnim({ startRect: rect, target: "[data-cart-target]", image: item.image, icon: "cart" });
                    addItem({ productId: item.productId, name: item.name, type: null, gramatura: null, quantity: 1, maxStock: stockMap[item.productId] ?? 999, image: item.image, price: item.price || 0 });
                    toast.success("Adicionado ao carrinho!");
                  }}>
                    <ShoppingCart className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Carrinho</span>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="flex-1 min-w-0 text-xs gap-1 opacity-50 truncate" disabled>
                    <PackageX className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Sem estoque</span>
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0" onClick={() => {
                  removeItem(item.productId);
                  toast.success("Removido dos favoritos");
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
    {flyAnim && (
      <FlyToAnimation
        startRect={flyAnim.startRect}
        targetSelector={flyAnim.target}
        imageUrl={flyAnim.image}
        icon={flyAnim.icon}
        onComplete={() => setFlyAnim(null)}
      />
    )}
    </>
  );
}
