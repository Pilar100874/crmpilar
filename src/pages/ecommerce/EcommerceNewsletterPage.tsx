import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Trash2, Search, Download, Users, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Subscriber {
  id: string;
  email: string;
  nome: string | null;
  ativo: boolean;
  created_at: string;
}

export default function EcommerceNewsletterPage() {
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    const estId = localStorage.getItem("estabelecimentoId");
    if (!estId) { setLoading(false); return; }
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .eq("estabelecimento_id", estId)
      .order("created_at", { ascending: false });
    setSubscribers((data as Subscriber[]) || []);
    setLoading(false);
  };

  const toggleActive = async (id: string, ativo: boolean) => {
    await supabase.from("newsletter_subscribers").update({ ativo: !ativo }).eq("id", id);
    setSubscribers(s => s.map(sub => sub.id === id ? { ...sub, ativo: !ativo } : sub));
    toast.success(ativo ? "Inscrito desativado" : "Inscrito reativado");
  };

  const deleteSubscriber = async (id: string) => {
    // We can't delete via RLS (no delete policy), so just deactivate
    await supabase.from("newsletter_subscribers").update({ ativo: false }).eq("id", id);
    setSubscribers(s => s.map(sub => sub.id === id ? { ...sub, ativo: false } : sub));
    toast.success("Inscrito removido");
  };

  const exportCSV = () => {
    const active = subscribers.filter(s => s.ativo);
    const csv = "Email,Nome,Data Inscrição\n" + active.map(s =>
      `${s.email},${s.nome || ""},${new Date(s.created_at).toLocaleDateString("pt-BR")}`
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter_inscritos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = subscribers.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.nome || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = subscribers.filter(s => s.ativo).length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ecommerce-config")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Newsletter - Inscritos
            </h1>
            <p className="text-muted-foreground text-sm">Gerencie os inscritos na newsletter da loja</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subscribers.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subscribers.length - activeCount}</p>
              <p className="text-xs text-muted-foreground">Inativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por e-mail ou nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {subscribers.length === 0 ? "Nenhum inscrito ainda" : "Nenhum resultado encontrado"}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {sub.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{sub.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sub.created_at).toLocaleDateString("pt-BR")}
                        {sub.nome && ` · ${sub.nome}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sub.ativo ? "default" : "secondary"} className="text-xs">
                      {sub.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActive(sub.id, sub.ativo)}
                      className="text-xs"
                    >
                      {sub.ativo ? "Desativar" : "Reativar"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
