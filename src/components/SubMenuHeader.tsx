import { ChevronDown } from "lucide-react";

interface SubMenuHeaderProps {
  title: string;
  subtitle?: string;
  onOpenSubmenu: () => void;
}

export function SubMenuHeader({ title, subtitle, onOpenSubmenu }: SubMenuHeaderProps) {
  return (
    <button
      onClick={onOpenSubmenu}
      className="inline-flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 rounded-sm transition-colors group"
    >
      <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
        {title}
      </h2>
      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      {subtitle && (
        <span className="text-sm text-muted-foreground ml-2">
          {subtitle}
        </span>
      )}
    </button>
  );
}
