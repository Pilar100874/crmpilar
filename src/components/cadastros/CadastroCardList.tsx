import React from "react";
import { cn } from "@/lib/utils";

export interface CadastroCardField {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}

export interface CadastroCardItem {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  fields?: CadastroCardField[];
  actions?: React.ReactNode;
  onClick?: () => void;
}

interface CadastroCardListProps {
  items: CadastroCardItem[];
  className?: string;
}

/**
 * Listagem em cartões para celular/tablet — substitui a tabela em telas estreitas,
 * mantendo os mesmos dados legíveis sem rolagem horizontal.
 */
export const CadastroCardList: React.FC<CadastroCardListProps> = ({ items, className }) => {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={item.onClick}
          className={cn(
            "rounded-2xl border border-border/50 bg-card shadow-sm p-3 flex flex-col gap-3",
            item.onClick && "cursor-pointer active:scale-[0.995] transition-transform"
          )}
        >
          <div className="flex items-start gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm text-primary break-words leading-snug">
                {item.title}
              </div>
              {item.subtitle && (
                <div className="text-xs text-muted-foreground break-words mt-0.5">
                  {item.subtitle}
                </div>
              )}
            </div>
            {item.badge && <div className="shrink-0">{item.badge}</div>}
          </div>

          {item.fields && item.fields.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
              {item.fields.map((f, i) => (
                <div key={i} className={cn("min-w-0", f.full && "col-span-2")}>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {f.label}
                  </dt>
                  <dd className="text-xs text-foreground break-words">{f.value || "-"}</dd>
                </div>
              ))}
            </dl>
          )}

          {item.actions && (
            <div
              className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40"
              onClick={(e) => e.stopPropagation()}
            >
              {item.actions}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CadastroCardList;
