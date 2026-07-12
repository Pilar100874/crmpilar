import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { menuItems, type MenuItem } from "@/components/Layout";

export default function MenuHub() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);

  const handleClick = (item: MenuItem) => {
    if (item.subItems && item.subItems.length) {
      setOpenItem(item);
      return;
    }
    if (item.url) navigate(item.url);
  };

  const items = openItem?.subItems ?? menuItems;
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
          <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
        </div>

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
