import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  couponDiscount: number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = "ecommerce_cart";
const VALID_COUPONS: Record<string, number> = {
  "PRIMEIRA10": 10,
  "LOJA20": 20,
  "VIP15": 15,
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [coupon, setCoupon] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "id">) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        return prev.map(i => i.productId === item.productId ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.maxStock) } : i);
      }
      return [...prev, { ...item, id: crypto.randomUUID() }];
    });
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) { removeItem(id); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.min(quantity, i.maxStock) } : i));
  };

  const clearCart = () => { setItems([]); setCoupon(null); };

  const applyCoupon = (code: string) => {
    const upper = code.toUpperCase().trim();
    if (VALID_COUPONS[upper]) { setCoupon(upper); return true; }
    return false;
  };

  const removeCoupon = () => setCoupon(null);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const couponDiscount = coupon ? (VALID_COUPONS[coupon] || 0) : 0;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, coupon, applyCoupon, removeCoupon, couponDiscount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
