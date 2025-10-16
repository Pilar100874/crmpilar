export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  price: number;
  designPngUrl: string;
  designJson: string;
  timestamp: number;
  // Product details
  grupo?: string;
  subgrupo?: string;
  tamanho?: string;
  material?: string;
  papel?: string;
  coating?: string;
  cor?: string;
}

export const getCart = (): CartItem[] => {
  const cartData = localStorage.getItem('cart');
  return cartData ? JSON.parse(cartData) : [];
};

export const addToCart = (item: Omit<CartItem, 'id' | 'timestamp'>): void => {
  const cart = getCart();
  const newItem: CartItem = {
    ...item,
    id: `cart-${Date.now()}`,
    timestamp: Date.now(),
  };
  cart.push(newItem);
  localStorage.setItem('cart', JSON.stringify(cart));
};

export const removeFromCart = (id: string): void => {
  const cart = getCart();
  const filtered = cart.filter(item => item.id !== id);
  localStorage.setItem('cart', JSON.stringify(filtered));
};

export const updateCartItem = (id: string, updates: Partial<CartItem>): void => {
  const cart = getCart();
  const updated = cart.map(item => 
    item.id === id ? { ...item, ...updates } : item
  );
  localStorage.setItem('cart', JSON.stringify(updated));
};

export const clearCart = (): void => {
  localStorage.removeItem('cart');
};
