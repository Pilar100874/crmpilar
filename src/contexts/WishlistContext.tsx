import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  image?: string;
  price?: number;
}

interface WishlistContextType {
  items: WishlistItem[];
  addItem: (item: Omit<WishlistItem, "id">) => void;
  removeItem: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (item: Omit<WishlistItem, "id">) => boolean; // returns true if added
  totalItems: number;
}

const WishlistContext = createContext<WishlistContextType | null>(null);
const WISHLIST_KEY = "ecommerce_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<WishlistItem, "id">) => {
    setItems(prev => {
      if (prev.find(i => i.productId === item.productId)) return prev;
      return [...prev, { ...item, id: crypto.randomUUID() }];
    });
  };

  const removeItem = (productId: string) => setItems(prev => prev.filter(i => i.productId !== productId));

  const isWishlisted = (productId: string) => items.some(i => i.productId === productId);

  const toggleWishlist = (item: Omit<WishlistItem, "id">) => {
    if (isWishlisted(item.productId)) {
      removeItem(item.productId);
      return false;
    }
    addItem(item);
    return true;
  };

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, isWishlisted, toggleWishlist, totalItems: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
