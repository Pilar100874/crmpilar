import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Zap, LifeBuoy, AppWindow, Shield, Sun, Moon } from "lucide-react";
import { menuItems, type MenuItem } from "@/components/Layout";
import { isEstabelecimentoAdmin } from "@/lib/estabelecimentoUtils";
import { AppsHealthIndicator } from "@/components/AppsHealthIndicator";

const ADMIN_ITEM: MenuItem = {
  id: "Admin",
  title: "Admin",
  icon: Shield,
  subItems: [
    { id: "Macros", title: "Macros", url: "/macros", icon: Zap },
    { id: "Tickets de Suporte", title: "Tickets de Suporte", url: "/admin/support-tickets", icon: LifeBuoy },
    { id: "Apps", title: "Apps", url: "/admin/apps", icon: AppWindow },
  ],
};

export default function MenuHub() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((v) => !v);

  useEffect(() => {
    let cancelled = false;
    isEstabelecimentoAdmin()
      .then((r) => { if (!cancelled) setIsAdmin(r); })
      .finally(() => { if (!cancelled) setLoadingAdmin(false); });
    return () => { cancelled = true; };
  }, []);

  const handleClick = (item: MenuItem) => {
    if (item.subItems && item.subItems.length) {
      setOpenItem(item);
      return;
    }
    if (item.url) navigate(item.url);
  };

  const rootItems: MenuItem[] = isAdmin ? [...menuItems, ...ADMIN_ITEMS] : menuItems;
  const items = openItem?.subItems ?? rootItems;
  const title = openItem?.title ?? "Menu Principal";

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {openItem ? (
            <button
              onClick={() => setOpenItem(null)}
              className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <h1 className="text-2xl sm:text-3xl font-bold flex-1">{title}</h1>
          <button
            onClick={toggleTheme}
            className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
            title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
            aria-label="Alternar tema"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card px-3 py-2">
          <AppsHealthIndicator />
        </div>

        {loadingAdmin && !openItem ? (
          <div className="text-sm text-muted-foreground mb-4">Carregando itens do menu...</div>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {items.map((item: any) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className="group aspect-square flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-card to-muted border border-border shadow-sm hover:shadow-lg hover:border-primary/60 hover:-translate-y-0.5 transition-all p-4 text-center"
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {Icon ? <Icon className="h-7 w-7 sm:h-8 sm:w-8" /> : null}
                </div>
                <span className="text-xs sm:text-sm font-medium leading-tight line-clamp-2">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
