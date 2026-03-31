import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  type: string | null;
  gramatura: string | null;
  quantity: number;
  maxStock: number;
  image?: string;
  price: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  coupon: string | null;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  couponDiscount: number;
  couponFixedDiscount: number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = "ecommerce_cart";

const hasValidPrice = (price: unknown) => typeof price === "number" && Number.isFinite(price) && price > 0;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((item: Partial<CartItem>) => ({
        id: item.id || crypto.randomUUID(),
        productId: item.productId || "",
        name: item.name || "Produto",
        type: item.type ?? null,
        gramatura: item.gramatura ?? null,
        quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
        maxStock: typeof item.maxStock === "number" && item.maxStock > 0 ? item.maxStock : 999,
        image: item.image,
        price: hasValidPrice(item.price) ? item.price : 0,
      }));
    } catch {
      return [];
    }
  });
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponDiscountVal, setCouponDiscountValue] = useState(0);
  const [couponFixedDiscount, setCouponFixedDiscount] = useState(0);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    const missingPriceIds = items
      .filter((item) => !hasValidPrice(item.price))
      .map((item) => item.productId)
      .filter(Boolean);

    if (missingPriceIds.length === 0) return;

    let cancelled = false;

    const syncMissingPrices = async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, preco_minimo, preco_tabela, tipo_preco, categoria_id")
        .in("id", missingPriceIds);

      if (cancelled || error || !data?.length) return;

      // Resolve category prices if needed
      const categoryIds = new Set<string>();
      for (const p of data) {
        if (p.tipo_preco === "categoria" && p.categoria_id) {
          categoryIds.add(p.categoria_id);
        }
      }

      let categoryPrices = new Map<string, number>();
      if (categoryIds.size > 0) {
        const { data: catData } = await supabase
          .from("tabelas_preco")
          .select("categoria_id, preco_minimo, preco_tabela")
          .in("categoria_id", Array.from(categoryIds))
          .eq("ativo", true);

        if (!cancelled && catData) {
          for (const row of catData) {
            categoryPrices.set(row.categoria_id, row.preco_minimo ?? row.preco_tabela ?? 0);
          }
        }
      }

      if (cancelled) return;

      const priceMap = new Map<string, number>();
      for (const p of data) {
        if (p.tipo_preco === "categoria" && p.categoria_id) {
          priceMap.set(p.id, categoryPrices.get(p.categoria_id) ?? 0);
        } else {
          priceMap.set(p.id, p.preco_minimo ?? p.preco_tabela ?? 0);
        }
      }

      setItems((prev) => {
        let changed = false;

        const next = prev.map((item) => {
          if (hasValidPrice(item.price)) return item;

          const syncedPrice = priceMap.get(item.productId);
          if (syncedPrice == null) return item;

          changed = true;
          return { ...item, price: syncedPrice };
        });

        return changed ? next : prev;
      });
    };

    syncMissingPrices();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const addItem = (item: Omit<CartItem, "id">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? {
                ...i,
                quantity: Math.min(i.quantity + item.quantity, item.maxStock),
                maxStock: item.maxStock,
                image: i.image || item.image,
                type: i.type || item.type,
                gramatura: i.gramatura || item.gramatura,
                price: hasValidPrice(i.price) ? i.price : item.price,
              }
            : i
        );
      }
      return [...prev, { ...item, id: crypto.randomUUID() }];
    });
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(quantity, i.maxStock) } : i)));
  };

  const clearCart = () => {
    setItems([]);
    setCoupon(null);
    setCouponDiscountValue(0);
    setCouponFixedDiscount(0);
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    const upper = code.toUpperCase().trim();
    if (!upper) return false;

    const estabId = localStorage.getItem("estabelecimentoId");
    const now = new Date().toISOString();

    let query = supabase
      .from("cupons_desconto")
      .select("id, codigo, tipo_desconto, valor_desconto")
      .eq("ativo", true)
      .ilike("codigo", upper)
      .or(`data_fim.is.null,data_fim.gte.${now}`)
      .limit(1);

    if (estabId) query = query.eq("estabelecimento_id", estabId);

    const { data } = await query;
    if (data && data.length > 0) {
      const c = data[0] as any;
      setCoupon(c.codigo);
      setCouponDiscountValue(c.tipo_desconto === "percentual" ? c.valor_desconto : 0);
      setCouponFixedDiscount(c.tipo_desconto === "fixo" ? c.valor_desconto : 0);
      return true;
    }
    return false;
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponDiscountValue(0);
    setCouponFixedDiscount(0);
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const couponDiscount = couponDiscountVal;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, coupon, applyCoupon, removeCoupon, couponDiscount, couponFixedDiscount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
