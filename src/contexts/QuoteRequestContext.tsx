import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QuoteItem {
  id: string;
  productId: string;
  name: string;
  type: string | null;
  quantity: number;
  image?: string;
}

interface QuoteRequestContextType {
  items: QuoteItem[];
  addItem: (item: Omit<QuoteItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearItems: () => void;
  totalItems: number;
  submitQuote: (observacoes?: string) => Promise<boolean>;
  submitting: boolean;
}

const QuoteRequestContext = createContext<QuoteRequestContextType | null>(null);

const QUOTE_KEY = "ecommerce_quote_request";

export function QuoteRequestProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>(() => {
    try {
      const saved = localStorage.getItem(QUOTE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem(QUOTE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<QuoteItem, "id">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity }
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
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  };

  const clearItems = () => setItems([]);

  const submitQuote = async (observacoes?: string): Promise<boolean> => {
    if (items.length === 0) {
      toast.error("Adicione ao menos um item à lista de orçamento.");
      return false;
    }

    setSubmitting(true);
    try {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado para solicitar um orçamento.");
        setSubmitting(false);
        return false;
      }

      // Get usuario record
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id, estabelecimento_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      // Get the customer linked to this user, or find by email
      let clienteId: string | null = null;
      let estabelecimentoId: string | null = null;

      if (usuario) {
        estabelecimentoId = usuario.estabelecimento_id;
        // Try to find a customer by user email
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();
        if (customer) clienteId = customer.id;
      }

      // If no estabelecimento from user, get from config
      if (!estabelecimentoId) {
        const { data: config } = await supabase
          .from("ecommerce_config")
          .select("estabelecimento_id")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (config) estabelecimentoId = config.estabelecimento_id;
      }

      if (!estabelecimentoId) {
        toast.error("Não foi possível identificar o estabelecimento.");
        setSubmitting(false);
        return false;
      }

      // If no customer exists, create one
      if (!clienteId) {
        const { data: newCustomer, error: custError } = await supabase
          .from("customers")
          .insert({
            estabelecimento_id: estabelecimentoId,
            nome: user.user_metadata?.nome || user.email?.split("@")[0] || "Cliente E-commerce",
            name: user.user_metadata?.nome || user.email?.split("@")[0] || "Cliente E-commerce",
            email: user.email || "",
            telefone: "",
            canal: "ecommerce",
          } as any)
          .select("id")
          .single();
        if (custError || !newCustomer) {
          // Try finding existing
          const { data: existing } = await supabase
            .from("customers")
            .select("id")
            .eq("email", user.email)
            .eq("estabelecimento_id", estabelecimentoId)
            .maybeSingle();
          if (existing) {
            clienteId = existing.id;
          } else {
            toast.error("Erro ao criar registro de cliente.");
            setSubmitting(false);
            return false;
          }
        } else {
          clienteId = newCustomer.id;
        }
      }

      // Create the orcamento
      const { data: orcamento, error: orcError } = await supabase
        .from("orcamentos")
        .insert({
          estabelecimento_id: estabelecimentoId,
          cliente_id: clienteId!,
          vendedor_id: usuario?.id || clienteId!,
          etapa: "orcamento",
          status: "aberto",
          valor_total: 0,
          valor_desconto: 0,
          percentual_desconto: 0,
          observacoes: `[ORÇAMENTO VIA SITE] ${observacoes || "Solicitação de orçamento via e-commerce"}`,
          origem: "ecommerce",
        } as any)
        .select("id")
        .single();

      if (orcError || !orcamento) {
        console.error("Erro ao criar orçamento:", orcError);
        toast.error("Erro ao enviar solicitação de orçamento.");
        setSubmitting(false);
        return false;
      }

      // Insert items
      const orcamentoItens = items.map((item) => ({
        orcamento_id: orcamento.id,
        produto_id: item.productId,
        quantidade: item.quantity,
        preco_unitario: 0,
        preco_original: 0,
        desconto: 0,
        subtotal: 0,
      }));

      const { error: itensError } = await supabase
        .from("orcamento_itens")
        .insert(orcamentoItens);

      if (itensError) {
        console.error("Erro ao inserir itens:", itensError);
      }

      clearItems();
      toast.success("Solicitação de orçamento enviada com sucesso! Entraremos em contato em breve.");
      setSubmitting(false);
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar solicitação.");
      setSubmitting(false);
      return false;
    }
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <QuoteRequestContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearItems, totalItems, submitQuote, submitting }}>
      {children}
    </QuoteRequestContext.Provider>
  );
}

export function useQuoteRequest() {
  const ctx = useContext(QuoteRequestContext);
  if (!ctx) throw new Error("useQuoteRequest must be used within QuoteRequestProvider");
  return ctx;
}
